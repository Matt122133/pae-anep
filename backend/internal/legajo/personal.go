package legajo

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Matt122133/pae-anep/backend/internal/bitacora"
	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
)

var etiquetasPersonal = map[string]string{
	"fullName": "Nombre completo", "ci": "CI / documento", "role": "Rol en cocina",
	"institutionType": "Régimen", "enterpriseName": "Empresa", "healthCardValidUntil": "Vencimiento carné de salud",
	"foodHandlerCardValidUntil": "Vencimiento carné de manipulador", "socialSecurityStatus": "Aportes BPS",
	"phone": "Teléfono", "notes": "Notas", "schoolId": "Escuela",
}

func leerPersonal(ctx context.Context, tx pgx.Tx, id string, bloquear bool) (StaffMember, error) {
	sql := `SELECT ` + columnasPersonal + ` FROM personal WHERE id = $1`
	if bloquear {
		sql += ` FOR UPDATE`
	}
	p, err := escanearPersonal(tx.QueryRow(ctx, sql, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return p, ErrNoExiste
	}
	return p, err
}

// nulo convierte "" en NULL para las columnas de fecha.
func nulo(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func opPersonal(escuela *bitacora.Escuela) operaciones[StaffMember] {
	return operaciones[StaffMember]{
		leer: leerPersonal,
		insertar: func(ctx context.Context, tx pgx.Tx, p *StaffMember) (bool, error) {
			tag, err := tx.Exec(ctx, `INSERT INTO personal (id, escuela_id, nombre_completo, ci, rol, regimen,
				empresa, vence_carne_salud, vence_carne_manipulador, bps, telefono, notas)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
				p.ID, p.SchoolID, p.FullName, p.CI, p.Role, p.InstitutionType, p.EnterpriseName,
				nulo(p.HealthCardValidUntil), nulo(p.FoodHandlerCardValidUntil), p.SocialSecurityStatus, p.Phone, p.Notes)
			if err != nil || tag.RowsAffected() == 0 {
				return false, err
			}
			// La asignacion inicial: el historial de escuelas empieza aca (FR-033).
			_, err = tx.Exec(ctx, `INSERT INTO personal_asignaciones (personal_id, escuela_id, desde)
				VALUES ($1, $2, current_date)`, p.ID, p.SchoolID)
			return err == nil, err
		},
		actualizar: func(ctx context.Context, tx pgx.Tx, p *StaffMember) error {
			_, err := tx.Exec(ctx, `UPDATE personal SET nombre_completo=$2, ci=$3, rol=$4, regimen=$5,
				empresa=$6, vence_carne_salud=$7, vence_carne_manipulador=$8, bps=$9, telefono=$10, notas=$11,
				version = version + 1 WHERE id = $1`,
				p.ID, p.FullName, p.CI, p.Role, p.InstitutionType, p.EnterpriseName,
				nulo(p.HealthCardValidUntil), nulo(p.FoodHandlerCardValidUntil), p.SocialSecurityStatus, p.Phone, p.Notes)
			return err
		},
		id:        func(p StaffMember) string { return p.ID },
		version:   func(p StaffMember) int { return p.Version },
		etiquetas: etiquetasPersonal,
		entrada: func(antes *StaffMember, p StaffMember, cambios []bitacora.Cambio) bitacora.Entrada {
			e := bitacora.Entrada{Escuela: escuela, Categoria: bitacora.CatPersonal, Detalle: cambios}
			if antes == nil {
				e.Accion, e.Detalle = bitacora.AccionCrear, nil
				e.Resumen = fmt.Sprintf("Alta de %s: %s", p.Role, p.FullName)
			} else {
				e.Accion = bitacora.AccionEditar
				e.Resumen = fmt.Sprintf("Actualización de datos de %s: %s", p.Role, p.FullName)
			}
			return e
		},
	}
}

// CrearPersonal da de alta una persona en una escuela activa.
func (r *Repositorio) CrearPersonal(ctx context.Context, autor *cuentas.Cuenta, p StaffMember) (StaffMember, error) {
	if err := ValidarPersonal(&p); err != nil {
		return StaffMember{}, err
	}
	var out StaffMember
	err := r.enTx(ctx, func(tx pgx.Tx) error {
		esc, err := escuelaDe(ctx, tx, p.SchoolID, true)
		if err != nil {
			return err
		}
		out, _, err = crear(ctx, tx, opPersonal(esc), autor, &p)
		return err
	})
	return out, err
}

// EditarPersonal edita los datos; **no cambia de escuela**: eso es Trasladar,
// que conserva el historial.
func (r *Repositorio) EditarPersonal(ctx context.Context, autor *cuentas.Cuenta, p StaffMember) (StaffMember, error) {
	if err := ValidarPersonal(&p); err != nil {
		return StaffMember{}, err
	}
	var out StaffMember
	err := r.enTx(ctx, func(tx pgx.Tx) error {
		antes, err := leerPersonal(ctx, tx, p.ID, false)
		if err != nil {
			return err
		}
		if antes.SchoolID != p.SchoolID {
			return invalido("schoolId", "para cambiar de escuela usá el traslado")
		}
		esc, err := escuelaDe(ctx, tx, antes.SchoolID, false)
		if err != nil {
			return err
		}
		out, err = editar(ctx, tx, opPersonal(esc), autor, &p, nil)
		return err
	})
	return out, err
}

// CambiarActivoPersonal es la baja logica de una persona (FR-015).
func (r *Repositorio) CambiarActivoPersonal(ctx context.Context, autor *cuentas.Cuenta, id string, version int, activo bool) (StaffMember, error) {
	var out StaffMember
	err := r.enTx(ctx, func(tx pgx.Tx) error {
		antes, err := leerPersonal(ctx, tx, id, true)
		if err != nil {
			return err
		}
		if antes.Active == activo {
			out = antes
			return nil
		}
		if antes.Version != version {
			return &ErrConflicto{Actual: antes}
		}
		if _, err := tx.Exec(ctx, `UPDATE personal SET activo = $2, version = version + 1 WHERE id = $1`, id, activo); err != nil {
			return err
		}
		if out, err = leerPersonal(ctx, tx, id, false); err != nil {
			return err
		}
		esc, err := escuelaDe(ctx, tx, out.SchoolID, false)
		if err != nil {
			return err
		}
		accion, resumen := bitacora.AccionBaja, "Baja de %s: %s (historial conservado)"
		if activo {
			accion, resumen = bitacora.AccionEditar, "Reincorporación de %s: %s"
		}
		return bitacora.Escribir(ctx, tx, autor, bitacora.Entrada{
			Escuela: esc, Accion: accion, Categoria: bitacora.CatPersonal,
			Resumen: fmt.Sprintf(resumen, out.Role, out.FullName),
			Detalle: []bitacora.Cambio{{Field: "active", FieldLabel: "Activa", OldValue: antes.Active, NewValue: activo}},
		})
	})
	return out, err
}

// Traslado es el cuerpo de POST /personal/{id}/traslado.
type Traslado struct {
	SchoolID string `json:"schoolId"`
	Fecha    string `json:"fecha"`
	Version  int    `json:"version"`
}

// Trasladar cambia a una persona de escuela **sin crear otra persona ni borrar
// nada** (FR-033): cierra la asignacion vigente, abre una nueva y deja entrada
// en la bitacora de las dos escuelas.
func (r *Repositorio) Trasladar(ctx context.Context, autor *cuentas.Cuenta, id string, t Traslado) (StaffMember, error) {
	if t.Fecha == "" {
		t.Fecha = time.Now().Format("2006-01-02")
	}
	e := errores{}
	e.vacio("schoolId", t.SchoolID)
	e.fecha("fecha", t.Fecha, true)
	if err := e.err(); err != nil {
		return StaffMember{}, err
	}
	var out StaffMember
	err := r.enTx(ctx, func(tx pgx.Tx) error {
		antes, err := leerPersonal(ctx, tx, id, true)
		if err != nil {
			return err
		}
		if antes.SchoolID == t.SchoolID {
			out = antes
			return nil
		}
		if antes.Version != t.Version {
			return &ErrConflicto{Actual: antes}
		}
		origen, err := escuelaDe(ctx, tx, antes.SchoolID, false)
		if err != nil {
			return err
		}
		destino, err := escuelaDe(ctx, tx, t.SchoolID, true)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE personal_asignaciones SET hasta = $2
			WHERE personal_id = $1 AND hasta IS NULL`, id, t.Fecha); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO personal_asignaciones (personal_id, escuela_id, desde)
			VALUES ($1, $2, $3)`, id, t.SchoolID, t.Fecha); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE personal SET escuela_id = $2, version = version + 1 WHERE id = $1`,
			id, t.SchoolID); err != nil {
			return err
		}
		if out, err = leerPersonal(ctx, tx, id, false); err != nil {
			return err
		}
		cambio := []bitacora.Cambio{{Field: "schoolId", FieldLabel: "Escuela",
			OldValue: fmt.Sprintf("Escuela N° %d", origen.Numero), NewValue: fmt.Sprintf("Escuela N° %d", destino.Numero)}}
		for _, esc := range []*bitacora.Escuela{origen, destino} {
			if err := bitacora.Escribir(ctx, tx, autor, bitacora.Entrada{
				Escuela: esc, Accion: bitacora.AccionEditar, Categoria: bitacora.CatPersonal,
				Resumen: fmt.Sprintf("Traslado de %s %s: escuela N° %d → N° %d (desde %s)",
					out.Role, out.FullName, origen.Numero, destino.Numero, t.Fecha),
				Detalle: cambio,
			}); err != nil {
				return err
			}
		}
		return nil
	})
	return out, err
}

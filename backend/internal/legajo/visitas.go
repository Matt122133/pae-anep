package legajo

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/Matt122133/pae-anep/backend/internal/bitacora"
	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
)

var etiquetasVisita = map[string]string{
	"date": "Fecha", "time": "Hora", "status": "Estado de la visita", "visitors": "Equipo visitante",
	"dinersActualCount": "Comensales efectivos", "menuEvaluation": "Evaluación del menú",
	"menuPlanned": "Menú planificado", "menuServed": "Menú servido", "hygieneChecklist": "Checklist de higiene",
	"deliveryNotesChecked": "Cotejo de remitos", "unauthorizedItemsFound": "Alimentos no autorizados",
	"meetingMinutes": "Acta", "suggestions": "Sugerencias", "generalObservations": "Observaciones generales",
	"scheduledObjective": "Objetivo planificado",
}

func leerVisita(ctx context.Context, tx pgx.Tx, id string, bloquear bool) (Visit, error) {
	sql := `SELECT ` + columnasVisita + ` FROM visitas WHERE id = $1`
	if bloquear {
		sql += ` FOR UPDATE`
	}
	v, err := escanearVisita(tx.QueryRow(ctx, sql, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return v, ErrNoExiste
	}
	return v, err
}

func opVisita(escuela *bitacora.Escuela, autor *cuentas.Cuenta) operaciones[Visit] {
	return operaciones[Visit]{
		leer: leerVisita,
		insertar: func(ctx context.Context, tx pgx.Tx, v *Visit) (bool, error) {
			contenido, err := json.Marshal(v.VisitaContenido)
			if err != nil {
				return false, err
			}
			// El numero correlativo se asigna con la escuela tomada: dos altas
			// simultaneas en la misma escuela salen con numeros distintos en vez de
			// chocar (research D10).
			if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext('visitas:' || $1))`, v.SchoolID); err != nil {
				return false, err
			}
			tag, err := tx.Exec(ctx, `INSERT INTO visitas (id, escuela_id, numero, fecha, hora, estado, visitantes,
				comensales_reales, evaluacion_menu, contenido, creada_por)
				VALUES ($1, $2, (SELECT COALESCE(max(numero), 0) + 1 FROM visitas WHERE escuela_id = $2),
				        $3, $4, $5, $6, $7, $8, $9, $10)
				ON CONFLICT (id) DO NOTHING`,
				v.ID, v.SchoolID, v.Date, v.Time, v.Status, v.Visitors, v.DinersActualCount,
				v.MenuEvaluation, contenido, autor.ID)
			return err == nil && tag.RowsAffected() == 1, err
		},
		actualizar: func(ctx context.Context, tx pgx.Tx, v *Visit) error {
			contenido, err := json.Marshal(v.VisitaContenido)
			if err != nil {
				return err
			}
			_, err = tx.Exec(ctx, `UPDATE visitas SET fecha=$2, hora=$3, estado=$4, visitantes=$5,
				comensales_reales=$6, evaluacion_menu=$7, contenido=$8, version = version + 1 WHERE id = $1`,
				v.ID, v.Date, v.Time, v.Status, v.Visitors, v.DinersActualCount, v.MenuEvaluation, contenido)
			return err
		},
		id:        func(v Visit) string { return v.ID },
		version:   func(v Visit) int { return v.Version },
		etiquetas: etiquetasVisita,
		entrada: func(antes *Visit, v Visit, cambios []bitacora.Cambio) bitacora.Entrada {
			e := bitacora.Entrada{Escuela: escuela, Categoria: bitacora.CatVisitas, Detalle: cambios}
			switch {
			case antes == nil && v.Status == "Programada":
				e.Accion, e.Detalle = bitacora.AccionCrear, nil
				e.Resumen = fmt.Sprintf("Programación de la visita N° %d para el %s", v.VisitNumber, v.Date)
			case antes == nil:
				e.Accion = bitacora.AccionVisita
				e.Detalle = []bitacora.Cambio{
					{Field: "dinersActualCount", FieldLabel: "Comensales efectivos", NewValue: v.DinersActualCount},
					{Field: "menuEvaluation", FieldLabel: "Evaluación del menú", NewValue: v.MenuEvaluation},
				}
				e.Resumen = fmt.Sprintf("Registro de la visita técnica N° %d (%s)", v.VisitNumber, v.Date)
			case antes.Status != v.Status:
				e.Accion = bitacora.AccionVisita
				e.Resumen = fmt.Sprintf("Visita N° %d: %s → %s", v.VisitNumber, antes.Status, v.Status)
			default:
				e.Accion = bitacora.AccionEditar
				e.Resumen = fmt.Sprintf("Actualización de la visita N° %d", v.VisitNumber)
			}
			return e
		},
	}
}

// visitantesValidos exige que cada visitante nuevo sea una cuenta activa. Los
// que ya estaban guardados (autoria historica de una visita importada) se
// aceptan aunque no sean cuentas.
func visitantesValidos(ctx context.Context, tx pgx.Tx, visitantes, yaGuardados []string) error {
	previos := conjunto(yaGuardados...)
	nuevos := []string{}
	for _, v := range visitantes {
		if !previos[v] {
			nuevos = append(nuevos, v)
		}
	}
	if len(nuevos) == 0 {
		return nil
	}
	var encontrados int
	if err := tx.QueryRow(ctx, `SELECT count(DISTINCT id) FROM cuentas WHERE activa AND id = ANY($1)`, nuevos).
		Scan(&encontrados); err != nil {
		return err
	}
	if encontrados != len(conjunto(nuevos...)) {
		return invalido("visitors", "hay visitantes que no son cuentas activas del equipo")
	}
	return nil
}

// AltaVisita es el cuerpo de POST /visitas.
type AltaVisita struct {
	Visit     Visit         `json:"visit"`
	NewIssues []SchoolIssue `json:"newIssues"`
}

// CrearVisita registra o programa una visita, con sus incidencias nuevas en la
// misma transaccion. El numero lo asigna el servidor. Idempotente por id.
func (r *Repositorio) CrearVisita(ctx context.Context, autor *cuentas.Cuenta, alta AltaVisita) (Visit, []SchoolIssue, error) {
	v := alta.Visit
	if err := ValidarVisita(&v); err != nil {
		return Visit{}, nil, err
	}
	var out Visit
	var incidencias []SchoolIssue
	err := r.enTx(ctx, func(tx pgx.Tx) error {
		esc, err := escuelaDe(ctx, tx, v.SchoolID, true)
		if err != nil {
			return err
		}
		if err := visitantesValidos(ctx, tx, v.Visitors, nil); err != nil {
			return err
		}
		out, _, err = crear(ctx, tx, opVisita(esc, autor), autor, &v)
		if err != nil {
			return err
		}
		for k, i := range alta.NewIssues {
			i.SchoolID, i.VisitID = out.SchoolID, out.ID
			if i.ReportedDate == "" {
				i.ReportedDate = out.Date
			}
			if i.Status == "" {
				i.Status = "Pendiente"
			}
			creada, err := crearIncidenciaEnTx(ctx, tx, autor, i)
			var inv *ErrInvalido
			if errors.As(err, &inv) {
				campos := map[string]string{}
				for c, m := range inv.Campos {
					campos[campoIndice("newIssues", k, c)] = m
				}
				return &ErrInvalido{Campos: campos}
			}
			if err != nil {
				return err
			}
			incidencias = append(incidencias, creada)
		}
		return nil
	})
	return out, incidencias, err
}

// EditarVisita edita, incluido pasar de Programada a Realizada o Cancelada.
func (r *Repositorio) EditarVisita(ctx context.Context, autor *cuentas.Cuenta, v Visit) (Visit, error) {
	if err := ValidarVisita(&v); err != nil {
		return Visit{}, err
	}
	var out Visit
	err := r.enTx(ctx, func(tx pgx.Tx) error {
		guardada, err := leerVisita(ctx, tx, v.ID, false)
		if err != nil {
			return err
		}
		esc, err := escuelaDe(ctx, tx, guardada.SchoolID, false)
		if err != nil {
			return err
		}
		if err := visitantesValidos(ctx, tx, v.Visitors, guardada.Visitors); err != nil {
			return err
		}
		out, err = editar(ctx, tx, opVisita(esc, autor), autor, &v, func(antes Visit, v *Visit) error {
			// Numero y escuela los decide el servidor y no cambian.
			v.SchoolID, v.VisitNumber = antes.SchoolID, antes.VisitNumber
			if antes.Status == "Realizada" && v.Status != "Realizada" {
				return invalido("status", "una visita realizada no vuelve a programada ni se cancela")
			}
			return nil
		})
		return err
	})
	return out, err
}

// BorrarVisita elimina una visita programada o cancelada. Una realizada no se
// borra: es parte del legajo.
func (r *Repositorio) BorrarVisita(ctx context.Context, autor *cuentas.Cuenta, id string, version int) error {
	return r.enTx(ctx, func(tx pgx.Tx) error {
		antes, err := leerVisita(ctx, tx, id, true)
		if errors.Is(err, ErrNoExiste) {
			return nil
		}
		if err != nil {
			return err
		}
		if antes.Status == "Realizada" {
			return invalido("status", "una visita realizada no se borra")
		}
		if antes.Version != version {
			return &ErrConflicto{Actual: antes}
		}
		esc, err := escuelaDe(ctx, tx, antes.SchoolID, false)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM visitas WHERE id = $1`, id); err != nil {
			if esViolacionFK(err) {
				return invalido("id", "la visita tiene incidencias asociadas")
			}
			return err
		}
		return bitacora.Escribir(ctx, tx, autor, bitacora.Entrada{
			Escuela: esc, Accion: bitacora.AccionBaja, Categoria: bitacora.CatVisitas,
			Resumen: fmt.Sprintf("Eliminación de la visita N° %d (%s, %s)", antes.VisitNumber, antes.Status, antes.Date),
		})
	})
}

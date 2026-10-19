package legajo

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/Matt122133/pae-anep/backend/internal/bitacora"
	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
)

var etiquetasEscuela = map[string]string{
	"number": "N° de escuela", "name": "Nombre", "department": "Departamento", "areaType": "Ámbito",
	"zone": "Localidad / zona", "assignedInspector": "Inspector/a asignado/a", "address": "Dirección",
	"phone": "Teléfono", "email": "Correo", "principalName": "Director/a", "headCookName": "Encargada de cocina",
	"modality": "Modalidad", "studentDinersCount": "Comensales alumnos", "staffDinersCount": "Comensales personal",
	"mealServices": "Servicios de comedor", "hasWaterSupply": "Agua de red OSE",
	"waterPurchaseAllowance": "Rubro compra de agua", "waterNotes": "Notas de agua",
	"milkProgramType": "Programa de leche", "milkPowderKg": "Leche en polvo (kg/mes)",
	"milkNotes": "Notas de leche", "notes": "Notas",
}

// camposAguaYLeche: si todo lo que cambio es de aca, la entrada va en la
// categoria "Agua y Leche" y no en "Legajo Institucional".
var camposAguaYLeche = conjunto("hasWaterSupply", "waterPurchaseAllowance", "waterNotes",
	"milkProgramType", "milkPowderKg", "milkNotes")

func leerEscuela(ctx context.Context, tx pgx.Tx, id string, bloquear bool) (School, error) {
	sql := `SELECT ` + columnasEscuela + ` FROM escuelas e WHERE e.id = $1`
	if bloquear {
		sql += ` FOR UPDATE OF e`
	}
	s, err := escanearEscuela(tx.QueryRow(ctx, sql, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return s, ErrNoExiste
	}
	return s, err
}

func argsEscuela(s *School) []any {
	return []any{s.ID, s.Number, s.Name, s.Department, s.AreaType, s.Zone, s.AssignedInspector,
		s.Address, s.Phone, s.Email, s.PrincipalName, s.HeadCookName, s.Modality,
		s.StudentDinersCount, s.StaffDinersCount, s.MealServices.Breakfast, s.MealServices.Lunch,
		s.MealServices.Snack, s.HasWaterSupply, s.WaterPurchaseAllowance, s.WaterNotes,
		s.MilkProgramType, s.MilkPowderKg, s.MilkNotes, s.Notes}
}

func numeroRepetido(err error) error {
	if esDuplicado(err, "escuelas_numero_key") {
		return invalido("number", "ya existe una escuela con ese número")
	}
	return err
}

var opEscuela = operaciones[School]{
	leer: leerEscuela,
	insertar: func(ctx context.Context, tx pgx.Tx, s *School) (bool, error) {
		tag, err := tx.Exec(ctx, `INSERT INTO escuelas (id, numero, nombre, departamento, ambito, zona,
			inspector, direccion, telefono, email, director, cocinera_responsable, modalidad,
			comensales_alumnos, comensales_personal, servicio_desayuno, servicio_almuerzo,
			servicio_merienda, agua_ose, rubro_agua, notas_agua, programa_leche, leche_kg, notas_leche, notas)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
			ON CONFLICT (id) DO NOTHING`, argsEscuela(s)...)
		if err != nil {
			return false, numeroRepetido(err)
		}
		return tag.RowsAffected() == 1, nil
	},
	actualizar: func(ctx context.Context, tx pgx.Tx, s *School) error {
		_, err := tx.Exec(ctx, `UPDATE escuelas SET numero=$2, nombre=$3, departamento=$4, ambito=$5,
			zona=$6, inspector=$7, direccion=$8, telefono=$9, email=$10, director=$11,
			cocinera_responsable=$12, modalidad=$13, comensales_alumnos=$14, comensales_personal=$15,
			servicio_desayuno=$16, servicio_almuerzo=$17, servicio_merienda=$18, agua_ose=$19,
			rubro_agua=$20, notas_agua=$21, programa_leche=$22, leche_kg=$23, notas_leche=$24, notas=$25,
			version = version + 1, actualizada_en = now()
			WHERE id = $1`, argsEscuela(s)...)
		return numeroRepetido(err)
	},
	id:        func(s School) string { return s.ID },
	version:   func(s School) int { return s.Version },
	etiquetas: etiquetasEscuela,
	entrada: func(antes *School, s School, cambios []bitacora.Cambio) bitacora.Entrada {
		e := bitacora.Entrada{
			Escuela:   &bitacora.Escuela{ID: s.ID, Numero: s.Number, Nombre: s.Name},
			Categoria: bitacora.CatLegajo,
			Detalle:   cambios,
		}
		if antes == nil {
			e.Accion = bitacora.AccionCrear
			e.Resumen = fmt.Sprintf("Alta de la escuela N° %d - %s", s.Number, s.Name)
			e.Detalle = nil
			return e
		}
		e.Accion = bitacora.AccionEditar
		e.Resumen = fmt.Sprintf("Actualización del legajo de la escuela N° %d", s.Number)
		soloAguaYLeche := len(cambios) > 0
		for _, c := range cambios {
			if !camposAguaYLeche[c.Field] {
				soloAguaYLeche = false
			}
		}
		if soloAguaYLeche {
			e.Categoria = bitacora.CatAguaYLeche
			e.Resumen = fmt.Sprintf("Actualización de agua y leche de la escuela N° %d", s.Number)
		}
		return e
	},
}

// CrearEscuela da de alta una escuela (idempotente por id).
func (r *Repositorio) CrearEscuela(ctx context.Context, autor *cuentas.Cuenta, s School) (School, error) {
	if err := ValidarEscuela(&s); err != nil {
		return School{}, err
	}
	var out School
	err := r.enTx(ctx, func(tx pgx.Tx) (err error) {
		out, _, err = crear(ctx, tx, opEscuela, autor, &s)
		return err
	})
	return out, err
}

// EditarEscuela aplica una edicion con control de version.
func (r *Repositorio) EditarEscuela(ctx context.Context, autor *cuentas.Cuenta, s School) (School, error) {
	if err := ValidarEscuela(&s); err != nil {
		return School{}, err
	}
	var out School
	err := r.enTx(ctx, func(tx pgx.Tx) (err error) {
		out, err = editar(ctx, tx, opEscuela, autor, &s, nil)
		return err
	})
	return out, err
}

// CambiarActivaEscuela es la baja logica (FR-015) y su reversa.
func (r *Repositorio) CambiarActivaEscuela(ctx context.Context, autor *cuentas.Cuenta, id string, version int, activa bool) (School, error) {
	var out School
	err := r.enTx(ctx, func(tx pgx.Tx) error {
		antes, err := leerEscuela(ctx, tx, id, true)
		if err != nil {
			return err
		}
		if antes.Version != version {
			if antes.Active == activa {
				out = antes
				return nil
			}
			return &ErrConflicto{Actual: antes}
		}
		if antes.Active == activa {
			out = antes
			return nil
		}
		if _, err := tx.Exec(ctx, `UPDATE escuelas SET activo = $2, version = version + 1,
			actualizada_en = now() WHERE id = $1`, id, activa); err != nil {
			return err
		}
		if out, err = leerEscuela(ctx, tx, id, false); err != nil {
			return err
		}
		accion, resumen := bitacora.AccionBaja, "Baja de la escuela N° %d (queda consultable)"
		if activa {
			accion, resumen = bitacora.AccionEditar, "Reactivación de la escuela N° %d"
		}
		return bitacora.Escribir(ctx, tx, autor, bitacora.Entrada{
			Escuela:   &bitacora.Escuela{ID: out.ID, Numero: out.Number, Nombre: out.Name},
			Accion:    accion,
			Categoria: bitacora.CatLegajo,
			Resumen:   fmt.Sprintf(resumen, out.Number),
			Detalle:   []bitacora.Cambio{{Field: "active", FieldLabel: "Activa", OldValue: antes.Active, NewValue: activa}},
		})
	})
	return out, err
}

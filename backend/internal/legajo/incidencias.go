package legajo

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/Matt122133/pae-anep/backend/internal/bitacora"
	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
)

var etiquetasIncidencia = map[string]string{
	"title": "Título", "description": "Descripción", "category": "Categoría", "severity": "Severidad",
	"reportedDate": "Fecha de reporte", "status": "Estado del caso", "resolvedDate": "Fecha de resolución",
	"resolutionNotes": "Notas de resolución", "resolvedInVisitNumber": "Resuelta en visita N°",
}

func leerIncidencia(ctx context.Context, tx pgx.Tx, id string, bloquear bool) (SchoolIssue, error) {
	sql := `SELECT ` + columnasIncidencia + ` FROM incidencias WHERE id = $1`
	if bloquear {
		sql += ` FOR UPDATE`
	}
	i, err := escanearIncidencia(tx.QueryRow(ctx, sql, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return i, ErrNoExiste
	}
	return i, err
}

func opIncidencia(escuela *bitacora.Escuela) operaciones[SchoolIssue] {
	return operaciones[SchoolIssue]{
		leer: leerIncidencia,
		insertar: func(ctx context.Context, tx pgx.Tx, i *SchoolIssue) (bool, error) {
			tag, err := tx.Exec(ctx, `INSERT INTO incidencias (id, escuela_id, visita_id, titulo, descripcion,
				categoria, severidad, fecha_reporte, estado, fecha_resolucion, notas_resolucion, resuelta_en_visita)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
				i.ID, i.SchoolID, nulo(i.VisitID), i.Title, i.Description, i.Category, i.Severity,
				i.ReportedDate, i.Status, nulo(i.ResolvedDate), i.ResolutionNotes, i.ResolvedInVisitNumber)
			return err == nil && tag.RowsAffected() == 1, err
		},
		actualizar: func(ctx context.Context, tx pgx.Tx, i *SchoolIssue) error {
			_, err := tx.Exec(ctx, `UPDATE incidencias SET titulo=$2, descripcion=$3, categoria=$4, severidad=$5,
				fecha_reporte=$6, estado=$7, fecha_resolucion=$8, notas_resolucion=$9, resuelta_en_visita=$10,
				version = version + 1 WHERE id = $1`,
				i.ID, i.Title, i.Description, i.Category, i.Severity, i.ReportedDate, i.Status,
				nulo(i.ResolvedDate), i.ResolutionNotes, i.ResolvedInVisitNumber)
			return err
		},
		id:        func(i SchoolIssue) string { return i.ID },
		version:   func(i SchoolIssue) int { return i.Version },
		etiquetas: etiquetasIncidencia,
		entrada: func(antes *SchoolIssue, i SchoolIssue, cambios []bitacora.Cambio) bitacora.Entrada {
			e := bitacora.Entrada{Escuela: escuela, Categoria: bitacora.CatCasos, Detalle: cambios}
			switch {
			case antes == nil:
				e.Accion, e.Detalle = bitacora.AccionCrear, nil
				e.Resumen = fmt.Sprintf("Nueva incidencia (%s): %s", i.Severity, i.Title)
			case antes.Status != i.Status:
				e.Accion = bitacora.AccionEstado
				e.Resumen = fmt.Sprintf("Incidencia «%s»: %s → %s", i.Title, antes.Status, i.Status)
			default:
				e.Accion = bitacora.AccionEditar
				e.Resumen = fmt.Sprintf("Actualización de la incidencia «%s»", i.Title)
			}
			return e
		},
	}
}

// crearIncidenciaEnTx es el alta, para usar sola o dentro del alta de una
// visita (las incidencias nuevas de una visita van en su misma transaccion).
func crearIncidenciaEnTx(ctx context.Context, tx pgx.Tx, autor *cuentas.Cuenta, i SchoolIssue) (SchoolIssue, error) {
	if err := ValidarIncidencia(&i); err != nil {
		return SchoolIssue{}, err
	}
	esc, err := escuelaDe(ctx, tx, i.SchoolID, true)
	if err != nil {
		return SchoolIssue{}, err
	}
	if i.VisitID != "" {
		var escuelaDeLaVisita string
		err := tx.QueryRow(ctx, `SELECT escuela_id FROM visitas WHERE id = $1`, i.VisitID).Scan(&escuelaDeLaVisita)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return SchoolIssue{}, err
		}
		if err != nil || escuelaDeLaVisita != i.SchoolID {
			return SchoolIssue{}, invalido("visitId", "la visita no existe en esta escuela")
		}
	}
	out, _, err := crear(ctx, tx, opIncidencia(esc), autor, &i)
	return out, err
}

// CrearIncidencia da de alta una incidencia suelta.
func (r *Repositorio) CrearIncidencia(ctx context.Context, autor *cuentas.Cuenta, i SchoolIssue) (SchoolIssue, error) {
	var out SchoolIssue
	err := r.enTx(ctx, func(tx pgx.Tx) (err error) {
		out, err = crearIncidenciaEnTx(ctx, tx, autor, i)
		return err
	})
	return out, err
}

// EditarIncidencia edita, incluido el cambio de estado.
func (r *Repositorio) EditarIncidencia(ctx context.Context, autor *cuentas.Cuenta, i SchoolIssue) (SchoolIssue, error) {
	if err := ValidarIncidencia(&i); err != nil {
		return SchoolIssue{}, err
	}
	var out SchoolIssue
	err := r.enTx(ctx, func(tx pgx.Tx) error {
		antes, err := leerIncidencia(ctx, tx, i.ID, false)
		if err != nil {
			return err
		}
		esc, err := escuelaDe(ctx, tx, antes.SchoolID, false)
		if err != nil {
			return err
		}
		out, err = editar(ctx, tx, opIncidencia(esc), autor, &i, func(antes SchoolIssue, i *SchoolIssue) error {
			// La escuela y la visita de origen no se cambian.
			i.SchoolID, i.VisitID = antes.SchoolID, antes.VisitID
			return nil
		})
		return err
	})
	return out, err
}

// BorrarIncidencia elimina una incidencia (como hoy en la app), con bitacora.
func (r *Repositorio) BorrarIncidencia(ctx context.Context, autor *cuentas.Cuenta, id string, version int) error {
	return r.enTx(ctx, func(tx pgx.Tx) error {
		antes, err := leerIncidencia(ctx, tx, id, true)
		if errors.Is(err, ErrNoExiste) {
			return nil // ya no esta: lo pedido ya se cumple (reenvio)
		}
		if err != nil {
			return err
		}
		if antes.Version != version {
			return &ErrConflicto{Actual: antes}
		}
		esc, err := escuelaDe(ctx, tx, antes.SchoolID, false)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM incidencias WHERE id = $1`, id); err != nil {
			return err
		}
		return bitacora.Escribir(ctx, tx, autor, bitacora.Entrada{
			Escuela: esc, Accion: bitacora.AccionBaja, Categoria: bitacora.CatCasos,
			Resumen: fmt.Sprintf("Eliminación de la incidencia «%s»", antes.Title),
			Detalle: bitacora.Diff(antes, nil, etiquetasIncidencia, ignorarAlComparar...),
		})
	})
}

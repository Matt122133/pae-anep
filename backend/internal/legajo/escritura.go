package legajo

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/Matt122133/pae-anep/backend/internal/bitacora"
	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
)

// ErrNoExiste: el registro pedido no existe.
var ErrNoExiste = errors.New("no existe")

// ErrInvalido lleva los problemas campo por campo (400).
type ErrInvalido struct{ Campos map[string]string }

func (e *ErrInvalido) Error() string { return fmt.Sprintf("datos invalidos: %v", e.Campos) }

func invalido(campo, motivo string) error {
	return &ErrInvalido{Campos: map[string]string{campo: motivo}}
}

// ErrConflicto: la version cambio en el servidor (FR-014), o un id repetido
// trae otro contenido (FR-029). Actual es lo que hay ahora.
type ErrConflicto struct{ Actual any }

func (e *ErrConflicto) Error() string { return "conflicto de version" }

// esDuplicado dice si err es una violacion de unicidad de la restriccion dada.
func esDuplicado(err error, restriccion string) bool {
	var pg *pgconn.PgError
	return errors.As(err, &pg) && pg.Code == "23505" && (restriccion == "" || pg.ConstraintName == restriccion)
}

// ignorarAlComparar son campos que no cuentan para decidir si dos versiones de
// un registro son "la misma": los pone el servidor.
var ignorarAlComparar = []string{"version", "totalVisits", "lastVisitDate", "activeIssuesCount", "visitNumber", "active"}

// mismoContenido dice si dos versiones de un registro son iguales a efectos de
// idempotencia (research D6, D7).
func mismoContenido(a, b any) bool {
	return len(bitacora.Diff(a, b, nil, ignorarAlComparar...)) == 0
}

// operaciones describe como guardar una entidad. crear y editar son iguales
// para todas; lo que cambia es esto.
type operaciones[T any] struct {
	// leer devuelve ErrNoExiste si no esta. Con bloquear, toma la fila
	// (FOR UPDATE) hasta el fin de la transaccion.
	leer func(ctx context.Context, tx pgx.Tx, id string, bloquear bool) (T, error)
	// insertar devuelve false si el id ya existia (ON CONFLICT DO NOTHING).
	insertar func(ctx context.Context, tx pgx.Tx, v *T) (bool, error)
	// actualizar escribe y suma uno a la version.
	actualizar func(ctx context.Context, tx pgx.Tx, v *T) error
	id         func(T) string
	version    func(T) int
	// entrada arma la bitacora; antes es nil en un alta.
	entrada func(antes *T, despues T, cambios []bitacora.Cambio) bitacora.Entrada
	// etiquetas traduce campos para el detalle de la bitacora.
	etiquetas map[string]string
}

// crear da de alta, de forma idempotente por id (FR-029): el mismo pedido dos
// veces devuelve el mismo registro y deja UNA entrada de bitacora; el mismo id
// con otro contenido es conflicto.
func crear[T any](ctx context.Context, tx pgx.Tx, op operaciones[T], autor *cuentas.Cuenta, v *T) (T, bool, error) {
	var cero T
	insertado, err := op.insertar(ctx, tx, v)
	if err != nil {
		return cero, false, err
	}
	if !insertado {
		existente, err := op.leer(ctx, tx, op.id(*v), false)
		if err != nil {
			return cero, false, err
		}
		if mismoContenido(existente, *v) {
			return existente, false, nil
		}
		return cero, false, &ErrConflicto{Actual: existente}
	}
	nuevo, err := op.leer(ctx, tx, op.id(*v), false)
	if err != nil {
		return cero, false, err
	}
	cambios := bitacora.Diff(nil, nuevo, op.etiquetas, ignorarAlComparar...)
	if err := bitacora.Escribir(ctx, tx, autor, op.entrada(nil, nuevo, cambios)); err != nil {
		return cero, false, err
	}
	return nuevo, true, nil
}

// editar aplica una edicion con control de version (research D7). Si la
// version no coincide pero el contenido ya es el enviado (un reenvio de algo
// que si se aplico), devuelve el actual sin error.
func editar[T any](ctx context.Context, tx pgx.Tx, op operaciones[T], autor *cuentas.Cuenta, v *T,
	ajustar func(antes T, v *T) error) (T, error) {
	var cero T
	antes, err := op.leer(ctx, tx, op.id(*v), true)
	if err != nil {
		return cero, err
	}
	if ajustar != nil {
		if err := ajustar(antes, v); err != nil {
			return cero, err
		}
	}
	if op.version(antes) != op.version(*v) {
		if mismoContenido(antes, *v) {
			return antes, nil
		}
		return cero, &ErrConflicto{Actual: antes}
	}
	cambios := bitacora.Diff(antes, *v, op.etiquetas, ignorarAlComparar...)
	if len(cambios) == 0 {
		return antes, nil
	}
	if err := op.actualizar(ctx, tx, v); err != nil {
		return cero, err
	}
	despues, err := op.leer(ctx, tx, op.id(*v), false)
	if err != nil {
		return cero, err
	}
	if err := bitacora.Escribir(ctx, tx, autor, op.entrada(&antes, despues, cambios)); err != nil {
		return cero, err
	}
	return despues, nil
}

// enTx corre f en una transaccion.
func (r *Repositorio) enTx(ctx context.Context, f func(tx pgx.Tx) error) error {
	return pgx.BeginFunc(ctx, r.pool, f)
}

// escuelaActiva lee la escuela para la bitacora y comprueba que exista y,
// si se pide, que este activa (U3: no se registran visitas en escuelas dadas
// de baja).
func escuelaDe(ctx context.Context, tx pgx.Tx, id string, exigirActiva bool) (*bitacora.Escuela, error) {
	var e bitacora.Escuela
	var activa bool
	err := tx.QueryRow(ctx, `SELECT id, numero, nombre, activo FROM escuelas WHERE id = $1`, id).
		Scan(&e.ID, &e.Numero, &e.Nombre, &activa)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, invalido("schoolId", "la escuela no existe")
	}
	if err != nil {
		return nil, err
	}
	if exigirActiva && !activa {
		return nil, invalido("schoolId", "escuela inactiva")
	}
	return &e, nil
}

package bitacora

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
	"github.com/Matt122133/pae-anep/backend/internal/testdb"
)

type ficha struct {
	Nombre  string `json:"name"`
	Kg      int    `json:"milkPowderKg"`
	Notas   string `json:"notes,omitempty"`
	Version int    `json:"version"`
}

func TestDiff(t *testing.T) {
	antes := ficha{Nombre: "Escuela 1", Kg: 12, Version: 3}
	despues := ficha{Nombre: "Escuela 1", Kg: 20, Notas: "", Version: 4}
	c := Diff(antes, despues, map[string]string{"milkPowderKg": "Leche en polvo (kg/mes)"}, "version")
	if len(c) != 1 || c[0].Field != "milkPowderKg" || c[0].FieldLabel != "Leche en polvo (kg/mes)" {
		t.Fatalf("diff = %+v", c)
	}
	if c[0].OldValue != float64(12) || c[0].NewValue != float64(20) {
		t.Errorf("valores = %v -> %v", c[0].OldValue, c[0].NewValue)
	}
	// Un alta: todo cambia desde nada; sin etiqueta usa el nombre del campo.
	alta := Diff(nil, ficha{Nombre: "N"}, nil, "version")
	if len(alta) != 2 || alta[0].FieldLabel != "milkPowderKg" {
		t.Errorf("alta = %+v", alta)
	}
}

func TestEscribirEnTransaccionYConAutorDeLaSesion(t *testing.T) {
	pool := testdb.Abrir(t)
	ctx := context.Background()
	autor, err := cuentas.Nuevo(pool).Crear(ctx, "valentina", "Valentina (prueba)", cuentas.RolEconoma, "h")
	if err != nil {
		t.Fatal(err)
	}

	entrada := Entrada{
		Escuela:   &Escuela{ID: "esc-1", Numero: 1, Nombre: "Escuela Uno"},
		Accion:    AccionEditar,
		Categoria: CatAguaYLeche,
		Resumen:   "Cambio de cuota de leche",
		Detalle:   []Cambio{{Field: "milkPowderKg", FieldLabel: "Leche", OldValue: 12, NewValue: 20}},
	}

	// Si la transaccion se revierte, la entrada no queda.
	tx, _ := pool.Begin(ctx)
	if err := Escribir(ctx, tx, autor, entrada); err != nil {
		t.Fatal(err)
	}
	tx.Rollback(ctx)
	var n int
	pool.QueryRow(ctx, `SELECT count(*) FROM bitacora`).Scan(&n)
	if n != 0 {
		t.Fatal("una entrada sobrevivio al rollback de su transaccion")
	}

	if err := pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error { return Escribir(ctx, tx, autor, entrada) }); err != nil {
		t.Fatal(err)
	}
	var cuentaID, autorNombre, etiqueta, escuela string
	pool.QueryRow(ctx, `SELECT cuenta_id, autor_nombre, etiqueta, escuela_nombre FROM bitacora`).
		Scan(&cuentaID, &autorNombre, &etiqueta, &escuela)
	if cuentaID != autor.ID || autorNombre != "Valentina (prueba)" {
		t.Errorf("autor = %s %s", cuentaID, autorNombre)
	}
	if etiqueta != "Control Bromatológico" || escuela != "Escuela Uno" {
		t.Errorf("etiqueta %q, escuela %q", etiqueta, escuela)
	}

	// Y una vez escrita, no se toca (trigger).
	if _, err := pool.Exec(ctx, `UPDATE bitacora SET resumen = 'otro'`); err == nil {
		t.Fatal("se pudo editar la bitacora")
	}
	if _, err := pool.Exec(ctx, `DELETE FROM bitacora`); err == nil {
		t.Fatal("se pudo borrar la bitacora")
	}
}

package testdb

import (
	"context"
	"testing"
)

// La base esta migrada y vacia, y el trigger de la bitacora existe.
func TestAbrirMigraYVacia(t *testing.T) {
	pool := Abrir(t)
	ctx := context.Background()

	var n int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM escuelas`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Fatalf("escuelas = %d, se esperaba vacia", n)
	}

	_, err := pool.Exec(ctx, `INSERT INTO bitacora (id, autor_nombre, accion, categoria, resumen)
		VALUES ('b1', 'Prueba', 'ADMIN_NOTE', 'Nota Administrativa', 'x')`)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `UPDATE bitacora SET resumen = 'y'`); err == nil {
		t.Fatal("el trigger deberia rechazar UPDATE sobre bitacora")
	}
	if _, err := pool.Exec(ctx, `DELETE FROM bitacora`); err == nil {
		t.Fatal("el trigger deberia rechazar DELETE sobre bitacora")
	}
}

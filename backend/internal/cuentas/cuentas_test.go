package cuentas

import (
	"context"
	"errors"
	"testing"

	"github.com/Matt122133/pae-anep/backend/internal/testdb"
)

func TestCrearYBuscar(t *testing.T) {
	r := Nuevo(testdb.Abrir(t))
	ctx := context.Background()

	c, err := r.Crear(ctx, "  Valentina ", "Valentina (prueba)", RolEconoma, "h1")
	if err != nil {
		t.Fatal(err)
	}
	if c.Usuario != "valentina" || !c.Activa {
		t.Errorf("cuenta = %+v", c)
	}
	if _, err := r.Crear(ctx, "VALENTINA", "Otra", RolEconoma, "h2"); !errors.Is(err, ErrYaExiste) {
		t.Errorf("duplicado: %v", err)
	}
	if got, _ := r.PorUsuario(ctx, "Valentina"); got == nil || got.ID != c.ID {
		t.Error("no se encontro por usuario normalizado")
	}
	if h, _ := r.HashDe(ctx, "valentina"); h != "h1" {
		t.Errorf("hash = %q", h)
	}
}

func TestValidaciones(t *testing.T) {
	r := Nuevo(testdb.Abrir(t))
	ctx := context.Background()
	if _, err := r.Crear(ctx, "a", "X", RolEconoma, "h"); !errors.Is(err, ErrUsuario) {
		t.Errorf("usuario corto: %v", err)
	}
	if _, err := r.Crear(ctx, "karina", " ", RolEconoma, "h"); !errors.Is(err, ErrNombreVacio) {
		t.Errorf("nombre vacio: %v", err)
	}
	if _, err := r.Crear(ctx, "karina", "K", "Jefa", "h"); !errors.Is(err, ErrRol) {
		t.Errorf("rol: %v", err)
	}
}

func TestDesactivarYResetearRevocanSesiones(t *testing.T) {
	pool := testdb.Abrir(t)
	r := Nuevo(pool)
	ctx := context.Background()
	c, _ := r.Crear(ctx, "karina", "Karina (prueba)", RolEconoma, "h")

	sesiones := func() int {
		var n int
		pool.QueryRow(ctx, `SELECT count(*) FROM sesiones WHERE cuenta_id = $1`, c.ID).Scan(&n)
		return n
	}
	abrir := func(id string) {
		if _, err := pool.Exec(ctx, `INSERT INTO sesiones (id, cuenta_id, token_hash) VALUES ($1, $2, $3)`,
			id, c.ID, []byte(id)); err != nil {
			t.Fatal(err)
		}
	}

	abrir("s1")
	abrir("s2")
	if err := r.CambiarHash(ctx, "karina", "nuevo"); err != nil {
		t.Fatal(err)
	}
	if n := sesiones(); n != 0 {
		t.Errorf("resetear dejo %d sesiones", n)
	}

	abrir("s3")
	if err := r.Desactivar(ctx, "karina"); err != nil {
		t.Fatal(err)
	}
	if n := sesiones(); n != 0 {
		t.Errorf("desactivar dejo %d sesiones", n)
	}
	activas, _ := r.Listar(ctx, false)
	if len(activas) != 0 {
		t.Errorf("una desactivada sigue en la lista de activas")
	}
	if err := r.Desactivar(ctx, "nadie"); !errors.Is(err, ErrNoExiste) {
		t.Errorf("inexistente: %v", err)
	}
}

package main

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"strings"
	"testing"

	"github.com/Matt122133/pae-anep/backend/internal/auth"
	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
	"github.com/Matt122133/pae-anep/backend/internal/testdb"
)

// respuestas devuelve un lector que contesta en orden.
func respuestas(rs ...string) lectorContrasena {
	return func(string) (string, error) {
		r := rs[0]
		rs = rs[1:]
		return r, nil
	}
}

func TestCicloDeVidaDeUnaCuenta(t *testing.T) {
	pool := testdb.Abrir(t)
	repo := cuentas.Nuevo(pool)
	ctx := context.Background()
	var out bytes.Buffer

	crear := []string{"crear", "-usuario", "karina", "-nombre", "Karina (prueba)", "-rol", cuentas.RolEconoma}
	if err := ejecutar(ctx, repo, crear, respuestas("contraseña uno", "contraseña uno"), &out); err != nil {
		t.Fatal(err)
	}
	verifica := func(c string) bool {
		h, _ := repo.HashDe(ctx, "karina")
		ok, _ := auth.VerificarContrasena(c, h)
		return ok
	}
	if !verifica("contraseña uno") {
		t.Fatal("la contraseña inicial no sirve")
	}

	// Una sesion abierta antes del reseteo tiene que caer.
	ses := auth.NuevasSesiones(pool, 1<<40)
	c, _ := repo.PorUsuario(ctx, "karina")
	token, _ := ses.Emitir(ctx, c.ID)

	if err := ejecutar(ctx, repo, []string{"resetear", "-usuario", "karina"},
		respuestas("contraseña dos!", "contraseña dos!"), &out); err != nil {
		t.Fatal(err)
	}
	if verifica("contraseña uno") || !verifica("contraseña dos!") {
		t.Fatal("el reseteo no cambio la contraseña")
	}
	if _, err := ses.Resolver(ctx, token); err == nil {
		t.Fatal("el reseteo dejo viva una sesion")
	}

	if err := ejecutar(ctx, repo, []string{"desactivar", "-usuario", "karina"}, nil, &out); err != nil {
		t.Fatal(err)
	}
	out.Reset()
	ejecutar(ctx, repo, []string{"listar", "-todas"}, nil, &out)
	if !strings.Contains(out.String(), "DESACTIVADA") {
		t.Fatalf("listar -todas = %q", out.String())
	}
}

func TestErroresDeEntrada(t *testing.T) {
	repo := cuentas.Nuevo(testdb.Abrir(t))
	ctx := context.Background()
	var out bytes.Buffer
	base := []string{"crear", "-usuario", "laura", "-nombre", "Laura (prueba)", "-rol", cuentas.RolNutricionista}

	if err := ejecutar(ctx, repo, base, respuestas("contraseña uno", "contraseña otra"), &out); err == nil {
		t.Error("contraseñas distintas deberian fallar")
	}
	if err := ejecutar(ctx, repo, base, respuestas("corta", "corta"), &out); err == nil {
		t.Error("contraseña corta deberia fallar")
	}
	if err := ejecutar(ctx, repo, []string{"resetear", "-usuario", "nadie"}, nil, &out); err == nil {
		t.Error("resetear inexistente deberia fallar antes de pedir contraseña")
	}
	if err := ejecutar(ctx, repo, []string{"borrar"}, nil, &out); err == nil {
		t.Error("subcomando desconocido deberia fallar")
	}
}

// Regresion: el comando real, con la contraseña y su confirmacion por un pipe
// (como en `railway run`), tiene que crear la cuenta. Corre el binario de
// verdad: inyectar el lector, como las pruebas de arriba, no reproduce el bug.
func TestCrearConContrasenaPorPipe(t *testing.T) {
	pool := testdb.Abrir(t)
	cmd := exec.Command("go", "run", ".", "crear", "-usuario", "laura", "-nombre", "Laura (prueba)",
		"-rol", cuentas.RolNutricionista)
	cmd.Env = append(os.Environ(), "DATABASE_URL="+testdb.URL())
	cmd.Stdin = strings.NewReader("contraseña de prueba\ncontraseña de prueba\n")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("%v\n%s", err, out)
	}
	if _, err := cuentas.Nuevo(pool).PorUsuario(context.Background(), "laura"); err != nil {
		t.Fatalf("la cuenta no se creo: %v", err)
	}
}

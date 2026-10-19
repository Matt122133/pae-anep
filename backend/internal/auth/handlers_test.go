package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
	"github.com/Matt122133/pae-anep/backend/internal/httpx"
	"github.com/Matt122133/pae-anep/backend/internal/testdb"
)

type entorno struct {
	h     *Handlers
	repo  *cuentas.Repositorio
	ses   *Sesiones
	yo    http.Handler
	salir http.Handler
}

func armar(t *testing.T) entorno {
	pool := testdb.Abrir(t)
	repo := cuentas.Nuevo(pool)
	ses := NuevasSesiones(pool, time.Hour)
	h := NuevosHandlers(repo, ses, NuevosLimites(pool), true)
	resolver := func(ctx context.Context, tok string) (*cuentas.Cuenta, error) { return ses.Resolver(ctx, tok) }
	return entorno{
		h: h, repo: repo, ses: ses,
		yo:    httpx.ConSesion(resolver, http.HandlerFunc(h.Yo)),
		salir: httpx.ConSesion(resolver, http.HandlerFunc(h.Salir)),
	}
}

func ingresar(e entorno, usuario, contrasena, ip string) *httptest.ResponseRecorder {
	cuerpo, _ := json.Marshal(pedidoIngreso{Usuario: usuario, Contrasena: contrasena})
	r := httptest.NewRequest(http.MethodPost, "/auth/ingresar", strings.NewReader(string(cuerpo)))
	r.Header.Set("X-Forwarded-For", ip)
	w := httptest.NewRecorder()
	e.h.Ingresar(w, r)
	return w
}

func conToken(h http.Handler, metodo, token string) int {
	r := httptest.NewRequest(metodo, "/", nil)
	r.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w.Code
}

func TestIngresoYSalida(t *testing.T) {
	e := armar(t)
	cuentaDePrueba(t, e.repo, "valentina")

	w := ingresar(e, " Valentina ", "contraseña de prueba", "1.1.1.1")
	if w.Code != http.StatusOK {
		t.Fatalf("ingreso correcto = %d %s", w.Code, w.Body)
	}
	var resp respuestaIngreso
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Token == "" || resp.Cuenta.Usuario != "valentina" {
		t.Fatalf("respuesta = %+v", resp)
	}
	if strings.Contains(w.Body.String(), "argon2") {
		t.Fatal("la respuesta filtra el hash")
	}

	if c := conToken(e.yo, http.MethodGet, resp.Token); c != 200 {
		t.Fatalf("/yo = %d", c)
	}
	if c := conToken(e.salir, http.MethodPost, resp.Token); c != 204 {
		t.Fatalf("/auth/salir = %d", c)
	}
	if c := conToken(e.yo, http.MethodGet, resp.Token); c != 401 {
		t.Fatalf("despues de salir /yo = %d", c)
	}
}

func TestMismoErrorParaTodo(t *testing.T) {
	e := armar(t)
	cuentaDePrueba(t, e.repo, "valentina")
	cuentaDePrueba(t, e.repo, "karina")
	e.repo.Desactivar(context.Background(), "karina")

	var cuerpos []string
	for _, c := range []struct{ u, p string }{
		{"nadie", "contraseña de prueba"},     // inexistente
		{"valentina", "otra contraseña mala"}, // contraseña mala
		{"karina", "contraseña de prueba"},    // desactivada (FR-006, US4)
	} {
		w := ingresar(e, c.u, c.p, "2.2.2.2")
		if w.Code != http.StatusUnauthorized {
			t.Errorf("%s: estado %d", c.u, w.Code)
		}
		cuerpos = append(cuerpos, strings.TrimSpace(w.Body.String()))
	}
	for _, c := range cuerpos[1:] {
		if c != cuerpos[0] {
			t.Errorf("respuestas distintas: %q vs %q", c, cuerpos[0])
		}
	}
}

func TestBloqueoAunConLaCorrecta(t *testing.T) {
	e := armar(t)
	cuentaDePrueba(t, e.repo, "valentina")
	for i := 0; i < MaxFallosPorUsuario; i++ {
		ingresar(e, "valentina", "mala mala mala", "3.3.3.3")
	}
	if w := ingresar(e, "valentina", "contraseña de prueba", "4.4.4.4"); w.Code != http.StatusUnauthorized {
		t.Fatalf("bloqueada deberia rechazar aun con la correcta: %d", w.Code)
	}
}

func TestCuentaDesactivadaPierdeSesionesAbiertas(t *testing.T) {
	e := armar(t)
	cuentaDePrueba(t, e.repo, "karina")
	var resp respuestaIngreso
	json.Unmarshal(ingresar(e, "karina", "contraseña de prueba", "5.5.5.5").Body.Bytes(), &resp)
	if err := e.repo.Desactivar(context.Background(), "karina"); err != nil {
		t.Fatal(err)
	}
	if c := conToken(e.yo, http.MethodGet, resp.Token); c != 401 {
		t.Fatalf("la sesion de una cuenta desactivada sigue sirviendo: %d", c)
	}
}

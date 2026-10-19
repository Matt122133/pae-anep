package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Matt122133/pae-anep/backend/internal/config"
	"github.com/Matt122133/pae-anep/backend/internal/httpx"
	"github.com/Matt122133/pae-anep/backend/internal/testdb"
)

func servidorDePrueba(t *testing.T) (http.Handler, dependencias) {
	pool := testdb.Abrir(t)
	cfg := &config.Config{OrigenesPermitidos: []string{"http://localhost:3000"}, SesionInactividad: time.Hour}
	d := armarDependencias(context.Background(), cfg, pool)
	return httpx.CORS(cfg.OrigenesPermitidos, rutas(d)), d
}

// SC-003: ninguna ruta de datos responde sin credencial valida. Recorre la
// MISMA tabla que se monta, asi que una ruta nueva queda cubierta sola.
func TestTodaRutaProtegidaExigeSesion(t *testing.T) {
	h, d := servidorDePrueba(t)
	rutas := rutasConSesion(d)
	if len(rutas) == 0 {
		t.Fatal("no hay rutas protegidas: la prueba no estaria probando nada")
	}
	for patron := range rutas {
		metodo, ruta, _ := strings.Cut(patron, " ")
		ruta = strings.NewReplacer("{id}", "x", "{tipo}", "escuela").Replace(ruta)
		for _, cabecera := range []string{"", "Bearer inventado"} {
			r := httptest.NewRequest(metodo, ruta, strings.NewReader("{}"))
			if cabecera != "" {
				r.Header.Set("Authorization", cabecera)
			}
			w := httptest.NewRecorder()
			h.ServeHTTP(w, r)
			if w.Code != http.StatusUnauthorized {
				t.Errorf("%s con %q = %d, se esperaba 401", patron, cabecera, w.Code)
			}
			if strings.Contains(w.Body.String(), "schools") {
				t.Errorf("%s filtro datos sin sesion", patron)
			}
		}
	}
}

// El preflight autoriza cada metodo que alguna ruta usa. Si falta uno, ningun
// navegador puede llamarla y las pruebas que llaman handlers directo no lo ven.
func TestCORSCubreLosMetodosDeLasRutas(t *testing.T) {
	_, d := servidorDePrueba(t)
	patrones := []string{}
	for p := range rutasConSesion(d) {
		patrones = append(patrones, p)
	}
	for p := range rutasPublicas {
		patrones = append(patrones, p)
	}
	for _, p := range patrones {
		metodo, _, _ := strings.Cut(p, " ")
		if !strings.Contains(httpx.MetodosPermitidos, metodo) {
			t.Errorf("%s usa %s, que no esta en httpx.MetodosPermitidos", p, metodo)
		}
	}
}

func TestSaludSinSesion(t *testing.T) {
	h, _ := servidorDePrueba(t)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/salud", nil))
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"ok":true`) {
		t.Fatalf("/salud = %d %s", w.Code, w.Body)
	}
}

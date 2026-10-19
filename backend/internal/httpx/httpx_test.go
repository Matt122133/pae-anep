package httpx

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

var ok = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusTeapot) })

func TestCORS(t *testing.T) {
	h := CORS([]string{"http://localhost:3000"}, ok)

	casos := []struct {
		nombre, metodo, origen string
		estado                 int
		conPermiso             bool
	}{
		{"preflight permitido", http.MethodOptions, "http://localhost:3000", 204, true},
		{"preflight ajeno", http.MethodOptions, "http://malo.example", 204, false},
		{"pedido permitido", http.MethodGet, "http://localhost:3000", 418, true},
		{"pedido ajeno", http.MethodGet, "http://malo.example", 403, false},
		{"sin origin", http.MethodGet, "", 418, false},
	}
	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			r := httptest.NewRequest(c.metodo, "/x", nil)
			if c.origen != "" {
				r.Header.Set("Origin", c.origen)
			}
			w := httptest.NewRecorder()
			h.ServeHTTP(w, r)
			if w.Code != c.estado {
				t.Errorf("estado = %d, se esperaba %d", w.Code, c.estado)
			}
			if got := w.Header().Get("Access-Control-Allow-Origin") != ""; got != c.conPermiso {
				t.Errorf("Allow-Origin presente = %v", got)
			}
			if w.Header().Get("Access-Control-Allow-Credentials") != "" {
				t.Error("no debe mandar Allow-Credentials: no hay cookies")
			}
		})
	}
}

func TestIPDelCliente(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.RemoteAddr = "10.0.0.1:5555"
	r.Header.Set("X-Forwarded-For", "6.6.6.6, 200.1.1.1")
	if got := IPDelCliente(r, true); got != "200.1.1.1" {
		t.Errorf("con proxy = %q, se esperaba la ultima entrada", got)
	}
	if got := IPDelCliente(r, false); got != "10.0.0.1" {
		t.Errorf("sin proxy = %q", got)
	}
}

type cuentaPrueba struct{ id string }

func TestConSesion(t *testing.T) {
	resolver := func(_ context.Context, token string) (cuentaPrueba, error) {
		switch token {
		case "bueno":
			return cuentaPrueba{"c1"}, nil
		case "rompe":
			return cuentaPrueba{}, errors.New("base caida")
		}
		return cuentaPrueba{}, ErrSesionInvalida
	}
	var vista string
	h := ConSesion(resolver, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, _ := CuentaDe[cuentaPrueba](r.Context())
		vista = c.id
	}))

	for cabecera, estado := range map[string]int{
		"":             401,
		"Basic x":      401,
		"Bearer malo":  401,
		"Bearer rompe": 500,
		"bearer bueno": 200,
	} {
		r := httptest.NewRequest(http.MethodGet, "/", nil)
		if cabecera != "" {
			r.Header.Set("Authorization", cabecera)
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != estado {
			t.Errorf("%q: estado = %d, se esperaba %d", cabecera, w.Code, estado)
		}
	}
	if vista != "c1" {
		t.Errorf("la cuenta no llego al handler: %q", vista)
	}
}

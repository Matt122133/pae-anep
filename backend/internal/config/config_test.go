package config

import (
	"strings"
	"testing"
	"time"
)

func entorno(m map[string]string) func(string) string {
	return func(k string) string { return m[k] }
}

func TestFaltanTodasSeNombranJuntas(t *testing.T) {
	_, err := cargarDe(entorno(nil))
	if err == nil {
		t.Fatal("se esperaba error")
	}
	for _, v := range []string{"DATABASE_URL", "CORS_ORIGENES"} {
		if !strings.Contains(err.Error(), v) {
			t.Errorf("el error no nombra %s: %v", v, err)
		}
	}
}

func TestValoresPorDefecto(t *testing.T) {
	cfg, err := cargarDe(entorno(map[string]string{
		"DATABASE_URL":  "postgres://x",
		"CORS_ORIGENES": " http://localhost:3000/ , https://matt122133.github.io ",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Puerto != "8080" {
		t.Errorf("puerto = %q", cfg.Puerto)
	}
	if cfg.SesionInactividad != 30*24*time.Hour {
		t.Errorf("inactividad = %v", cfg.SesionInactividad)
	}
	if !cfg.ConfiarProxy {
		t.Error("ConfiarProxy deberia ser true por defecto")
	}
	want := []string{"http://localhost:3000", "https://matt122133.github.io"}
	if strings.Join(cfg.OrigenesPermitidos, "|") != strings.Join(want, "|") {
		t.Errorf("origenes = %v", cfg.OrigenesPermitidos)
	}
}

func TestValoresInvalidos(t *testing.T) {
	base := map[string]string{"DATABASE_URL": "x", "CORS_ORIGENES": "http://a"}
	for k, v := range map[string]string{"SESION_INACTIVIDAD": "treinta", "CONFIAR_PROXY": "quizas"} {
		m := map[string]string{k: v}
		for bk, bv := range base {
			m[bk] = bv
		}
		if _, err := cargarDe(entorno(m)); err == nil {
			t.Errorf("%s=%q deberia fallar", k, v)
		}
	}
}

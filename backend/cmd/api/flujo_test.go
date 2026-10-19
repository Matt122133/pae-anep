package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Matt122133/pae-anep/backend/internal/auth"
	"github.com/Matt122133/pae-anep/backend/internal/config"
	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
	"github.com/Matt122133/pae-anep/backend/internal/db"
	"github.com/Matt122133/pae-anep/backend/internal/httpx"
	"github.com/Matt122133/pae-anep/backend/internal/testdb"
)

type cliente struct {
	t     *testing.T
	h     http.Handler
	token string
}

func (c cliente) pedir(metodo, ruta string, cuerpo any) (int, map[string]any) {
	c.t.Helper()
	var r *http.Request
	if cuerpo == nil {
		r = httptest.NewRequest(metodo, ruta, nil)
	} else {
		b, _ := json.Marshal(cuerpo)
		r = httptest.NewRequest(metodo, ruta, strings.NewReader(string(b)))
	}
	if c.token != "" {
		r.Header.Set("Authorization", "Bearer "+c.token)
	}
	w := httptest.NewRecorder()
	c.h.ServeHTTP(w, r)
	var out map[string]any
	json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func entorno(t *testing.T) (http.Handler, *db.Pool) {
	pool := testdb.Abrir(t)
	cfg := &config.Config{OrigenesPermitidos: []string{"http://localhost:3000"}, SesionInactividad: time.Hour}
	d := armarDependencias(context.Background(), cfg, pool)
	return httpx.CORS(cfg.OrigenesPermitidos, rutas(d)), pool
}

func ingresarComo(t *testing.T, h http.Handler, pool *db.Pool, usuario string) (cliente, string) {
	t.Helper()
	hash, _ := auth.HashContrasena("contraseña de prueba")
	c, err := cuentas.Nuevo(pool).Crear(context.Background(), usuario, usuario+" (prueba)", cuentas.RolEconoma, hash)
	if err != nil {
		t.Fatal(err)
	}
	anon := cliente{t: t, h: h}
	code, resp := anon.pedir("POST", "/auth/ingresar", map[string]string{"usuario": usuario, "contrasena": "contraseña de prueba"})
	if code != 200 {
		t.Fatalf("ingreso %s = %d", usuario, code)
	}
	return cliente{t: t, h: h, token: resp["token"].(string)}, c.ID
}

func TestFlujoCompartido(t *testing.T) {
	h, pool := entorno(t)
	a, idA := ingresarComo(t, h, pool, "valentina")
	b, _ := ingresarComo(t, h, pool, "karina")

	escuela := map[string]any{"id": "esc-1", "number": 1, "name": "Escuela ficticia", "areaType": "Rural",
		"modality": "Rural", "mealServices": map[string]bool{"lunch": true}}
	if code, r := a.pedir("POST", "/escuelas", escuela); code != 200 {
		t.Fatalf("POST /escuelas = %d %v", code, r)
	}

	// La visita dice que la hizo "otra persona" en sus textos; la bitacora
	// igual queda a nombre de la sesion (SC-002).
	visita := map[string]any{"visit": map[string]any{
		"id": "v-1", "schoolId": "esc-1", "date": "2026-10-15", "time": "11:00", "status": "Realizada",
		"visitors": []string{idA}, "dinersActualCount": 50, "menuEvaluation": "Adecuado y Variado",
		"inspectorName": "Alguien que no es Valentina", "inspectorRole": "x", "attendedBy": "Directora",
		"menuPlanned": "Arroz", "menuServed": "Arroz", "deliveryNotesChecked": true, "deliveryNotesDetails": "",
		"unauthorizedItemsFound": false, "unauthorizedItemsList": []any{},
		"hygieneChecklist": map[string]string{"coldChain": "Bien"},
		"meetingMinutes":   "", "suggestions": "", "generalObservations": "",
	}, "newIssues": []any{}}

	for i := 0; i < 2; i++ { // T046: el mismo POST dos veces
		if code, r := a.pedir("POST", "/visitas", visita); code != 200 {
			t.Fatalf("POST /visitas #%d = %d %v", i+1, code, r)
		}
	}

	// Un campo de autor en el cuerpo no se ignora en silencio: se rechaza.
	conAutor := map[string]any{"id": "n-1", "summary": "Nota", "userName": "Karina"}
	if code, _ := a.pedir("POST", "/bitacora/notas", conAutor); code != 400 {
		t.Errorf("nota con userName = %d, se esperaba 400", code)
	}

	// B ve lo que cargo A al recargar (SC-001).
	_, legajo := b.pedir("GET", "/legajo", nil)
	visitas := legajo["visits"].([]any)
	if len(visitas) != 1 {
		t.Fatalf("B ve %d visitas, se esperaba 1 (y una sola pese al doble POST)", len(visitas))
	}
	var autoresVisita []string
	for _, e := range legajo["activityLogs"].([]any) {
		m := e.(map[string]any)
		if m["actionType"] == "VISIT_LOG" {
			autoresVisita = append(autoresVisita, m["userName"].(string))
		}
	}
	if len(autoresVisita) != 1 || autoresVisita[0] != "valentina (prueba)" {
		t.Errorf("entradas de la visita: %v (se esperaba una, de valentina)", autoresVisita)
	}

	// La bitacora no se edita ni se borra por HTTP.
	for _, m := range []string{"PUT", "DELETE"} {
		if code, _ := a.pedir(m, "/bitacora/cualquiera", map[string]any{}); code != 405 {
			t.Errorf("%s /bitacora = %d, se esperaba 405", m, code)
		}
	}

	// Conflicto por HTTP: B edita con la version 1 despues de que A ya guardo.
	escuela["version"] = 1
	escuela["notes"] = "de A"
	if code, _ := a.pedir("PUT", "/escuelas/esc-1", escuela); code != 200 {
		t.Fatal("PUT de A fallo")
	}
	escuela["notes"] = "de B"
	code, r := b.pedir("PUT", "/escuelas/esc-1", escuela)
	if code != 409 || r["actual"].(map[string]any)["notes"] != "de A" {
		t.Errorf("PUT viejo de B = %d %v", code, r)
	}

	// Presencia: B ve que A tiene abierta la ficha.
	a.pedir("PUT", "/presencia/escuela/esc-1", nil)
	_, p := b.pedir("PUT", "/presencia/escuela/esc-1", nil)
	otros := p["otros"].([]any)
	if len(otros) != 1 || otros[0].(map[string]any)["nombre"] != "valentina (prueba)" {
		t.Errorf("presencia = %v", p)
	}
}

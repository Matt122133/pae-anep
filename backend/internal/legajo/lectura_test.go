package legajo

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Matt122133/pae-anep/backend/internal/db"
	"github.com/Matt122133/pae-anep/backend/internal/testdb"
)

// sembrar carga un legajo minimo y ficticio con SQL directo, para probar la
// lectura sin depender de las escrituras.
func sembrar(t *testing.T, pool *db.Pool) {
	t.Helper()
	ctx := context.Background()
	for _, sql := range []string{
		`INSERT INTO escuelas (id, numero, nombre, ambito, modalidad, leche_kg)
		 VALUES ('esc-1', 1, 'Escuela Uno (ficticia)', 'Urbana', 'Común', 12.5),
		        ('esc-2', 2, 'Escuela Dos (ficticia)', 'Rural', 'Rural', 0)`,
		`UPDATE escuelas SET activo = false WHERE id = 'esc-2'`,
		`INSERT INTO personal (id, escuela_id, nombre_completo, rol, regimen, bps, vence_carne_salud)
		 VALUES ('p-1', 'esc-1', 'Auxiliar Ficticia', 'Auxiliar de Cocina', 'DGEIP', 'Al día / Registrado', '2027-03-01')`,
		`INSERT INTO visitas (id, escuela_id, numero, fecha, estado, evaluacion_menu, contenido)
		 VALUES ('v-1', 'esc-1', 1, '2026-09-01', 'Realizada', 'Adecuado y Variado', '{"menuPlanned":"Guiso","monthlySheetsSentToEmail":"en marzo"}'),
		        ('v-2', 'esc-1', 2, '2026-10-01', 'Realizada', 'Adecuado y Variado', '{}'),
		        ('v-3', 'esc-1', 3, '2026-12-01', 'Programada', 'Adecuado y Variado', '{}'),
		        ('v-4', 'esc-2', 1, '2026-08-01', 'Realizada', 'Adecuado y Variado', '{}')`,
		`INSERT INTO incidencias (id, escuela_id, titulo, categoria, severidad, fecha_reporte, estado, fecha_resolucion)
		 VALUES ('i-1', 'esc-1', 'Heladera', 'Equipamiento/Infraestructura', 'Media', '2026-09-01', 'Pendiente', NULL),
		        ('i-2', 'esc-1', 'Carné', 'Documentación de Auxiliares', 'Leve', '2026-09-01', 'Resuelto', '2026-09-10')`,
		`INSERT INTO bitacora (id, autor_nombre, accion, categoria, resumen, escuela_id)
		 VALUES ('b-1', 'Prueba', 'ADMIN_NOTE', 'Nota Administrativa', 'Nota vieja', 'esc-1')`,
	} {
		if _, err := pool.Exec(ctx, sql); err != nil {
			t.Fatalf("sembrando: %v\n%s", err, sql)
		}
	}
}

func TestLeerConDerivados(t *testing.T) {
	pool := testdb.Abrir(t)
	sembrar(t, pool)
	l, err := NuevoRepositorio(pool).Leer(context.Background(), false)
	if err != nil {
		t.Fatal(err)
	}

	if len(l.Schools) != 1 || l.Schools[0].ID != "esc-1" {
		t.Fatalf("sin inactivos deberia venir solo esc-1: %+v", l.Schools)
	}
	s := l.Schools[0]
	// Programada no cuenta; resuelta no cuenta.
	if s.TotalVisits != 2 || s.LastVisitDate != "2026-10-01" || s.ActiveIssuesCount != 1 {
		t.Errorf("derivados = visitas %d, ultima %q, activas %d", s.TotalVisits, s.LastVisitDate, s.ActiveIssuesCount)
	}
	if s.MilkPowderKg != 12.5 || !s.Active || s.Version != 1 {
		t.Errorf("escuela = %+v", s)
	}
	// La visita de la escuela inactiva sigue viniendo (FR-015).
	if len(l.Visits) != 4 {
		t.Errorf("visitas = %d, se esperaban 4 (incluida la de la escuela inactiva)", len(l.Visits))
	}
	if l.Staff[0].HealthCardValidUntil != "2027-03-01" {
		t.Errorf("fecha de carné = %q", l.Staff[0].HealthCardValidUntil)
	}
	if len(l.ActivityLogs) != 1 || l.Cuentas == nil {
		t.Errorf("bitacora %d, cuentas %v", len(l.ActivityLogs), l.Cuentas)
	}

	todo, _ := NuevoRepositorio(pool).Leer(context.Background(), true)
	if len(todo.Schools) != 2 || todo.Schools[1].Active {
		t.Errorf("con inactivos: %+v", todo.Schools)
	}
}

func TestGetLegajoFormaJSON(t *testing.T) {
	pool := testdb.Abrir(t)
	sembrar(t, pool)
	w := httptest.NewRecorder()
	NuevosHandlers(NuevoRepositorio(pool)).GetLegajo(w, httptest.NewRequest(http.MethodGet, "/legajo", nil))
	if w.Code != 200 {
		t.Fatalf("estado %d: %s", w.Code, w.Body)
	}
	var crudo map[string][]map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &crudo); err != nil {
		t.Fatal(err)
	}
	for _, k := range []string{"schools", "staff", "visits", "issues", "activityLogs", "cuentas"} {
		if _, ok := crudo[k]; !ok {
			t.Errorf("falta la clave %q (forma de DatabaseState)", k)
		}
	}
	// El contenido jsonb sale plano, con los nombres del frontend.
	var v1 map[string]any
	for _, v := range crudo["visits"] {
		if v["id"] == "v-1" {
			v1 = v
		}
	}
	if v1["menuPlanned"] != "Guiso" || v1["schoolId"] != "esc-1" || v1["monthlySheetsSentToEmail"] != "en marzo" {
		t.Errorf("visita v-1 = %v", v1)
	}
	if _, hay := v1["contenido"]; hay {
		t.Error("la columna contenido no deberia aparecer como tal")
	}
}

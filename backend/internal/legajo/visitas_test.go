package legajo

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"

	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
	"github.com/Matt122133/pae-anep/backend/internal/db"
	"github.com/Matt122133/pae-anep/backend/internal/testdb"
)

func visitaFicticia(id, escuela string, autor *cuentas.Cuenta) Visit {
	v := Visit{ID: id, SchoolID: escuela, Date: "2026-10-15", Time: "11:30", Status: "Realizada",
		Visitors: []string{autor.ID}, DinersActualCount: 80, MenuEvaluation: "Adecuado y Variado"}
	v.MenuPlanned, v.MenuServed = "Guiso de lentejas", "Guiso de lentejas"
	v.HygieneChecklist = HygieneChecklist{ColdChain: "Bien", Cleanliness: "Regular"}
	return v
}

func preparar(t *testing.T) (*Repositorio, *cuentas.Cuenta, context.Context, *db.Pool) {
	pool := testdb.Abrir(t)
	r := NuevoRepositorio(pool)
	ctx := context.Background()
	a := autorDePrueba(t, pool, "valentina")
	if _, err := r.CrearEscuela(ctx, a, escuelaFicticia("esc-1", 1)); err != nil {
		t.Fatal(err)
	}
	return r, a, ctx, pool
}

func TestVisitaConIncidenciasEnUnaTransaccion(t *testing.T) {
	r, a, ctx, pool := preparar(t)
	alta := AltaVisita{
		Visit: visitaFicticia("v-1", "esc-1", a),
		NewIssues: []SchoolIssue{{ID: "i-1", Title: "Heladera sin frío", Category: "Equipamiento/Infraestructura",
			Severity: "Crítica"}},
	}
	v, incs, err := r.CrearVisita(ctx, a, alta)
	if err != nil {
		t.Fatal(err)
	}
	if v.VisitNumber != 1 || len(incs) != 1 || incs[0].VisitID != "v-1" || incs[0].Status != "Pendiente" {
		t.Fatalf("visita %+v, incidencias %+v", v, incs)
	}
	if incs[0].ReportedDate != "2026-10-15" {
		t.Errorf("la incidencia no tomo la fecha de la visita: %q", incs[0].ReportedDate)
	}
	// Reenvio identico (respuesta perdida): nada nuevo.
	antes := entradasBitacora(t, pool)
	if _, _, err := r.CrearVisita(ctx, a, alta); err != nil {
		t.Fatalf("reenvio: %v", err)
	}
	if entradasBitacora(t, pool) != antes {
		t.Error("el reenvio dejo entradas nuevas")
	}
	// Una incidencia invalida tira abajo toda la visita, y el error dice cual.
	mala := AltaVisita{Visit: visitaFicticia("v-2", "esc-1", a),
		NewIssues: []SchoolIssue{{ID: "i-2", Title: "x", Category: "Inventada", Severity: "Leve"}}}
	var inv *ErrInvalido
	if _, _, err := r.CrearVisita(ctx, a, mala); !errors.As(err, &inv) || inv.Campos["newIssues[0].category"] == "" {
		t.Fatalf("incidencia invalida: %v", err)
	}
	var n int
	pool.QueryRow(ctx, `SELECT count(*) FROM visitas WHERE id = 'v-2'`).Scan(&n)
	if n != 0 {
		t.Error("la visita quedo guardada aunque su incidencia era invalida")
	}
}

func TestNumerosCorrelativosConAltasSimultaneas(t *testing.T) {
	r, a, ctx, _ := preparar(t)
	var wg sync.WaitGroup
	errs := make(chan error, 6)
	for i := 0; i < 6; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, _, err := r.CrearVisita(ctx, a, AltaVisita{Visit: visitaFicticia(fmt.Sprintf("v-%d", i), "esc-1", a)})
			errs <- err
		}(i)
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatalf("alta simultanea: %v", err)
		}
	}
	l, _ := r.Leer(ctx, false)
	vistos := map[int]bool{}
	for _, v := range l.Visits {
		vistos[v.VisitNumber] = true
	}
	for n := 1; n <= 6; n++ {
		if !vistos[n] {
			t.Errorf("falta el numero %d: %v", n, vistos)
		}
	}
}

func TestVisitaReglas(t *testing.T) {
	r, a, ctx, _ := preparar(t)
	var inv *ErrInvalido

	// Visitante que no es cuenta.
	v := visitaFicticia("v-1", "esc-1", a)
	v.Visitors = []string{"alguien-inventado"}
	if _, _, err := r.CrearVisita(ctx, a, AltaVisita{Visit: v}); !errors.As(err, &inv) || inv.Campos["visitors"] == "" {
		t.Errorf("visitante inventado: %v", err)
	}

	// Programada → Realizada sí; Realizada no se borra ni vuelve atrás.
	prog := visitaFicticia("v-2", "esc-1", a)
	prog.Status = "Programada"
	p, _, err := r.CrearVisita(ctx, a, AltaVisita{Visit: prog})
	if err != nil {
		t.Fatal(err)
	}
	p.Status = "Realizada"
	p.VisitNumber = 99 // el servidor lo ignora
	hecha, err := r.EditarVisita(ctx, a, p)
	if err != nil || hecha.Status != "Realizada" || hecha.VisitNumber != 1 {
		t.Fatalf("programada → realizada: %v %+v", err, hecha)
	}
	hecha.Status = "Programada"
	if _, err := r.EditarVisita(ctx, a, hecha); !errors.As(err, &inv) {
		t.Errorf("realizada → programada deberia fallar: %v", err)
	}
	if err := r.BorrarVisita(ctx, a, hecha.ID, hecha.Version); !errors.As(err, &inv) {
		t.Errorf("borrar una realizada deberia fallar: %v", err)
	}

	// Escuela inactiva (U3).
	s, _ := r.CrearEscuela(ctx, a, escuelaFicticia("esc-2", 2))
	r.CambiarActivaEscuela(ctx, a, s.ID, s.Version, false)
	if _, _, err := r.CrearVisita(ctx, a, AltaVisita{Visit: visitaFicticia("v-3", "esc-2", a)}); !errors.As(err, &inv) ||
		inv.Campos["schoolId"] != "escuela inactiva" {
		t.Errorf("visita a escuela inactiva: %v", err)
	}
}

func TestIncidenciaCambioDeEstado(t *testing.T) {
	r, a, ctx, pool := preparar(t)
	i, err := r.CrearIncidencia(ctx, a, SchoolIssue{ID: "i-1", SchoolID: "esc-1", Title: "Carné vencido",
		Category: "Documentación de Auxiliares", Severity: "Media", Status: "Pendiente", ReportedDate: "2026-10-01"})
	if err != nil {
		t.Fatal(err)
	}
	i.Status = "Resuelto"
	res, err := r.EditarIncidencia(ctx, a, i)
	if err != nil || res.ResolvedDate == "" {
		t.Fatalf("resolver: %v %+v", err, res)
	}
	var accion string
	pool.QueryRow(ctx, `SELECT accion FROM bitacora ORDER BY momento DESC LIMIT 1`).Scan(&accion)
	if accion != "STATUS_CHANGE" {
		t.Errorf("accion = %q, se esperaba STATUS_CHANGE", accion)
	}
	res.Status = "Pendiente"
	reab, _ := r.EditarIncidencia(ctx, a, res)
	if reab.ResolvedDate != "" {
		t.Error("reabrir no limpio la fecha de resolucion")
	}
	if err := r.BorrarIncidencia(ctx, a, "i-1", reab.Version); err != nil {
		t.Fatal(err)
	}
	if err := r.BorrarIncidencia(ctx, a, "i-1", reab.Version); err != nil {
		t.Errorf("borrar dos veces (reenvio) deberia ser no-op: %v", err)
	}
}

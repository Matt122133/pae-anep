package main

import (
	"bytes"
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
	"github.com/Matt122133/pae-anep/backend/internal/importacion"
	"github.com/Matt122133/pae-anep/backend/internal/legajo"
	"github.com/Matt122133/pae-anep/backend/internal/testdb"
)

func TestImportarEjemplo(t *testing.T) {
	pool := testdb.Abrir(t)
	ctx := context.Background()
	val, err := cuentas.Nuevo(pool).Crear(ctx, "valentina", "Valentina (prueba)", cuentas.RolEconoma, "h")
	if err != nil {
		t.Fatal(err)
	}

	var out bytes.Buffer
	if err := correr(ctx, pool, "testdata/ejemplo.json", false, false, &out); err != nil {
		t.Fatalf("%v\n%s", err, out.String())
	}
	if !strings.Contains(out.String(), "escuelas 3 · personal 2 · visitas 2 · incidencias 1 · bitácora 1") {
		t.Errorf("informe = %s", out.String())
	}

	l, err := legajo.NuevoRepositorio(pool).Leer(ctx, false)
	if err != nil {
		t.Fatal(err)
	}
	var visitaVal, visitaHist legajo.Visit
	for _, v := range l.Visits {
		switch v.ID {
		case "visit-901-1":
			visitaVal = v
		case "visit-902-1":
			visitaHist = v
		}
	}
	if len(visitaVal.Visitors) != 1 || visitaVal.Visitors[0] != val.ID {
		t.Errorf("el usuario 'valentina' no se asocio a su cuenta: %v", visitaVal.Visitors)
	}
	if visitaHist.Visitors[0] != "persona-historica" || visitaHist.VisitNumber != 1 {
		t.Errorf("visita historica = %+v", visitaHist)
	}
	// Los derivados se recalculan: el 99 del archivo no cuenta.
	for _, s := range l.Schools {
		if s.ID == "esc-901" && (s.TotalVisits != 1 || s.ActiveIssuesCount != 0) {
			t.Errorf("derivados de esc-901 = %d visitas, %d incidencias", s.TotalVisits, s.ActiveIssuesCount)
		}
		if s.ID == "esc-903" && s.Modality != "Escuelas de Educación Especial" {
			t.Errorf("alias de modalidad no aplicado: %q", s.Modality)
		}
	}
	var importadas, eventos int
	pool.QueryRow(ctx, `SELECT count(*) FILTER (WHERE importada), count(*) FILTER (WHERE accion = 'IMPORT') FROM bitacora`).
		Scan(&importadas, &eventos)
	if importadas != 1 || eventos != 1 {
		t.Errorf("bitacora: %d importadas, %d eventos IMPORT", importadas, eventos)
	}

	// Una segunda vez, sin -agregar: se niega.
	if err := correr(ctx, pool, "testdata/ejemplo.json", false, false, &out); err == nil {
		t.Error("importar sobre una base con datos sin -agregar deberia fallar")
	}
	// Con -agregar, los ids repetidos son errores y no se carga nada.
	out.Reset()
	if err := correr(ctx, pool, "testdata/ejemplo.json", false, true, &out); !errors.Is(err, errHayErrores) ||
		!strings.Contains(out.String(), "ya existe en la base") {
		t.Errorf("-agregar con ids repetidos: %v\n%s", err, out.String())
	}
}

func TestImportarConErroresNoCargaNada(t *testing.T) {
	pool := testdb.Abrir(t)
	ctx := context.Background()
	var out bytes.Buffer
	err := correr(ctx, pool, "testdata/con_errores.json", false, false, &out)
	if !errors.Is(err, errHayErrores) {
		t.Fatalf("se esperaba errHayErrores: %v", err)
	}
	for _, esperado := range []string{
		`staff[1].schoolId: escuela "esc-999" no existe`,
		"schools[2].number: el número 901 ya lo usa schools[0]",
		"issues[0].severity: valor no permitido: Gravísima",
		"visits[1].date: fecha invalida",
	} {
		if !strings.Contains(out.String(), esperado) {
			t.Errorf("falta el error %q en:\n%s", esperado, out.String())
		}
	}
	var n int
	pool.QueryRow(ctx, `SELECT count(*) FROM escuelas`).Scan(&n)
	if n != 0 {
		t.Errorf("se cargaron %d escuelas con un archivo con errores", n)
	}
}

func TestValidarSoloNoEscribe(t *testing.T) {
	pool := testdb.Abrir(t)
	var out bytes.Buffer
	if err := correr(context.Background(), pool, "testdata/ejemplo.json", true, false, &out); err != nil {
		t.Fatal(err)
	}
	var n int
	pool.QueryRow(context.Background(), `SELECT count(*) FROM escuelas`).Scan(&n)
	if n != 0 {
		t.Error("-validar escribio en la base")
	}
}

func TestCamposDesconocidosSonAvisos(t *testing.T) {
	res := importacion.Validar([]byte(`{"schools":[{"id":"e1","number":1,"name":"X","areaType":"Rural",
		"modality":"Rural","nmae":"typo"}]}`), importacion.Existentes{}, nil)
	if len(res.Errores) != 0 || len(res.Avisos) != 1 || !strings.Contains(res.Avisos[0], "schools[0].nmae") {
		t.Errorf("errores %v, avisos %v", res.Errores, res.Avisos)
	}
}

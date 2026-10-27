package legajo

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
	"github.com/Matt122133/pae-anep/backend/internal/db"
	"github.com/Matt122133/pae-anep/backend/internal/testdb"
)

func autorDePrueba(t *testing.T, pool *db.Pool, usuario string) *cuentas.Cuenta {
	t.Helper()
	c, err := cuentas.Nuevo(pool).Crear(context.Background(), usuario, usuario+" (prueba)", cuentas.RolEconoma, "h")
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func entradasBitacora(t *testing.T, pool *db.Pool) int {
	var n int
	pool.QueryRow(context.Background(), `SELECT count(*) FROM bitacora`).Scan(&n)
	return n
}

func escuelaFicticia(id string, numero int) School {
	return School{ID: id, Number: numero, Name: "Escuela ficticia", AreaType: "Rural", Modality: "Rural", MilkPowderKg: 12}
}

func TestEscuelaCrearEsIdempotente(t *testing.T) {
	pool := testdb.Abrir(t)
	r := NuevoRepositorio(pool)
	ctx := context.Background()
	autor := autorDePrueba(t, pool, "valentina")

	s, err := r.CrearEscuela(ctx, autor, escuelaFicticia("esc-9", 9))
	if err != nil {
		t.Fatal(err)
	}
	if s.Version != 1 || !s.Active || s.Department != "Tacuarembó" {
		t.Errorf("escuela creada = %+v", s)
	}
	// El mismo pedido dos veces: un registro, una entrada (FR-029).
	if _, err := r.CrearEscuela(ctx, autor, escuelaFicticia("esc-9", 9)); err != nil {
		t.Fatalf("reenvio identico: %v", err)
	}
	if n := entradasBitacora(t, pool); n != 1 {
		t.Errorf("entradas = %d, se esperaba 1", n)
	}
	// Mismo id, otro contenido: conflicto.
	otra := escuelaFicticia("esc-9", 9)
	otra.Name = "Otro nombre"
	var conflicto *ErrConflicto
	if _, err := r.CrearEscuela(ctx, autor, otra); !errors.As(err, &conflicto) {
		t.Errorf("mismo id con otro contenido: %v", err)
	}
	// Otro id con el mismo numero: invalido en el campo number.
	var inv *ErrInvalido
	if _, err := r.CrearEscuela(ctx, autor, escuelaFicticia("esc-otra", 9)); !errors.As(err, &inv) || inv.Campos["number"] == "" {
		t.Errorf("numero repetido: %v", err)
	}
}

func TestEscuelaEditarConVersion(t *testing.T) {
	pool := testdb.Abrir(t)
	r := NuevoRepositorio(pool)
	ctx := context.Background()
	a := autorDePrueba(t, pool, "valentina")
	b := autorDePrueba(t, pool, "karina")

	s, _ := r.CrearEscuela(ctx, a, escuelaFicticia("esc-1", 1))

	// A y B cargaron la version 1. B guarda primero.
	deB := s
	deB.MilkPowderKg = 20
	s2, err := r.EditarEscuela(ctx, b, deB)
	if err != nil || s2.Version != 2 {
		t.Fatalf("edicion de B: %v %+v", err, s2)
	}
	// A guarda despues con la version 1 y otro cambio: conflicto, no pisa.
	deA := s
	deA.Name = "Nombre de A"
	var conflicto *ErrConflicto
	if _, err := r.EditarEscuela(ctx, a, deA); !errors.As(err, &conflicto) {
		t.Fatalf("A deberia recibir conflicto: %v", err)
	}
	if conflicto.Actual.(School).MilkPowderKg != 20 {
		t.Error("el conflicto no trae la version actual")
	}
	// B reenvia lo mismo con la version vieja (respuesta perdida): no es error.
	if got, err := r.EditarEscuela(ctx, b, deB); err != nil || got.Version != 2 {
		t.Errorf("reenvio de algo ya aplicado: %v %+v", err, got)
	}

	// La entrada de B dice B, es de "Agua y Leche" y trae el valor anterior real.
	var autor, categoria string
	var detalle []byte
	pool.QueryRow(ctx, `SELECT autor_nombre, categoria, detalle FROM bitacora
		WHERE accion = 'UPDATE'`).Scan(&autor, &categoria, &detalle)
	if autor != "karina (prueba)" || categoria != "Agua y Leche" {
		t.Errorf("entrada = %s / %s", autor, categoria)
	}
	if string(detalle) == "" || !contiene(string(detalle), `"oldValue": 12`) && !contiene(string(detalle), `"oldValue":12`) {
		t.Errorf("detalle sin el valor anterior de la base: %s", detalle)
	}
}

func TestEscuelaBajaLogica(t *testing.T) {
	pool := testdb.Abrir(t)
	r := NuevoRepositorio(pool)
	ctx := context.Background()
	a := autorDePrueba(t, pool, "valentina")
	s, _ := r.CrearEscuela(ctx, a, escuelaFicticia("esc-1", 1))

	baja, err := r.CambiarActivaEscuela(ctx, a, s.ID, s.Version, false)
	if err != nil || baja.Active {
		t.Fatalf("baja: %v %+v", err, baja)
	}
	l, _ := r.Leer(ctx, false)
	if len(l.Schools) != 0 {
		t.Error("una escuela dada de baja sigue en el listado")
	}
	l, _ = r.Leer(ctx, true)
	if len(l.Schools) != 1 {
		t.Error("la escuela dada de baja no es consultable")
	}
	if _, err := r.CambiarActivaEscuela(ctx, a, s.ID, baja.Version, true); err != nil {
		t.Errorf("reactivar: %v", err)
	}
}

func TestEscuelaValidacion(t *testing.T) {
	r := NuevoRepositorio(testdb.Abrir(t))
	_, err := r.CrearEscuela(context.Background(), &cuentas.Cuenta{}, School{ID: "x", AreaType: "Lunar", Modality: "Común"})
	var inv *ErrInvalido
	if !errors.As(err, &inv) {
		t.Fatalf("se esperaba ErrInvalido: %v", err)
	}
	for _, campo := range []string{"number", "name", "areaType"} {
		if inv.Campos[campo] == "" {
			t.Errorf("falta el error de %s: %v", campo, inv.Campos)
		}
	}
}

func TestEscuelaProveedoresAlta(t *testing.T) {
	pool := testdb.Abrir(t)
	r := NuevoRepositorio(pool)
	ctx := context.Background()
	a := autorDePrueba(t, pool, "valentina")

	con := escuelaFicticia("esc-1", 1)
	con.Providers = []string{" Proveedor Uno ", "Proveedor Dos"}
	s, err := r.CrearEscuela(ctx, a, con)
	if err != nil {
		t.Fatal(err)
	}
	if got := strings.Join(s.Providers, "|"); got != "Proveedor Uno|Proveedor Dos" {
		t.Errorf("proveedores guardados = %q (recortados y en orden)", got)
	}

	// Sin el campo: queda [] y el reenvio identico no es conflicto (R3).
	sin, err := r.CrearEscuela(ctx, a, escuelaFicticia("esc-2", 2))
	if err != nil || sin.Providers == nil || len(sin.Providers) != 0 {
		t.Fatalf("alta sin proveedores: %v %#v", err, sin.Providers)
	}
	if _, err := r.CrearEscuela(ctx, a, escuelaFicticia("esc-2", 2)); err != nil {
		t.Errorf("reenvio del alta sin proveedores: %v", err)
	}

	l, _ := r.Leer(ctx, false)
	for _, e := range l.Schools {
		if e.Providers == nil {
			t.Errorf("la lectura de %s trae providers nil", e.ID)
		}
	}
}

func TestEscuelaProveedoresEdicion(t *testing.T) {
	pool := testdb.Abrir(t)
	r := NuevoRepositorio(pool)
	ctx := context.Background()
	a := autorDePrueba(t, pool, "valentina")

	inicial := escuelaFicticia("esc-1", 1)
	inicial.Providers = []string{"Proveedor Uno", "Proveedor Dos"}
	s, _ := r.CrearEscuela(ctx, a, inicial)

	// Quitar uno: queda el otro y la bitacora lo registra.
	s.Providers = []string{"Proveedor Dos"}
	s, err := r.EditarEscuela(ctx, a, s)
	if err != nil || strings.Join(s.Providers, "|") != "Proveedor Dos" {
		t.Fatalf("quitar uno: %v %v", err, s.Providers)
	}
	var detalle []byte
	pool.QueryRow(ctx, `SELECT detalle FROM bitacora WHERE accion = 'UPDATE'`).Scan(&detalle)
	if !contiene(string(detalle), `"providers"`) || !contiene(string(detalle), "Proveedores") {
		t.Errorf("la bitacora no registra el cambio de proveedores: %s", detalle)
	}

	// Un PUT sin el campo (borrador viejo) cambia otra cosa y conserva la lista (FR-006).
	viejo := s
	viejo.Providers = nil
	viejo.Notes = "nota nueva"
	s, err = r.EditarEscuela(ctx, a, viejo)
	if err != nil || strings.Join(s.Providers, "|") != "Proveedor Dos" || s.Notes != "nota nueva" {
		t.Fatalf("edicion sin el campo: %v %+v", err, s)
	}

	// [] explicito vacia la lista.
	s.Providers = []string{}
	s, err = r.EditarEscuela(ctx, a, s)
	if err != nil || len(s.Providers) != 0 {
		t.Errorf("vaciar la lista: %v %v", err, s.Providers)
	}
}

func TestEscuelaProveedoresValidacion(t *testing.T) {
	r := NuevoRepositorio(testdb.Abrir(t))
	casos := map[string][]string{
		"vacio":        {""},
		"solo espacio": {"   "},
		"largo":        {strings.Repeat("ñ", 121)},
		"repetido":     {"Proveedor Uno", " proveedor uno"},
	}
	for nombre, lista := range casos {
		s := escuelaFicticia("esc-1", 1)
		s.Providers = lista
		_, err := r.CrearEscuela(context.Background(), &cuentas.Cuenta{}, s)
		var inv *ErrInvalido
		if !errors.As(err, &inv) || inv.Campos["providers"] == "" {
			t.Errorf("%s: se esperaba error en providers, fue %v", nombre, err)
		}
	}
	// 120 caracteres (no bytes) entra.
	s := escuelaFicticia("esc-1", 1)
	s.Providers = []string{strings.Repeat("ñ", 120)}
	if err := ValidarEscuela(&s); err != nil {
		t.Errorf("120 caracteres: %v", err)
	}
}

func contiene(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

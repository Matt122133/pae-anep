package legajo

import (
	"context"
	"errors"
	"testing"

	"github.com/Matt122133/pae-anep/backend/internal/testdb"
)

func auxiliarFicticia(id, escuela string) StaffMember {
	return StaffMember{ID: id, SchoolID: escuela, FullName: "Auxiliar Ficticia", Role: "Auxiliar de Cocina",
		InstitutionType: "DGEIP", SocialSecurityStatus: "Al día / Registrado", HealthCardValidUntil: "2027-01-31"}
}

func TestPersonalAltaEdicionYBaja(t *testing.T) {
	pool := testdb.Abrir(t)
	r := NuevoRepositorio(pool)
	ctx := context.Background()
	a := autorDePrueba(t, pool, "valentina")
	r.CrearEscuela(ctx, a, escuelaFicticia("esc-1", 1))

	p, err := r.CrearPersonal(ctx, a, auxiliarFicticia("p-1", "esc-1"))
	if err != nil || p.HealthCardValidUntil != "2027-01-31" || !p.Active {
		t.Fatalf("alta: %v %+v", err, p)
	}
	p.HealthCardValidUntil = "2028-01-31"
	p2, err := r.EditarPersonal(ctx, a, p)
	if err != nil || p2.Version != 2 {
		t.Fatalf("edicion: %v %+v", err, p2)
	}
	// Cambiar de escuela por edicion no se permite: es traslado.
	p2.SchoolID = "esc-2"
	var inv *ErrInvalido
	if _, err := r.EditarPersonal(ctx, a, p2); !errors.As(err, &inv) || inv.Campos["schoolId"] == "" {
		t.Errorf("cambiar escuela editando: %v", err)
	}
	baja, err := r.CambiarActivoPersonal(ctx, a, "p-1", 2, false)
	if err != nil || baja.Active {
		t.Errorf("baja: %v", err)
	}
	if l, _ := r.Leer(ctx, false); len(l.Staff) != 0 {
		t.Error("una persona dada de baja sigue en el listado")
	}
}

func TestTrasladoConservaHistorial(t *testing.T) {
	pool := testdb.Abrir(t)
	r := NuevoRepositorio(pool)
	ctx := context.Background()
	a := autorDePrueba(t, pool, "valentina")
	r.CrearEscuela(ctx, a, escuelaFicticia("esc-1", 1))
	r.CrearEscuela(ctx, a, escuelaFicticia("esc-2", 2))
	p, _ := r.CrearPersonal(ctx, a, auxiliarFicticia("p-1", "esc-1"))

	movida, err := r.Trasladar(ctx, a, "p-1", Traslado{SchoolID: "esc-2", Fecha: "2026-11-01", Version: p.Version})
	if err != nil || movida.SchoolID != "esc-2" || movida.ID != "p-1" {
		t.Fatalf("traslado: %v %+v", err, movida)
	}

	var asignaciones, vigentes int
	pool.QueryRow(ctx, `SELECT count(*), count(*) FILTER (WHERE hasta IS NULL)
		FROM personal_asignaciones WHERE personal_id = 'p-1'`).Scan(&asignaciones, &vigentes)
	if asignaciones != 2 || vigentes != 1 {
		t.Errorf("asignaciones = %d (vigentes %d), se esperaban 2 (1)", asignaciones, vigentes)
	}
	var enOrigen, enDestino int
	pool.QueryRow(ctx, `SELECT count(*) FILTER (WHERE escuela_id = 'esc-1' AND resumen LIKE 'Traslado%'),
		count(*) FILTER (WHERE escuela_id = 'esc-2' AND resumen LIKE 'Traslado%') FROM bitacora`).Scan(&enOrigen, &enDestino)
	if enOrigen != 1 || enDestino != 1 {
		t.Errorf("bitacora del traslado: origen %d, destino %d", enOrigen, enDestino)
	}
	var personas int
	pool.QueryRow(ctx, `SELECT count(*) FROM personal`).Scan(&personas)
	if personas != 1 {
		t.Errorf("el traslado creo otra persona: %d", personas)
	}
}

func TestTrasladoAJardinNombraPorTipo(t *testing.T) {
	pool := testdb.Abrir(t)
	r := NuevoRepositorio(pool)
	ctx := context.Background()
	a := autorDePrueba(t, pool, "valentina")
	r.CrearEscuela(ctx, a, escuelaFicticia("esc-1", 1))
	jardin := escuelaFicticia("jar-7", 7)
	jardin.SchoolType = "Jardín"
	r.CrearEscuela(ctx, a, jardin)
	p, _ := r.CrearPersonal(ctx, a, auxiliarFicticia("p-1", "esc-1"))

	if _, err := r.Trasladar(ctx, a, "p-1", Traslado{SchoolID: "jar-7", Fecha: "2026-11-01", Version: p.Version}); err != nil {
		t.Fatal(err)
	}
	var resumen string
	var detalle []byte
	pool.QueryRow(ctx, `SELECT resumen, detalle FROM bitacora WHERE resumen LIKE 'Traslado%' LIMIT 1`).Scan(&resumen, &detalle)
	if !contiene(resumen, "escuela N° 1 → jardín N° 7") {
		t.Errorf("resumen del traslado = %q", resumen)
	}
	if !contiene(string(detalle), "Escuela N° 1") || !contiene(string(detalle), "Jardín N° 7") {
		t.Errorf("detalle del traslado = %s", detalle)
	}
}

func TestPersonalEnEscuelaInactiva(t *testing.T) {
	pool := testdb.Abrir(t)
	r := NuevoRepositorio(pool)
	ctx := context.Background()
	a := autorDePrueba(t, pool, "valentina")
	s, _ := r.CrearEscuela(ctx, a, escuelaFicticia("esc-1", 1))
	r.CambiarActivaEscuela(ctx, a, s.ID, s.Version, false)
	var inv *ErrInvalido
	if _, err := r.CrearPersonal(ctx, a, auxiliarFicticia("p-1", "esc-1")); !errors.As(err, &inv) {
		t.Errorf("alta en escuela inactiva: %v", err)
	}
}

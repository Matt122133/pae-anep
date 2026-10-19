package presencia

import (
	"testing"
	"time"

	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
)

func TestPresencia(t *testing.T) {
	r := Nuevo()
	reloj := time.Now()
	r.ahora = func() time.Time { return reloj }
	a := &cuentas.Cuenta{ID: "a", Nombre: "Valentina"}
	b := &cuentas.Cuenta{ID: "b", Nombre: "Karina"}

	if otros := r.Latir("personal", "p-1", a); len(otros) != 0 {
		t.Fatalf("sola en la ficha: %v", otros)
	}
	if otros := r.Latir("personal", "p-1", b); len(otros) != 1 || otros[0] != "Valentina" {
		t.Fatalf("B deberia ver a A: %v", otros)
	}
	if otros := r.Latir("personal", "p-2", b); len(otros) != 0 {
		t.Fatalf("otra ficha no comparte presencia: %v", otros)
	}

	// A deja de latir: pasado el vencimiento, B ya no la ve.
	reloj = reloj.Add(Vencimiento + time.Second)
	if otros := r.Latir("personal", "p-1", b); len(otros) != 0 {
		t.Fatalf("una presencia vencida sigue apareciendo: %v", otros)
	}

	r.Latir("personal", "p-1", a)
	r.Salir("personal", "p-1", a)
	if otros := r.Latir("personal", "p-1", b); len(otros) != 0 {
		t.Fatalf("despues de salir sigue apareciendo: %v", otros)
	}

	reloj = reloj.Add(2 * Vencimiento)
	r.Limpiar()
	if len(r.fichas) != 0 {
		t.Errorf("limpiar dejo %d fichas", len(r.fichas))
	}
}

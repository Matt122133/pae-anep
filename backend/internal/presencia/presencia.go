// Package presencia avisa quien mas tiene abierta una ficha en edicion
// (FR-034): "Karina esta editando esta ficha".
//
// En memoria y no en la base, a proposito (research D8): es informacion de
// cortesia y efimera; perderla en un reinicio no importa, y Railway corre una
// sola replica. Si algun dia hay dos, el aviso se vuelve parcial, no falso.
package presencia

import (
	"net/http"
	"sync"
	"time"

	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
	"github.com/Matt122133/pae-anep/backend/internal/httpx"
)

// Vencimiento: sin latido en este tiempo, la presencia se descarta. La app late
// cada 20 s, asi que un minuto tolera dos latidos perdidos.
const Vencimiento = time.Minute

var tiposValidos = map[string]bool{"escuela": true, "personal": true, "visita": true, "incidencia": true}

type clave struct{ tipo, id string }

type quien struct {
	nombre string
	visto  time.Time
}

// Registro guarda los latidos.
type Registro struct {
	mu     sync.Mutex
	fichas map[clave]map[string]quien // cuenta id → presencia
	ahora  func() time.Time
}

func Nuevo() *Registro {
	return &Registro{fichas: map[clave]map[string]quien{}, ahora: time.Now}
}

// Latir marca que la cuenta tiene la ficha abierta y devuelve los nombres de
// las demas que tambien la tienen.
func (r *Registro) Latir(tipo, id string, c *cuentas.Cuenta) []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	k := clave{tipo, id}
	ahora := r.ahora()
	if r.fichas[k] == nil {
		r.fichas[k] = map[string]quien{}
	}
	r.fichas[k][c.ID] = quien{nombre: c.Nombre, visto: ahora}
	otros := []string{}
	for cid, q := range r.fichas[k] {
		if ahora.Sub(q.visto) > Vencimiento {
			delete(r.fichas[k], cid)
			continue
		}
		if cid != c.ID {
			otros = append(otros, q.nombre)
		}
	}
	return otros
}

// Salir quita la presencia de la cuenta en la ficha.
func (r *Registro) Salir(tipo, id string, c *cuentas.Cuenta) {
	r.mu.Lock()
	defer r.mu.Unlock()
	k := clave{tipo, id}
	delete(r.fichas[k], c.ID)
	if len(r.fichas[k]) == 0 {
		delete(r.fichas, k)
	}
}

// Limpiar borra fichas sin latidos vigentes, para que el mapa no crezca.
func (r *Registro) Limpiar() {
	r.mu.Lock()
	defer r.mu.Unlock()
	ahora := r.ahora()
	for k, m := range r.fichas {
		for cid, q := range m {
			if ahora.Sub(q.visto) > Vencimiento {
				delete(m, cid)
			}
		}
		if len(m) == 0 {
			delete(r.fichas, k)
		}
	}
}

type otro struct {
	Nombre string `json:"nombre"`
}

// PutLatido atiende PUT /presencia/{tipo}/{id}.
func (r *Registro) PutLatido(w http.ResponseWriter, req *http.Request) {
	c, tipo, id, ok := leerRuta(w, req)
	if !ok {
		return
	}
	nombres := r.Latir(tipo, id, c)
	otros := make([]otro, 0, len(nombres))
	for _, n := range nombres {
		otros = append(otros, otro{Nombre: n})
	}
	httpx.JSON(w, http.StatusOK, map[string][]otro{"otros": otros})
}

// DeleteLatido atiende DELETE /presencia/{tipo}/{id}.
func (r *Registro) DeleteLatido(w http.ResponseWriter, req *http.Request) {
	c, tipo, id, ok := leerRuta(w, req)
	if !ok {
		return
	}
	r.Salir(tipo, id, c)
	w.WriteHeader(http.StatusNoContent)
}

func leerRuta(w http.ResponseWriter, req *http.Request) (*cuentas.Cuenta, string, string, bool) {
	c, ok := httpx.CuentaDe[*cuentas.Cuenta](req.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, httpx.CodSesionInvalida)
		return nil, "", "", false
	}
	tipo, id := req.PathValue("tipo"), req.PathValue("id")
	if !tiposValidos[tipo] || id == "" {
		httpx.Invalido(w, map[string]string{"tipo": "tipo de ficha desconocido"})
		return nil, "", "", false
	}
	return c, tipo, id, true
}

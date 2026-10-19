package auth

import (
	"errors"
	"log"
	"net/http"

	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
	"github.com/Matt122133/pae-anep/backend/internal/httpx"
)

// Handlers atiende /auth/* y /yo.
type Handlers struct {
	cuentas      *cuentas.Repositorio
	sesiones     *Sesiones
	limites      *Limites
	confiarProxy bool
}

func NuevosHandlers(c *cuentas.Repositorio, s *Sesiones, l *Limites, confiarProxy bool) *Handlers {
	return &Handlers{cuentas: c, sesiones: s, limites: l, confiarProxy: confiarProxy}
}

type pedidoIngreso struct {
	Usuario    string `json:"usuario"`
	Contrasena string `json:"contrasena"`
}

type respuestaIngreso struct {
	Token  string          `json:"token"`
	Cuenta *cuentas.Cuenta `json:"cuenta"`
}

// Ingresar verifica usuario y contrasena y emite una sesion.
//
// **Todo fallo da la misma respuesta** (FR-005): usuario inexistente,
// contrasena mala, cuenta desactivada y bloqueo por intentos. Distinguirlos le
// diria a quien prueba que usuarios existen. Con el usuario inexistente igual se
// verifica contra un hash senuelo, para que el tiempo tampoco lo delate.
func (h *Handlers) Ingresar(w http.ResponseWriter, r *http.Request) {
	var p pedidoIngreso
	if err := httpx.LeerJSON(w, r, &p); err != nil {
		httpx.CuerpoInvalido(w, err)
		return
	}
	ctx := r.Context()
	ip := httpx.IPDelCliente(r, h.confiarProxy)
	rechazar := func() { httpx.Error(w, http.StatusUnauthorized, httpx.CodCredenciales) }

	bloqueado, err := h.limites.Bloqueado(ctx, p.Usuario, ip)
	if err != nil {
		httpx.ErrorInterno(w, "consultando limites", err)
		return
	}
	if bloqueado {
		// Sin verificar el hash: el bloqueo existe para que no se pueda seguir
		// probando, y verificar igual seria seguir respondiendo la pregunta.
		rechazar()
		return
	}

	hash, err := h.cuentas.HashDe(ctx, p.Usuario)
	existe := err == nil
	if err != nil && !errors.Is(err, cuentas.ErrNoExiste) {
		httpx.ErrorInterno(w, "buscando la cuenta", err)
		return
	}
	if !existe {
		hash = hashSenuelo
	}
	coincide, err := VerificarContrasena(p.Contrasena, hash)
	if err != nil {
		httpx.ErrorInterno(w, "verificando la contrasena", err)
		return
	}

	var c *cuentas.Cuenta
	if existe && coincide {
		c, err = h.cuentas.PorUsuario(ctx, p.Usuario)
		if err != nil {
			httpx.ErrorInterno(w, "leyendo la cuenta", err)
			return
		}
	}
	exito := c != nil && c.Activa
	if err := h.limites.Registrar(ctx, p.Usuario, ip, exito); err != nil {
		log.Printf("auth: no se pudo registrar el intento: %v", err)
	}
	if !exito {
		rechazar()
		return
	}

	token, err := h.sesiones.Emitir(ctx, c.ID)
	if err != nil {
		httpx.ErrorInterno(w, "emitiendo la sesion", err)
		return
	}
	httpx.JSON(w, http.StatusOK, respuestaIngreso{Token: token, Cuenta: c})
}

// Salir revoca la sesion con la que se hizo el pedido, y solo esa.
func (h *Handlers) Salir(w http.ResponseWriter, r *http.Request) {
	if err := h.sesiones.Revocar(r.Context(), httpx.TokenDeLaCredencial(r)); err != nil {
		httpx.ErrorInterno(w, "revocando la sesion", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Yo devuelve la cuenta de la sesion.
func (h *Handlers) Yo(w http.ResponseWriter, r *http.Request) {
	c, ok := httpx.CuentaDe[*cuentas.Cuenta](r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, httpx.CodSesionInvalida)
		return
	}
	httpx.JSON(w, http.StatusOK, c)
}

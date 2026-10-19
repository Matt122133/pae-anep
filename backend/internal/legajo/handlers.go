package legajo

import (
	"errors"
	"net/http"

	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
	"github.com/Matt122133/pae-anep/backend/internal/httpx"
)

// responderError traduce los errores del dominio al contrato (contracts/api.md).
func responderError(w http.ResponseWriter, contexto string, err error) {
	var inv *ErrInvalido
	var conf *ErrConflicto
	switch {
	case errors.As(err, &inv):
		httpx.Invalido(w, inv.Campos)
	case errors.As(err, &conf):
		httpx.Conflicto(w, conf.Actual)
	case errors.Is(err, ErrNoExiste):
		httpx.Error(w, http.StatusNotFound, httpx.CodNoExiste)
	default:
		httpx.ErrorInterno(w, contexto, err)
	}
}

// conCuerpo decodifica el cuerpo y obtiene la cuenta de la sesion; si algo
// falla, ya respondio y devuelve false.
func conCuerpo[T any](w http.ResponseWriter, r *http.Request) (*cuentas.Cuenta, T, bool) {
	var cuerpo T
	autor, ok := httpx.CuentaDe[*cuentas.Cuenta](r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, httpx.CodSesionInvalida)
		return nil, cuerpo, false
	}
	if err := httpx.LeerJSON(w, r, &cuerpo); err != nil {
		httpx.CuerpoInvalido(w, err)
		return nil, cuerpo, false
	}
	return autor, cuerpo, true
}

type soloVersion struct {
	Version int `json:"version"`
}

// --- escuelas

func (h *Handlers) PostEscuela(w http.ResponseWriter, r *http.Request) {
	autor, s, ok := conCuerpo[School](w, r)
	if !ok {
		return
	}
	out, err := h.repo.CrearEscuela(r.Context(), autor, s)
	if err != nil {
		responderError(w, "creando escuela", err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handlers) PutEscuela(w http.ResponseWriter, r *http.Request) {
	autor, s, ok := conCuerpo[School](w, r)
	if !ok {
		return
	}
	s.ID = r.PathValue("id")
	out, err := h.repo.EditarEscuela(r.Context(), autor, s)
	if err != nil {
		responderError(w, "editando escuela", err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handlers) cambiarActivaEscuela(activa bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		autor, v, ok := conCuerpo[soloVersion](w, r)
		if !ok {
			return
		}
		out, err := h.repo.CambiarActivaEscuela(r.Context(), autor, r.PathValue("id"), v.Version, activa)
		if err != nil {
			responderError(w, "cambiando estado de escuela", err)
			return
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

func (h *Handlers) DeleteEscuela() http.HandlerFunc    { return h.cambiarActivaEscuela(false) }
func (h *Handlers) ReactivarEscuela() http.HandlerFunc { return h.cambiarActivaEscuela(true) }

// --- personal

func (h *Handlers) PostPersonal(w http.ResponseWriter, r *http.Request) {
	autor, p, ok := conCuerpo[StaffMember](w, r)
	if !ok {
		return
	}
	out, err := h.repo.CrearPersonal(r.Context(), autor, p)
	if err != nil {
		responderError(w, "creando personal", err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handlers) PutPersonal(w http.ResponseWriter, r *http.Request) {
	autor, p, ok := conCuerpo[StaffMember](w, r)
	if !ok {
		return
	}
	p.ID = r.PathValue("id")
	out, err := h.repo.EditarPersonal(r.Context(), autor, p)
	if err != nil {
		responderError(w, "editando personal", err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handlers) DeletePersonal(w http.ResponseWriter, r *http.Request) {
	autor, v, ok := conCuerpo[soloVersion](w, r)
	if !ok {
		return
	}
	out, err := h.repo.CambiarActivoPersonal(r.Context(), autor, r.PathValue("id"), v.Version, false)
	if err != nil {
		responderError(w, "dando de baja personal", err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handlers) PostTraslado(w http.ResponseWriter, r *http.Request) {
	autor, t, ok := conCuerpo[Traslado](w, r)
	if !ok {
		return
	}
	out, err := h.repo.Trasladar(r.Context(), autor, r.PathValue("id"), t)
	if err != nil {
		responderError(w, "trasladando personal", err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

// --- visitas

type respuestaAltaVisita struct {
	Visit     Visit         `json:"visit"`
	NewIssues []SchoolIssue `json:"newIssues"`
}

func (h *Handlers) PostVisita(w http.ResponseWriter, r *http.Request) {
	autor, alta, ok := conCuerpo[AltaVisita](w, r)
	if !ok {
		return
	}
	v, incs, err := h.repo.CrearVisita(r.Context(), autor, alta)
	if err != nil {
		responderError(w, "creando visita", err)
		return
	}
	if incs == nil {
		incs = []SchoolIssue{}
	}
	httpx.JSON(w, http.StatusOK, respuestaAltaVisita{Visit: v, NewIssues: incs})
}

func (h *Handlers) PutVisita(w http.ResponseWriter, r *http.Request) {
	autor, v, ok := conCuerpo[Visit](w, r)
	if !ok {
		return
	}
	v.ID = r.PathValue("id")
	out, err := h.repo.EditarVisita(r.Context(), autor, v)
	if err != nil {
		responderError(w, "editando visita", err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handlers) DeleteVisita(w http.ResponseWriter, r *http.Request) {
	autor, v, ok := conCuerpo[soloVersion](w, r)
	if !ok {
		return
	}
	if err := h.repo.BorrarVisita(r.Context(), autor, r.PathValue("id"), v.Version); err != nil {
		responderError(w, "borrando visita", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- incidencias

func (h *Handlers) PostIncidencia(w http.ResponseWriter, r *http.Request) {
	autor, i, ok := conCuerpo[SchoolIssue](w, r)
	if !ok {
		return
	}
	out, err := h.repo.CrearIncidencia(r.Context(), autor, i)
	if err != nil {
		responderError(w, "creando incidencia", err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handlers) PutIncidencia(w http.ResponseWriter, r *http.Request) {
	autor, i, ok := conCuerpo[SchoolIssue](w, r)
	if !ok {
		return
	}
	i.ID = r.PathValue("id")
	out, err := h.repo.EditarIncidencia(r.Context(), autor, i)
	if err != nil {
		responderError(w, "editando incidencia", err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handlers) DeleteIncidencia(w http.ResponseWriter, r *http.Request) {
	autor, v, ok := conCuerpo[soloVersion](w, r)
	if !ok {
		return
	}
	if err := h.repo.BorrarIncidencia(r.Context(), autor, r.PathValue("id"), v.Version); err != nil {
		responderError(w, "borrando incidencia", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- bitacora

func (h *Handlers) PostNota(w http.ResponseWriter, r *http.Request) {
	autor, n, ok := conCuerpo[Nota](w, r)
	if !ok {
		return
	}
	if err := h.repo.AgregarNota(r.Context(), autor, n); err != nil {
		responderError(w, "agregando nota", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// BitacoraInmutable responde 405 a todo intento de editar o borrar una entrada
// (FR-018). Existe como ruta explicita para que el rechazo sea un 405 claro y
// no un 404 que parezca "esa entrada no existe".
func BitacoraInmutable(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Allow", "GET")
	httpx.Error(w, http.StatusMethodNotAllowed, httpx.CodMetodo)
}

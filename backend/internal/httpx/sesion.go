package httpx

import (
	"context"
	"errors"
	"net/http"
	"strings"
)

type claveContexto struct{ nombre string }

var claveCuenta = claveContexto{"cuenta"}

// ErrSesionInvalida es lo que devuelve el resolvedor cuando la credencial no
// sirve, por el motivo que sea (vencida, revocada, inventada, cuenta
// desactivada). Una sola causa hacia afuera.
var ErrSesionInvalida = errors.New("sesion invalida")

// TokenDeLaCredencial saca el token de `Authorization: Bearer <token>`.
// Vacio ante cualquier otra forma. Exportada para que /auth/salir lea el token
// exactamente igual que el middleware.
func TokenDeLaCredencial(r *http.Request) string {
	esquema, valor, hay := strings.Cut(r.Header.Get("Authorization"), " ")
	if !hay || !strings.EqualFold(esquema, "Bearer") {
		return ""
	}
	return strings.TrimSpace(valor)
}

// ConSesion exige credencial valida y deja la cuenta en el contexto.
//
// Generico para que httpx no importe el paquete de cuentas y el handler que lee
// la cuenta reciba el tipo correcto sin asertar a mano.
//
// 401 sin credencial o con una invalida (la app vuelve al ingreso); 500 si el
// resolvedor fallo por otra cosa, para no hacerle borrar a la app una
// credencial que probablemente sirve.
func ConSesion[T any](
	resolver func(ctx context.Context, token string) (T, error),
	siguiente http.Handler,
) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := TokenDeLaCredencial(r)
		if token == "" {
			Error(w, http.StatusUnauthorized, CodSesionInvalida)
			return
		}
		cuenta, err := resolver(r.Context(), token)
		if err != nil {
			if errors.Is(err, ErrSesionInvalida) {
				Error(w, http.StatusUnauthorized, CodSesionInvalida)
				return
			}
			ErrorInterno(w, "resolviendo la sesion", err)
			return
		}
		siguiente.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), claveCuenta, cuenta)))
	})
}

// CuentaDe devuelve quien hizo el pedido. **El autor de todo cambio sale de
// aca y nunca del cuerpo** (FR-017, Principio II).
func CuentaDe[T any](ctx context.Context) (T, bool) {
	c, hay := ctx.Value(claveCuenta).(T)
	return c, hay
}

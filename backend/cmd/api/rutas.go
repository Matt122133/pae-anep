package main

import (
	"context"
	"net/http"
	"time"

	"github.com/Matt122133/pae-anep/backend/internal/auth"
	"github.com/Matt122133/pae-anep/backend/internal/config"
	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
	"github.com/Matt122133/pae-anep/backend/internal/db"
	"github.com/Matt122133/pae-anep/backend/internal/httpx"
	"github.com/Matt122133/pae-anep/backend/internal/legajo"
)

// dependencias es lo que las rutas necesitan para existir. Una estructura y no
// parametros sueltos: la lista crece con cada historia, y una firma larga del
// mismo tipo es como se pasan dos en el orden equivocado.
type dependencias struct {
	auth     *auth.Handlers
	legajo   *legajo.Handlers
	resolver func(context.Context, string) (*cuentas.Cuenta, error)
	tareas   []db.Tarea
}

func armarDependencias(_ context.Context, cfg *config.Config, pool *db.Pool) dependencias {
	repoCuentas := cuentas.Nuevo(pool)
	sesiones := auth.NuevasSesiones(pool, cfg.SesionInactividad)
	limites := auth.NuevosLimites(pool)

	return dependencias{
		auth:     auth.NuevosHandlers(repoCuentas, sesiones, limites, cfg.ConfiarProxy),
		legajo:   legajo.NuevosHandlers(legajo.NuevoRepositorio(pool)),
		resolver: sesiones.Resolver,
		// Una purga que nadie dispara no purga nada.
		tareas: []db.Tarea{
			{Nombre: "purga de sesiones vencidas", Correr: func(ctx context.Context) (int64, error) {
				return sesiones.PurgarVencidas(ctx, 24*time.Hour)
			}},
			{Nombre: "purga de intentos de ingreso", Correr: limites.Purgar},
		},
	}
}

// rutasPublicas son las unicas que responden sin sesion. Cualquier otra ruta
// registrada exige credencial; cmd/api/main_test.go lo comprueba ruta por ruta
// (SC-003).
var rutasPublicas = map[string]bool{
	"GET /salud":          true,
	"POST /auth/ingresar": true,
}

// rutas arma el enrutador.
func rutas(d dependencias) http.Handler {
	mux := http.NewServeMux()
	conSesion := func(h http.HandlerFunc) http.Handler { return httpx.ConSesion(d.resolver, h) }

	// Sin datos y sin sesion: es lo que mira Railway para saber si el servicio
	// esta vivo.
	mux.HandleFunc("GET /salud", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
	})
	mux.HandleFunc("POST /auth/ingresar", d.auth.Ingresar)

	for patron, h := range rutasConSesion(d) {
		mux.Handle(patron, conSesion(h))
	}
	return mux
}

// rutasConSesion es la tabla de rutas protegidas. Vive aparte para que la
// prueba de SC-003 recorra exactamente la misma lista que se monta.
func rutasConSesion(d dependencias) map[string]http.HandlerFunc {
	return map[string]http.HandlerFunc{
		"POST /auth/salir": d.auth.Salir,
		"GET /yo":          d.auth.Yo,
		"GET /legajo":      d.legajo.GetLegajo,
	}
}

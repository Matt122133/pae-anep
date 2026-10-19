package main

import (
	"context"
	"net/http"

	"github.com/Matt122133/pae-anep/backend/internal/config"
	"github.com/Matt122133/pae-anep/backend/internal/db"
	"github.com/Matt122133/pae-anep/backend/internal/httpx"
)

// dependencias es lo que las rutas necesitan para existir. Una estructura y no
// parametros sueltos: la lista crece con cada historia, y una firma larga del
// mismo tipo es como se pasan dos en el orden equivocado.
type dependencias struct {
	pool   *db.Pool
	cfg    *config.Config
	tareas []db.Tarea
}

func armarDependencias(_ context.Context, cfg *config.Config, pool *db.Pool) dependencias {
	return dependencias{pool: pool, cfg: cfg}
}

// rutas arma el enrutador. Cada ruta de datos va bajo sesion; las unicas
// publicas son /salud y el ingreso.
func rutas(d dependencias) http.Handler {
	mux := http.NewServeMux()

	// Sin datos y sin sesion: es lo que mira Railway para saber si el servicio
	// esta vivo.
	mux.HandleFunc("GET /salud", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
	})

	return mux
}

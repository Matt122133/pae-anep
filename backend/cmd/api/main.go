// Comando api es el servicio HTTP del legajo compartido del PAE Tacuarembo.
//
// Arranca en este orden, y el orden importa: configuracion, base, migraciones,
// rutas, servidor. Si algo de lo primero falla el proceso termina: es
// preferible que Railway muestre un servicio caido a uno que levanta a medias.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Matt122133/pae-anep/backend/internal/config"
	"github.com/Matt122133/pae-anep/backend/internal/db"
	"github.com/Matt122133/pae-anep/backend/internal/httpx"
)

func main() {
	if err := correr(); err != nil {
		log.Fatalf("el servicio no pudo arrancar: %v", err)
	}
}

// correr existe aparte de main para que los defer se ejecuten: log.Fatal llama
// a os.Exit, que los saltea.
func correr() error {
	cfg, err := config.Cargar()
	if err != nil {
		return err
	}

	// Railway manda SIGTERM al desplegar: dejar de aceptar y terminar lo que
	// esta en curso.
	ctx, detener := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer detener()

	pool, err := db.Abrir(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	// Migrar al arrancar hace que desplegar y migrar sean el mismo acto.
	if err := db.Migrar(ctx, pool); err != nil {
		return err
	}

	deps := armarDependencias(ctx, cfg, pool)
	go db.ArrancarJanitor(ctx, deps.tareas...)

	srv := &http.Server{
		Addr:    ":" + cfg.Puerto,
		Handler: httpx.CORS(cfg.OrigenesPermitidos, rutas(deps)),
		// Sin plazos, una conexion que nunca termina de mandar ocupa una
		// goroutine para siempre.
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errServidor := make(chan error, 1)
	go func() {
		log.Printf("api escuchando en %s | origenes permitidos: %v", srv.Addr, cfg.OrigenesPermitidos)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errServidor <- err
		}
	}()

	select {
	case err := <-errServidor:
		return err
	case <-ctx.Done():
		log.Print("apagando")
	}

	// Contexto propio: el de arriba ya esta cancelado y cortaria lo que esta en
	// curso en vez de darle tiempo a terminar.
	ctxApagado, cancelar := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancelar()
	return srv.Shutdown(ctxApagado)
}

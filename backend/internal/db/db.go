// Package db abre la conexion a Postgres y aplica las migraciones.
package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Pool es el pool de conexiones del servicio. Alias para que el resto de los
// paquetes no importe pgxpool directamente.
type Pool = pgxpool.Pool

// Abrir conecta y comprueba que la base responde. Un pool que se crea pero no
// llega a la base falla recien con la primera consulta, que es tarde.
func Abrir(ctx context.Context, url string) (*Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("DATABASE_URL invalida: %w", err)
	}
	// Cuatro usuarias: no hace falta mas. Tope bajo para no agotar las
	// conexiones del plan de Railway.
	cfg.MaxConns = 8

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("no se pudo crear el pool: %w", err)
	}

	ctxPing, cancelar := context.WithTimeout(ctx, 10*time.Second)
	defer cancelar()
	if err := pool.Ping(ctxPing); err != nil {
		pool.Close()
		return nil, fmt.Errorf("la base no responde: %w", err)
	}
	return pool, nil
}

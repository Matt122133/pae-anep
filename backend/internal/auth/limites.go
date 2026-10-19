package auth

import (
	"context"
	"time"

	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
	"github.com/Matt122133/pae-anep/backend/internal/db"
)

// Limites de ingreso (FR-004, research D4).
const (
	VentanaIntentos     = 15 * time.Minute
	MaxFallosPorUsuario = 5
	MaxFallosPorIP      = 20
	RetencionIntentos   = 30 * 24 * time.Hour
)

// Limites cuenta intentos de ingreso en la base, para que sobrevivan a un
// redespliegue.
type Limites struct {
	pool  *db.Pool
	ahora func() time.Time
}

func NuevosLimites(pool *db.Pool) *Limites { return &Limites{pool: pool, ahora: time.Now} }

// Bloqueado dice si el usuario o la IP no pueden intentar ahora.
//
// Por usuario cuentan los fallos **seguidos**: los posteriores al ultimo exito
// dentro de la ventana. Un ingreso correcto pone el contador en cero.
func (l *Limites) Bloqueado(ctx context.Context, usuario, ip string) (bool, error) {
	desde := l.ahora().Add(-VentanaIntentos)
	usuario = cuentas.NormalizarUsuario(usuario)

	var fallosUsuario, fallosIP int
	err := l.pool.QueryRow(ctx, `
		SELECT
		  (SELECT count(*) FROM intentos_ingreso
		    WHERE usuario = $1 AND NOT exito AND momento > $3
		      AND momento > COALESCE((SELECT max(momento) FROM intentos_ingreso
		                               WHERE usuario = $1 AND exito), '-infinity')),
		  (SELECT count(*) FROM intentos_ingreso
		    WHERE ip = $2 AND NOT exito AND momento > $3)`,
		usuario, ip, desde).Scan(&fallosUsuario, &fallosIP)
	if err != nil {
		return false, err
	}
	return fallosUsuario >= MaxFallosPorUsuario || fallosIP >= MaxFallosPorIP, nil
}

// Registrar anota un intento.
func (l *Limites) Registrar(ctx context.Context, usuario, ip string, exito bool) error {
	_, err := l.pool.Exec(ctx, `INSERT INTO intentos_ingreso (usuario, ip, exito, momento)
		VALUES ($1, $2, $3, $4)`, cuentas.NormalizarUsuario(usuario), ip, exito, l.ahora())
	return err
}

// Purgar borra intentos viejos.
func (l *Limites) Purgar(ctx context.Context) (int64, error) {
	tag, err := l.pool.Exec(ctx, `DELETE FROM intentos_ingreso WHERE momento < $1`,
		l.ahora().Add(-RetencionIntentos))
	return tag.RowsAffected(), err
}

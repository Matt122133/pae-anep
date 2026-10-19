package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
	"github.com/Matt122133/pae-anep/backend/internal/db"
	"github.com/Matt122133/pae-anep/backend/internal/httpx"
)

// ErrSesionInvalida es literalmente el valor de httpx, no una copia: el
// middleware decide 401 contra 500 comparando contra el suyo.
var ErrSesionInvalida = httpx.ErrSesionInvalida

// refrescoUltimoUso es cada cuanto se escribe ultimo_uso como maximo. Sin el,
// cada request seria una escritura; con el, la sesion vence a los 30 dias de
// inactividad con un error de a lo sumo cinco minutos (research D3).
const refrescoUltimoUso = 5 * time.Minute

// Sesiones emite, resuelve y revoca credenciales.
type Sesiones struct {
	pool        *db.Pool
	inactividad time.Duration
	ahora       func() time.Time
}

func NuevasSesiones(pool *db.Pool, inactividad time.Duration) *Sesiones {
	return &Sesiones{pool: pool, inactividad: inactividad, ahora: time.Now}
}

// hashDelToken: SHA-256 sin sal, a proposito. La sal defiende de tablas
// precomputadas, que solo sirven contra valores adivinables; un token de 256
// bits no lo es. Determinista, se busca por indice.
func hashDelToken(token string) []byte {
	s := sha256.Sum256([]byte(token))
	return s[:]
}

// Emitir crea una sesion y devuelve el token. El token existe solo aca: en la
// base queda su hash.
func (s *Sesiones) Emitir(ctx context.Context, cuentaID string) (string, error) {
	crudo := make([]byte, 32)
	if _, err := rand.Read(crudo); err != nil {
		return "", fmt.Errorf("no hay entropia para el token: %w", err)
	}
	token := base64.RawURLEncoding.EncodeToString(crudo)

	id := make([]byte, 16)
	if _, err := rand.Read(id); err != nil {
		return "", err
	}
	ahora := s.ahora()
	_, err := s.pool.Exec(ctx, `INSERT INTO sesiones (id, cuenta_id, token_hash, creada_en, ultimo_uso)
		VALUES ($1, $2, $3, $4, $4)`, hex.EncodeToString(id), cuentaID, hashDelToken(token), ahora)
	if err != nil {
		return "", err
	}
	return token, nil
}

// Resolver devuelve la cuenta duena del token, o ErrSesionInvalida si el
// token no existe, vencio por inactividad, o la cuenta esta desactivada.
func (s *Sesiones) Resolver(ctx context.Context, token string) (*cuentas.Cuenta, error) {
	var (
		c         cuentas.Cuenta
		sesionID  string
		ultimoUso time.Time
	)
	err := s.pool.QueryRow(ctx, `
		SELECT s.id, s.ultimo_uso, c.id, c.usuario, c.nombre, c.rol, c.activa, c.creada_en
		FROM sesiones s JOIN cuentas c ON c.id = s.cuenta_id
		WHERE s.token_hash = $1`, hashDelToken(token)).
		Scan(&sesionID, &ultimoUso, &c.ID, &c.Usuario, &c.Nombre, &c.Rol, &c.Activa, &c.CreadaEn)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrSesionInvalida
	}
	if err != nil {
		return nil, err
	}

	ahora := s.ahora()
	if !c.Activa || ahora.Sub(ultimoUso) > s.inactividad {
		return nil, ErrSesionInvalida
	}
	if ahora.Sub(ultimoUso) > refrescoUltimoUso {
		if _, err := s.pool.Exec(ctx, `UPDATE sesiones SET ultimo_uso = $2 WHERE id = $1`, sesionID, ahora); err != nil {
			return nil, err
		}
	}
	return &c, nil
}

// Revocar borra la sesion de ese token. Revocar uno que no existe no es error:
// el resultado que se pide —que ese token no sirva— ya se cumple.
func (s *Sesiones) Revocar(ctx context.Context, token string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM sesiones WHERE token_hash = $1`, hashDelToken(token))
	return err
}

// PurgarVencidas borra sesiones inactivas hace mas de la inactividad + margen.
func (s *Sesiones) PurgarVencidas(ctx context.Context, margen time.Duration) (int64, error) {
	tag, err := s.pool.Exec(ctx, `DELETE FROM sesiones WHERE ultimo_uso < $1`,
		s.ahora().Add(-s.inactividad-margen))
	return tag.RowsAffected(), err
}

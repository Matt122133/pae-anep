// Package cuentas guarda a las integrantes del equipo que pueden ingresar.
//
// Reemplaza a la lista fija PAE_TEAM_MEMBERS del frontend. Las cuentas solo se
// crean, resetean y desactivan con cmd/cuentas: no hay registro desde la app
// (FR-009).
package cuentas

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Matt122133/pae-anep/backend/internal/db"
)

// Roles validos. Informativos: no cambian permisos (FR-010).
const (
	RolEconoma       = "Ecónoma del PAE"
	RolNutricionista = "Licenciada en Nutrición"
)

// Cuenta es una integrante del equipo. No lleva el hash: el hash solo lo lee
// quien verifica contrasenas, por HashDe.
type Cuenta struct {
	ID       string    `json:"id"`
	Usuario  string    `json:"usuario"`
	Nombre   string    `json:"nombre"`
	Rol      string    `json:"rol"`
	Activa   bool      `json:"activa"`
	CreadaEn time.Time `json:"-"`
}

var (
	ErrNoExiste    = errors.New("la cuenta no existe")
	ErrYaExiste    = errors.New("ya existe una cuenta con ese usuario")
	ErrUsuario     = errors.New("usuario invalido: 3 a 32 caracteres a-z, 0-9, punto, guion o guion bajo")
	ErrRol         = fmt.Errorf("rol invalido: %q o %q", RolEconoma, RolNutricionista)
	ErrNombreVacio = errors.New("el nombre no puede estar vacio")
	formaUsuario   = regexp.MustCompile(`^[a-z0-9._-]{3,32}$`)
)

// NormalizarUsuario es la unica forma de convertir lo que se escribe en el
// login en la clave que se busca. Minusculas y sin espacios alrededor.
func NormalizarUsuario(u string) string { return strings.ToLower(strings.TrimSpace(u)) }

// Repositorio lee y escribe cuentas.
type Repositorio struct{ pool *db.Pool }

func Nuevo(pool *db.Pool) *Repositorio { return &Repositorio{pool: pool} }

const columnas = `id, usuario, nombre, rol, activa, creada_en`

func escanear(f pgx.Row) (*Cuenta, error) {
	var c Cuenta
	if err := f.Scan(&c.ID, &c.Usuario, &c.Nombre, &c.Rol, &c.Activa, &c.CreadaEn); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNoExiste
		}
		return nil, err
	}
	return &c, nil
}

// Crear da de alta una cuenta con el hash ya calculado.
func (r *Repositorio) Crear(ctx context.Context, usuario, nombre, rol, hash string) (*Cuenta, error) {
	usuario = NormalizarUsuario(usuario)
	nombre = strings.TrimSpace(nombre)
	switch {
	case !formaUsuario.MatchString(usuario):
		return nil, ErrUsuario
	case nombre == "":
		return nil, ErrNombreVacio
	case rol != RolEconoma && rol != RolNutricionista:
		return nil, ErrRol
	}
	crudo := make([]byte, 16)
	if _, err := rand.Read(crudo); err != nil {
		return nil, err
	}
	c, err := escanear(r.pool.QueryRow(ctx, `
		INSERT INTO cuentas (id, usuario, nombre, rol, hash_contrasena)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (usuario) DO NOTHING
		RETURNING `+columnas, hex.EncodeToString(crudo), usuario, nombre, rol, hash))
	if errors.Is(err, ErrNoExiste) {
		return nil, ErrYaExiste
	}
	return c, err
}

// PorUsuario busca por usuario normalizado.
func (r *Repositorio) PorUsuario(ctx context.Context, usuario string) (*Cuenta, error) {
	return escanear(r.pool.QueryRow(ctx,
		`SELECT `+columnas+` FROM cuentas WHERE usuario = $1`, NormalizarUsuario(usuario)))
}

// PorID busca por id.
func (r *Repositorio) PorID(ctx context.Context, id string) (*Cuenta, error) {
	return escanear(r.pool.QueryRow(ctx, `SELECT `+columnas+` FROM cuentas WHERE id = $1`, id))
}

// HashDe devuelve el hash de contrasena de un usuario.
func (r *Repositorio) HashDe(ctx context.Context, usuario string) (string, error) {
	var h string
	err := r.pool.QueryRow(ctx, `SELECT hash_contrasena FROM cuentas WHERE usuario = $1`,
		NormalizarUsuario(usuario)).Scan(&h)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNoExiste
	}
	return h, err
}

// Listar devuelve las cuentas; solo activas salvo que se pida todas.
func (r *Repositorio) Listar(ctx context.Context, incluirInactivas bool) ([]Cuenta, error) {
	filas, err := r.pool.Query(ctx, `SELECT `+columnas+` FROM cuentas
		WHERE activa OR $1 ORDER BY nombre`, incluirInactivas)
	if err != nil {
		return nil, err
	}
	defer filas.Close()
	lista := []Cuenta{}
	for filas.Next() {
		c, err := escanear(filas)
		if err != nil {
			return nil, err
		}
		lista = append(lista, *c)
	}
	return lista, filas.Err()
}

// CambiarHash reemplaza la contrasena y **revoca todas las sesiones** de la
// cuenta en la misma transaccion (FR-006): una contrasena reseteada que deja
// sesiones vivas no corta a quien la tenia.
func (r *Repositorio) CambiarHash(ctx context.Context, usuario, hash string) error {
	return r.cambiarYRevocar(ctx, usuario, `UPDATE cuentas SET hash_contrasena = $2 WHERE usuario = $1 RETURNING id`, hash)
}

// Desactivar impide ingresar y revoca todas sus sesiones. La cuenta no se
// borra: su autoria en bitacora y visitas se conserva.
func (r *Repositorio) Desactivar(ctx context.Context, usuario string) error {
	return r.cambiarYRevocar(ctx, usuario, `UPDATE cuentas SET activa = false WHERE usuario = $1 RETURNING id`)
}

func (r *Repositorio) cambiarYRevocar(ctx context.Context, usuario, sql string, args ...any) error {
	return pgx.BeginFunc(ctx, r.pool, func(tx pgx.Tx) error {
		var id string
		err := tx.QueryRow(ctx, sql, append([]any{NormalizarUsuario(usuario)}, args...)...).Scan(&id)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNoExiste
		}
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `DELETE FROM sesiones WHERE cuenta_id = $1`, id)
		return err
	})
}

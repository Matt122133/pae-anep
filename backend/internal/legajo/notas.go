package legajo

import (
	"context"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/Matt122133/pae-anep/backend/internal/bitacora"
	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
)

// Nota es el cuerpo de POST /bitacora/notas (FR-018). El id lo genera el
// dispositivo para que reenviar no duplique.
type Nota struct {
	ID       string   `json:"id"`
	SchoolID string   `json:"schoolId,omitempty"`
	Summary  string   `json:"summary"`
	Notes    string   `json:"notes,omitempty"`
	Tags     []string `json:"tags,omitempty"`
}

// AgregarNota escribe una nota administrativa. Es lo unico que las usuarias
// escriben directo en la bitacora; editarla o borrarla no existe.
func (r *Repositorio) AgregarNota(ctx context.Context, autor *cuentas.Cuenta, n Nota) error {
	e := errores{}
	e.vacio("id", n.ID)
	e.vacio("summary", n.Summary)
	if err := e.err(); err != nil {
		return err
	}
	return r.enTx(ctx, func(tx pgx.Tx) error {
		var ya bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM bitacora WHERE id = $1)`, n.ID).Scan(&ya); err != nil {
			return err
		}
		if ya {
			return nil // reenvio de una nota ya escrita
		}
		var esc *bitacora.Escuela
		if n.SchoolID != "" {
			var err error
			if esc, err = escuelaDe(ctx, tx, n.SchoolID, false); err != nil {
				return err
			}
		}
		return bitacora.EscribirConID(ctx, tx, n.ID, autor, bitacora.Entrada{
			Escuela:   esc,
			Accion:    bitacora.AccionNota,
			Categoria: bitacora.CatNota,
			Etiquetas: limpiar(n.Tags),
			Resumen:   strings.TrimSpace(n.Summary),
			Notas:     n.Notes,
		})
	})
}

func limpiar(xs []string) []string {
	out := []string{}
	for _, x := range xs {
		if x = strings.TrimSpace(x); x != "" {
			out = append(out, x)
		}
	}
	return out
}

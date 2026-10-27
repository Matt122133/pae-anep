// Package bitacora escribe el registro de auditoria del legajo.
//
// Dos reglas que no se negocian (Principio II, research D9):
//
//   - **El autor sale de la cuenta de la sesion**, que el handler le pasa. Nada
//     del cuerpo del pedido llega aca.
//   - **Se escribe en la misma transaccion que el cambio.** Si el cambio se
//     confirma, su entrada tambien; si no, ninguno de los dos.
//
// El diff se calcula entre lo que estaba EN LA BASE y lo nuevo, nunca con el
// "valor anterior" que mande la app.
package bitacora

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"reflect"
	"sort"

	"github.com/jackc/pgx/v5"

	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
)

// Acciones y categorias del contrato (CHECK de la tabla bitacora).
const (
	AccionCrear       = "CREATE"
	AccionEditar      = "UPDATE"
	AccionBaja        = "DELETE"
	AccionEstado      = "STATUS_CHANGE"
	AccionVisita      = "VISIT_LOG"
	AccionNota        = "ADMIN_NOTE"
	AccionImportacion = "IMPORT"
	CatLegajo         = "Legajo Institucional"
	CatPersonal       = "Auxiliares y Personal"
	CatVisitas        = "Visitas de Campo"
	CatCasos          = "Seguimiento de Casos"
	CatAguaYLeche     = "Agua y Leche"
	CatRemitos        = "Remitos y Alimentos"
	CatNota           = "Nota Administrativa"
)

// EtiquetaDeCategoria es la etiqueta de evento por defecto de cada categoria.
// La misma tabla que usaba App.tsx (createLog) antes de que la bitacora la
// escribiera el servidor.
func EtiquetaDeCategoria(cat string) string {
	switch cat {
	case CatPersonal:
		return "Cambio de personal"
	case CatLegajo:
		return "Actualización institucional"
	case CatVisitas:
		return "Visita crítica"
	case CatAguaYLeche:
		return "Control Bromatológico"
	case CatRemitos:
		return "Gestión de Alimentos"
	case CatCasos:
		return "Incidencia o Reclamo"
	}
	return "Acuerdo Administrativo"
}

// Cambio es un campo cambiado, en la forma de ActivityChangeDetail del
// frontend.
type Cambio struct {
	Field      string `json:"field"`
	FieldLabel string `json:"fieldLabel"`
	OldValue   any    `json:"oldValue"`
	NewValue   any    `json:"newValue"`
}

// Escuela identifica la escuela afectada. Se copia en la entrada: la entrada
// dice lo que era cierto cuando se escribio.
type Escuela struct {
	ID     string
	Numero int
	Nombre string
	// Tipo ("Escuela" o "Jardín", 010) solo sirve para armar resumenes; no
	// se guarda.
	Tipo string
}

// Entrada es lo que el handler arma; autor y momento los pone Escribir.
type Entrada struct {
	Escuela   *Escuela
	Accion    string
	Categoria string
	Etiquetas []string // vacia: se usa la de la categoria
	Resumen   string
	Detalle   []Cambio
	Notas     string
}

// Escribir agrega la entrada dentro de la transaccion tx, con autor de la
// sesion y hora del servidor (now() de Postgres). Pide una pgx.Tx y no un pool
// a proposito: asi no se puede escribir la entrada por fuera del cambio.
func Escribir(ctx context.Context, tx pgx.Tx, autor *cuentas.Cuenta, e Entrada) error {
	return EscribirConID(ctx, tx, NuevoID(), autor, e)
}

// EscribirConID es Escribir con un id dado: las notas administrativas traen el
// suyo, generado en el dispositivo, para que reenviarlas no las duplique.
func EscribirConID(ctx context.Context, tx pgx.Tx, id string, autor *cuentas.Cuenta, e Entrada) error {
	etiquetas := e.Etiquetas
	if len(etiquetas) == 0 {
		etiquetas = []string{EtiquetaDeCategoria(e.Categoria)}
	}
	detalle := e.Detalle
	if detalle == nil {
		detalle = []Cambio{}
	}
	dj, err := json.Marshal(detalle)
	if err != nil {
		return err
	}
	var escID, escNumero any
	escNombre := ""
	if e.Escuela != nil {
		escID, escNumero, escNombre = e.Escuela.ID, e.Escuela.Numero, e.Escuela.Nombre
	}
	_, err = tx.Exec(ctx, `INSERT INTO bitacora
		(id, escuela_id, escuela_numero, escuela_nombre, cuenta_id, autor_nombre, autor_rol,
		 accion, categoria, etiqueta, etiquetas, resumen, detalle, notas)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		id, escID, escNumero, escNombre, autor.ID, autor.Nombre, autor.Rol,
		e.Accion, e.Categoria, etiquetas[0], etiquetas, e.Resumen, dj, e.Notas)
	return err
}

// NuevoID devuelve un id aleatorio para entradas de bitacora.
func NuevoID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic(err) // sin entropia no hay nada razonable que hacer
	}
	return "log-" + hex.EncodeToString(b)
}

// Diff compara dos valores campo a campo de primer nivel, por su forma JSON, y
// devuelve los que cambiaron. `ignorar` son campos que no cuentan (version,
// derivados). `etiquetas` traduce el nombre del campo a algo legible; si un
// campo no tiene etiqueta se usa su nombre.
func Diff(antes, despues any, etiquetas map[string]string, ignorar ...string) []Cambio {
	a, d := comoMapa(antes), comoMapa(despues)
	saltear := map[string]bool{}
	for _, k := range ignorar {
		saltear[k] = true
	}
	claves := map[string]bool{}
	for k := range a {
		claves[k] = true
	}
	for k := range d {
		claves[k] = true
	}
	orden := make([]string, 0, len(claves))
	for k := range claves {
		if !saltear[k] {
			orden = append(orden, k)
		}
	}
	sort.Strings(orden)

	cambios := []Cambio{}
	for _, k := range orden {
		va, vd := vacioANil(a[k]), vacioANil(d[k])
		if reflect.DeepEqual(va, vd) {
			continue
		}
		etiqueta := etiquetas[k]
		if etiqueta == "" {
			etiqueta = k
		}
		cambios = append(cambios, Cambio{Field: k, FieldLabel: etiqueta, OldValue: va, NewValue: vd})
	}
	return cambios
}

func comoMapa(v any) map[string]any {
	m := map[string]any{}
	if v == nil {
		return m
	}
	b, err := json.Marshal(v)
	if err != nil {
		return m
	}
	json.Unmarshal(b, &m)
	return m
}

// vacioANil hace que "" y un campo ausente cuenten igual: con omitempty, un
// texto vaciado desaparece del JSON y no tiene que contar como dos cambios.
func vacioANil(v any) any {
	if s, ok := v.(string); ok && s == "" {
		return nil
	}
	return v
}

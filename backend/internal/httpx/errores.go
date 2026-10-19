// Package httpx tiene las piezas HTTP compartidas: CORS, la forma de los
// errores y el middleware de sesion. Es transporte: no sabe como se guardan
// las cosas.
package httpx

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
)

// Codigos de error del contrato (specs/001-backend-legajo-compartido/contracts/api.md).
const (
	CodInvalido       = "invalido"
	CodSesionInvalida = "sesion_invalida"
	CodCredenciales   = "credenciales"
	CodNoExiste       = "no_existe"
	CodConflicto      = "conflicto"
	CodInterno        = "interno"
	CodMetodo         = "metodo_no_permitido"
)

type respuestaError struct {
	Error  string            `json:"error"`
	Campos map[string]string `json:"campos,omitempty"`
	Actual any               `json:"actual,omitempty"`
}

// JSON escribe una respuesta exitosa.
func JSON(w http.ResponseWriter, estado int, cuerpo any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(estado)
	if cuerpo == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(cuerpo); err != nil {
		log.Printf("httpx: no se pudo escribir la respuesta: %v", err)
	}
}

// Error responde con un codigo del contrato y nada mas.
func Error(w http.ResponseWriter, estado int, codigo string) {
	JSON(w, estado, respuestaError{Error: codigo})
}

// Invalido responde 400 nombrando cada campo y su motivo (FR-012).
func Invalido(w http.ResponseWriter, campos map[string]string) {
	JSON(w, http.StatusBadRequest, respuestaError{Error: CodInvalido, Campos: campos})
}

// Conflicto responde 409 con la version actual del registro, para que la app
// la muestre y deje reintentar sin perder lo escrito (FR-014).
func Conflicto(w http.ResponseWriter, actual any) {
	JSON(w, http.StatusConflict, respuestaError{Error: CodConflicto, Actual: actual})
}

// ErrorInterno registra la causa real y responde algo que no dice nada: un
// error de base suele traer nombres de tablas y fragmentos de datos.
func ErrorInterno(w http.ResponseWriter, contexto string, err error) {
	log.Printf("httpx: %s: %v", contexto, err)
	Error(w, http.StatusInternalServerError, CodInterno)
}

// ErrCuerpoInvalido envuelve cualquier falla al leer el cuerpo.
var ErrCuerpoInvalido = errors.New("cuerpo invalido")

// LeerJSON decodifica el cuerpo con limite de tamano y rechazando campos
// desconocidos: un campo de mas se avisa en vez de ignorarse en silencio.
func LeerJSON(w http.ResponseWriter, r *http.Request, destino any) error {
	const maxCuerpo = 1 << 20 // 1 MiB: una visita completa entra de sobra
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxCuerpo))
	dec.DisallowUnknownFields()
	if err := dec.Decode(destino); err != nil {
		return errors.Join(ErrCuerpoInvalido, err)
	}
	return nil
}

// CuerpoInvalido responde 400 para un cuerpo que no se pudo leer.
func CuerpoInvalido(w http.ResponseWriter, err error) {
	Invalido(w, map[string]string{"_cuerpo": err.Error()})
}

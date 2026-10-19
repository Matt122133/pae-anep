// Package auth prueba que quien ingresa es quien dice ser, y emite la
// credencial con la que despues se la reconoce.
package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"golang.org/x/crypto/argon2"
)

// MinimoContrasena es el largo minimo al crear o resetear una cuenta (FR-003).
const MinimoContrasena = 10

// Parametros de argon2id: el minimo de OWASP (research D2). Quedan escritos en
// cada hash (formato PHC), asi que subirlos despues no rompe los viejos.
const (
	argonMemoria   = 19 * 1024 // KiB
	argonTiempo    = 2
	argonHilos     = 1
	argonLargoHash = 32
	argonLargoSal  = 16
)

// ErrContrasenaCorta se devuelve al crear o resetear con menos del minimo.
var ErrContrasenaCorta = fmt.Errorf("la contrasena tiene que tener al menos %d caracteres", MinimoContrasena)

var errHashInvalido = errors.New("hash de contrasena con formato invalido")

// HashContrasena devuelve el hash a guardar, en formato PHC:
// $argon2id$v=19$m=19456,t=2,p=1$<sal>$<hash>
func HashContrasena(contrasena string) (string, error) {
	if utf8.RuneCountInString(contrasena) < MinimoContrasena {
		return "", ErrContrasenaCorta
	}
	sal := make([]byte, argonLargoSal)
	if _, err := rand.Read(sal); err != nil {
		return "", fmt.Errorf("no hay entropia para la sal: %w", err)
	}
	hash := argon2.IDKey([]byte(contrasena), sal, argonTiempo, argonMemoria, argonHilos, argonLargoHash)
	b64 := base64.RawStdEncoding
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, argonMemoria, argonTiempo, argonHilos,
		b64.EncodeToString(sal), b64.EncodeToString(hash)), nil
}

// VerificarContrasena dice si la contrasena corresponde al hash. Compara en
// tiempo constante. Un hash mal formado es un error, no un "no coincide": en
// la base no deberia existir.
func VerificarContrasena(contrasena, guardado string) (bool, error) {
	partes := strings.Split(guardado, "$")
	// ["", "argon2id", "v=19", "m=..,t=..,p=..", sal, hash]
	if len(partes) != 6 || partes[1] != "argon2id" {
		return false, errHashInvalido
	}
	var version int
	if _, err := fmt.Sscanf(partes[2], "v=%d", &version); err != nil || version != argon2.Version {
		return false, errHashInvalido
	}
	var memoria, tiempo uint32
	var hilos uint8
	if _, err := fmt.Sscanf(partes[3], "m=%d,t=%d,p=%d", &memoria, &tiempo, &hilos); err != nil {
		return false, errHashInvalido
	}
	b64 := base64.RawStdEncoding
	sal, err := b64.DecodeString(partes[4])
	if err != nil {
		return false, errHashInvalido
	}
	esperado, err := b64.DecodeString(partes[5])
	if err != nil {
		return false, errHashInvalido
	}
	calculado := argon2.IDKey([]byte(contrasena), sal, tiempo, memoria, hilos, uint32(len(esperado)))
	return subtle.ConstantTimeCompare(calculado, esperado) == 1, nil
}

// hashSenuelo es un hash valido de una contrasena que nadie conoce. Se verifica
// contra el cuando el usuario no existe, para que el tiempo de respuesta no
// delate que usuarios existen (FR-005).
var hashSenuelo = func() string {
	h, err := HashContrasena("senuelo-que-nadie-usa-" + base64.RawStdEncoding.EncodeToString([]byte{1, 2, 3}))
	if err != nil {
		panic(err)
	}
	return h
}()

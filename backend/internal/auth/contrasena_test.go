package auth

import (
	"errors"
	"strings"
	"testing"
)

func TestHashYVerificacion(t *testing.T) {
	h, err := HashContrasena("una contraseña larga")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(h, "$argon2id$v=19$m=19456,t=2,p=1$") {
		t.Errorf("formato inesperado: %s", h)
	}
	if ok, err := VerificarContrasena("una contraseña larga", h); err != nil || !ok {
		t.Errorf("la correcta no verifica: %v %v", ok, err)
	}
	if ok, _ := VerificarContrasena("otra contraseña larga", h); ok {
		t.Error("una incorrecta verifico")
	}
	otro, _ := HashContrasena("una contraseña larga")
	if otro == h {
		t.Error("dos hashes de la misma contraseña son iguales: falta la sal")
	}
}

func TestMinimo(t *testing.T) {
	if _, err := HashContrasena("corta"); !errors.Is(err, ErrContrasenaCorta) {
		t.Errorf("se esperaba ErrContrasenaCorta, vino %v", err)
	}
	// Cuenta caracteres, no bytes: "ñññññññññ" son 9 aunque ocupen 18 bytes.
	if _, err := HashContrasena("ñññññññññ"); err == nil {
		t.Error("9 caracteres no deberian alcanzar")
	}
}

func TestHashMalFormado(t *testing.T) {
	for _, h := range []string{"", "texto", "$bcrypt$x", "$argon2id$v=19$m=1$a$b"} {
		if _, err := VerificarContrasena("lo que sea", h); err == nil {
			t.Errorf("%q deberia dar error", h)
		}
	}
}

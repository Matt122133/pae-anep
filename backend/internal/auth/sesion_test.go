package auth

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
	"github.com/Matt122133/pae-anep/backend/internal/testdb"
)

func cuentaDePrueba(t *testing.T, r *cuentas.Repositorio, usuario string) *cuentas.Cuenta {
	t.Helper()
	h, _ := HashContrasena("contraseña de prueba")
	c, err := r.Crear(context.Background(), usuario, usuario+" (prueba)", cuentas.RolEconoma, h)
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func TestSesionVidaCompleta(t *testing.T) {
	pool := testdb.Abrir(t)
	repo := cuentas.Nuevo(pool)
	c := cuentaDePrueba(t, repo, "valentina")
	ctx := context.Background()

	reloj := time.Now()
	s := NuevasSesiones(pool, 30*24*time.Hour)
	s.ahora = func() time.Time { return reloj }

	token, err := s.Emitir(ctx, c.ID)
	if err != nil {
		t.Fatal(err)
	}
	var guardado []byte
	pool.QueryRow(ctx, `SELECT token_hash FROM sesiones`).Scan(&guardado)
	if string(guardado) == token {
		t.Fatal("el token se guardo en claro")
	}

	if got, err := s.Resolver(ctx, token); err != nil || got.ID != c.ID {
		t.Fatalf("resolver: %v %v", got, err)
	}

	// 29 dias sin uso: sigue viva, y el uso la renueva.
	reloj = reloj.Add(29 * 24 * time.Hour)
	if _, err := s.Resolver(ctx, token); err != nil {
		t.Fatalf("a los 29 dias deberia servir: %v", err)
	}
	// Otros 29 dias desde el ultimo uso: sigue viva (vence por inactividad, no por edad).
	reloj = reloj.Add(29 * 24 * time.Hour)
	if _, err := s.Resolver(ctx, token); err != nil {
		t.Fatalf("usada hace 29 dias deberia servir: %v", err)
	}
	// 31 dias sin uso: vencida.
	reloj = reloj.Add(31 * 24 * time.Hour)
	if _, err := s.Resolver(ctx, token); !errors.Is(err, ErrSesionInvalida) {
		t.Fatalf("a los 31 dias sin uso deberia vencer: %v", err)
	}
}

func TestRevocarYDesactivar(t *testing.T) {
	pool := testdb.Abrir(t)
	repo := cuentas.Nuevo(pool)
	c := cuentaDePrueba(t, repo, "karina")
	ctx := context.Background()
	s := NuevasSesiones(pool, time.Hour)

	t1, _ := s.Emitir(ctx, c.ID)
	t2, _ := s.Emitir(ctx, c.ID)
	if err := s.Revocar(ctx, t1); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Resolver(ctx, t1); !errors.Is(err, ErrSesionInvalida) {
		t.Error("la revocada sigue sirviendo")
	}
	if _, err := s.Resolver(ctx, t2); err != nil {
		t.Error("revocar una cerro otra")
	}
	if _, err := s.Resolver(ctx, "inventado"); !errors.Is(err, ErrSesionInvalida) {
		t.Error("un token inventado no da ErrSesionInvalida")
	}
}

func TestLimites(t *testing.T) {
	pool := testdb.Abrir(t)
	ctx := context.Background()
	l := NuevosLimites(pool)

	for i := 0; i < MaxFallosPorUsuario-1; i++ {
		l.Registrar(ctx, "valentina", "1.1.1.1", false)
	}
	if b, _ := l.Bloqueado(ctx, "valentina", "1.1.1.1"); b {
		t.Fatal("bloqueado antes del quinto fallo")
	}
	l.Registrar(ctx, "Valentina", "1.1.1.1", false)
	if b, _ := l.Bloqueado(ctx, "valentina", "9.9.9.9"); !b {
		t.Fatal("5 fallos seguidos deberian bloquear al usuario desde cualquier IP")
	}
	if b, _ := l.Bloqueado(ctx, "karina", "1.1.1.1"); b {
		t.Fatal("5 fallos de una usuaria bloquearon a otra en la misma IP")
	}

	// Pasada la ventana, se libera.
	l.ahora = func() time.Time { return time.Now().Add(VentanaIntentos + time.Minute) }
	if b, _ := l.Bloqueado(ctx, "valentina", "1.1.1.1"); b {
		t.Fatal("sigue bloqueado pasada la ventana")
	}
}

func TestUnExitoReiniciaLosFallosSeguidos(t *testing.T) {
	pool := testdb.Abrir(t)
	ctx := context.Background()
	l := NuevosLimites(pool)
	base := time.Now()
	paso := 0
	l.ahora = func() time.Time { paso++; return base.Add(time.Duration(paso) * time.Second) }

	for i := 0; i < 4; i++ {
		l.Registrar(ctx, "valentina", "1.1.1.1", false)
	}
	l.Registrar(ctx, "valentina", "1.1.1.1", true)
	for i := 0; i < 4; i++ {
		l.Registrar(ctx, "valentina", "1.1.1.1", false)
	}
	if b, _ := l.Bloqueado(ctx, "valentina", "1.1.1.1"); b {
		t.Fatal("4 fallos despues de un exito no deberian bloquear")
	}
}

func TestIPDetrasDelMismoProxyNoSeBloqueaJunta(t *testing.T) {
	// Lo que importa de U1: si la IP fuera la del proxy, 20 fallos de una
	// usuaria dejarian afuera a las demas. Con la IP real del cliente
	// (httpx.IPDelCliente), cada una cuenta aparte.
	pool := testdb.Abrir(t)
	ctx := context.Background()
	l := NuevosLimites(pool)
	for i := 0; i < MaxFallosPorIP; i++ {
		l.Registrar(ctx, "u"+string(rune('a'+i%3)), "200.0.0.1", false)
	}
	if b, _ := l.Bloqueado(ctx, "karina", "200.0.0.2"); b {
		t.Fatal("otra IP quedo bloqueada por los fallos de 200.0.0.1")
	}
	if b, _ := l.Bloqueado(ctx, "karina", "200.0.0.1"); !b {
		t.Fatal("20 fallos desde una IP deberian bloquearla")
	}
}

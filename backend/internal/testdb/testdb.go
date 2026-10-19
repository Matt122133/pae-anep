// Package testdb da a las pruebas una base Postgres real, migrada y vacia.
//
// **Si no hay base, la prueba FALLA; no se saltea.** Es el sensor que en
// flash-urbano faltaba: alla las pruebas de base se salteaban solas sin
// TEST_DATABASE_URL, y un `go test ./...` verde no habia probado nada sobre el
// paquete que se estaba cambiando (research D16, docs/processes/harness.md).
//
// Saltear exige decirlo: PAE_SIN_DB=1.
package testdb

import (
	"context"
	"os"
	"sync"
	"testing"

	"github.com/Matt122133/pae-anep/backend/internal/db"
)

// URLPorDefecto es la base de pruebas documentada en el quickstart. Puerto
// 55442 y no 55432: ese lo usa la base de pruebas de flash-urbano en la misma
// maquina, y compartirla seria vaciar la de otro proyecto.
const URLPorDefecto = "postgres://postgres:test@localhost:55442/pae_test?sslmode=disable"

// tablas se vacian entre pruebas. TRUNCATE no dispara el trigger de
// inmutabilidad de la bitacora (es de fila, para UPDATE/DELETE).
const tablas = `bitacora, incidencias, visitas, personal_asignaciones, personal,
	escuelas, intentos_ingreso, sesiones, cuentas`

var (
	migrarUnaVez sync.Once
	errMigrar    error
	// cerrojo serializa las pruebas que usan la base dentro de un paquete: todas
	// vacian las mismas tablas.
	cerrojo sync.Mutex
)

// URL devuelve la base a usar: TEST_DATABASE_URL o la documentada.
func URL() string {
	if u := os.Getenv("TEST_DATABASE_URL"); u != "" {
		return u
	}
	return URLPorDefecto
}

// Abrir devuelve un pool sobre una base migrada y vacia. Se cierra solo al
// terminar la prueba.
func Abrir(t testing.TB) *db.Pool {
	t.Helper()
	if os.Getenv("PAE_SIN_DB") == "1" {
		t.Skip("PAE_SIN_DB=1: prueba de base salteada a pedido")
	}

	ctx := context.Background()
	pool, err := db.Abrir(ctx, URL())
	if err != nil {
		t.Fatalf("no hay base de pruebas en %s (%v).\n"+
			"Levantala con el comando de specs/001-backend-legajo-compartido/quickstart.md,\n"+
			"o corre con PAE_SIN_DB=1 sabiendo que estas pruebas NO van a correr.", URL(), err)
	}

	migrarUnaVez.Do(func() { errMigrar = db.Migrar(ctx, pool) })
	if errMigrar != nil {
		pool.Close()
		t.Fatalf("no se pudo migrar la base de pruebas: %v", errMigrar)
	}

	cerrojo.Lock()
	if _, err := pool.Exec(ctx, "TRUNCATE "+tablas+" CASCADE"); err != nil {
		cerrojo.Unlock()
		pool.Close()
		t.Fatalf("no se pudo vaciar la base de pruebas: %v", err)
	}
	t.Cleanup(func() {
		pool.Close()
		cerrojo.Unlock()
	})
	return pool
}

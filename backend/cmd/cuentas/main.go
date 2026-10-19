// Comando cuentas administra las cuentas del equipo (FR-009, US4).
//
//	cuentas crear      -usuario karina -nombre "Karina Rivero" -rol "Ecónoma del PAE"
//	cuentas resetear   -usuario karina
//	cuentas desactivar -usuario karina
//	cuentas listar     [-todas]
//
// La contrasena se pide por la entrada estandar, **sin eco y nunca como
// argumento**: un argumento queda en el historial de la shell y en la lista de
// procesos (research D17). Si la entrada no es una terminal (un pipe, en
// pruebas o en `railway run`), se lee la primera linea.
//
// Lee DATABASE_URL del entorno, igual que el servicio.
package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"

	"golang.org/x/term"

	"github.com/Matt122133/pae-anep/backend/internal/auth"
	"github.com/Matt122133/pae-anep/backend/internal/cuentas"
	"github.com/Matt122133/pae-anep/backend/internal/db"
)

func main() {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		fmt.Fprintln(os.Stderr, "falta DATABASE_URL")
		os.Exit(2)
	}
	ctx := context.Background()
	pool, err := db.Abrir(ctx, url)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer pool.Close()
	if err := db.Migrar(ctx, pool); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	if err := ejecutar(ctx, cuentas.Nuevo(pool), os.Args[1:], leerDeTerminal, os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

// lectorContrasena pide una contrasena mostrando el aviso.
type lectorContrasena func(aviso string) (string, error)

// entrada es UN lector para toda la ejecucion. Con un bufio.Reader nuevo por
// lectura, el primero se tragaba todo el pipe y la confirmacion llegaba vacia:
// `printf 'c\nc\n' | cuentas crear ...` fallaba con "no coinciden", que es
// justo como se usa con `railway run`. Lo encontro la prueba de humo del
// 2026-10-19; las pruebas unitarias inyectaban el lector y no lo veian.
var entrada = bufio.NewReader(os.Stdin)

func leerDeTerminal(aviso string) (string, error) {
	fmt.Fprint(os.Stderr, aviso)
	if term.IsTerminal(int(os.Stdin.Fd())) {
		b, err := term.ReadPassword(int(os.Stdin.Fd()))
		fmt.Fprintln(os.Stderr)
		return string(b), err
	}
	return leerLinea(entrada)
}

// leerLinea pide un *bufio.Reader y no un io.Reader a proposito: envolver uno
// nuevo en cada llamada es el bug de arriba.
func leerLinea(r *bufio.Reader) (string, error) {
	linea, err := r.ReadString('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return "", err
	}
	return strings.TrimRight(linea, "\r\n"), nil
}

const uso = `uso: cuentas <crear|resetear|desactivar|listar> [opciones]
  crear      -usuario U -nombre "N" -rol "Ecónoma del PAE" | "Licenciada en Nutrición"
  resetear   -usuario U
  desactivar -usuario U
  listar     [-todas]`

func ejecutar(ctx context.Context, repo *cuentas.Repositorio, args []string, leer lectorContrasena, salida io.Writer) error {
	if len(args) == 0 {
		return errors.New(uso)
	}
	fs := flag.NewFlagSet(args[0], flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	usuario := fs.String("usuario", "", "usuario")
	nombre := fs.String("nombre", "", "nombre a mostrar")
	rol := fs.String("rol", cuentas.RolEconoma, "rol")
	todas := fs.Bool("todas", false, "incluir desactivadas")
	if err := fs.Parse(args[1:]); err != nil {
		return fmt.Errorf("%v\n%s", err, uso)
	}

	pedirNueva := func() (string, error) {
		c1, err := leer(fmt.Sprintf("Contraseña nueva para %s (mínimo %d caracteres): ", *usuario, auth.MinimoContrasena))
		if err != nil {
			return "", err
		}
		c2, err := leer("Repetila: ")
		if err != nil {
			return "", err
		}
		if c1 != c2 {
			return "", errors.New("las contraseñas no coinciden")
		}
		return auth.HashContrasena(c1)
	}

	switch args[0] {
	case "crear":
		if *usuario == "" || *nombre == "" {
			return errors.New(uso)
		}
		hash, err := pedirNueva()
		if err != nil {
			return err
		}
		c, err := repo.Crear(ctx, *usuario, *nombre, *rol, hash)
		if err != nil {
			return err
		}
		fmt.Fprintf(salida, "cuenta creada: %s (%s, %s)\n", c.Usuario, c.Nombre, c.Rol)
	case "resetear":
		if *usuario == "" {
			return errors.New(uso)
		}
		if _, err := repo.PorUsuario(ctx, *usuario); err != nil {
			return err
		}
		hash, err := pedirNueva()
		if err != nil {
			return err
		}
		if err := repo.CambiarHash(ctx, *usuario, hash); err != nil {
			return err
		}
		fmt.Fprintf(salida, "contraseña reseteada y sesiones cerradas: %s\n", cuentas.NormalizarUsuario(*usuario))
	case "desactivar":
		if *usuario == "" {
			return errors.New(uso)
		}
		if err := repo.Desactivar(ctx, *usuario); err != nil {
			return err
		}
		fmt.Fprintf(salida, "cuenta desactivada y sesiones cerradas: %s\n", cuentas.NormalizarUsuario(*usuario))
	case "listar":
		lista, err := repo.Listar(ctx, *todas)
		if err != nil {
			return err
		}
		for _, c := range lista {
			estado := "activa"
			if !c.Activa {
				estado = "DESACTIVADA"
			}
			fmt.Fprintf(salida, "%-16s %-28s %-24s %s\n", c.Usuario, c.Nombre, c.Rol, estado)
		}
	default:
		return errors.New(uso)
	}
	return nil
}

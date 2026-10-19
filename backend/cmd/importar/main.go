// Comando importar carga el legajo real desde un JSON (US5,
// contracts/importacion.md).
//
//	importar -archivo ../datos/legajo-real.json            # base vacia
//	importar -archivo ../datos/legajo-real.json -validar   # solo valida
//	importar -archivo ../datos/legajo-real.json -agregar   # base con datos
//
// Todo o nada: con un error no se carga nada, y se listan todos. El archivo
// real tiene datos personales: va en datos/ (ignorado), nunca en el repo.
//
// Lee DATABASE_URL del entorno. Conviene crear las cuentas ANTES de importar:
// asi los visitantes y autores historicos que coincidan con un usuario quedan
// asociados a su cuenta.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/Matt122133/pae-anep/backend/internal/db"
	"github.com/Matt122133/pae-anep/backend/internal/importacion"
)

func main() {
	archivo := flag.String("archivo", "", "JSON a importar")
	soloValidar := flag.Bool("validar", false, "validar sin escribir")
	agregar := flag.Bool("agregar", false, "permitir importar sobre una base con datos")
	flag.Parse()

	url := os.Getenv("DATABASE_URL")
	if *archivo == "" || url == "" {
		fmt.Fprintln(os.Stderr, "uso: importar -archivo <json> [-validar] [-agregar]   (requiere DATABASE_URL)")
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
	if err := correr(ctx, pool, *archivo, *soloValidar, *agregar, os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

var errHayErrores = errors.New("no se cargó nada")

func correr(ctx context.Context, pool *db.Pool, archivo string, soloValidar, agregar bool, out io.Writer) error {
	datos, err := os.ReadFile(archivo)
	if err != nil {
		return err
	}
	ex, cuentas, err := importacion.LeerExistentes(ctx, pool)
	if err != nil {
		return err
	}
	res := importacion.Validar(datos, ex, cuentas)
	for _, a := range res.Avisos {
		fmt.Fprintln(out, "aviso:", a)
	}
	if len(res.Errores) > 0 {
		for _, e := range res.Errores {
			fmt.Fprintln(out, "error:", e)
		}
		fmt.Fprintf(out, "%d errores. ", len(res.Errores))
		return errHayErrores
	}
	p := res.Plan
	fmt.Fprintf(out, "archivo válido: escuelas %d · personal %d · visitas %d · incidencias %d · bitácora %d\n",
		len(p.Escuelas), len(p.Personal), len(p.Visitas), len(p.Incidencias), len(p.Bitacora))
	if soloValidar {
		fmt.Fprintln(out, "-validar: no se escribió nada")
		return nil
	}
	c, err := importacion.Cargar(ctx, pool, p, filepath.Base(archivo), agregar)
	if err != nil {
		return err
	}
	fmt.Fprintln(out, "cargado:", c)
	return nil
}

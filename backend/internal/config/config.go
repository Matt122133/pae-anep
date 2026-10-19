// Package config lee la configuracion del servicio desde el entorno.
//
// Solo del entorno: no hay archivo que el servicio abra por su cuenta. En
// Railway las variables las inyecta la plataforma; en local las exporta
// dev.sh desde backend/.env. Si falta una obligatoria el servicio no arranca:
// es preferible un servicio caido a uno que levanta a medias y falla con la
// primera usuaria.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config es todo lo que el servicio necesita saber de su entorno.
type Config struct {
	DatabaseURL        string
	OrigenesPermitidos []string
	Puerto             string

	// SesionInactividad es cuanto puede pasar sin usar una sesion antes de que
	// venza (FR-006: 30 dias).
	SesionInactividad time.Duration

	// ConfiarProxy hace que la IP del cliente se tome de X-Forwarded-For. En
	// Railway todo llega desde su proxy; sin esto, los limites por IP
	// bloquearian a todas las usuarias juntas (research D4).
	ConfiarProxy bool
}

// Cargar lee y valida la configuracion. Devuelve un error que nombra TODAS las
// variables que faltan, no solo la primera: corregir de a una por arranque es
// como se pierde una tarde.
func Cargar() (*Config, error) {
	return cargarDe(os.Getenv)
}

func cargarDe(leer func(string) string) (*Config, error) {
	var faltan []string
	obligatoria := func(nombre string) string {
		v := strings.TrimSpace(leer(nombre))
		if v == "" {
			faltan = append(faltan, nombre)
		}
		return v
	}

	cfg := &Config{
		DatabaseURL: obligatoria("DATABASE_URL"),
		Puerto:      "8080",
	}
	origenes := obligatoria("CORS_ORIGENES")

	if len(faltan) > 0 {
		return nil, fmt.Errorf("faltan variables de entorno obligatorias: %s", strings.Join(faltan, ", "))
	}

	for _, o := range strings.Split(origenes, ",") {
		o = strings.TrimRight(strings.TrimSpace(o), "/")
		if o != "" {
			cfg.OrigenesPermitidos = append(cfg.OrigenesPermitidos, o)
		}
	}
	if len(cfg.OrigenesPermitidos) == 0 {
		return nil, fmt.Errorf("CORS_ORIGENES no tiene ningun origen")
	}

	if p := strings.TrimSpace(leer("PORT")); p != "" {
		cfg.Puerto = p
	}

	cfg.SesionInactividad = 30 * 24 * time.Hour
	if v := strings.TrimSpace(leer("SESION_INACTIVIDAD")); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil || d <= 0 {
			return nil, fmt.Errorf("SESION_INACTIVIDAD invalida: %q", v)
		}
		cfg.SesionInactividad = d
	}

	cfg.ConfiarProxy = true
	if v := strings.TrimSpace(leer("CONFIAR_PROXY")); v != "" {
		b, err := strconv.ParseBool(v)
		if err != nil {
			return nil, fmt.Errorf("CONFIAR_PROXY invalida: %q", v)
		}
		cfg.ConfiarProxy = b
	}

	return cfg, nil
}

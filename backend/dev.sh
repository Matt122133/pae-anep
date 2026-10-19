#!/usr/bin/env bash
#
# Levanta lo que el backend necesita para correr en local, en un comando: la
# base de desarrollo en Docker y el servicio.
#
#   cd backend && ./dev.sh
#
# Puerto 55443 y no 55433: ese lo usa flash-urbano en esta misma maquina. La
# base de PRUEBAS es otra (55442) y se vacia en cada corrida de tests.
#
# NO es para produccion: Railway usa el Dockerfile.

set -euo pipefail
cd "$(dirname "$0")"

CONTENEDOR="pae-pg-dev"
PUERTO_DB=55443

rojo()  { printf '\033[31m%s\033[0m\n' "$*"; }
verde() { printf '\033[32m%s\033[0m\n' "$*"; }

if ! docker ps >/dev/null 2>&1; then
  rojo "Docker no responde. Abri Docker Desktop y espera 'Engine running'."
  exit 1
fi

# Tres estados: no existe (crear), parado (arrancar), corriendo (no tocar).
# Recrearla siempre borraria las cuentas de prueba.
estado="$(docker inspect -f '{{.State.Status}}' "$CONTENEDOR" 2>/dev/null || true)"
estado="$(printf '%s' "$estado" | tr -d '[:space:]')"
case "${estado:-no-existe}" in
  running) verde "✓ La base ya estaba corriendo" ;;
  no-existe)
    docker run -d --name "$CONTENEDOR" -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=pae_dev \
      -p "${PUERTO_DB}:5432" postgres:17 >/dev/null
    verde "✓ Base creada" ;;
  *) docker start "$CONTENEDOR" >/dev/null; verde "✓ Base arrancada" ;;
esac

# Postgres acepta conexiones bastante despues de figurar como 'running'.
for _ in $(seq 1 60); do
  docker exec "$CONTENEDOR" pg_isready -U postgres -d pae_dev >/dev/null 2>&1 && break
  sleep 1
done

if [ ! -f .env ]; then
  rojo "Falta backend/.env:  cp .env.example .env"
  exit 1
fi
# El servicio lee solo del entorno: set -a exporta todo lo que define .env.
set -a; . ./.env; set +a

verde "Arrancando en http://localhost:${PORT:-8080}  (salud: /salud, cortar: Ctrl+C)"
exec go run ./cmd/api

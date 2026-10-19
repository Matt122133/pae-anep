# Handoff — dónde quedó 001 (2026-10-19)

Archivo de traspaso entre sesiones. Se borra en T059, antes del PR.

## Estado

- Rama `001-backend-legajo-compartido`, **sin push**. Plan `active`.
- **57 de 59 tareas hechas** (`tasks.md` es la fuente de verdad del avance).
  Backend completo, frontend reescrito contra la API, docs al día.
- `verify:` del plan **verde**, sin pruebas salteadas.
- Prueba de humo del API levantado: OK (CORS, ingreso, lectura, escritura con
  bitácora, salida). Encontró y se arregló un bug real en `cmd/cuentas` (pipe).

## Lo que falta

1. **T058 — probar la interfaz en un navegador y en un teléfono.** Nunca se
   abrió la app nueva en un navegador. Los 15 escenarios y cuáles faltan están
   al final de `quickstart.md`. Para levantar todo:
   ```bash
   docker start pae-pg-test pae-pg-dev        # pruebas :55442, desarrollo :55443
   cd backend && cp .env.example .env && ./dev.sh    # API en :8080
   # en otra terminal, cuentas de prueba (pide contraseña):
   cd backend && set -a && . ./.env && set +a && go run ./cmd/cuentas crear -usuario valentina -nombre "Valentina (prueba)" -rol "Ecónoma del PAE"
   go run ./cmd/importar -archivo cmd/importar/testdata/ejemplo.json   # si la base está vacía
   # frontend, en la raíz:
   VITE_API_URL=http://localhost:8080 npm run dev     # http://localhost:3000
   ```
   La base de desarrollo `pae-pg-dev` ya tiene cuentas `valentina` y `karina`
   (contraseña `contraseña de prueba`) y el ejemplo importado, con alguna
   edición de la prueba de humo.
2. **T059 — antes del PR**: borrar este archivo, correr el chequeo de datos
   personales de `AGENTS.md` (hoy da limpio), poner el plan en `completed`.

## Decisiones ya tomadas por el dueño del repo (no volver a preguntar)

- Go + Postgres en Railway; frontend en GitHub Pages. Usuario + contraseña con
  hash, sin recuperación; cuentas por comando. JSON real armado por su script,
  forma del respaldo actual, en `datos/` (ignorado).
- 001 online; borradores "no enviados" sí en 001; todo lo demás offline en 002.
- Co-edición en vivo → feature 003; en 001, rechazo del segundo guardado +
  aviso de presencia.
- Sesión 30 días sin uso; bajas lógicas; traslado de personal conserva historial.

## Para después de 001

- **Despliegue** (feature propio): Railway (servicio + Postgres, variables,
  `railway run` para `cuentas`/`importar`), GitHub Pages (`base` de Vite para
  `/pae-anep/`, workflow, `VITE_API_URL` como variable del repo), CORS con el
  origen de Pages.
- **002**: lectura sin conexión y sincronización automática de borradores.
- Pendientes en `docs/tech-debt-tracker.md` (nombres reales en el historial de
  git, `.gitattributes`, etc.).

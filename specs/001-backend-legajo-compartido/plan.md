---
ticket: none
status: completed
covers:
  - backend/
  - src/
  - package.json
  - package-lock.json
  - vite.config.ts
  - tsconfig.json
  - .gitignore
  - .env.example
  - .githooks/pre-commit
verify: npm ci && npm run lint && npm test && npm run build && cd backend && go vet ./... && go test -count=1 ./... && go build ./...
analyzed: 2026-10-18
---

<!--
Harness frontmatter:
- ticket: known Jira key, or none when there is no ticket.
- status: draft until a human promotes the analyzed plan to active.
- covers: repository-relative path prefixes this feature may edit.
- verify: command that proves the feature works; run until green.
- analyzed: date the /speckit-analyze report was read before promotion.
-->

# Implementation Plan: Backend online para el legajo compartido

**Branch**: `001-backend-legajo-compartido` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-backend-legajo-compartido/spec.md`

## Summary

Se crea `backend/`, un servicio Go con Postgres que pasa a ser la fuente de
verdad del legajo: cuentas con usuario y contraseña (argon2id), sesiones por
token en `Authorization`, API por recurso con control de versión, bitácora
escrita por el servidor en la misma transacción e inmutable por trigger, bajas
lógicas, traslado de personal con historial, aviso de presencia en memoria, y
dos comandos de servidor (`cuentas`, `importar`). El frontend cambia de dónde
sale su `DatabaseState` (de `localStorage` a `GET /legajo`), escribe por la API,
gana pantalla de ingreso y borradores "no enviados" con reenvío manual, y pierde
el selector de usuaria activa y el simulador de sincronización. Detalle de cada
decisión en [research.md](research.md).

Lo observable al terminar: con dos navegadores y dos cuentas de prueba, lo que
carga una lo ve la otra al recargar, la bitácora dice quién fue, y un guardado
sin red queda como borrador que se reenvía una sola vez (ver
[quickstart.md](quickstart.md)).

## Technical Context

**Language/Version**: Go 1.26 (backend); TypeScript + React 19 + Vite 8 (frontend, existente)

**Primary Dependencies**: `net/http` estándar, `jackc/pgx/v5`, `golang.org/x/crypto` (argon2id); Vitest (nuevo, dev) en el frontend

**Storage**: PostgreSQL 17 (Railway en producción; Docker en local). En el navegador, `localStorage` solo para la sesión y los borradores

**Testing**: `go test` contra Postgres real en `:55442` (falla si no hay base, D16); Vitest para `api.ts` y `borradores.ts`; escenarios manuales del quickstart

**Target Platform**: servicio Linux en contenedor (Railway); PWA estática en navegadores móviles

**Project Type**: web-service + SPA estática, orígenes distintos

**Performance Goals**: `GET /legajo` completo < 1 s en conexión móvil para ~140 escuelas (SC-005)

**Constraints**: credencial en encabezado (no cookies); nada de datos reales en el repo; el servicio no arranca si falta configuración obligatoria

**Scale/Scope**: 4 cuentas, ~140 escuelas, cientos de visitas por año; una réplica

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumple | Cómo |
|---|---|---|
| I. Lo escrito sin señal no se pierde | Sí, en su mitad no postergable | Borradores locales con id del dispositivo y reenvío idempotente (D6, D14). La llegada automática es 002, decidido por el dueño en clarify |
| II. Un legajo, cada cambio con autor | Sí | Autor desde la sesión, bitácora en la misma transacción, trigger de inmutabilidad, versión por registro (D7, D9) |
| III. Simplicidad | Sí | Sin framework, sin ORM, presencia en memoria, una lectura de legajo completo (D1, D8, D13) |
| IV. Datos personales, repo público | Sí | `datos/` ignorado, ejemplo ficticio, ningún dato sin sesión, secretos solo en entorno, contraseñas por stdin (D15, D17) |
| V. Pages + Railway | Sí | Un servicio y una base en Railway; nada más pago. Despliegue en feature aparte |
| VI. Mobile-first | Sí | Ingreso y borradores pensados para el teléfono; no se rediseña la carga de campo |

Harness: `covers:` nombra todos los prefijos a tocar; `verify:` instala, tipa,
prueba y compila las dos superficies, con las pruebas de base **obligatorias**.

Re-chequeo post-diseño: sin violaciones. *Complexity Tracking* vacío.

## Project Structure

### Documentation (this feature)

```text
specs/001-backend-legajo-compartido/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/api.md, contracts/importacion.md
├── checklists/requirements.md
├── HANDOFF.md           # traspaso entre sesiones; se borra al activar
└── tasks.md             # /speckit-tasks
```

### Source Code

```text
backend/
├── cmd/api/             # servicio: config, migrar, rutas, servidor
├── cmd/cuentas/         # crear | resetear | desactivar | listar (contraseña por stdin)
├── cmd/importar/        # importación JSON todo-o-nada; testdata/ejemplo.json ficticio
├── internal/config/     # entorno; falla al arrancar si falta algo
├── internal/db/         # pool, migraciones con cerrojo, tareas periódicas
├── internal/testdb/     # helper de pruebas: base obligatoria salvo PAE_SIN_DB=1
├── internal/httpx/      # CORS, middleware de sesión, errores JSON
├── internal/auth/       # contraseñas, sesiones, límites de intento
├── internal/cuentas/    # repositorio de cuentas
├── internal/bitacora/   # diff campo a campo y escritura en transacción
├── internal/legajo/     # escuelas, personal, traslados, visitas, incidencias, GET /legajo
├── internal/presencia/  # mapa en memoria con latidos
├── migrations/          # SQL embebido, solo hacia adelante
├── Dockerfile, dev.sh, .env.example, README.md

src/
├── services/api.ts        # nuevo: cliente HTTP, token, errores tipados
├── services/borradores.ts # nuevo: borradores no enviados
├── services/sesion.ts     # nuevo: token en localStorage, cerrar sesión
├── services/storage.ts    # queda solo con exportación CSV/JSON y helpers de carné
├── components/Login.tsx            # nuevo
├── components/BorradoresModal.tsx  # nuevo (reemplaza a SyncModal)
├── components/PresenciaAviso.tsx   # nuevo
├── App.tsx               # handlers → API; sin usuaria activa ni simulador
└── (componentes que hoy leen PAE_TEAM_MEMBERS o el estado offline: ajustados)
```

**Structure Decision**: se copia la estructura de `flash-urbano/backend` (corte
por dominio dentro de `internal/`). El frontend se queda en la raíz: moverlo a
`web/` sería un refactor fuera de alcance. `src/data/initialData.ts` queda solo
para desarrollo y deja de cargarse automáticamente.

## Pasos

Prosa del orden de trabajo; el detalle lo genera `/speckit-tasks`.

1. **Instalación reproducible del frontend** (D18): arreglar `esbuild`, quitar
   dependencias muertas, versionar `package-lock.json`, agregar Vitest. Hecho
   cuando `npm ci && npm run lint && npm test && npm run build` da verde en un
   clon limpio.
2. **Esqueleto del servicio**: config, pool, migraciones con cerrojo, `/salud`,
   CORS, `testdb`, Dockerfile y `dev.sh`. Hecho cuando `go test ./...` corre
   contra la base de pruebas y falla con ella apagada.
3. **Identidad**: tabla y comando `cuentas`, argon2id, ingreso con límites,
   sesiones con vencimiento por inactividad, `/auth/*`, `/yo`.
4. **Legajo**: esquema completo, `GET /legajo` con derivados, escrituras con
   versión, idempotencia por id, bitácora en transacción + trigger, bajas
   lógicas, traslado, presencia.
5. **Importación**: `cmd/importar` con validación completa, `-validar`,
   `-agregar`, ejemplo ficticio y prueba de que un error no carga nada.
6. **Frontend**: login, `api.ts`, `App.tsx` contra la API, cuentas en lugar de
   `PAE_TEAM_MEMBERS`, borradores, aviso de presencia y de conflicto, quitar
   simulador y toggle offline, deshabilitar la importación desde la app.
7. **Cierre**: actualizar `ARCHITECTURE.md`, `SECURITY.md`, `dev-setup.md`,
   `backend/README.md`, tech-debt; carril `npm run lint` en el pre-commit;
   recorrer el quickstart completo.

## Complexity Tracking

Sin violaciones de la constitución que justificar.

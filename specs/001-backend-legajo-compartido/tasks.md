# Tasks: Backend online para el legajo compartido

**Input**: `specs/001-backend-legajo-compartido/` (plan, spec, research, data-model, contracts, quickstart)

**Tests**: sí. `research.md` D16 los hace parte del `verify:`; las pruebas de
base **fallan** si no hay Postgres en `:55442` (salvo `PAE_SIN_DB=1`).

**Formato**: `- [ ] T### [P?] [US?] descripción con ruta`. `[P]` = archivos
distintos y sin dependencias pendientes.

## Phase 1: Setup

- [x] T001 Arreglar la instalación en `package.json`: subir `esbuild` a una versión que satisfaga el peer de `vite@8` (o quitarlo si nada lo importa), quitar `@google/genai`, `express`, `dotenv`, `@types/express`; agregar `vitest` y el script `"test": "vitest run"`. Generar y versionar `package-lock.json`. Hecho cuando `npm ci && npm run lint && npm run build` pasa sin `--legacy-peer-deps` (D18)
- [x] T002 [P] Configurar Vitest en `vite.config.ts` (entorno `node`, `src/**/*.test.ts`) y tipos en `tsconfig.json`
- [x] T003 [P] Crear el módulo Go `github.com/Matt122133/pae-anep/backend` en `backend/go.mod` (Go 1.26, pgx/v5, x/crypto) y `backend/.gitignore` (`.env`)
- [x] T004 [P] Agregar `datos/` y `backend/.env` a `.gitignore` raíz; reemplazar `.env.example` raíz por `VITE_API_URL` (sin `GEMINI_API_KEY`, sin `APP_URL`)
- [x] T005 [P] Crear `backend/.env.example` con `DATABASE_URL`, `CORS_ORIGENES`, `PORT`, `SESION_INACTIVIDAD` (nombres y ejemplos locales, nunca valores reales)

## Phase 2: Foundational (bloquea todas las historias)

- [x] T006 `backend/internal/config/config.go` + `config_test.go`: lee el entorno, valida obligatorias, falla con la lista de las faltantes
- [x] T007 `backend/internal/db/db.go` (pool pgx) y `backend/internal/db/migrate.go` (migraciones embebidas, solo hacia adelante, una transacción por archivo, cerrojo de aviso — copiar el patrón de `flash-urbano/backend/internal/db/migrate.go`) + `backend/migrations/embed.go`
- [x] T008 `backend/internal/testdb/testdb.go`: abre `TEST_DATABASE_URL` o `postgres://postgres:test@localhost:55442/pae_test?sslmode=disable`, migra, trunca entre pruebas; si no conecta **falla** salvo `PAE_SIN_DB=1` (D16) + `testdb_test.go` que lo comprueba
- [x] T009 `backend/migrations/0001_esquema_inicial.sql`: todas las tablas de `data-model.md` con sus `CHECK`, índices únicos (`escuelas.numero`, `(visitas.escuela_id, numero)`, asignación vigente parcial) y el trigger `bitacora_inmutable`
- [x] T010 [P] `backend/internal/httpx/cors.go` + test: solo orígenes de `CORS_ORIGENES`, preflight, encabezados de `contracts/api.md`
- [x] T011 [P] `backend/internal/httpx/errores.go`: respuestas JSON de la tabla de errores del contrato; nunca filtra el error interno
- [x] T012 `backend/internal/httpx/sesion.go` + test: lee `Authorization: Bearer`, resuelve la cuenta con una función inyectada, 401 `sesion_invalida`, cuenta en el contexto (genérico, como en `flash-urbano`)
- [x] T013 `backend/cmd/api/main.go`: config → pool → migrar → rutas → servidor con timeouts y apagado ordenado; `GET /salud`; tarea periódica de purgas en `backend/internal/db/janitor.go`
- [x] T014 [P] `backend/Dockerfile` (dos etapas, distroless nonroot) y `backend/dev.sh` (levanta `pae-pg-dev` en :55443 (no 55433: lo usa flash-urbano), carga `.env`, `go run ./cmd/api`)

**Checkpoint**: `cd backend && go test ./...` pasa con la base de pruebas arriba y falla con ella apagada.

## Phase 3: User Story 1 — Ingresar y ver el legajo compartido (P1) 🎯 MVP

**Prueba independiente**: dos cuentas en dos navegadores ven los mismos datos; sin sesión, ningún dato.

- [x] T015 [P] [US1] `backend/internal/auth/contrasena.go` + test: argon2id en formato PHC, verificación en tiempo constante, mínimo 10 caracteres (D2)
- [x] T016 [P] [US1] `backend/internal/cuentas/cuentas.go` + test: crear, buscar por usuario (normalizado), listar activas, desactivar, cambiar hash
- [x] T017 [US1] `backend/internal/auth/sesion.go` + test: emitir token (32 bytes, se guarda sha256), resolver con vencimiento por inactividad de 30 días y `ultimo_uso` como máximo cada 5 min, revocar una, revocar todas de una cuenta (D3)
- [x] T018 [US1] `backend/internal/auth/limites.go` + test: 5 fallos seguidos por usuario / 20 por IP en 15 min bloquean; bloqueado responde igual que credencial mala sin verificar hash; IP del cliente = última entrada de `X-Forwarded-For` con `CONFIAR_PROXY`, con prueba de que dos clientes detrás del mismo proxy no se bloquean entre sí (D4)
- [x] T019 [US1] `backend/internal/auth/handlers.go` + test: `POST /auth/ingresar`, `POST /auth/salir`, `GET /yo`; mismo error para usuario inexistente y contraseña mala (FR-005)
- [x] T020 [US1] `backend/cmd/cuentas/main.go` subcomando `crear` (`-usuario -nombre -rol`, contraseña por stdin sin eco, D17) y `listar`
- [x] T021 [US1] `backend/internal/legajo/lectura.go` + test: `GET /legajo` en la forma de `DatabaseState` con derivados de escuela (D10), `cuentas`, bitácora completa, `?incluir_inactivos=1`
- [ ] T022 [US1] Montar rutas de US1 en `backend/cmd/api/main.go` y prueba de que **cada** ruta de datos responde 401 sin credencial (SC-003) en `backend/cmd/api/main_test.go`
- [ ] T023 [P] [US1] `src/services/sesion.ts` + `src/services/sesion.test.ts`: guardar/leer/borrar token y cuenta en `localStorage` (try/catch)
- [ ] T024 [P] [US1] `src/services/api.ts` + `src/services/api.test.ts`: `fetch` con base `import.meta.env.VITE_API_URL`, token, errores tipados (`red`, `sesion`, `invalido` con campos, `conflicto` con actual, `servidor`); generador de id con respaldo para contexto no seguro
- [ ] T025 [US1] `src/components/Login.tsx`: formulario usuario/contraseña mobile-first, mensaje único de error, estado de carga
- [ ] T026 [US1] `src/App.tsx`: sin sesión muestra `Login`; con sesión carga `GET /legajo` en el `DatabaseState`; 401 vuelve a `Login`; botón cerrar sesión. Quitar `initializeDatabase()` del arranque. Agregar `active?` y `version?` a `School`, `StaffMember`, `Visit`, `SchoolIssue` en `src/types/index.ts`
- [ ] T027 [US1] Reemplazar el selector de usuaria activa por el nombre de la cuenta en `src/components/Navbar.tsx` y `src/components/MobileBottomNav.tsx`; quitar `getActiveUserId`/`setActiveUserId` de `src/services/storage.ts`

## Phase 4: User Story 2 — Cargar y editar a mi nombre (P1)

**Prueba independiente**: A registra una visita y edita una auxiliar; B recarga y ve ambos cambios y dos entradas de bitácora de A.

- [ ] T028 [US2] `backend/internal/bitacora/bitacora.go` + test: diff campo a campo entre registro de la base y el nuevo con etiquetas legibles, escritura dentro de una `pgx.Tx`, autor desde la cuenta; prueba de que `UPDATE`/`DELETE` sobre `bitacora` falla por el trigger
- [ ] T029 [US2] `backend/internal/legajo/escuelas.go` + test: `POST` idempotente por id, `PUT` con versión (409 / 200 si igual, D7), `DELETE` lógico, `reactivar`; validación de listas cerradas con error por campo
- [ ] T030 [US2] `backend/internal/legajo/personal.go` + test: alta, edición con versión, baja lógica, `POST /personal/{id}/traslado` con `personal_asignaciones` y bitácora en ambas escuelas (FR-033)
- [ ] T031 [US2] `backend/internal/legajo/visitas.go` + test: `POST /visitas` con `newIssues` en una transacción, número correlativo con reintento ante choque, `contenido` validado con `DisallowUnknownFields`, `PUT` con versión, `DELETE` solo de no realizadas; escuela inactiva → 400 `schoolId: "escuela inactiva"`; prueba de dos altas simultáneas en la misma escuela
- [ ] T032 [US2] `backend/internal/legajo/incidencias.go` + test: alta, edición/cambio de estado con versión y regla `Resuelto ⇔ fecha_resolucion`, baja
- [ ] T033 [US2] `backend/internal/legajo/notas.go` + test: `POST /bitacora/notas`; `PUT`/`DELETE` sobre `/bitacora` → 405
- [ ] T034 [US2] Prueba en `backend/internal/legajo/autor_test.go`: un cuerpo con `userId`/`inspectorName`/`timestamp` falsos queda atribuido a la dueña de la sesión (SC-002)
- [ ] T035 [P] [US2] `backend/internal/presencia/presencia.go` + test: mapa en memoria con latidos, vence a 60 s, `PUT`/`DELETE /presencia/{tipo}/{id}` (D8)
- [ ] T036 [US2] Montar rutas de US2 en `backend/cmd/api/main.go`
- [ ] T037 [US2] `src/App.tsx`: cada `handleSave*`/`handleDelete*`/`handleToggleIssueStatus` llama a la API y reemplaza el registro con la respuesta; deja de armar bitácora y contadores en el cliente; los logs vienen del servidor
- [ ] T038 [US2] Cuentas del servidor en lugar de `PAE_TEAM_MEMBERS`: `src/components/TeamVisitorSelector.tsx`, `src/components/NewVisitModal.tsx`, `src/components/ScheduleVisitModal.tsx`, `src/components/SchoolDetail.tsx`, `src/components/ActivityLogView.tsx`, `src/components/Dashboard.tsx`, `src/components/SchoolReportModal.tsx`; `formatTeamVisitors` en `src/types/index.ts` recibe la lista de cuentas. **Borrar** `PAE_TEAM_MEMBERS`, los nombres fijos de `formatTeamVisitors` y `generateSeedActivityLogs` de `src/services/storage.ts` (nombres reales en repo público, tech-debt)
- [ ] T039 [P] [US2] `src/components/PresenciaAviso.tsx` + uso en los modales de edición (latido cada 20 s, `DELETE` al cerrar)
- [ ] T040 [US2] Manejo de `409` en los modales de edición: aviso con la versión actual y opción de reintentar sin perder lo escrito
- [ ] T041 [US2] Acción de traslado de auxiliar en `src/components/StaffModal.tsx` / `src/components/SchoolDetail.tsx`; bajas lógicas y "ver inactivos" en `src/components/SchoolList.tsx`

## Phase 5: User Story 3 — Sin señal, lo escrito no se pierde (P2)

**Prueba independiente**: offline, guardar visita, cerrar y reabrir, volver online, reenviar dos veces: una sola visita en el servidor.

- [ ] T042 [P] [US3] `src/services/borradores.ts` + `src/services/borradores.test.ts`: agregar, listar, reenviar (borra solo si el servidor confirmó), descartar; sobrevive a recargar; qué errores generan borrador (red, 401, 5xx) y cuáles no (400, 409); un reenvío que da 400/409 deja el borrador con el error y la opción "Abrir en el formulario" (D14)
- [ ] T043 [US3] Integrar borradores en `src/App.tsx`: un guardado fallido por red/401/5xx crea borrador y avisa "no enviado" sin cerrar el formulario; 401 además pide reingresar
- [ ] T044 [US3] `src/components/BorradoresModal.tsx` y contador en `src/components/Navbar.tsx` / `src/components/MobileBottomNav.tsx`; descartar con confirmación; aviso al cerrar sesión con borradores pendientes
- [ ] T045 [US3] Eliminar `src/components/SyncModal.tsx`, el toggle de offline simulado y todo indicador de "sincronizado" (`src/App.tsx`, `src/components/Dashboard.tsx`, `src/components/SchoolDetail.tsx`, `src/components/SchoolList.tsx`); quitar `isOfflinePendingSync`/`offlineSavedAt`/`syncedAt` de `src/types/index.ts` y la migración que los inventa en `src/services/storage.ts` (FR-027, SC-007)
- [ ] T046 [US3] Prueba de idempotencia en `backend/internal/legajo/idempotencia_test.go`: mismo `POST` dos veces → un registro y una entrada de bitácora; mismo id con otro contenido → 409

## Phase 6: User Story 4 — La administradora gestiona cuentas (P2)

**Prueba independiente**: crear, ingresar, resetear: contraseña vieja falla y sesiones abiertas caen.

- [x] T047 [US4] Subcomandos `resetear` y `desactivar` en `backend/cmd/cuentas/main.go` que revocan todas las sesiones de la cuenta (FR-006) + `backend/cmd/cuentas/main_test.go`
- [x] T048 [US4] Prueba en `backend/internal/auth/handlers_test.go`: cuenta desactivada no ingresa y su sesión previa da 401; su autoría en bitácora se conserva

## Phase 7: User Story 5 — Cargar el catálogo real (P2)

**Prueba independiente**: ejemplo ficticio carga en base vacía; JSON con un error no carga nada y nombra el error.

- [ ] T049 [P] [US5] `backend/cmd/importar/testdata/ejemplo.json` (datos ficticios: 3 escuelas, personal, visitas, incidencias, bitácora) y `testdata/con_errores.json`
- [ ] T050 [US5] `backend/internal/importacion/validar.go` + test: valida todo según `contracts/importacion.md`, errores con ruta (`visits[12].schoolId`), campos desconocidos como avisos
- [ ] T051 [US5] `backend/internal/importacion/cargar.go` + test: una transacción, asignaciones iniciales, números de visita, bitácora importada marcada, evento `IMPORT`; se niega con datos salvo `-agregar`
- [ ] T052 [US5] `backend/cmd/importar/main.go` con `-archivo`, `-validar`, `-agregar` e informe de conteos
- [ ] T053 [US5] Deshabilitar la importación desde la app en `src/components/ExportImportModal.tsx` (la exportación CSV/JSON sigue, FR-031/FR-032)

## Phase 8: Polish

- [ ] T054 [P] `backend/README.md`: estructura, variables, bases local y de pruebas, comandos `cuentas` e `importar`
- [ ] T055 [P] Actualizar `ARCHITECTURE.md`, `SECURITY.md` (frontera de confianza real), `docs/processes/dev-setup.md` (sección backend), `docs/README.md`, `docs/tech-debt-tracker.md` (resolver las tres filas `High` y la de `npm install`), `docs/HARNESS-TODO.md`
- [ ] T056 Agregar carril `npm run lint` en `.githooks/pre-commit` arriba del sensor
- [ ] T057 `src/data/initialData.ts` solo para desarrollo: no se carga en ningún camino de producción (verificar con `grep`)
- [ ] T058 Correr `verify:` completo y los 15 escenarios de `quickstart.md`; anotar resultado por escenario en `quickstart.md`
- [ ] T059 Chequeo de datos personales antes del PR: `git diff master..HEAD | grep "^+"` sin cédulas ni mails reales; borrar `HANDOFF.md`

## Dependencies

- Setup (T001–T005) → Foundational (T006–T014) → historias.
- **US1** es prerequisito de todas (sin sesión no hay API).
- **US2** depende de US1. **US3** depende de US2 (necesita escrituras). **US4** depende de US1. **US5** depende de Foundational y de `bitacora` (T028).
- Polish al final.

## Paralelismo

- Setup: T002–T005 en paralelo tras T001.
- Foundational: T010, T011, T014 en paralelo.
- US1: backend (T015, T016) y frontend (T023, T024) en paralelo.
- US2: T035 y T039 en paralelo con el resto.
- US4 y US5 en paralelo entre sí una vez terminada US2.

## Estrategia

MVP = Setup + Foundational + US1: ingresar y ver el legajo compartido
(importado del ejemplo). Después US2 (escribir), US3 (borradores) —**001 no se
usa en campo antes de US3**—, y US4/US5 para la puesta en marcha con datos
reales.

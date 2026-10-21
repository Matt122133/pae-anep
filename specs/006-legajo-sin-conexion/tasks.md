# Tasks: Legajo sin conexión y envío automático

**Input**: Design documents from `specs/006-legajo-sin-conexion/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/servicios-dispositivo.md](contracts/servicios-dispositivo.md), [quickstart.md](quickstart.md)

**Tests**: sí, de lógica pura con vitest (research R12; el `verify:` los corre). La interfaz se valida con [quickstart.md](quickstart.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de la spec (US1–US4)

Rutas relativas a la raíz del repo. Todo frontend; `backend/` no se toca (R1).

---

## Phase 1: Setup

- [x] T001 Verificar el punto de partida: `npm run lint && npm test && npm run build` en verde en la rama `006-legajo-sin-conexion` antes de tocar código; si algo falla, frenar y reportar.

---

## Phase 2: Foundational (bloquea todas las historias)

- [x] T002 [P] En `src/services/api.ts`, `pedir` corta a los 15 s con `AbortController` y lo informa como `ErrorApi('red', 'No hay conexión con el servidor.')`; opción `tiempoMs` en `Opciones` para pruebas (R5). Agregar el caso en `src/services/api.test.ts` (un `fetchImpl` que no resuelve hasta que lo abortan → tipo `red`).
- [x] T003 [P] Extender `Borrador` en `src/services/borradores.ts` según [data-model.md](data-model.md): campos opcionales `cuentaId`, `estado` (`'pendiente' | 'rechazado'`), `actualizadoEn`. `listarBorradores(almacen?, cuentaActual?)` asigna `cuentaId = cuentaActual` a los que no lo tienen y persiste la migración. `guardarBorrador` conserva `creadoEn` si ya existía la clave, pone `actualizadoEn = ahora` y `estado = 'pendiente'`. Nuevas `marcarRechazado(clave, error, motivo?, almacen?)` y `buscarBorrador(clave, almacen?)`. `reenviarBorrador` deja el borrador en `pendiente` antes de mandar y lo marca `rechazado` si vuelve 400/409. Actualizar el comentario de cabecera (ya no dice "el reenvío es manual").
- [x] T004 [P] Pruebas en `src/services/borradores.test.ts`: migración de `cuentaId`; `creadoEn` conservado al reemplazar; `actualizadoEn` cambia; `estado` vuelve a `pendiente` al guardar; `marcarRechazado` guarda motivo y tipo; un 400 en `reenviarBorrador` deja `rechazado`.

**Checkpoint**: cola con cuenta y estado; pedidos que no cuelgan.

---

## Phase 3: User Story 1 — Consultar el legajo sin señal (P1) 🎯 MVP

**Goal**: sin señal la app abre con el último legajo recibido y la fecha a la vista.

**Independent Test**: quickstart escenarios 1–3.

- [x] T005 [P] [US1] Crear `src/services/copiaLegajo.ts` (R2, contrato): interfaz `AlmacenCopia { leer(): Promise<Copia | undefined>; guardar(c: Copia): Promise<void>; borrar(): Promise<void> }`, adaptador `almacenIndexedDB()` con la API nativa (base `pae`, versión 1, almacén `copia`, clave `'legajo'`), y las funciones `guardarCopia(c, almacen?)`, `leerCopia(cuentaId, almacen?)` (null si no hay o es de otra cuenta), `borrarCopia(almacen?)`. Nunca tiran: errores → `false`/`null`; sin `indexedDB` en el entorno → no-op.
- [x] T006 [P] [US1] Pruebas en `src/services/copiaLegajo.test.ts` con un `AlmacenCopia` en memoria y otro que tira: guardar/leer; otra cuenta → null; borrar; fallos → `false`/`null` sin excepción.
- [x] T007 [US1] En `src/App.tsx` (R6): estado `origenDatos: 'servidor' | 'copia'` y `copiaDel`. Con sesión, al arrancar leer la copia de la cuenta y pintarla si existe; después `cargarLegajo()`. Si el pedido sale: `setDatabase`, `origenDatos = 'servidor'`, `guardarCopia({ cuentaId, recibidoEn: ahora, legajo })` (si devuelve `false`, avisar una sola vez que este dispositivo no puede guardar el legajo para usarlo sin señal). Si falla por red/5xx y hay copia: quedarse en `copia` sin `errorCarga`. Sin copia y sin red: el mensaje "Para usar la app sin señal hace falta abrirla una vez con conexión" con reintentar (reemplaza el texto actual de `errorCarga` para `red`). Recargar el legajo en el evento `online`.
- [x] T008 [US1] En `src/App.tsx` (R10, FR-006): `cerrarSesion` llama a `borrarCopia()` (los borradores no se tocan; ajustar el `confirm` si menciona la copia). Al ingresar, si la copia es de otra cuenta, `borrarCopia()`.
- [x] T009 [P] [US1] En `src/components/Navbar.tsx` y `src/components/MobileBottomNav.tsx`: props `origenDatos` y `copiaDel`; con `copia`, mostrar "Sin conexión — datos del <dd/mm hh:mm>" en lugar del aviso genérico de sin conexión. Pasar las props desde `src/App.tsx`.

**Checkpoint**: MVP de lectura; escenarios 1–3 de quickstart.

---

## Phase 4: User Story 2 — Lo cargado sin señal llega solo (P1)

**Goal**: la cola se envía sola, en orden, sin duplicar, y avisa al terminar.

**Independent Test**: quickstart escenarios 4–6, 12 y la prueba de duplicados.

- [x] T010 [P] [US2] Crear `src/services/envio.ts` (R4, contrato): `enviarCola(cuentaId, { enviar?, almacen? })` recorre los borradores `pendiente` de esa cuenta por `creadoEn`, de a uno: confirmado → `descartarBorrador`; `red`/`servidor`/`sesion` → corta y devuelve `frenadoPor`; `invalido`/`conflicto` → `marcarRechazado` y sigue. Devuelve `{ enviados, rechazados, frenadoPor? }`. `siguienteEspera(actualMs, r)`: 30 000 si salió bien o no quedó nada; con `red`/`servidor` el doble, tope 300 000.
- [x] T011 [P] [US2] Pruebas en `src/services/envio.test.ts`: orden por `creadoEn` aunque se haya editado uno; rechazado no frena a los demás; red frena y deja todo `pendiente`; 401 frena; no envía `rechazado` ni de otra cuenta; reenviar algo ya aplicado (el servidor devuelve OK) lo saca de la cola; `siguienteEspera` 30 s → 60 s → … → 300 s y vuelve a 30 s.
- [x] T012 [US2] En `src/App.tsx`: hook `useEnvioAutomatico` (en el mismo archivo o `src/services/`) con candado en memoria y estado `enviando`. Dispara `enviarCola` al tener sesión y legajo/copia, en `online`, después de cada `escribir()` que dejó un borrador, y con temporizador según `siguienteEspera` mientras queden pendientes. Al terminar: `setBorradores(listarBorradores(...))`; si `enviados > 0`, `cargarLegajo()` y `avisar("Se enviaron N" + (rechazados ? "; M necesitan revisión" : ""))`; si `frenadoPor === 'sesion'`, `perderSesion(...)` (la cola queda). `escribir()` y `reenviar()` guardan con `cuentaId` de la sesión.
- [x] T013 [P] [US2] En `src/components/Navbar.tsx` y `src/components/MobileBottomNav.tsx`: prop `enviando` ("Enviando…" junto al contador) y `rechazados` ("N para revisar"). Ningún texto "sincronizado"/"al día" (FR-019). Revisar con `grep -rni "sincroniz\|al día" src/` que no quede ninguno.

**Checkpoint**: MVP completo (US1 + US2).

---

## Phase 5: User Story 3 — Resolver lo que el servidor rechazó (P2)

**Goal**: todo borrador se edita en su formulario; rechazados con motivo; ficha con borrador avisa.

**Independent Test**: quickstart escenarios 7–10.

- [x] T014 [US3] En `src/services/envio.ts` (R9): al marcar rechazado un borrador con `cuerpo.schoolId` (o `cuerpo.visit.schoolId`) cuyo alta `escuela:<schoolId>` está `rechazado`, motivo "Depende de la Escuela N° X, que todavía no se envió" (el número sale del `cuerpo` de ese borrador). Prueba en `src/services/envio.test.ts`.
- [x] T015 [P] [US3] Crear `src/components/AvisoBorrador.tsx` (R8): `{ guardadoEn: string; onAbrir: () => void }`; franja con "Hay cambios sin enviar en esta ficha (guardados el <dd/mm hh:mm>)" y botón "Abrir el borrador".
- [x] T016 [US3] En `src/components/StaffModal.tsx`, `src/components/IssueModal.tsx`, `src/components/SchoolModal.tsx`, `src/components/ScheduleVisitModal.tsx`: prop opcional `avisoBorrador?: { guardadoEn: string; onAbrir: () => void }` que renderiza `AvisoBorrador` arriba del formulario. Nada más cambia en esos modales.
- [x] T017 [US3] En `src/components/NewVisitModal.tsx`: prop opcional `borrador?: { visit: Visit; newIssues: SchoolIssue[] }` que precarga todos los campos del formulario (fecha, hora, visitantes, observaciones, controles, incidencias nuevas) y reutiliza `borrador.visit.id` al guardar, para que guardar reemplace el mismo borrador.
- [x] T018 [US3] En `src/components/BorradoresModal.tsx`: estado `rechazado` con su motivo y etiqueta "Para revisar"; botón "Editar" (`onEditar(b)`) para claves `visita:`, `personal:`, `incidencia:`, `escuela:`; edición en línea de resumen y texto para `nota:` (guarda con `guardarBorrador`, misma clave); sin "Editar" para `*-borrar:`, `*-baja:`, `personal-traslado:`; "Reenviar" también para pendientes (envío inmediato); grupo aparte "De otra cuenta" solo con "Descartar" confirmado (FR-014). Se mantiene "Aplicar sobre la versión actual" para los rechazados por conflicto (FR-018).
- [x] T019 [US3] En `src/App.tsx` (R7): `editarBorrador(b)` selecciona la escuela del `cuerpo`, guarda `abiertoDesde = { clave }` y abre el modal según la tabla de R7 (`NewVisitModal` con `borrador` si es POST de visita `Realizada`; una instancia propia de `ScheduleVisitModal` con `visitToEdit` si es visita programada o PUT; `StaffModal`/`IssueModal`/`SchoolModal` con el `cuerpo` como `xToEdit`). Al cerrar, limpiar `abiertoDesde`.
- [x] T020 [US3] En `src/App.tsx` (R8, FR-021): al abrir un modal de edición desde el legajo, si `buscarBorrador('<tipo>:<id>')` existe y no es `abiertoDesde`, pasar `avisoBorrador` (con `onAbrir` → `editarBorrador`). En `escribir()`: si existe un borrador con `op.clave` y la operación no viene de ese borrador, `confirm("Ya hay cambios sin enviar en esta ficha (guardados el …). ¿Reemplazarlos por estos?")`; si cancela, devolver un mensaje que deja el formulario abierto y no enviar nada. Si confirma y el servidor acepta, `descartarBorrador(op.clave)` (el borrador viejo quedó reemplazado; si no se borra, se enviaría después con la versión vieja). El `ScheduleVisitModal` de `VisitCalendar.tsx` queda sin aviso visual (fuera de `covers:`): lo cubre esta confirmación al guardar.

**Checkpoint**: rechazos resolubles y borradores editables.

---

## Phase 6: User Story 4 — Sesión vencida con pendientes (P3)

**Goal**: la cola sobrevive a una sesión vencida y no se envía con otra cuenta.

**Independent Test**: quickstart escenarios 11 y 13.

- [x] T021 [US4] En `src/App.tsx`: tras reingresar, el hook de T012 dispara `enviarCola` con la nueva sesión; los borradores de otra `cuentaId` no cuentan para el contador principal (se ven en el grupo "De otra cuenta" de T018). Verificar que `perderSesion` no borra la cola ni la copia (la copia se borra solo en `cerrarSesion` o al entrar otra cuenta).

---

## Phase 7: Polish & Cross-Cutting

- [x] T022 [P] Actualizar `ARCHITECTURE.md`: la sección "Sin conexión" describe la copia en IndexedDB (se borra al cerrar sesión), la cola con envío automático y los estados; agregar `copiaLegajo.ts` y `envio.ts` al layout.
- [x] T023 [P] Actualizar `AGENTS.md` y su copia byte a byte `CLAUDE.md`: reemplazar "No hay lectura sin conexión ni sincronización automática hasta `002`" por lo que existe desde `006`. Comprobar con `diff -q AGENTS.md CLAUDE.md`.
- [x] T024 [P] En `docs/tech-debt-tracker.md`: pasar a Resolved el ítem High "Sin lectura del legajo sin conexión" y el Medium "Un borrador con 400 no se puede abrir en el formulario", con referencia a `006`.
- [x] T025 Correr `verify:` (`npm run lint && npm test && npm run build`) y recorrer [quickstart.md](quickstart.md) con el backend local; anotar el resultado por escenario al final de este archivo. Lo que no se pudo probar se dice.
- [x] T026 Chequeo de datos reales antes del commit final: `git diff master..HEAD | grep "^+" | grep -oE "[0-9]\.[0-9]{3}\.[0-9]{3}-[0-9]|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+"` sin resultados reales.

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T004)** → historias.
- **US1 (T005–T009)** depende solo de Foundational.
- **US2 (T010–T013)** depende de Foundational; usa `cuentaId` de T003. Independiente de US1 en lógica, pero ambas tocan `App.tsx`, `Navbar.tsx` y `MobileBottomNav.tsx`: hacer US1 antes para no pisar ediciones.
- **US3 (T014–T020)** depende de US2 (estado `rechazado` y `envio.ts`).
- **US4 (T021)** depende de US2 y T018.
- **Polish (T022–T026)** al final.

Dentro de cada historia: servicios y sus pruebas [P] primero, después `App.tsx`, después componentes.

## Parallel Example

```text
Foundational: T002 (api.ts) ‖ T003+T004 (borradores.ts)
US1:          T005+T006 (copiaLegajo) ‖ T009 (Navbar/MobileBottomNav) → T007 → T008
US2:          T010+T011 (envio) ‖ T013 (Navbar/MobileBottomNav) → T012
US3:          T014 ‖ T015 → T016 ‖ T017 ‖ T018 → T019 → T020
Polish:       T022 ‖ T023 ‖ T024 → T025 → T026
```

## Implementation Strategy

1. **MVP = US1 + US2** (las dos P1): consultar sin señal y que lo cargado llegue solo. Es lo que saca el riesgo High del tracker.
2. US3: editar borradores y resolver rechazos (cierra la deuda del 400 de `001`).
3. US4: sesión vencida y otra cuenta.
4. Commits por fase, con el plan en `active`; al terminar, `status: completed` en un commit aparte.

## Resultado de T025 (2026-10-21)

`verify:` en verde: 5 archivos, 32 pruebas, build OK. Quickstart recorrido con
`playwright-core` en Edge headless (escritorio, 1280×900) contra el build
(`vite preview --base /pae-anep/`, service worker activo) y el backend local con
los datos ficticios de `cmd/importar/testdata`. La red se cortó con la emulación
offline del navegador; "servidor caído" fue detener el backend.

| # | Resultado |
|---|---|
| 1 | OK — recarga sin red: legajo visible y "Sin conexión — datos del <fecha>". |
| 2 | OK — al volver la red el aviso se va solo. |
| 3 | OK — sin copia y sin red: "hace falta abrirla una vez con conexión", con Reintentar. |
| 4 | OK — visita y nota sin red: el formulario se cierra, aviso de guardado, "2 no enviados", la visita no está en la ficha. |
| 5 | OK — al volver la red, "enviando…" y "Se enviaron 2" en ~1 s; la visita queda una sola vez. |
| 6 | OK — 3 notas sin red, pestaña cerrada, reabierta con red: "Se enviaron 3"; cada una una vez en la base. |
| 7 | OK con arreglo — la escuela con número repetido queda "para revisar"; incidencia y nota llegan. **Arreglo**: el motivo decía solo "Hay datos para corregir."; ahora incluye el campo (`describirCampos` pasó a `api.ts` y lo usa `marcarRechazado`). |
| 8 | OK — "Editar" abre el alta en su formulario; con otro número llega y sale de la lista. |
| 9 | OK — aviso con "Abrir el borrador"; el formulario muestra el dato del servidor; guardar pide confirmar; cancelar deja el borrador; abrirlo trae lo escrito. |
| 10 | OK — otra cuenta guarda la misma persona; el borrador queda "para revisar" por conflicto; "Aplicar sobre la versión actual" lo manda (queda su valor). |
| 11 | OK — sesiones borradas en la base: pide reingresar con el aviso, la cola sigue; tras ingresar "Se envió 1". |
| 12 | OK — backend detenido: pedidos a los 0 s, 60 s y 180 s (30 s base, el doble por cada falla); la cola sigue pendiente y nada dice "al día". |
| 13 | OK con arreglo — al salir la base `pae` queda vacía y la cola se conserva; con otra cuenta no se envía y aparece aparte. **Arreglo**: con cero propios la barra no mostraba nada (FR-014 pide avisar); ahora muestra "N de otra cuenta". |
| Duplicados | OK — 10 visitas sin red, red cortada y vuelta 3 veces durante el envío: 10 en la base, 10 ids distintos. |

No probado: un teléfono real, la vista de celular (`MobileBottomNav`) y DevTools
a mano. Anotado en `docs/tech-debt-tracker.md`.

T026: el único resultado es el correo institucional del programa, que ya está
en `master` desde el primer commit; aparece en el diff porque T017 reescribió
esas líneas para la precarga. Sin cédulas ni datos de personas.

---
owner: pae-anep
status: living
last_reviewed: 2026-10-21
update_trigger: on-debt-added-or-resolved
---

# Tech debt tracker

Registro de riesgos conocidos, atajos y mejoras diferidas. Se mantiene según el
steering loop del harness (ver [`processes/harness.md`](processes/harness.md)).

## Cómo funciona

Cada fila es un ítem. Los nuevos van arriba de su sección.

- **Severidad.** `High` (riesgo activo o de correctitud), `Medium` (frena o
  confunde), `Low` (cosmético o especulativo).
- **Estado.** `Open`, `In progress`, `Resolved`, `Dropped`.
- **Resolución.** Cómo se pagó, con referencia a commit/plan/ADR.

## Open

| Fecha | Severidad | Descripción |
|---|---|---|
| 2026-10-21 | Low | **Los atajos del manifest (`?view=schools`, `?tab=`) no los lee nadie**: abren la app en el panel. Sobrevivieron a `005`, que solo arregló las rutas para Pages. Leer el parámetro al arrancar o sacar los atajos. |
| 2026-10-21 | Medium | **`006` se probó en Edge headless de escritorio, no en un teléfono**, y la E2E tampoco está en el repo. Los 13 escenarios de su quickstart y la prueba de duplicados pasaron con `playwright-core` contra el build (`vite preview`) y el backend local. Falta un teléfono real perdiendo señal en una escuela, y una vista de celular. |
| 2026-10-21 | Low | **Las visitas programadas que se editan desde el calendario no muestran el aviso de borrador** (`ScheduleVisitModal` dentro de `VisitCalendar.tsx`, fuera del `covers:` de `006`). Al guardar sí piden confirmar el reemplazo. |
| 2026-10-21 | Low | **Un borrador de personal o visita de una escuela cuya alta todavía no llegó no se abre en su formulario**: la app avisa que primero tiene que llegar el alta. Se envía en orden igual, y si el alta se rechaza queda para revisar con ese motivo. |
| 2026-10-19 | Medium | **La interfaz de `001` se probó en Chrome headless, no en un teléfono real**, y **la prueba E2E no está en el repo**. 17 controles (ingreso, borrador sin señal que sobrevive a cerrar la pestaña, reenvío sin duplicar, presencia, conflicto sin perder lo escrito) pasaron con `playwright-core` en viewport de teléfono; faltan traslado y baja en pantalla, y el escenario 15 en un teléfono con datos móviles. Versionar la E2E (fuera del `covers:` de `001`) daría un sensor para la interfaz, que hoy no tiene ninguno. |
| 2026-10-19 | Low | **Tras un 409, el formulario conserva lo escrito pero sobre la versión nueva**: si la usuaria guarda sin revisar, sus campos (incluidos los que no tocó y que la otra cambió) se aplican encima. Es lo que dice el aviso ("revisalo y guardá de nuevo"), pero no se resaltan los campos que cambió la otra persona. |
| 2026-10-19 | Medium | **Nombres reales en el historial de git de un repo público.** `001` sacó del código los nombres del equipo técnico y de inspectores (`PAE_TEAM_MEMBERS`, logs semilla de `storage.ts`, `initialData.ts`, `SchoolReportModal`, `SchoolModal`), pero **siguen en commits anteriores** (`355815f` y siguientes). Si son personas reales y no quieren figurar, hace falta reescribir el historial (`git filter-repo`) y forzar el push, o hacer el repo privado. Es decisión del dueño del repo; nada de eso se hizo. |
| 2026-10-19 | Low | **CRLF en la copia de trabajo.** Git avisa en cada commit que va a convertir LF a CRLF (`core.autocrlf`). El blob queda en LF y hoy no rompe nada, pero `backend/dev.sh` con CRLF no corre en bash. Un `.gitattributes` con `*.sh eol=lf` lo fija; no está en el `covers:` de `001`. |
| 2026-10-19 | Low | **Tipos espejo TS/Go sin generación.** `src/types/index.ts` y `backend/internal/legajo/tipos.go` se sincronizan a mano, y las listas cerradas existen tres veces (TS, `validar.go`, `CHECK`). El servidor rechaza campos desconocidos, así que la deriva se nota rápido (400), pero no hay prueba que compare las listas. |
| 2026-10-19 | Low | **El aviso de presencia es en memoria de una réplica.** Si Railway corriera dos instancias, cada una vería solo sus latidos (research D8). |
| 2026-10-18 | Low | **Dependencias de la plantilla**: `metadata.json` con `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`, y el README todavía describe la app como "AI Studio app". (`@google/genai`, `express`, `dotenv` y `GEMINI_API_KEY` ya salieron en `001`.) |
| 2026-10-18 | Low | **Bundle grande**: `vite build` avisa chunks > 500 kB (precache ~910 KiB). Relevante para la primera carga en campo con mala señal. |

## Resolved

| Fecha | Severidad | Descripción | Resolución |
|---|---|---|---|
| 2026-10-19 | Medium | Rutas absolutas incompatibles con GitHub Pages (`index.html`, manifest y service worker asumían la raíz del dominio). | `005`: `base: '/pae-anep/'` solo en el build, manifest con rutas relativas, workflow de Actions que publica en Pages. |
| 2026-10-19 | High | Sin lectura del legajo sin conexión: en una escuela sin señal la app no mostraba el legajo. | `006`: copia del legajo en IndexedDB que se abre sin señal con su fecha a la vista, y envío automático de los "no enviados" al volver la red. |
| 2026-10-19 | Medium | Un borrador con 400 no se podía abrir en el formulario para corregirlo. | `006`: todos los "no enviados" con formulario se editan en él; un 400 queda "para revisar" con el campo a corregir. |
| 2026-10-18 | High | No había backend: cada dispositivo tenía su propio legajo. | `001`: backend Go + Postgres, `GET /legajo` y escrituras por la API. |
| 2026-10-18 | High | La sincronización offline era una simulación (`SyncModal` con `setTimeout`, visitas marcadas "para probar"). | `001`: se borraron `SyncModal`, el toggle de offline simulado y los campos `isOfflinePendingSync`/`offlineSavedAt`/`syncedAt`; lo no enviado son borradores reales que se borran solo con confirmación del servidor. |
| 2026-10-18 | High | No había identidad: la usuaria activa se elegía de una lista. | `001`: usuario y contraseña (argon2id), sesiones revocables, autor de la bitácora desde la sesión. |
| 2026-10-18 | Medium | `npm install` fallaba con `ERESOLVE` (esbuild 0.25 vs vite 8) y no había lockfile. | `001` T001: `esbuild` fuera de `devDependencies` (nada lo importaba), dependencias muertas fuera, `package-lock.json` versionado. `npm ci` anda sin flags. |
| 2026-10-18 | Low | Sin tests en el frontend. | `001`: Vitest para `api.ts`, `sesion.ts`, `borradores.ts` (la interfaz sigue sin pruebas automáticas: ver la fila High de arriba). |

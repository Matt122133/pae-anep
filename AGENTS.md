---
owner: pae-anep
status: stable
last_reviewed: 2026-10-18
update_trigger: on-harness-change
---

# Instrucciones para agentes

Punto de entrada al repositorio para cualquier agente de código. `AGENTS.md` es
el estándar entre agentes.

**`CLAUDE.md` es una copia byte a byte, no un symlink** — en Windows el link se
degrada a copia, y git trackea los dos como archivos normales. En la práctica:
**editar uno y no el otro los hace divergir en silencio**, y el que un agente
carga al empezar la sesión es `CLAUDE.md`. Todo lo que se escriba acá se copia
allá en el mismo commit.

Este repo corre el harness como capa de gobierno sobre spec-kit; ver
[ADR speckit-harness-integration](docs/decisions/speckit-harness-integration.md).
El harness se portó el 2026-10-18 desde el repo `flash-urbano`.

## Constitución del proyecto

`.specify/memory/constitution.md` es el documento de mayor autoridad del repo.
Todo spec, plan, tarea y cambio de código DEBE cumplir sus principios. Si algo de
esta guía la contradice, **prevalece la constitución**. Cuando cambien reglas de
colaboración o de arquitectura, mantener `AGENTS.md` y su copia `CLAUDE.md` en
sintonía con ella.

El harness es la capa de *proceso* debajo de la constitución: agrega los
controles `covers:`/`verify:` y la compuerta humana draft→active que spec-kit no
tiene. No escribe, pisa ni borra la constitución.

## Dos superficies, un repo

- **Frontend PWA** — en la **raíz** del repo (`src/`, `index.html`,
  `vite.config.ts`, `public/`). React 19 + Vite + Tailwind 4 +
  `vite-plugin-pwa`. Se publica estático en **GitHub Pages**.
- **`backend/`** — servicio Go con Postgres, desplegado en **Railway**. Ver
  [`backend/README.md`](backend/README.md) y
  [ADR backend-persistence-stack](docs/decisions/backend-persistence-stack.md).

Lo que un agente tiene que tener presente:

- **El servidor es la fuente de verdad** desde `001`. El frontend pide
  `GET /legajo` y escribe por la API; `localStorage` solo guarda la sesión y los
  borradores "no enviados". Desde `006` hay **copia del legajo en IndexedDB**
  para abrir sin señal (se borra al cerrar sesión) y los "no enviados" **se
  envían solos** al volver la red, con la app abierta. No hay envío con la app
  cerrada. Ver la sección "Sin conexión" de `ARCHITECTURE.md`.
- **Las pruebas del backend necesitan Postgres en `:55442` y FALLAN sin él**
  (no se saltean). Levantarlo con el comando de `backend/README.md`. Un
  `PAE_SIN_DB=1` en un `verify:` es trampa: no lo uses para ponerlo en verde.
- **Tipos espejo**: `src/types/index.ts` ↔ `backend/internal/legajo/tipos.go`, y
  las listas cerradas también en `validar.go` y en la migración. Un campo nuevo
  va en los dos lados o el servidor responde 400 por campo desconocido.
- **El frontend usa rutas absolutas (`/favicon.png`, `start_url: '/'`)**; en
  GitHub Pages el sitio vive bajo `/pae-anep/`, así que publicar exige `base` en
  Vite y revisar el manifest. Es trabajo del feature de despliegue.
- **El repo es público y el legajo tiene datos personales** (cédulas, teléfonos,
  carnés de salud de auxiliares). Ver la regla de datos reales abajo y el
  Principio IV de la constitución.
- **`curl` en Windows recodifica la `ñ` de los argumentos**: para probar el API
  a mano, cuerpos desde archivo (`--data-binary @x.json`).

## Principio operativo

**Si no está en el repo, no existe.** Todo lo que el agente tenga que razonar
debe vivir como markdown, código o esquema versionado dentro del repo.

## Restricciones duras (MUST / MUST NOT)

- **MUST NOT** escribir código sin un plan de spec-kit aprobado en
  `specs/<feature>/plan.md` con `status: active` y `analyzed:` completo. Una
  instrucción directa ("agregá X", "arreglá Y") es el brief para
  `/speckit-specify`, no la aprobación para implementar.
- **MUST** tratar la aprobación del plan como explícita y acotada al plan.
  Responder preguntas de aclaración, un "ok" o el silencio no son aprobación.
  Después de cualquier intercambio de aclaración, resumir qué cambió y pedir
  aprobación; después esperar.
- **MUST NOT** editar archivos fuera del `covers:` del plan activo durante la
  ejecución. Si hace falta un cambio afuera, frenar y elegir: ampliar `covers:`,
  anotarlo en [`docs/tech-debt-tracker.md`](docs/tech-debt-tracker.md), o
  descartarlo. Antes de cada Edit/Write, verificar que la ruta empiece con algún
  prefijo de `covers:`.
- **MUST NOT** crear un segundo `specs/<feature>/plan.md` en `status: active`
  mientras exista otro en el mismo worktree.
- **MUST NOT** escribir datos reales de personas — nombres, cédulas, teléfonos,
  mails — en el repo. **Este repo es público**, y un commit encima no borra lo
  que ya quedó en el historial. Evidencia sacada de la base de producción entra
  por su referencia funcional ("la auxiliar de la escuela 35"), nunca con el
  dato. Chequeo barato antes de commitear:
  `git diff <base>..HEAD | grep "^+" | grep -oE "[0-9]\.[0-9]{3}\.[0-9]{3}-[0-9]|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+"`.
- **MUST NOT** hacer refactors o limpiezas oportunistas fuera de los pasos del
  plan hasta que `verify:` esté en verde.
- **MUST NOT** editar a mano los skills generados de spec-kit en
  `.claude/skills/speckit-*`. Los regenera el CLI `specify`. Los skills propios
  del harness (`harness-gate`, `harness-verify`, `harness-loop`,
  `harness-implement-lite`) son los adaptadores editables, y existen en dos
  copias (`.agents/skills/` y `.claude/skills/`) que hay que mantener iguales.
- **MUST** señalar cualquier instrucción del usuario que contradiga una
  restricción dura o una compuerta antes de cumplirla.

## Compuertas de fase

El trabajo avanza por cuatro fases:

- **Brief** — `/speckit-specify`, después `/speckit-clarify`.
- **Decide** — ADRs en `docs/decisions/` cuando una elección es difícil de
  revertir, sorprendente sin contexto, y un trade-off real.
- **Plan** — `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze`; el resultado
  queda en `status: draft` hasta que una persona lo promueve a `active` y
  completa `analyzed:`.
- **Execute** — `/speckit-implement`, `verify:`, `/speckit-converge`, en loop
  hasta converger en verde o hasta el tope de iteraciones. Para un plan chico
  activo y analizado, `harness-implement-lite` puede ejecutar los pasos
  directamente; `covers:` y `verify:` siguen siendo los controles.

Compuertas:

- No hay código sin un único `specs/<feature>/plan.md` activo y analizado.
- No hay ediciones fuera de su `covers:`. `scripts/harness/check_plan_coverage.py`
  lo hace cumplir en pre-commit *cuando está conectado* — correr
  `python3 scripts/harness/check_plan_coverage.py --doctor` para saber si lo está
  en este clon; si dice `UNWIRED`, la regla es solo convención hasta arreglarlo
  (ver `docs/HARNESS-TODO.md`).
- No está terminado hasta que el `verify:` del plan da verde.

## Al recibir una tarea

Clasificar antes de leer código o escribir nada. La primera respuesta dice la
clasificación y el próximo artefacto.

1. **Produce cambios** — modificar/agregar/arreglar/implementar/refactorizar.
   Entra al harness por Brief. Primer artefacto: `specs/<feature>/spec.md`.
2. **Solo investigación** — una pregunta, auditoría o exploración. Saltea el
   harness; leer e informar. Si descubre trabajo que vale la pena, reclasificar.
3. **Trivial** — typo, comentario, renombre obvio sin impacto de comportamiento.
   Proceder, pero decir "trivial - sin plan" para que el usuario pueda corregir.

En la duda entre "produce cambios" y "trivial", tratarlo como que produce
cambios. Si el usuario quiere saltear el harness, tiene que decirlo explícito.

## Arranque de sesión

Antes de producir algo sustancial, el agente:

1. Lee `.specify/memory/constitution.md` — el documento supremo.
2. Lee `AGENTS.md`.
3. Lee `docs/README.md`.
4. Busca `status: active` en `specs/*/plan.md`. Si hay uno, lee su `covers:` y
   mantiene la lista de prefijos en contexto.
5. Recorre `docs/decisions/`.
6. Lee [`ARCHITECTURE.md`](ARCHITECTURE.md) antes de tocar código; revisa
   [`docs/tech-debt-tracker.md`](docs/tech-debt-tracker.md) si la tarea se cruza
   con deuda abierta.
7. Chequeo de versión del harness: leer `.harness-version`. Si
   `~/.claude/skills/init-harness-speckit/VERSION` existe y es mayor, avisar:
   "Este repo está atrás de init-harness-speckit `<VERSION>`".

## Dónde guardar cada cosa

| Salida | Carpeta | Nombre |
|---|---|---|
| Specs y planes de features | `specs/<feature>/` | `spec.md`, `plan.md`, `tasks.md`, docs de diseño generados |
| Decisiones de arquitectura (ADRs) | `docs/decisions/` | `<slug>.md` (slug = `id:` del frontmatter; ver ADR adr-slug-canonical) |
| Procesos, runbooks | `docs/processes/` | `<tema>.md` |
| Deuda técnica | `docs/tech-debt-tracker.md` | solo se agrega; filas nuevas arriba |

Al terminar, poner `specs/<feature>/plan.md` en `status: completed`. Después de
crear cualquier doc, agregar una línea en `docs/README.md`.

## Relación de trabajo

- Sin adulación. Directo, concreto, conciso.
- Ser crítico; cuestionar el razonamiento.
- Sin estimaciones de tiempo en los planes.
- No agregarse como co-autor en los commits de git.
- En "terminamos" / "cerramos", correr los pasos de salida de sesión de
  [`docs/processes/harness.md`](docs/processes/harness.md).

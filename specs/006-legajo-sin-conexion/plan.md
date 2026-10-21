---
ticket: none
status: active
covers:
  - src/services/
  - src/App.tsx
  - src/components/AvisoBorrador.tsx
  - src/components/BorradoresModal.tsx
  - src/components/Navbar.tsx
  - src/components/MobileBottomNav.tsx
  - src/components/NewVisitModal.tsx
  - src/components/ScheduleVisitModal.tsx
  - src/components/StaffModal.tsx
  - src/components/IssueModal.tsx
  - src/components/SchoolModal.tsx
  - ARCHITECTURE.md
  - AGENTS.md
  - CLAUDE.md
  - docs/tech-debt-tracker.md
  - specs/006-legajo-sin-conexion/
  - .specify/feature.json
verify: npm run lint && npm test && npm run build
analyzed: 2026-10-21 (analyze sin críticos; I1, C2, T1 aplicados; aprobado por el dueño del repo: "si, apruebo el plan, arrancá con el MVP")
---

# Implementation Plan: Legajo sin conexión y envío automático

**Branch**: `006-legajo-sin-conexion` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-legajo-sin-conexion/spec.md`

## Summary

La app guarda en el dispositivo una copia del último legajo recibido
(IndexedDB) y la muestra cuando no hay conexión, con la fecha a la vista. Los
"No enviados" de `001` pasan a ser una cola que se envía sola —al abrir, al
volver la red y con reintentos espaciados—, sigue de largo ante rechazos, y
cuyos elementos se pueden editar en su formulario. **Sin cambios de backend**:
el servidor ya trata como idempotentes todos los reenvíos ([research R1](research.md#r1-el-backend-no-cambia)).

## Technical Context

**Language/Version**: TypeScript 5 / React 19 (frontend). Go del backend sin cambios.

**Primary Dependencies**: las existentes (Vite, `vite-plugin-pwa`). IndexedDB con la API nativa; **ninguna dependencia nueva**.

**Storage**: IndexedDB para la copia del legajo (R2); `localStorage` para la cola, extendiendo `pae.borradores.v1` (R3).

**Testing**: vitest sobre lógica pura (`envio`, `borradores`, `copiaLegajo` con IndexedDB inyectado, `api`). Interfaz a mano con [quickstart.md](quickstart.md).

**Target Platform**: navegadores de escritorio y tablet (Chrome/Edge/Safari recientes), PWA en GitHub Pages.

**Project Type**: web (frontend PWA + backend Go existente).

**Performance Goals**: la copia se pinta antes del pedido al servidor; un borrador sale ≤ 1 min tras volver la red con la app abierta (SC-002).

**Constraints**: offline-capable; sin envío con la app cerrada; corte de pedidos a los 15 s (R5).

**Scale/Scope**: 4 cuentas, ~140 escuelas, legajo de pocos MB; cola de decenas de elementos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple | Estado |
|---|---|---|
| I. El territorio manda | Copia para consultar sin señal; cola que sobrevive a cerrar la app y se envía sola; nada "sincronizado" sin confirmación (FR-019); reenvío idempotente por id del dispositivo (R1). Es el feature que este principio pide. | ✅ |
| II. Un legajo, cada cambio con autor | El autor sigue saliendo de la sesión; la cola no se envía con otra cuenta (FR-014, R10). Conflictos: regla escrita (rechazado → la usuaria decide; FR-018, FR-021). | ✅ |
| III. Simplicidad | Sin dependencias nuevas, sin service worker propio, sin Background Sync; un bucle por pestaña; backend intacto. | ✅ |
| IV. Datos personales | La copia guarda datos de terceros en el dispositivo **solo mientras la sesión está abierta**: se borra al cerrar sesión y si entra otra cuenta (clarify Q1). No entra nada al repo. | ✅ |
| V. Hosting económico | Nada nuevo en Railway; todo en el cliente. | ✅ |
| VI. Mobile-first | Avisos y "Editar" en la lista existente; sin pantallas nuevas. | ✅ |
| Harness | `covers:` lista cada ruta; `verify:` corre tipos, pruebas y build. | ✅ |

**Post-diseño**: sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/006-legajo-sin-conexion/
├── spec.md
├── plan.md              # este archivo
├── research.md          # R1–R12
├── data-model.md        # copia, borrador extendido, estados
├── quickstart.md        # 13 escenarios + prueba de duplicados
├── contracts/
│   └── servicios-dispositivo.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── services/
│   ├── api.ts               # corte a los 15 s → 'red' (R5)
│   ├── borradores.ts        # cuentaId, estado, actualizadoEn; creadoEn conservado (R3)
│   ├── copiaLegajo.ts       # NUEVO: copia en IndexedDB (R2)
│   ├── envio.ts             # NUEVO: enviarCola + espera creciente (R4)
│   └── *.test.ts            # pruebas de lo anterior
├── App.tsx                  # arranque con copia (R6), hook de envío (R4),
│                            # editar borrador (R7), aviso de ficha con borrador (R8)
└── components/
    ├── AvisoBorrador.tsx    # NUEVO (R8)
    ├── BorradoresModal.tsx  # Editar, notas en línea, rechazados, otra cuenta
    ├── Navbar.tsx, MobileBottomNav.tsx   # "Sin conexión — datos del …", "Enviando…"
    └── NewVisitModal.tsx, ScheduleVisitModal.tsx, StaffModal.tsx,
        IssueModal.tsx, SchoolModal.tsx   # prop avisoBorrador (+ precarga en NewVisitModal)
```

**Structure Decision**: solo frontend, en la raíz. `backend/` no se toca.

Documentación al cerrar: `ARCHITECTURE.md` (sección "Sin conexión"),
`AGENTS.md` + `CLAUDE.md` (la línea "No hay lectura sin conexión… hasta 002"),
`docs/tech-debt-tracker.md` (resolver el ítem High de lectura sin conexión y el
Medium del 400 sin formulario).

## Complexity Tracking

Sin violaciones de la constitución que justificar.

---
ticket: none
status: active
covers:
  - backend/migrations/0002_proveedores_escuela.sql
  - backend/internal/legajo/
  - src/types/index.ts
  - src/services/proveedores.ts
  - src/services/proveedores.test.ts
  - src/components/SchoolModal.tsx
  - src/components/SchoolDetail.tsx
  - src/components/ActivityLogView.tsx
  - ARCHITECTURE.md
  - specs/009-proveedores-escuela/
  - .specify/feature.json
verify: npm run lint && npm test && npm run build && cd backend && go vet ./... && go test ./...
analyzed: 2026-10-26 (analyze sin críticos; U1, A1, I1 aplicados; aprobado por el dueño del repo: "si demosle")
---

# Implementation Plan: Proveedores en la ficha de escuela

**Branch**: `009-proveedores-escuela` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-proveedores-escuela/spec.md`

## Summary

La escuela gana un campo `providers`: una lista de nombres de texto libre que
se carga en el formulario de alta/edición y se muestra en el bloque de datos de
la pantalla de la escuela. En el servidor es una columna `text[]` de
`escuelas` (migración `0002`), validada en `ValidarEscuela` (sin vacíos, sin
repetidos ignorando mayúsculas, ≤ 120 caracteres). Una edición que **no trae**
el campo conserva la lista guardada ([research R2](research.md#r2-una-edición-sin-el-campo-no-borra)),
para que los "No enviados" y las copias del legajo anteriores a esta versión no
borren proveedores.

## Technical Context

**Language/Version**: TypeScript 5 / React 19 (frontend); Go del backend.

**Primary Dependencies**: las existentes (pgx en el backend). **Ninguna dependencia nueva.**

**Storage**: Postgres, columna `escuelas.proveedores text[] NOT NULL DEFAULT '{}'` ([R1](research.md#r1-columna-text-en-escuelas)).

**Testing**: `go test` contra Postgres en `:55442` (crear, editar, edición sin el campo, validación); vitest para la lógica de agregar/quitar (`src/services/proveedores.ts`). Interfaz a mano con [quickstart.md](quickstart.md).

**Target Platform**: navegadores de escritorio y tablet; backend en Railway.

**Project Type**: web (frontend PWA + backend Go).

**Performance Goals**: sin metas nuevas; unas pocas decenas de nombres por escuela.

**Constraints**: **orden de publicación**: Railway primero, después mergear (Pages sale con el push a `master`); al revés, el servidor viejo rechaza `providers` con 400 (T019). Offline-capable sin cambios en la cola (la ficha ya viaja entera como "No enviado"); compatibilidad con borradores y copias sin el campo.

**Scale/Scope**: ~140 escuelas, 4 cuentas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumple | Cómo |
|---|---|---|
| I. Territorio / sin señal | Sí | El alta/edición de escuela ya se encola entera en "No enviados"; el campo nuevo viaja con ella. Reenvíos idempotentes intactos ([R3](research.md#r3-alta-idempotente)). |
| II. Legajo compartido con autor | Sí | Se guarda en el servidor; el cambio entra a la bitácora con etiqueta "Proveedores" y el autor de la sesión. |
| III. Simplicidad | Sí | Una columna, sin tabla ni catálogo (FR-004); la entidad propia queda para cuando la pida la dueña. |
| IV. Datos personales | Sí | Nombres de empresas/repartidores cargados en la base, nunca en el repo. Pruebas con nombres ficticios. |
| V. Hosting económico | Sí | Sin servicios nuevos. |
| VI. Mobile-first | Sí | Un input + botón "Agregar" y una lista con quitar, en el formulario existente. |

Sin violaciones. Re-chequeo post-diseño: igual.

## Project Structure

### Documentation (this feature)

```text
specs/009-proveedores-escuela/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/escuela.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── migrations/0002_proveedores_escuela.sql   # nueva
└── internal/legajo/
    ├── tipos.go          # School.Providers
    ├── validar.go        # reglas de la lista
    ├── escuelas.go       # insert/update, etiqueta, ajustar en editar
    ├── lectura.go        # columna en SELECT y Scan
    └── escuelas_test.go  # pruebas nuevas

src/
├── types/index.ts                 # School.providers?
├── services/proveedores.ts        # agregar/quitar normalizado (+ test)
└── components/
    ├── SchoolModal.tsx            # lista editable
    ├── SchoolDetail.tsx           # bloque de datos
    └── ActivityLogView.tsx        # listas legibles en el detalle
```

**Structure Decision**: web existente; sin carpetas nuevas.

## Complexity Tracking

Sin violaciones que justificar.

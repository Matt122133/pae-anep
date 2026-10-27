---
ticket: none
status: active
covers:
  - backend/migrations/0003_tipo_institucion.sql
  - backend/internal/legajo/
  - backend/internal/bitacora/bitacora.go
  - src/types/index.ts
  - src/services/
  - src/App.tsx
  - src/components/ActivityLogView.tsx
  - src/components/Dashboard.tsx
  - src/components/Navbar.tsx
  - src/components/MobileBottomNav.tsx
  - src/components/NewVisitModal.tsx
  - src/components/ScheduleVisitModal.tsx
  - src/components/SchoolDetail.tsx
  - src/components/SchoolList.tsx
  - src/components/SchoolModal.tsx
  - src/components/SchoolReportModal.tsx
  - src/components/StaffModal.tsx
  - src/components/VisitCalendar.tsx
  - ARCHITECTURE.md
  - docs/decisions/jardin-tipo-de-institucion.md
  - docs/README.md
  - specs/010-jardines/
  - .specify/feature.json
verify: npm run lint && npm test && npm run build && cd backend && go vet ./... && go test ./...
analyzed: 2026-10-26 (analyze sin críticos; C1 e I1 aplicados; aprobado por el dueño del repo: "aplica todo y demosle")
---

# Implementation Plan: Jardines en el legajo

**Branch**: `010-jardines` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-jardines/spec.md`

## Summary

Un jardín es una institución más del legajo, con un **tipo**: columna
`escuelas.tipo` (`Escuela` | `Jardín`), campo `schoolType` en la API
([ADR](../../docs/decisions/jardin-tipo-de-institucion.md), [R1](research.md#r1-columna-tipo-en-escuelas)).
Hereda todo lo de una escuela sin código nuevo de relaciones. El formulario
de alta suma "Tipo de institución"; un único módulo arma "Escuela N° X" /
"Jardín N° X" para todas las pantallas ([R3](research.md#r3-un-solo-lugar-arma-el-nombre))
y el servidor nombra por tipo en la bitácora ([R4](research.md#r4-bitácora-del-servidor)).
Lo genérico pasa a decir "Instituciones" y el directorio gana un filtro
Todas / Escuelas / Jardines ([R5](research.md#r5-instituciones-y-filtro)).
Como en 009, un PUT sin el campo conserva el tipo guardado.

## Technical Context

**Language/Version**: TypeScript 5 / React 19; Go del backend.

**Primary Dependencies**: las existentes. **Ninguna nueva.**

**Storage**: Postgres, `escuelas.tipo text NOT NULL DEFAULT 'Escuela' CHECK (...)` (migración `0003`).

**Testing**: `go test` con Postgres en `:55442` (alta de jardín, ausente conserva, tipo inválido, número repetido entre tipos, resumen de bitácora); vitest para `institucion.ts`. Interfaz con [quickstart.md](quickstart.md) en navegador.

**Target Platform**: escritorio y tablet; backend en Railway, frontend en Pages.

**Project Type**: web (PWA + Go).

**Performance Goals**: sin metas nuevas.

**Constraints**: **publicación**: Railway y Pages salen juntos con el merge a `master`; el servidor viejo rechaza `schoolType` con 400 durante los segundos en que Pages ya está y Railway no. Mergear en un momento sin uso (como en 009). Offline sin cambios en la cola.

**Scale/Scope**: ~140 instituciones, 4 cuentas; ~35 lugares del frontend que nombran la institución.

## Constitution Check

| Principio | Cumple | Cómo |
|---|---|---|
| I. Territorio / sin señal | Sí | Alta/edición de jardín usa la misma cola; idempotencia intacta (R2). |
| II. Legajo compartido con autor | Sí | Servidor como fuente; bitácora nombra por tipo; entradas viejas no se editan. |
| III. Simplicidad | Sí | Una columna, sin tabla ni renombres (ADR). |
| IV. Datos personales | Sí | Pruebas con instituciones ficticias. |
| V. Hosting económico | Sí | Sin servicios nuevos. |
| VI. Mobile-first | Sí | Un selector más en el formulario y uno en el directorio. |

Sin violaciones. Re-chequeo post-diseño: igual.

## Project Structure

```text
specs/010-jardines/  spec, plan, research, data-model, contracts/escuela.md, quickstart, tasks
docs/decisions/jardin-tipo-de-institucion.md

backend/
├── migrations/0003_tipo_institucion.sql
└── internal/
    ├── bitacora/bitacora.go   # Escuela.Tipo (solo en memoria)
    └── legajo/                # tipos, validar, escuelas, lectura, escritura (escuelaDe), personal, tests

src/
├── types/index.ts                 # SchoolType, School.schoolType?
├── services/institucion.ts (+test)
├── services/{borradores,envio,storage}.ts  # textos con el nombre
├── App.tsx
└── components/                    # los de covers:
```

**Structure Decision**: web existente; sin carpetas nuevas.

## Complexity Tracking

Sin violaciones que justificar.

## Resultado (2026-10-26)

- `verify:` en verde: lint, 42 pruebas de vitest, build, `go vet` y `go test` contra Postgres en `:55442` (3 pruebas nuevas: alta/edición/baja de jardín con resúmenes por tipo, validación y número único entre tipos, traslado escuela → jardín).
- Quickstart recorrido en Edge headless (`playwright-core`) contra backend (con `0003` aplicada) y frontend locales: 18/18 controles OK (pasos 1–12).
- Encontrado en el recorrido y corregido: "Volver al Directorio de Escuelas" en la ficha → "Instituciones".
- Barrido de SC-002: sin "Escuela N°" fuera de `institucion.ts` y del servidor; las frases "esta escuela" de la ficha nombran por tipo. Quedan sin tocar los genéricos (búsqueda, ordenar, recetarios, inspector de escuela, ayuda del ámbito) según las Assumptions.
- Chequeo de datos reales sobre `master..HEAD`: sin cédulas ni correos.
- Después del merge: Railway aplica `0003` y Pages publica solos; verificar en producción que una institución abre con su tipo.

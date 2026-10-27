# Tasks: Proveedores en la ficha de escuela

**Input**: `specs/009-proveedores-escuela/` (spec, plan, research, data-model, contracts, quickstart)

**Tests**: sí — el plan pide `go test` para las reglas del servidor (R1–R3) y vitest para la normalización (R5).

## Phase 1: Setup

Sin tareas: no hay dependencias ni estructura nueva.

## Phase 2: Foundational (servidor y tipos)

- [ ] T001 Crear `backend/migrations/0002_proveedores_escuela.sql` con `ALTER TABLE escuelas ADD COLUMN proveedores text[] NOT NULL DEFAULT '{}'` y comentario que remita a la spec 009 (R1)
- [ ] T002 Agregar `Providers []string \`json:"providers"\`` a `School` en `backend/internal/legajo/tipos.go`, después de `Notes`, con comentario: ausente en un PUT = conservar (R2)
- [ ] T003 Agregar `e.proveedores` (o regla equivalente) en `ValidarEscuela` de `backend/internal/legajo/validar.go`: recortar cada nombre; vacío → `"hay un nombre vacío"`; > 120 runas → `"cada nombre admite hasta 120 caracteres"`; repetido sin distinguir mayúsculas → `"nombre repetido: <nombre>"` (contracts/escuela.md)
- [ ] T004 En `backend/internal/legajo/lectura.go` sumar `e.proveedores` a `columnasEscuela` y `&s.Providers` al `Scan` de `escanearEscuela`, en el mismo orden
- [ ] T005 En `backend/internal/legajo/escuelas.go`: sumar `s.Providers` a `argsEscuela` y la columna `proveedores` ($26) al INSERT y al UPDATE; etiqueta `"providers": "Proveedores"`; en `CrearEscuela` poner `[]string{}` si viene `nil` antes de insertar (R3); en `EditarEscuela` pasar un `ajustar` que copie `antes.Providers` cuando `v.Providers == nil` (R2)
- [ ] T006 [P] Agregar `providers?: string[]` a `School` en `src/types/index.ts`, con comentario de por qué es opcional (copias sin el campo)

## Phase 3: User Story 1 — Anotar los proveedores de una escuela (P1) 🎯 MVP

**Goal**: cargar, quitar y ver proveedores de una escuela, compartidos y sin señal.

**Independent Test**: quickstart pasos 1–8.

### Tests

- [ ] T007 [US1] En `backend/internal/legajo/escuelas_test.go`: alta con dos proveedores → GET los trae en orden; alta sin `providers` → `[]`; reenvío idéntico del alta sin `providers` no da conflicto
- [ ] T008 [US1] En `backend/internal/legajo/escuelas_test.go`: edición que quita uno deja el otro y escribe bitácora con `field: "providers"`; edición **sin** el campo conserva la lista (FR-006); edición con `[]` la vacía
- [ ] T009 [US1] En `backend/internal/legajo/escuelas_test.go` (o en `TestEscuelaValidacion`): vacío, solo espacios, 121 caracteres y repetido con otra capitalización → 400 en `providers`
- [ ] T010 [P] [US1] Crear `src/services/proveedores.test.ts`: agregar recorta, ignora vacío, ignora repetido sin distinguir mayúsculas, ignora lo de más de 120; quitar por índice

### Implementation

- [ ] T011 [P] [US1] Crear `src/services/proveedores.ts` con `agregarProveedor(lista, nombre)` y `quitarProveedor(lista, indice)` puras (R5)
- [ ] T012 [US1] En `src/components/SchoolModal.tsx`: estado `providers` cargado de `schoolToEdit.providers ?? []`; input con `maxLength={120}` + botón "Agregar" (Enter también agrega, sin enviar el formulario) y lista con botón quitar por nombre, en un bloque "Proveedores" del formulario siguiendo el estilo de los bloques vecinos; al guardar, incluir `providers` salvo cuando se edita una escuela sin el campo y la lista quedó vacía (R2)
- [ ] T013 [US1] En `src/components/SchoolDetail.tsx`, bloque "Información Institucional del Comedor": tarjeta "Proveedores" con los nombres separados por coma, o "Sin proveedores registrados" (FR-007)
- [ ] T014 [P] [US1] En `src/components/ActivityLogView.tsx`, mostrar `oldValue`/`newValue` que sean listas unidos por `", "` (y lista vacía como vacío) (R4)

## Phase 4: Polish

- [ ] T015 En `ARCHITECTURE.md`, sección "Modelo de dominio", anotar la regla de `providers`: ausente en un PUT = conservar lo guardado (R2)
- [ ] T016 Correr `verify:` del plan con Postgres de pruebas en `:55442`; corregir hasta verde
- [ ] T017 Recorrer `specs/009-proveedores-escuela/quickstart.md` en navegador contra backend local; anotar resultado en el plan
- [ ] T018 Chequeo de datos reales sobre el diff (`git diff master..HEAD | grep "^+" | grep -oE ...` de AGENTS.md) y nombres de prueba ficticios

- [ ] T019 Antes de mergear el PR: desplegar `backend/` a Railway (`railway up` desde `backend/`), confirmar que `GET /legajo` en producción trae `providers` en las escuelas, y recién ahí mergear (Pages publica en cada push a `master`)

## Dependencies

- T001 → T004/T005 (la columna tiene que existir). T002 → T003/T004/T005. T005 → T007–T009.
- T006 → T012/T013. T011 → T012. T010 con T011.
- Phase 4 al final.

## Parallel Example

```text
T006, T010+T011, T014 pueden ir juntas mientras se hace el servidor (T001–T005).
```

## Implementation Strategy

Una sola historia: servidor primero (T001–T009, verde con `go test`), después el navegador (T010–T014), cierre (T015–T018). Se publica junto: el frontend nuevo contra un servidor viejo respondería 400 por campo desconocido, así que **Railway se despliega antes que Pages**.

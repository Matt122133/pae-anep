# Tasks: Jardines en el legajo

**Input**: `specs/010-jardines/` (spec, plan, research, data-model, contracts, quickstart)

**Tests**: sí — `go test` para R1, R2 y R4; vitest para `institucion.ts` (R3).

## Phase 1: Setup

Sin tareas.

## Phase 2: Foundational (servidor, tipos y nombre)

- [ ] T001 Crear `backend/migrations/0003_tipo_institucion.sql`: `ALTER TABLE escuelas ADD COLUMN tipo text NOT NULL DEFAULT 'Escuela' CHECK (tipo IN ('Escuela', 'Jardín'))`, con comentario que remita al ADR `jardin-tipo-de-institucion`
- [ ] T002 En `backend/internal/legajo/tipos.go`, `SchoolType string \`json:"schoolType"\`` en `School` (después de `Number`), comentario: ausente en un PUT = conservar
- [ ] T003 En `backend/internal/legajo/validar.go`: `listaTipoInstitucion = conjunto("Escuela", "Jardín")` (actualizar el comentario de "las tres listas" para nombrar también la migración 0003) y en `ValidarEscuela` validar `schoolType` con `enLista` solo si no está vacío
- [ ] T004 En `backend/internal/legajo/lectura.go` sumar `e.tipo` a `columnasEscuela` y `&s.SchoolType` al `Scan`, en el mismo orden
- [ ] T005 En `backend/internal/legajo/escuelas.go`: `tipo` ($27) en `argsEscuela`, INSERT y UPDATE; etiqueta `"schoolType": "Tipo de institución"`; en `CrearEscuela`, vacío → `"Escuela"` antes del insert; en el `ajustar` de `EditarEscuela` (hoy `conservarProveedores`, renombrar a `conservarAusentes`), vacío → `antes.SchoolType`; mensaje de `numeroRepetido` → "ya existe una institución con ese número"
- [ ] T006 Agregar `Tipo string` a `bitacora.Escuela` en `backend/internal/bitacora/bitacora.go` (comentario: solo para armar resúmenes, no se guarda) y leer `tipo` en `escuelaDe` de `backend/internal/legajo/escritura.go`
- [ ] T007 En `backend/internal/legajo/escuelas.go` agregar `nombreInstitucion(tipo string, numero int) string` ("escuela N° 5" / "jardín N° 5") y `delDe(tipo)` ("de la escuela" / "del jardín"); usarlas en los 5 resúmenes (alta, edición, agua y leche, baja, reactivación) según el contrato
- [ ] T008 En `backend/internal/legajo/personal.go`, el traslado nombra origen y destino con su tipo (`OldValue`/`NewValue` "Escuela N° 5" / "Jardín N° 7" y el resumen)
- [ ] T009 [P] En `src/types/index.ts`: `export type SchoolType = 'Escuela' | 'Jardín'` y `schoolType?: SchoolType` en `School`, con comentario de por qué es opcional
- [ ] T010 [P] Crear `src/services/institucion.ts` (`tipoDe`, `nombreInstitucion`, `conArticulo`, `aLa`, `nombreInstitucionPorId`) y `src/services/institucion.test.ts` (escuela, jardín, ausente = escuela, por id encontrado y no encontrado)

## Phase 3: User Story 1 — Dar de alta un jardín (P1) 🎯 MVP

**Goal**: alta y edición de jardín desde el mismo formulario; el directorio lo distingue y filtra; lo genérico dice "Instituciones".

**Independent Test**: quickstart pasos 1–6, 9–12.

- [ ] T011 [US1] Pruebas en `backend/internal/legajo/escuelas_test.go`: alta de jardín → GET con `schoolType: "Jardín"` y bitácora "Alta del jardín N° …"; alta sin tipo → "Escuela" y reenvío idéntico sin conflicto; PUT sin tipo conserva "Jardín"; tipo inválido → 400 en `schoolType`; jardín con el número de una escuela → 400 en `number`
- [ ] T012 [US1] En `src/components/SchoolModal.tsx`: estado `schoolType` (por defecto Escuela, cargado de `schoolToEdit`), selector "Tipo de institución" como primer campo con el estilo de los selects vecinos; "N° de Escuela *" → "Número *"; nombre por defecto y título de la ficha según el tipo (`nombreInstitucion`); título del alta "Registrar Nueva Institución en Tacuarembó"; `confirm` de baja con `conArticulo`; mandar `schoolType` salvo al editar una ficha sin el campo cuando no se cambió (R2)
- [ ] T013 [US1] En `src/components/SchoolList.tsx`: título "Directorio Oficial • N Instituciones de Tacuarembó", "de N instituciones"; selector "Tipo" Todas / Escuelas / Jardines en la fila de filtros, aplicado en el filtrado (confirmar que el vacío existente se ve con el filtro "Jardines" y sin jardines; si no hay, un texto corto); nombres de tarjeta y fila con `nombreInstitucion`
- [ ] T014 [P] [US1] En `src/components/Navbar.tsx`: acceso "N Instituciones" (texto y `title`), "Directorio de N Instituciones", "Nueva Institución" (título, `aria-label`, texto) y "+ Registrar Nueva Institución"; resultados de búsqueda con `nombreInstitucion`
- [ ] T015 [P] [US1] En `src/components/MobileBottomNav.tsx`: "Instituciones" y los comentarios
- [ ] T016 [P] [US1] En `src/components/Dashboard.tsx`: etiqueta del contador del panel a "Instituciones"; los 6 "Escuela N°" con `nombreInstitucion` / `nombreInstitucionPorId`
- [ ] T017 [US1] En `src/App.tsx`: los textos de borradores ("Alta de la Escuela N°", "Baja de la Escuela N°") y el nombre de la línea 303 con `institucion.ts`

## Phase 4: User Story 2 — Trabajar con un jardín igual que con una escuela (P2)

**Goal**: toda pantalla que nombra la institución dice "Jardín N°" para un jardín; la bitácora del servidor también.

**Independent Test**: quickstart pasos 7–8.

- [ ] T018 [US2] Prueba en `backend/internal/legajo/personal_test.go`: traslado de una escuela a un jardín registra "Escuela N° … → Jardín N° …"; en `escuelas_test.go`, baja de un jardín → "Baja del jardín N° …"
- [ ] T019 [P] [US2] `src/components/SchoolDetail.tsx` (encabezado, las 2 firmas "Por Escuela N°" y la etiqueta de ámbito "Escuela Rural/Urbana" → "<tipo> Rural/Urbana") con `institucion.ts`
- [ ] T020 [P] [US2] `src/components/SchoolReportModal.tsx` (título, texto del acta "cocina comedor de escuela N°", encabezado) por tipo
- [ ] T021 [P] [US2] `src/components/ActivityLogView.tsx` (título de la bitácora de una institución, opciones del selector, línea de cada entrada con `nombreInstitucionPorId`)
- [ ] T022 [P] [US2] `src/components/NewVisitModal.tsx`, `src/components/ScheduleVisitModal.tsx`, `src/components/StaffModal.tsx` (`confirm` de traslado con `aLa`), `src/components/VisitCalendar.tsx` (`confirm` con `aLa`)
- [ ] T023 [P] [US2] `src/services/borradores.ts` (comentario), `src/services/envio.ts` (mensaje "Depende de …") y `src/services/storage.ts` (mapa de nombres) con `institucion.ts`; ajustar `borradores.test.ts`/`envio.test.ts` si cambia un texto esperado

## Phase 5: Polish

- [ ] T024 Barrido (SC-002): `grep -rn "Escuela N°\|escuela N°" src backend/internal` sin resultados fuera de `institucion.ts`, `nombreInstitucion` del servidor y pruebas; además revisar cada `Escuela`/`escuela` restante en `src/components/` y corregir los que nombran a una institución concreta (los genéricos y las modalidades "Escuelas de Educación …" quedan)
- [ ] T025 `ARCHITECTURE.md`, "Modelo de dominio": `schoolType` (jardín = fila con tipo, ver ADR) y que ausente se conserva como `providers`; ADR a `status: accepted`
- [ ] T026 `verify:` del plan con Postgres de pruebas; corregir hasta verde
- [ ] T027 Quickstart en navegador contra backend local; resultado en el plan
- [ ] T028 Chequeo de datos reales sobre `master..HEAD`
- [ ] T029 Plan a `status: completed` con resultados, **en la rama, antes de pedir el merge**; PR con aviso de mergear en un momento sin uso

## Dependencies

- T001 → T004/T005. T002 → T003–T008. T006 → T007/T008. T005–T008 → T011, T018.
- T009, T010 → T012–T023.
- US1 antes que US2 (comparten `institucion.ts`, ya en Phase 2). Phase 5 al final.

## Parallel Example

```text
Con Phase 2 lista: T014, T015, T016 juntas; en US2, T019–T023 juntas (archivos distintos).
```

## Implementation Strategy

Servidor y `institucion.ts` primero (verde con `go test` y vitest), US1 (alta + directorio + "Instituciones"), US2 (barrido de nombres), cierre con el plan `completed` en la misma rama.

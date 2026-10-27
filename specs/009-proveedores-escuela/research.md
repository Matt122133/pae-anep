# Research: Proveedores en la ficha de escuela

## R1. Columna `text[]` en `escuelas`

- **Decision**: `ALTER TABLE escuelas ADD COLUMN proveedores text[] NOT NULL DEFAULT '{}'` en la migración `0002_proveedores_escuela.sql`. Las escuelas existentes quedan con lista vacía (US1 escenario 5, SC-003).
- **Rationale**: la lista no tiene identidad propia ni se consulta fuera de su escuela (FR-004); viaja y se versiona con la ficha, igual que el resto de sus campos. pgx lee y escribe `text[]` como `[]string` sin código extra.
- **Alternatives considered**: tabla `proveedores_escuela` (una fila por nombre): es el camino si después hay catálogo, pero hoy obliga a sincronizar filas en cada edición sin beneficio. `jsonb`: no gana nada frente a `text[]` para una lista de strings.
- Las reglas (vacíos, repetidos, 120 caracteres) viven en `ValidarEscuela`, no en `CHECK`s: así el 400 sale con el campo y el motivo, como el resto de la ficha.

## R2. Una edición sin el campo no borra

- **Decision**: en `School` (Go) el campo es `Providers []string \`json:"providers"\``. Si un PUT llega **sin** `providers` (slice `nil`), `EditarEscuela` copia la lista guardada antes de comparar y escribir, usando el gancho `ajustar` que ya tiene `editar`. Un `[]` explícito sí vacía la lista.
- **Rationale**: FR-006. Los "No enviados" guardados antes de publicar y las copias del legajo en IndexedDB no tienen el campo; sin esto, su envío automático borraría los proveedores cargados desde otra cuenta.
- **Lado del navegador**: si `SchoolModal` edita una escuela cuyo objeto no trae `providers` (copia vieja) y la lista quedó vacía, **no manda** el campo. Si la ecónoma agrega algo, lo manda.
- **Alternatives considered**: tratar `[]` y ausente igual (no se podría vaciar la lista); migrar los borradores en el navegador (más código, y no cubre una pestaña vieja abierta).

## R3. Alta idempotente

- **Decision**: en `CrearEscuela`, un `providers` ausente se guarda como `[]` **antes** del insert.
- **Rationale**: `crear` compara el reenvío con lo guardado (`mismoContenido`, vía JSON); `null` contra `[]` daría un conflicto falso en el reenvío de un alta.

## R4. Bitácora

- **Decision**: etiqueta `"providers": "Proveedores"` en `etiquetasEscuela`; el cambio cae en "Legajo Institucional". En `ActivityLogView`, un valor que sea lista se muestra unido por `", "` (hoy `String([...])` daría `a,b` y una lista vacía un recuadro en blanco).
- **Rationale**: el detalle de la bitácora es lo que lee la dueña para saber qué cambió.

## R5. Normalización en el formulario

- **Decision**: `src/services/proveedores.ts` con `agregarProveedor(lista, nombre)` y `quitarProveedor(lista, i)`, funciones puras con test: recorta espacios, ignora vacío, ignora repetido sin distinguir mayúsculas, ignora lo de más de 120 (el input ya tiene `maxLength`). El servidor valida lo mismo por si llega algo por otra vía.
- **Rationale**: es la única lógica no trivial del lado del navegador y el repo ya prueba con vitest solo lo que está en `src/services/`.

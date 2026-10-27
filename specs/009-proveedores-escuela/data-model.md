# Data Model: Proveedores en la ficha de escuela

## Escuela (cambio)

| Campo (API) | Columna | Tipo | Regla |
|---|---|---|---|
| `providers` | `proveedores` | lista de texto (`text[]`, `NOT NULL DEFAULT '{}'`) | Cada nombre recortado, no vacío, ≤ 120 caracteres; sin repetidos ignorando mayúsculas. Orden = orden de carga. |

- Ausente en un PUT → se conserva lo guardado ([R2](research.md#r2-una-edición-sin-el-campo-no-borra)). `[]` → vacía.
- Ausente en un POST → `[]`.
- En el GET siempre viene (lista, posiblemente vacía).

Tipos espejo: `School.providers?: string[]` en `src/types/index.ts` (opcional porque las copias viejas no lo traen) ↔ `School.Providers []string` en `backend/internal/legajo/tipos.go`.

## Proveedor (anotación)

No es entidad: un string dentro de `escuelas.proveedores`. No tiene id, no existe fuera de su escuela; el mismo nombre en dos escuelas son dos anotaciones (FR-004).

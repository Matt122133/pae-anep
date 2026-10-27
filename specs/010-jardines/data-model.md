# Data Model: Jardines en el legajo

## Institución (tabla `escuelas`, tipo `School`) — cambio

| Campo (API) | Columna | Tipo | Regla |
|---|---|---|---|
| `schoolType` | `tipo` | `'Escuela'` \| `'Jardín'` | `NOT NULL DEFAULT 'Escuela'`, `CHECK` en la migración y lista cerrada en `validar.go` y en el tipo TS (las tres a la vez). |

- POST sin el campo → `'Escuela'`. PUT sin el campo → se conserva. GET siempre lo trae.
- `number` sigue siendo único entre **todas** las instituciones (`escuelas_numero_key`).
- Todo lo demás (comensales, agua, leche, proveedores, personal, visitas, incidencias, historial, bitácora) no cambia: un jardín es una fila más.

Tipos espejo: `export type SchoolType = 'Escuela' | 'Jardín'` y `School.schoolType?: SchoolType` en `src/types/index.ts` ↔ `School.SchoolType string \`json:"schoolType"\`` en `backend/internal/legajo/tipos.go`.

## `bitacora.Escuela` (solo en memoria)

Suma `Tipo string` para armar resúmenes; no se persiste (la bitácora guarda el resumen ya escrito y número/nombre).

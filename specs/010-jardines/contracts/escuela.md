# Contrato: institución con tipo

Mismos endpoints (`/escuelas`, `/legajo`); cambia el cuerpo de la escuela.

## `GET /legajo` → `schools[]`

Cada institución trae `"schoolType": "Escuela"` o `"schoolType": "Jardín"`.

## `POST /escuelas`

- `schoolType` opcional; ausente → `"Escuela"`.
- Número ya usado por **cualquier** institución → 400 `campos.number = "ya existe una institución con ese número"`.

## `PUT /escuelas/{id}`

- `schoolType` presente → lo cambia (con entrada de bitácora "Tipo de institución").
- Ausente → se conserva.

## Errores (400)

| Caso | Campo |
|---|---|
| `schoolType` fuera de la lista | `schoolType`: `"valor no permitido"` (mensaje de `enLista`) |

## Bitácora (resúmenes que escribe el servidor)

| Acción | Escuela | Jardín |
|---|---|---|
| Alta | `Alta de la escuela N° 5 - <nombre>` | `Alta del jardín N° 5 - <nombre>` |
| Edición | `Actualización del legajo de la escuela N° 5` | `Actualización del legajo del jardín N° 5` |
| Agua y leche | `… de agua y leche de la escuela N° 5` | `… de agua y leche del jardín N° 5` |
| Baja / reactivación | `Baja de la escuela N° 5 (queda consultable)` | `Baja del jardín N° 5 (queda consultable)` |
| Traslado de personal | `… Escuela N° 5 → Jardín N° 7 …` | (según el tipo de cada una) |

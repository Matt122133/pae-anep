# Contrato: escuela con proveedores

Cambia solo el cuerpo de la escuela en los endpoints existentes; no hay rutas nuevas.

## `GET /legajo` → `schools[]`

Cada escuela incluye siempre:

```json
{ "providers": ["Distribuidora Norte", "Panadería La Esquina"] }
```

(`[]` si no tiene.)

## `POST /escuelas`

- `providers` opcional. Ausente → `[]`.
- Reenvío del mismo alta (mismo `id`, mismo contenido) → 200 con lo guardado, sin entrada nueva de bitácora.

## `PUT /escuelas/{id}`

- `providers` presente → reemplaza la lista entera.
- `providers` ausente → se conserva la lista guardada.

## Errores (400, `campos`)

| Caso | `campos.providers` |
|---|---|
| Nombre vacío o solo espacios | `"hay un nombre vacío"` |
| Nombre de más de 120 caracteres | `"cada nombre admite hasta 120 caracteres"` |
| Mismo nombre dos veces (sin distinguir mayúsculas) | `"nombre repetido: <nombre>"` |

## Bitácora

Un cambio de lista registra `field: "providers"`, `fieldLabel: "Proveedores"`, `oldValue`/`newValue` como listas.

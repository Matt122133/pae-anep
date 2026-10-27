---
id: jardin-tipo-de-institucion
owner: pae-anep
status: accepted
last_reviewed: 2026-10-26
update_trigger: on-institution-model-change
---

# ADR jardin-tipo-de-institucion — El jardín es un tipo de institución, no una tabla propia

## Status

Aceptado el 2026-10-26 con el plan de `specs/010-jardines/`.

## Contexto

La dueña pidió cargar jardines de infantes. Aclaró que un jardín es
**independiente** de cualquier escuela, que lleva **todo lo mismo** que una
escuela (comedor, agua, leche, proveedores, personal, visitas, incidencias,
bitácora) y que se carga con **el mismo formulario**: "son entidades distintas
pero el formulario es igual". El número es único entre todas las
instituciones (spec 010, Clarifications).

## Decisión

Una sola tabla `escuelas` con una columna `tipo` (`'Escuela'` | `'Jardín'`,
por defecto `'Escuela'`). En la API, el campo `schoolType` de `School`. No se
renombran tabla, rutas (`/escuelas`) ni tipos (`School`): son nombres
internos; lo que ve la usuaria dice "Instituciones", "Escuela N°" o
"Jardín N°" según corresponda.

## Alternativas

- **Tabla `jardines` aparte**: es la lectura literal de "entidades
  distintas", pero personal, visitas, incidencias, historial de personal y
  bitácora tienen FK a `escuelas`. Habría que duplicar cada relación (o
  volverlas polimórficas), duplicar validación y endpoints, y garantizar a
  mano la unicidad del número entre dos tablas. Todo para guardar los mismos
  campos.
- **Renombrar `escuelas` → `instituciones`** en base, API y tipos: deja el
  código más fiel al dominio, pero toca cada consulta, cada ruta y la cola de
  "No enviados" de los dispositivos (que guardan rutas `/escuelas/...`) sin
  cambiar nada para la usuaria.

## Consecuencias

- La unicidad del número sigue siendo la restricción `escuelas_numero_key`.
- Distinguir escuela de jardín es leer `tipo`; todo lo demás se hereda.
- Si un día un jardín necesita datos propios que una escuela no tiene, la
  columna permite validarlos por tipo; si divergen mucho, revisar esta
  decisión.
- En el código, "escuela" en nombres internos significa "institución".

# Feature Specification: Los textos genéricos dicen "institución"

**Created**: 2026-10-26 · **Status**: Draft

**Input**: Pedido del dueño del repo tras 010 ("sí, cambiá lo de escuela a
institución"): los textos genéricos que todavía dicen "escuela" (buscador,
ordenar, inspector, ayuda del ámbito y similares) pasan a "institución",
porque ahora el legajo tiene escuelas y jardines.

## Requirements

- **FR-001**: Los textos de interfaz que hablan de escuelas en general
  (etiquetas, títulos, placeholders, ayudas, mensajes de vacío, `title` y
  `aria-label`, encabezados del CSV de personal) MUST decir "institución" /
  "instituciones".
- **FR-002**: Donde el texto se refiere a una institución concreta y suena
  forzado con "institución" (por ejemplo "Inspector/a de Escuela
  Asignado/a"), se quita la palabra ("Inspector/a Asignado/a").
- **FR-003**: No cambian: los nombres de modalidad ("Escuelas de Educación
  Especial", "…Artística (EDEA)"), los títulos de recetarios oficiales, los
  valores por defecto que se precargan como datos, los nombres internos del
  código ni lo que ya nombra por tipo (010).

## Success Criteria

- **SC-001**: En el barrido de `src/components/` y del CSV, ningún texto
  visible genérico dice "escuela", salvo los de FR-003.

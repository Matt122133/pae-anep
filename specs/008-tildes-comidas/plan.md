---
ticket: none
status: active
covers:
  - src/components/SchoolModal.tsx
  - specs/008-tildes-comidas/
  - .specify/feature.json
verify: npm run lint && npm test && npm run build
analyzed: 2026-10-24 (plan lite; aprobado por el dueño del repo con "si dale de una")
---

# Implementation Plan: Los tildes de comidas entran en la ficha de escuela

Solo clases de Tailwind en `SchoolModal.tsx`, en el contenedor de los tres
tildes del bloque "Comensales y Servicios de Alimentación": pasa de
`flex items-center gap-3` a `flex flex-wrap items-center gap-x-3 gap-y-1`,
para que "Merienda" baje de renglón cuando no entra. Sin elementos nuevos ni
cambios de color.

Verificación: `verify:` y la medición de SC-001 con `playwright-core` en Edge
headless contra el build y el backend local.

## Resultado (2026-10-24)

SC-001 medido (Edge headless, build + backend de producción con una cuenta de
prueba): el borde derecho de "Merienda" queda dentro del recuadro en 390
(299 de 353), 768 (573 de 727), 1024 (706 de 871), 1280 (834 de 999) y 1440
(914 de 1079). `verify:` en verde (32 pruebas).

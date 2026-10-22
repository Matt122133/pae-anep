---
ticket: none
status: active
covers:
  - src/components/Navbar.tsx
  - src/components/MobileBottomNav.tsx
  - specs/007-barra-superior/
  - .specify/feature.json
verify: npm run lint && npm test && npm run build
analyzed: 2026-10-21 (plan lite; aprobado por el dueño del repo con "dale nomas")
---

# Implementation Plan: La barra superior entra en pantalla

Solo clases de Tailwind en `Navbar.tsx`: los textos de los botones de la
derecha ("alertas", "Respaldo / Excel", "Nueva Escuela", "no enviados", "datos
del …") se muestran desde un ancho mayor que hoy (`xl`/`2xl` según lo que entre)
y por debajo queda ícono + número, con el texto en `title`. Si con eso no
alcanza en tablet, el contenedor de la derecha pasa a `min-w-0` y los enlaces
del centro achican su separación. Sin elementos nuevos ni cambios de color.

En `MobileBottomNav.tsx`, el singular de "NO ENVIADOS".

Verificación: `verify:` y la medición de SC-001 con `playwright-core` en Edge
headless contra el build y el backend local, con y sin señal.

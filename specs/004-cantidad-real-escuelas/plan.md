---
ticket: none
status: active
covers:
  - src/components/Navbar.tsx
  - src/components/IndicatorsSummary.tsx
  - src/components/ActivityLogView.tsx
  - src/components/ExportImportModal.tsx
  - src/components/SchoolList.tsx
  - src/components/MobileBottomNav.tsx
  - .specify/feature.json
verify: npm run lint && npm test && npm run build
analyzed: 2026-10-19 (plan lite; aprobado por el dueño del repo con "sí, cambialo a real")
---

# Implementation Plan: Cantidad real de escuelas en los textos

Cada componente ya recibe la lista de escuelas (`schools` o
`databaseState.schools`); se reemplaza el "140" fijo por su `length`. En
`SchoolList` se usa la lista visible (activas, o todas si se piden las dadas de
baja). En el orden "N° Escuela (1 - 140)" se saca el rango. El comentario de
`MobileBottomNav` se corrige. Verificación: `verify:` y navegador.

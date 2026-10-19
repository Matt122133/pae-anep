---
ticket: none
status: completed
covers:
  - src/components/Dashboard.tsx
  - .specify/feature.json
verify: npm run lint && npm test && npm run build
analyzed: 2026-10-19 (plan lite aprobado por el dueño del repo; sin tasks.md)
---

# Implementation Plan: Sin bloque de bienvenida en el panel

**Spec**: [spec.md](spec.md)

## Summary

Se borra el bloque "Welcome Banner" de `src/components/Dashboard.tsx` (el `div`
con degradé que va desde el comentario `{/* Welcome Banner */}` hasta antes de
`{/* Resumen de Indicadores con Recharts */}`). El panel empieza por
`IndicatorsSummary`. Las props que solo usaba el bloque se dejan (no se hace
limpieza oportunista).

`verify:` sin `npm ci`: con un `npm run dev` abierto en Windows, `npm ci` deja
`node_modules` a medio borrar (ver `docs/processes/harness.md`), y este cambio
no toca dependencias.

## Constitution Check

- III. Simplicidad: se borra código. VI. Mobile-first: los accesos siguen en el
  menú móvil.

## Pasos

1. Borrar el bloque en `Dashboard.tsx`.
2. `verify:` verde y comprobación en navegador (tres anchos): sin el bloque y con
  los cinco accesos presentes en barra o menú.

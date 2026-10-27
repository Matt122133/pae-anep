---
ticket: none
status: active
covers:
  - src/components/
  - src/services/storage.ts
  - specs/011-textos-institucion/
verify: npm run lint && npm test && npm run build
analyzed: 2026-10-26 (plan lite, solo textos; pedido y aprobado por el dueño del repo: "si, cambia lo de escuala a institucion")
---

# Plan lite: los textos genéricos dicen "institución"

Rama `010-jardines` (sale con el PR #10). Spec: [spec.md](spec.md).

## Pasos

1. Reemplazar los textos genéricos que encuentra el barrido (`grep -rnE "[Ee]scuelas?\b" src/components src/services/storage.ts`) en ActivityLogView, Dashboard, ExportImportModal, IndicatorsSummary, Navbar, NewVisitModal, ScheduleVisitModal, SchoolDetail, SchoolList, SchoolModal, StaffModal y VisitCalendar, y los encabezados del CSV en `storage.ts`.
2. "Inspector/a de Escuela Asignado/a" → "Inspector/a Asignado/a" (FR-002).
3. Lo que nombra una institución concreta sin tipo ("• Escuela rural:" en las observaciones de la visita, el respaldo `'Escuela'` del calendario) usa `tipoDe` / "Institución".
4. Lo de FR-003 no se toca.
5. `verify:` y una mirada en el navegador al directorio, la ficha y el formulario.

Sin cambios de backend ni de datos.

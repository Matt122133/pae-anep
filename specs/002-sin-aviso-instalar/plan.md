---
ticket: none
status: completed
covers:
  - src/App.tsx
  - src/components/Navbar.tsx
  - src/components/PWAPromptBanner.tsx
  - src/components/PWAInstallButton.tsx
  - src/components/PWAInstallModal.tsx
  - src/hooks/usePWAInstall.ts
  - .specify/feature.json
verify: npm ci && npm run lint && npm test && npm run build
analyzed: 2026-10-19 (plan lite aprobado por el dueño del repo; sin tasks.md)
---

# Implementation Plan: Sin avisos de "Instalar App"

**Branch**: `002-sin-aviso-instalar` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

## Summary

Se borran los tres componentes de invitación a instalar (`PWAPromptBanner`,
`PWAInstallButton`, `PWAInstallModal`) y el hook que los alimenta
(`usePWAInstall`), y se quitan sus tres usos: la franja en `App.tsx` y los dos
botones de `Navbar.tsx` (barra y menú móvil). No se toca `vite.config.ts`: el
service worker y el manifest siguen.

## Constitution Check

- **VI. Mobile-first / pensada para la cocina**: sin conflicto; el dueño aclaró
  que el uso es escritorio y tablet, y sacar un aviso no afecta la carga de campo.
- **III. Simplicidad**: se borra código (744 líneas), no se agrega.
- Harness: `covers:` lista cada archivo; `verify:` tipa, prueba y compila.

## Pasos

1. Borrar los cuatro archivos de instalación.
2. Quitar el import y el uso en `App.tsx` y en `Navbar.tsx`.
3. `verify:` verde, y en navegador (escritorio, tablet, teléfono): ninguna
   aparición de "Instalar".

## Complexity Tracking

Sin violaciones.

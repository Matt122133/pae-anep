---
owner: pae-anep
status: living
last_reviewed: 2026-10-18
update_trigger: on-debt-added-or-resolved
---

# Tech debt tracker

Registro de riesgos conocidos, atajos y mejoras diferidas. Se mantiene según el
steering loop del harness (ver [`processes/harness.md`](processes/harness.md)).

## Cómo funciona

Cada fila es un ítem. Los nuevos van arriba de su sección.

- **Severidad.** `High` (riesgo activo o de correctitud), `Medium` (frena o
  confunde), `Low` (cosmético o especulativo).
- **Estado.** `Open`, `In progress`, `Resolved`, `Dropped`.
- **Resolución.** Cómo se pagó, con referencia a commit/plan/ADR.

## Open

| Fecha | Severidad | Descripción |
|---|---|---|
| 2026-10-18 | High | **No hay backend: cada dispositivo tiene su propio legajo.** Cuatro personas cargando en cuatro navegadores producen cuatro verdades distintas, y borrar los datos del navegador pierde todo. Lo paga `001`. |
| 2026-10-18 | High | **La sincronización offline es una simulación.** `SyncModal.tsx` espera con `setTimeout` y marca visitas como sincronizadas sin enviarlas a ningún lado; además `storage.ts` marca a propósito visitas de las escuelas 17 y 35 como pendientes "para probar". Un indicador de "sincronizado" falso viola el Principio I. Lo paga `001` (o el feature de sincronización si se separa). |
| 2026-10-18 | High | **No hay identidad.** La usuaria activa se elige de una lista; la bitácora atribuye cambios a lo que diga el navegador (Principio II). Lo paga `001`. |
| 2026-10-18 | Medium | **`npm install` falla con `ERESOLVE`**: `devDependencies.esbuild@^0.25` no satisface el peer `esbuild@^0.27 \|\| ^0.28` de `vite@8.3`. Funciona con `--legacy-peer-deps`, y con eso `tsc --noEmit` y `vite build` pasan (medido el 2026-10-18). Arreglo probable: subir o quitar `esbuild` de `devDependencies`. Tampoco hay `package-lock.json` versionado, así que cada instalación resuelve versiones distintas. Necesita plan porque toca `package.json`. |
| 2026-10-18 | Medium | **Rutas absolutas incompatibles con GitHub Pages.** `index.html` (`/favicon.png`, `/icon.svg`, `/src/main.tsx`) y el manifest (`start_url`, `scope`, `shortcuts[].url`) asumen la raíz del dominio; en Pages el sitio vive en `/pae-anep/`. Hay que configurar `base` en Vite y revisar el manifest/service worker. Lo paga el feature de despliegue. |
| 2026-10-18 | Medium | **Nombres reales del equipo en el código de un repo público.** `PAE_TEAM_MEMBERS` (`src/types/index.ts`) y los logs semilla de `storage.ts` nombran a las integrantes del equipo técnico y a inspectores de zona. Si son personas reales, decidir con ellas si pueden figurar; con backend, el equipo pasa a vivir en la base y el código no necesita nombres. **No** se reescribe el historial sin decisión del dueño del repo. |
| 2026-10-18 | Low | **Dependencias de la plantilla sin uso**: `@google/genai`, `express`, `dotenv`, `GEMINI_API_KEY` en `.env.example`, `metadata.json` con `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`, y `name: react-example` en `package.json`. Restos de AI Studio. El README todavía describe la app como "AI Studio app". |
| 2026-10-18 | Low | **Sin tests en el frontend.** No hay runner configurado (`npm run lint` es solo `tsc --noEmit`). Cualquier `verify:` del frontend hoy prueba que compila, no que funciona. |
| 2026-10-18 | Low | **Bundle grande**: `vite build` avisa chunks > 500 kB (precache de ~960 KiB). Relevante para la primera carga en campo con mala señal. |

## Resolved

| Fecha | Severidad | Descripción | Resolución |
|---|---|---|---|

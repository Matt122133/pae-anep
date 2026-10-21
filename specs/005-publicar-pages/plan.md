---
ticket: none
status: active
covers:
  - vite.config.ts
  - .github/workflows/pages.yml
  - docs/processes/despliegue.md
  - docs/README.md
  - specs/005-publicar-pages/
  - .specify/feature.json
verify: npm run lint && npm test && npm run build && grep -q 'href="/pae-anep/favicon.png"' dist/index.html && grep -q '"start_url":"./"' dist/manifest.webmanifest && ! grep -q '140' dist/manifest.webmanifest
analyzed: 2026-10-21 (plan lite; aprobado por el dueño del repo con "pasemoslo nomas y deployemos el front")
---

# Implementation Plan: Publicar el frontend en GitHub Pages

1. **`vite.config.ts`**: `base` es `/pae-anep/` solo en `build` (en `dev` sigue
   `/`). En el manifest, `id`, `start_url` y `scope` pasan a `./`; los íconos y
   los `url` de los accesos directos pierden la `/` inicial para resolverse
   contra la dirección del manifest. El acceso directo "140 Escuelas" pasa a
   "Escuelas" con descripción sin número. Las rutas absolutas de `index.html`
   las reescribe Vite con `base` al compilar (lo comprueba `verify:`).
2. **`.github/workflows/pages.yml`**: en push a `master` y a mano
   (`workflow_dispatch`): `npm ci`, `npm run lint`, `npm test`, `npm run build`
   con `VITE_API_URL: ${{ vars.VITE_API_URL }}`, y publicación con
   `actions/upload-pages-artifact` + `actions/deploy-pages`. Permisos mínimos
   (`pages: write`, `id-token: write`) y concurrencia de un despliegue a la vez.
3. **`docs/processes/despliegue.md`** (+ línea en `docs/README.md`): activar
   Pages con fuente GitHub Actions; cómo conectar Railway cuando vuelva
   (variable `VITE_API_URL`, volver a correr el workflow,
   `CORS_ORIGENES=https://matt122133.github.io` en Railway); cómo comprobar.

Verificación: `verify:` local; después del merge, SC-001/SC-002 en la dirección
pública (requiere el paso manual de Settings → Pages).

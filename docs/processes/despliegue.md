---
owner: pae-anep
status: living
last_reviewed: 2026-10-21
update_trigger: on-deploy-change
---

# Despliegue

## Frontend — GitHub Pages

Dirección: <https://matt122133.github.io/pae-anep/>.

El workflow [`.github/workflows/pages.yml`](../../.github/workflows/pages.yml)
corre en cada push a `master` (y a mano desde Actions → Pages → Run workflow):
`npm ci`, `lint`, pruebas y build; si algo falla, no publica.

- **Una sola vez**: Settings → Pages → Source: **GitHub Actions** (hecho el
  2026-10-21).
- Al compilar, Vite usa `base: '/pae-anep/'`; en `npm run dev` la app sigue en
  `/`. El manifest usa rutas relativas (`./`) para que la app instalada abra
  bajo `/pae-anep/`.
- La dirección del servidor se fija **al compilar** desde la variable del repo
  `VITE_API_URL`. Sin ella, la app carga y al ingresar avisa que no tiene
  servidor configurado.

## Conectar el backend (Railway)

Solo configuración, sin código:

1. En Railway, `CORS_ORIGENES=https://matt122133.github.io` (el origen no lleva
   la ruta `/pae-anep/`). Si ya hay otros orígenes, agregarlo a la lista.
2. En GitHub, Settings → Secrets and variables → Actions → **Variables** →
   `VITE_API_URL` = la dirección pública del servicio en Railway, sin `/` final.
3. Actions → Pages → **Run workflow** para recompilar con la variable.

Cambiar la dirección del servidor siempre exige volver a correr el workflow.

## Comprobar

- La dirección pública abre la pantalla de ingreso y la consola no muestra 404.
- Con servidor: ingresar con una cuenta y ver el legajo. Un error de CORS en la
  consola significa que falta el paso 1.
- La app instalada se puede quedar con la versión anterior hasta recargar
  (`registerType: 'autoUpdate'` la actualiza en la siguiente carga).

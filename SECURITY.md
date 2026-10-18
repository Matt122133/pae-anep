---
owner: pae-anep
status: living
last_reviewed: 2026-10-18
update_trigger: on-trust-boundary-change
---

# Seguridad

Postura de seguridad del repo. **Hoy no hay frontera de confianza**: es un sitio
estático sin servidor y todos los datos viven en el navegador de quien lo usa.
Este documento se reescribe cuando `001` agregue el backend; lo que sigue marca
lo que ya obliga desde ahora.

## Reportes

Un problema de seguridad se reporta al dueño del repo por un canal privado
(GitHub → *Security* → *Report a vulnerability*, si está habilitado), **no** en
un issue público: el repo es público.

## Datos personales

El legajo contiene datos personales de terceros (Ley 18.331): nombre, cédula,
teléfono, estado de BPS y vencimiento de carnés de salud de cocineras y
auxiliares; nombres y contactos de directores/as. Reglas:

- **Nada de datos reales en el árbol.** `src/data/initialData.ts` genera datos
  ficticios (las cédulas se arman con una fórmula). Así tiene que seguir.
- **Excepción a revisar**: `PAE_TEAM_MEMBERS` (`src/types/index.ts`) y los logs
  de ejemplo de `storage.ts` nombran a las integrantes del equipo técnico y a
  inspectores. Ver la fila correspondiente en `docs/tech-debt-tracker.md`.
- Hoy un respaldo JSON exportado (`ExportImportModal`) contiene **todo** el
  legajo en claro. Quien lo descarga es responsable de dónde lo guarda.

## Secretos

- Ningún secreto en el árbol. `.env*` está ignorado salvo `.env.example`, que
  documenta **nombres** de variables, nunca valores.
- Con el backend, la URL de la base y cualquier clave de sesión viven en las
  variables de entorno de Railway.
- Lo que se inyecta en el bundle del frontend en tiempo de build (por ejemplo la
  URL del API) **es público** por definición: va en *variables* del repo en
  GitHub Actions, no en *secrets*, para no fingir que es secreto.

## Escaneo de dependencias

Pendiente. `npm audit` da 0 vulnerabilidades al 2026-10-18 (instalado con
`--legacy-peer-deps`). Activar Dependabot en GitHub cuando haya backend.

## Autenticación y fronteras de confianza

**Hoy: ninguna.** La "usuaria activa" es un valor de `localStorage` que
cualquiera cambia desde la interfaz; la bitácora registra lo que el navegador
dice, no quién es. No sirve como auditoría.

Con el backend (`001`), como mínimo:

- El servidor decide la identidad a partir de una sesión; el autor de cada
  entrada de bitácora sale de ahí, nunca del cuerpo de la petición.
- Ningún endpoint de datos responde sin sesión válida.
- CORS restringido al origen de GitHub Pages (y localhost en desarrollo).
- La credencial viaja en el encabezado `Authorization`, no en cookies
  cross-origin.

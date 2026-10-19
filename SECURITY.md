---
owner: pae-anep
status: living
last_reviewed: 2026-10-19
update_trigger: on-trust-boundary-change
---

# Seguridad

Postura de seguridad del repo. Desde `001` hay una **frontera de confianza**: el
backend (`backend/`, Railway) guarda el legajo y decide quién es quién; el
frontend (GitHub Pages) es un cliente más, y todo lo que manda se valida.

## Reportes

Un problema de seguridad se reporta al dueño del repo por un canal privado
(GitHub → *Security* → *Report a vulnerability*, si está habilitado), **no** en
un issue público: el repo es público.

## Datos personales

El legajo contiene datos personales de terceros (Ley 18.331): nombre, cédula,
teléfono, estado de BPS y vencimiento de carnés de salud de cocineras y
auxiliares; nombres y contactos de directores/as. Reglas:

- **Nada de datos reales en el árbol.** Desde `001` el código no tiene nombres de
  personas: el equipo viene de las cuentas del servidor, y el ejemplo de
  importación (`backend/cmd/importar/testdata/ejemplo.json`) es ficticio. Los
  nombres reales que hubo hasta `001` **siguen en el historial de git**; ver
  `docs/tech-debt-tracker.md`.
- El JSON real de importación va en `datos/` (ignorado) y nunca se versiona.
- Un respaldo JSON o CSV exportado contiene el legajo en claro. Quien lo
  descarga es responsable de dónde lo guarda.

## Secretos

- Ningún secreto en el árbol. `.env*` está ignorado salvo `.env.example`, que
  documenta **nombres** de variables, nunca valores.
- La URL de la base vive en las variables de entorno de Railway. El servicio
  lee solo del entorno y no arranca si falta algo.
- Lo que se inyecta en el bundle del frontend en tiempo de build (por ejemplo la
  URL del API) **es público** por definición: va en *variables* del repo en
  GitHub Actions, no en *secrets*, para no fingir que es secreto.

## Escaneo de dependencias

Pendiente. `npm audit` da 0 vulnerabilidades al 2026-10-19. Activar Dependabot
en GitHub para `npm` y `gomod` (es configuración del repo, no código).

## Autenticación y fronteras de confianza

- **Usuario y contraseña.** Contraseñas con argon2id (parámetros mínimos de
  OWASP, sal por cuenta, formato PHC), mínimo 10 caracteres. Sin registro
  público ni recuperación: las cuentas se crean, resetean y desactivan con
  `backend/cmd/cuentas`, y la contraseña se lee por stdin (nunca como argumento).
- **Mismo error para todo ingreso fallido** (usuario inexistente, contraseña
  mala, cuenta desactivada, bloqueo). Con un usuario inexistente se verifica
  igual contra un hash señuelo para no delatarlo por el tiempo.
- **Límites**: 5 fallos seguidos por usuario o 20 por IP en 15 minutos
  bloquean. La IP es la última entrada de `X-Forwarded-For` (la del proxy de
  Railway), no `RemoteAddr`, que sería la misma para todas.
- **Sesiones**: token aleatorio de 256 bits en `Authorization: Bearer`; en la
  base solo su SHA-256. Vencen a los 30 días sin uso. Resetear la contraseña o
  desactivar la cuenta revoca todas sus sesiones. El token del navegador vive
  en `localStorage` (clave `pae.sesion.v1`).
- **Toda ruta de datos exige sesión**; una prueba recorre la tabla de rutas y
  exige 401 sin credencial en cada una (`backend/cmd/api/main_test.go`).
- **El autor de cada cambio lo decide el servidor** desde la sesión. Un cuerpo
  con campos desconocidos (p. ej. `userName`) se rechaza con 400.
- **Bitácora inmutable**: trigger en Postgres que rechaza `UPDATE`/`DELETE`.
- **CORS** solo para los orígenes de `CORS_ORIGENES`; un origen ajeno recibe 403
  también del lado del servidor. Sin cookies, sin `Allow-Credentials`.
- Los errores hacia afuera son códigos del contrato; la causa interna solo va
  al log del servicio.

**Riesgo residual conocido**: el token en `localStorage` es legible por
cualquier script que corra en el origen del sitio. Es el costo de no usar
cookies entre orígenes distintos; se acota no cargando scripts de terceros
(hoy solo Google Fonts, que es CSS).

---
id: backend-persistence-stack
owner: pae-anep
status: accepted
last_reviewed: 2026-10-18
update_trigger: on-hosting-or-datastore-change
---

# ADR backend-persistence-stack — Frontend estático en GitHub Pages, backend y Postgres en Railway

## Status

**Aceptado** el 2026-10-18. Hosting y lenguaje confirmados por el dueño del
repo ese mismo día. Lo pone en efecto `specs/001-backend-legajo-compartido/`.

## Context

La app es un prototipo completo en interfaz y en modelo de datos, pero **no
tiene servidor**: cada navegador guarda su propio legajo en `localStorage`, la
"sincronización" es simulada y no hay identidad. Para que cuatro personas
trabajen sobre el mismo legajo hace falta persistencia compartida.

Tres restricciones, todas del dueño del repo:

- **Costo.** El frontend en GitHub Pages es gratis; el único componente pago
  tiene que ser el backend.
- **Railway** es la plataforma que el dueño del repo ya usa en producción
  (`flash-urbano`), con su backend y su Postgres.
- **El dueño escribe Go profesionalmente**, y `flash-urbano` ya tiene resuelto
  en Go lo que este backend necesita (sesiones por encabezado, CORS, migraciones
  embebidas, pruebas contra Postgres que se saltean sin base).

## Decision

- **El frontend sigue siendo un sitio estático en GitHub Pages.** No se mueve a
  un host con servidor. Lo que hoy funciona offline sigue funcionando offline.
- **El backend es un servicio separado en Railway, con Postgres en Railway.**
  Sin PostGIS: no hay geometría en este dominio.
- **Lenguaje: Go**, sin framework HTTP, con migraciones SQL embebidas,
  siguiendo la estructura de `flash-urbano/backend` (`cmd/api`, `internal/<dominio>`,
  `migrations/`). Alternativa considerada: Node/TypeScript para compartir los
  tipos de `src/types/index.ts` con el frontend. Se propone Go porque el costo
  de un segundo lenguaje ya está pagado por el dueño del repo y porque reusar
  patrones probados vale más que compartir tipos en una API de este tamaño.
  Confirmado por el dueño del repo el 2026-10-18.
- **Ingreso con usuario y contraseña** (hash, sin recuperación por mail), por
  decisión del dueño del repo el 2026-10-18 para la primera instancia. Se
  descartaron Google con lista blanca (exige que todas tengan cuenta Google) y
  código por mail (exige dominio y proveedor de correo: costo). Las cuentas se
  crean con un comando del servidor.
- **Dos orígenes.** `github.io` para el sitio, un dominio de Railway para el
  API. La sesión viaja en `Authorization`, no en cookies cross-origin.
- **Online primero, offline automático después.** En `001` el backend es la
  fuente de verdad y un guardado sin red queda como borrador local que se
  reenvía a mano; la cola automática es `002`. Los identificadores generados en
  el dispositivo desde `001` hacen que reintentar no duplique, y son la base
  sobre la que `002` construye.

## Consequences

- **Costo por tiempo encendido, no por tráfico.** Cuatro usuarias y 140
  escuelas son un volumen mínimo; el costo lo fija que el servicio y la base
  estén prendidos.
- **CORS y autenticación cross-origin son el costo real de la separación**, y
  hay que diseñarlos desde el principio.
- **Las migraciones pasan a ser una obligación permanente**: con datos reales,
  un cambio de forma es una migración, no regenerar un archivo.
- **El repo es público**: la URL de la base y los secretos de sesión viven en
  Railway, y `SECURITY.md` se reescribe con la nueva frontera de confianza.
- Si cambia el hosting o la base, este ADR se reemplaza, no se edita (ver
  [ADR adr-slug-canonical](adr-slug-canonical.md)).

---
owner: pae-anep
status: stable
last_reviewed: 2026-10-18
update_trigger: on-doc-added
---

# Catálogo de docs

Punto de entrada al contexto para agentes. Leer antes de cualquier tarea que
necesite conocer el repo. Al agregar un doc, sumar una línea en su sección.

## Anclajes en la raíz

- [`/AGENTS.md`](../AGENTS.md) — entrada para agentes: principio operativo,
  restricciones duras, compuertas, arranque de sesión. `CLAUDE.md` es una copia
  idéntica.
- [`/ARCHITECTURE.md`](../ARCHITECTURE.md) — mapa del código: dos superficies
  (PWA y backend), flujo de escritura contra la API, borradores, tipos espejo
  TS/Go, puntos calientes.
- [`/SECURITY.md`](../SECURITY.md) — datos personales, secretos, y la frontera
  de confianza del backend (contraseñas, sesiones, límites, CORS, bitácora).
- [`/backend/README.md`](../backend/README.md) — estructura del servicio,
  variables de entorno (nombres, nunca valores), bases locales de pruebas y de
  desarrollo, comandos `cuentas` e `importar`, y las trampas conocidas.
- [`/.specify/memory/constitution.md`](../.specify/memory/constitution.md) — la
  constitución, documento supremo.

## Specs y planes

- `../specs/` — specs, planes, tareas y artefactos de diseño por feature.
- [`PLANS.md`](PLANS.md) — contrato de estilo de `specs/<feature>/plan.md`.

## Decisiones (ADRs)

- [`decisions/harness-design.md`](decisions/harness-design.md) — por qué existe
  el harness y qué trae.
- [`decisions/speckit-harness-integration.md`](decisions/speckit-harness-integration.md)
  — spec-kit como pipeline de artefactos, harness como capa de gobierno.
- [`decisions/adr-slug-canonical.md`](decisions/adr-slug-canonical.md) — los
  slugs como identificador canónico de ADRs.
- [`decisions/backend-persistence-stack.md`](decisions/backend-persistence-stack.md)
  — frontend estático en GitHub Pages, backend Go + Postgres en Railway, ingreso
  con usuario y contraseña, online primero y offline automático en `002`.

## Procesos

- [`processes/harness.md`](processes/harness.md) — manual operativo del harness,
  incluidas las trampas de `cmd.exe` al correr `verify:`.
- [`processes/speckit-loop.md`](processes/speckit-loop.md) — runbook del loop
  por feature.
- [`processes/dev-setup.md`](processes/dev-setup.md) — toolchain, comandos, y
  cómo conectar el sensor de cobertura.
- [`processes/despliegue.md`](processes/despliegue.md) — publicación del
  frontend en GitHub Pages y cómo conectar el backend de Railway.

## Trackers

- [`tech-debt-tracker.md`](tech-debt-tracker.md) — riesgos conocidos y trabajo
  diferido.
- [`HARNESS-TODO.md`](HARNESS-TODO.md) — esqueletos del harness que faltan
  completar (borrar cuando esté todo tildado).

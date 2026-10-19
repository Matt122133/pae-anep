# Handoff — dónde quedó 001 (2026-10-18)

Archivo de traspaso entre sesiones. Borrarlo cuando el plan pase a `active`.

## Estado

- Rama `001-backend-legajo-compartido`. Harness portado y spec escrito,
  commiteados (commit `14275d9`, con `HARNESS_BYPASS` por ser el bootstrap).
  **No pusheado.**
- Fase: **Brief**. `spec.md` listo; `/speckit-clarify` hecho el 2026-10-18
  (ver sección *Clarifications* del spec), incluidos los dos seguimientos: rechazo +
  aviso de presencia (co-edición en vivo → 003) y borradores sin señal en 001.
- **Plan escrito** (`plan.md` en `status: draft`, con research, data-model,
  contracts y quickstart). Faltan `tasks.md` y `/speckit-analyze`. Sin código.

## Decisiones ya tomadas por el dueño del repo (no volver a preguntar)

- Backend en **Go**, Postgres, en **Railway**; frontend estático en **GitHub
  Pages**. ADR `backend-persistence-stack` aceptado.
- Login **usuario + contraseña con hash**, sin "me olvidé la contraseña";
  cuentas por comando del servidor.
- Datos reales: el dueño arma un **JSON con su propio script** desde Excel y
  Word. El backend importa con la forma del respaldo actual
  (`schools`, `staff`, `visits`, `issues`, `activityLogs`). El archivo nunca
  entra al repo.
- Alcance: **online primero** (001); sincronización automática en **002**. Sin
  red → borrador local "no enviado" con reenvío manual.

## Para `/speckit-clarify`: defaults elegidos sin preguntar

Sesión 30 días; 5 intentos fallidos → bloqueo 15 min; contraseña ≥ 10
caracteres; bajas que ocultan pero conservan historia; mismos permisos para
todas; conflicto de edición = rechazo del segundo guardado; copia de solo
lectura sin conexión (Historia 6, P3) que se borra al cerrar sesión.

## Siguiente paso

1. ~~Clarify~~ hecho. ~~`/speckit-plan`~~ hecho.
2. `/speckit-tasks` → `/speckit-analyze` (hook `after_tasks`). El `covers:` va a
   necesitar al menos `backend/`, `src/`, `.gitignore` (patrón del JSON real),
   `package.json`, `.env.example`. Modelo de backend: `flash-urbano/backend`
   (`cmd/api`, `internal/<dominio>`, `migrations/` embebidas, tests con
   `TEST_DATABASE_URL` que se saltean sin base: mirar el conteo de skips).
3. El dueño promueve el plan a `active` y completa `analyzed:`.

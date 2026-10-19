---
owner: pae-anep
status: living
last_reviewed: 2026-10-18
update_trigger: on-skeleton-filled
---

# Onboarding del harness — esqueletos a completar

Checklist **no bloqueante** de lo que el harness dejó a medio llenar al portarse
desde `flash-urbano` el 2026-10-18. Se puede especificar y entregar features
antes de tildar todo. Borrar este archivo cuando no quede nada sin tildar.

## Checklist

- [x] **`.specify/memory/constitution.md`** — escrita con seis principios
  derivados del estado de la app y del pedido del dueño (1.0.0). Revisar con
  `/speckit-constitution` si cambia el alcance.
- [x] **`ARCHITECTURE.md`** — mapa del frontend actual. Actualizar cuando `001`
  cree `backend/`.
- [x] **`SECURITY.md`** — reescrito en `001` con la frontera de confianza real.
- [x] **`docs/processes/dev-setup.md`** — frontend y backend (`001`).
- [x] **Carriles del stack en `.githooks/pre-commit`** — `npm run lint` y `gofmt`
  desde `001` (los tests completos quedan en el `verify:`, por velocidad).
- [ ] **`docs/processes/despliegue.md`** — runbook de GitHub Pages + Railway.
  *Listo cuando:* el feature de despliegue lo escriba.

## Ítems condicionales

- [x] **Symlinks degradados a copias** — en este Windows `ln -s` crea copias.
  `CLAUDE.md` es copia de `AGENTS.md`, y los cuatro skills `harness-*` existen
  en `.agents/skills/` y en `.claude/skills/`. Editar siempre las dos copias.
- [x] **`python3` en Windows** — esta máquina ya tiene el shim en
  `C:\Users\USUARIO\bin\python3` (instalado para `flash-urbano`). Otra máquina
  lo va a necesitar.

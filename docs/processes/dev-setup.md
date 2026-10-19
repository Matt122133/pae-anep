---
owner: pae-anep
status: living
last_reviewed: 2026-10-18
update_trigger: on-toolchain-change
---

# Entorno de desarrollo

Toolchain local, comandos del día a día, y el único sensor mecánico del harness.
El modelo del harness está en [harness.md](harness.md).

## Toolchain

- **Frontend PWA** (raíz del repo): Node.js 22, React 19, Vite 8, TypeScript,
  Tailwind CSS 4, `vite-plugin-pwa`.
- **Backend** (`backend/`): Go 1.26, Postgres 17 en Docker. Ver
  [`backend/README.md`](../../backend/README.md) para comandos, variables y
  bases locales (pruebas en `:55442`, desarrollo en `:55443`).
- **Scripts del harness** (`scripts/harness/`): Python ≥ 3.9 solo stdlib. En
  Windows sin un `python3.exe` real en el `PATH` hace falta un shim; en esta
  máquina existe en `C:\Users\USUARIO\bin\python3`.
- **spec-kit**: CLI `specify` 0.14.2 (`~/.local/bin/specify`).

## Comandos del frontend

Todos desde la raíz del repo.

| Para qué | Comando |
|---|---|
| Instalar dependencias | `npm ci` (hay `package-lock.json` versionado desde `001`) |
| Correr en local | `VITE_API_URL=http://localhost:8080 npm run dev` (http://localhost:3000), con el backend corriendo (`backend/dev.sh`) |
| Chequeo de tipos | `npm run lint` (es `tsc --noEmit`; no hay ESLint) |
| Build | `npm run build` (sale en `dist/`) |
| Previsualizar el build | `npm run preview` |
| Tests | `npm test` (Vitest, lógica pura de `src/services/`) |

El service worker está activo también en `dev` (`devOptions.enabled: true`). Si
algo "no se actualiza", sospechar del cache de la PWA antes que del código:
DevTools → Application → Service Workers → *Unregister*. En `localStorage`
quedan la sesión (`pae.sesion.v1`) y los borradores no enviados
(`pae.borradores.v1`); el legajo ya no.

## El sensor de cobertura (pre-commit)

`.githooks/pre-commit` corre `scripts/harness/check_plan_coverage.py`, que
rechaza un commit cuyos archivos staged no estén cubiertos por el `covers:` del
único plan activo. Exentos siempre: `docs/`, `specs/`, `scripts/harness/` y los
anclajes de la raíz (`AGENTS.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `SECURITY.md`,
`README.md`, `.harness-version`).

El repo no tiene gestor de hooks (ni husky ni lefthook), así que el harness es
el gestor. Se conecta **una vez por clon**:

```bash
git config core.hooksPath .githooks
python3 scripts/harness/check_plan_coverage.py --doctor   # tiene que decir WIRED
```

Para saltear **solo** este chequeo, con motivo:

```bash
HARNESS_BYPASS="<motivo>" git commit ...
```

### Agregar carriles del stack

Desde `001` el hook corre `npm run lint` si el commit toca el frontend y `gofmt -l`
sobre los `.go` del commit, antes del sensor. Son rápidos a propósito: las
pruebas completas son el `verify:` del plan, no el hook.

## Servidor MCP de GitHub

`.mcp.json` declara el servidor MCP de GitHub corriendo en Docker, que necesita
`/speckit-taskstoissues`. El token se lee de `GITHUB_PERSONAL_ACCESS_TOKEN` del
entorno; nunca se escribe en el archivo.

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
- **Backend** (`backend/`): a definir en `001`. Ver
  [ADR backend-persistence-stack](../decisions/backend-persistence-stack.md).
- **Scripts del harness** (`scripts/harness/`): Python ≥ 3.9 solo stdlib. En
  Windows sin un `python3.exe` real en el `PATH` hace falta un shim; en esta
  máquina existe en `C:\Users\USUARIO\bin\python3`.
- **spec-kit**: CLI `specify` 0.14.2 (`~/.local/bin/specify`).

## Comandos del frontend

Todos desde la raíz del repo.

| Para qué | Comando |
|---|---|
| Instalar dependencias | `npm install --legacy-peer-deps` — **sin el flag falla** con `ERESOLVE` (ver tech-debt-tracker) |
| Correr en local | `npm run dev` (http://localhost:3000) |
| Chequeo de tipos | `npm run lint` (es `tsc --noEmit`; no hay ESLint) |
| Build | `npm run build` (sale en `dist/`) |
| Previsualizar el build | `npm run preview` |
| Tests | ninguno todavía |

El service worker está activo también en `dev` (`devOptions.enabled: true`). Si
algo "no se actualiza", sospechar del cache de la PWA antes que del código:
DevTools → Application → Service Workers → *Unregister*, y borrar
`localStorage` si se quiere volver a los datos de ejemplo.

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

El hook no corre nada del stack todavía. Cuando haya tests, se agregan arriba
del paso del sensor (p. ej. `npm run lint`, y los tests del backend). Tienen que
ser rápidos: un hook lento es un hook que se saltea.

## Servidor MCP de GitHub

`.mcp.json` declara el servidor MCP de GitHub corriendo en Docker, que necesita
`/speckit-taskstoissues`. El token se lee de `GITHUB_PERSONAL_ACCESS_TOKEN` del
entorno; nunca se escribe en el archivo.

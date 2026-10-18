---
owner: pae-anep
status: living
last_reviewed: 2026-10-18
update_trigger: on-module-change
---

# Arquitectura

Mapa de cómo está organizado el código. Leerlo antes de escribir código que
después haya que deshacer. Para el flujo de trabajo ver [`AGENTS.md`](AGENTS.md)
y [`docs/processes/harness.md`](docs/processes/harness.md).

## Visión general

PAE-ANEP es la herramienta de campo del equipo técnico del **Programa de
Alimentación Escolar de Tacuarembó**: tres ecónomas y una licenciada en
nutrición que llevan el legajo de unas 140 escuelas con comedor, las visitan,
registran lo que ven en la cocina y siguen las observaciones hasta resolverlas.

Estado al 2026-10-18 (portado el harness, antes de `001`):

- **Una sola superficie desplegable: el frontend PWA**, en la raíz del repo.
  Generado originalmente con Google AI Studio.
- **Sin backend.** Toda la persistencia es `localStorage` del navegador. Cada
  dispositivo tiene su propio legajo; compartir es exportar e importar un JSON.
- **La sincronización offline es una simulación**: `SyncModal` espera con
  `setTimeout` y marca visitas como sincronizadas. No hay servidor.
- **Sin autenticación.** La "usuaria activa" se elige de una lista fija
  (`PAE_TEAM_MEMBERS` en `src/types/index.ts`) y se guarda en `localStorage`.

Destino acordado (ver
[ADR backend-persistence-stack](docs/decisions/backend-persistence-stack.md)):
el frontend sigue estático en **GitHub Pages**; un **backend** nuevo con
**Postgres** corre en **Railway**. Son orígenes distintos.

## Layout

```text
index.html            # Shell de la PWA (fuentes, metas PWA, monta #root)
vite.config.ts        # Vite + React + Tailwind + vite-plugin-pwa (manifest, workbox)
src/
  main.tsx            # Bootstrap de React
  App.tsx             # Estado global (DatabaseState), navegación, modales, bitácora
  types/index.ts      # Modelo de dominio + equipo PAE + estilos de etiquetas
  services/storage.ts # "Base de datos": localStorage, seeds, migraciones, CSV/JSON
  data/initialData.ts # Generador de las 140 escuelas y datos FICTICIOS de ejemplo
  hooks/usePWAInstall.ts
  components/         # Vistas y modales (ver abajo)
public/               # Íconos PWA
scripts/generate-icons.js  # Genera los PNG de íconos con sharp
backend/              # (a crear en 001) servicio HTTP + migraciones Postgres
specs/                # Specs y planes de spec-kit
docs/                 # Decisiones, procesos, trackers del harness
scripts/harness/      # Sensor de cobertura + motor gate/verify/loop (Python)
.specify/             # Motor de spec-kit (plantillas, constitución, scripts)
.agents/skills/, .claude/skills/  # Skills del harness y de spec-kit
```

## Frontend: cómo fluye el estado

**`App.tsx` es el único dueño del estado.** Mantiene un `DatabaseState`
(`schools`, `staff`, `visits`, `issues`, `activityLogs`) en `useState`,
inicializado con `initializeDatabase()`. Cada handler (`handleSaveVisit`,
`handleSaveStaff`, …) arma el nuevo estado, agrega una entrada de bitácora con
el detalle campo por campo y llama `saveAll()`, que reescribe **todas** las
claves de `localStorage`. Los componentes reciben datos y callbacks por props;
no hay contexto, store ni router.

Navegación: `currentView` (`dashboard` | `schools` | `school-detail`) y
`dashboardTab` (`overview` | `calendar` | `bitacora`). Los parámetros de URL
`?view=` y `?tab=` los usan los atajos del manifest PWA.

### Componentes

| Componente | Rol |
|---|---|
| `Navbar`, `MobileBottomNav` | Navegación, selector de usuaria activa, estado de conexión |
| `Dashboard` | Panel principal con pestañas; usa `IndicatorsSummary`, `VisitCalendar`, `ActivityLogView` |
| `IndicatorsSummary` | KPIs y gráficos (Recharts) |
| `VisitCalendar`, `ScheduleVisitModal` | Agenda de visitas programadas |
| `ActivityLogView` | Bitácora filtrable, exportable a CSV |
| `SchoolList` | Catálogo de las 140 escuelas con filtros |
| `SchoolDetail` | Legajo de una escuela: datos, personal, visitas, incidencias |
| `SchoolModal`, `StaffModal`, `IssueModal` | Altas/ediciones |
| `NewVisitModal` | Formulario completo de visita técnica (el más grande, ~1400 líneas) |
| `TeamVisitorSelector` | Quiénes del equipo hicieron la visita |
| `SchoolReportModal` | Informe imprimible (`window.print()`) |
| `ExportImportModal` | Respaldo JSON y CSV |
| `SyncModal` | **Simulación** de sincronización offline |
| `PWAInstall*`, `PWAPromptBanner` | Instalación de la PWA |

### Modelo de dominio (`src/types/index.ts`)

- `School` — número, nombre, ámbito rural/urbano, modalidad, inspector/a,
  comensales, servicios, agua (OSE / rubro compra), programa de leche y kg/mes.
- `StaffMember` — personal de cocina: CI, rol, régimen (DGEIP / tercerizada /
  …), vencimientos de carné de salud y de manipulador, estado BPS. **Datos
  personales**.
- `Visit` — visita técnica (realizada o programada) con ~40 campos por sección,
  checklist de higiene, alimentos no autorizados, y marcas offline
  (`isOfflinePendingSync`, `offlineSavedAt`, `syncedAt`).
- `SchoolIssue` — observación con categoría, severidad y estado.
- `ActivityLog` — entrada de bitácora con autor, tipo de acción, etiquetas y
  detalle de campos cambiados.

Los contadores de `School` (`totalVisits`, `activeIssuesCount`,
`lastVisitDate`) están **desnormalizados** y los recalcula `App.tsx` a mano. Con
un backend tienen que pasar a ser derivados o mantenidos por el servidor.

## Puntos calientes

- **`storage.ts` mezcla persistencia con migraciones de datos de ejemplo.**
  `initializeDatabase()` reasigna modalidades a escuelas puntuales y marca
  visitas de las escuelas 17 y 35 como pendientes de sincronizar "para poder
  probar". Nada de eso puede llegar a un backend real.
- **`App.tsx` concentra toda la lógica de escritura.** Es el lugar natural para
  enchufar la capa de API, y también el lugar donde un cambio rompe todo.
- **Rutas absolutas** (`/favicon.png`, `start_url: '/'`, `scope: '/'`): rompen
  bajo el subpath de GitHub Pages.

## Límites externos

Hoy la app solo habla con Google Fonts. Ninguna llamada de red a datos.

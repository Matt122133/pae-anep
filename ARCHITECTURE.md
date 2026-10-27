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

Desde `001` (2026-10-19) hay **dos superficies**:

- **Frontend PWA** en la raíz del repo, estático, destinado a **GitHub Pages**.
  Ya no guarda el legajo: lo pide a la API (`GET /legajo`) y escribe por ella.
- **`backend/`**: servicio Go con **Postgres**, destinado a **Railway**. Es la
  fuente de verdad compartida, decide la identidad (usuario y contraseña) y
  escribe la bitácora. Ver [`backend/README.md`](backend/README.md).

**Son orígenes distintos.** La sesión viaja en `Authorization: Bearer`, nunca en
cookies; CORS se restringe a `CORS_ORIGENES`. Ver
[ADR backend-persistence-stack](docs/decisions/backend-persistence-stack.md).

**Sin conexión** (desde `006`):

- **Lectura.** Cada legajo recibido se guarda como **copia** en IndexedDB
  (`src/services/copiaLegajo.ts`, base `pae`, una por dispositivo, con la cuenta
  y la fecha). Sin señal la app abre con esa copia y lo dice ("Sin conexión —
  datos del …"). Cerrar sesión la borra; una copia de otra cuenta no se muestra.
- **Escritura.** Lo que no llega al servidor (sin red, 401, 5xx o sin respuesta
  en 15 s) queda como **borrador "no enviado"** (`src/services/borradores.ts`,
  `localStorage`), con la cuenta que lo escribió y un estado: `pendiente` o
  `rechazado` ("para revisar": 400 con el campo a corregir, o 409).
- **Envío.** `src/services/envio.ts` manda los pendientes de la cuenta activa
  solo, sin confirmar: al abrir, al volver la red y con espera creciente
  (30 s, el doble con cada falla de red o servidor, tope 5 min). De a uno y en
  el orden en que se escribieron; un rechazo no frena a los demás, la red o la
  sesión sí. El mismo id en cada reintento hace que el servidor no duplique.
- **Edición.** Todo borrador con formulario (visita, personal, incidencia,
  escuela) se reabre en él; las notas se editan en la lista. Una ficha abierta
  desde el legajo que tiene un borrador muestra los datos del servidor, avisa
  (`AvisoBorrador`) y pide confirmar antes de reemplazarlo.

Nada se muestra como enviado si el servidor no lo confirmó. No hay envío con la
app cerrada (sin Background Sync).

## Layout

```text
index.html            # Shell de la PWA (fuentes, metas PWA, monta #root)
vite.config.ts        # Vite + React + Tailwind + vite-plugin-pwa (manifest, workbox)
src/
  main.tsx            # Bootstrap de React
  App.tsx             # Estado global (DatabaseState), navegación, modales, bitácora
  types/index.ts      # Modelo de dominio + equipo PAE + estilos de etiquetas
  services/api.ts     # Cliente HTTP: token, errores tipados, id del dispositivo
  services/sesion.ts  # Token y cuenta en localStorage
  services/borradores.ts # Guardados que no llegaron al servidor: cola por cuenta, estado
  services/envio.ts   # Envío automático de la cola: orden, rechazos, espera creciente
  services/copiaLegajo.ts # Copia del legajo en IndexedDB para abrir sin señal
  services/fechas.ts  # Fecha corta para avisos ("dd/mm hh:mm")
  services/equipo.tsx # Contexto con el equipo (cuentas activas del servidor)
  services/storage.ts # Solo exportación CSV/JSON y estado de carnés
  hooks/usePWAInstall.ts
  components/         # Vistas y modales (ver abajo)
public/               # Íconos PWA
scripts/generate-icons.js  # Genera los PNG de íconos con sharp
backend/              # Servicio Go + migraciones Postgres (ver backend/README.md)
specs/                # Specs y planes de spec-kit
docs/                 # Decisiones, procesos, trackers del harness
scripts/harness/      # Sensor de cobertura + motor gate/verify/loop (Python)
.specify/             # Motor de spec-kit (plantillas, constitución, scripts)
.agents/skills/, .claude/skills/  # Skills del harness y de spec-kit
```

## Frontend: cómo fluye el estado

**`App.tsx` es el único dueño del estado.** Sin sesión muestra `Login`; con
sesión pide `GET /legajo?incluir_inactivos=1` y guarda el `DatabaseState` en
memoria (más las cuentas del equipo, que van a `EquipoProvider`). Cada handler
manda **una operación** a la API con `escribir()`:

- si el servidor confirma, reemplaza el registro con la respuesta y recarga el
  legajo (la bitácora y los contadores los calcula el servidor);
- si falla por red, sesión vencida o error del servidor, guarda la operación
  tal cual como borrador "no enviado" (mismo id → reenviar no duplica);
- si es `409` (otra persona guardó antes), carga la versión actual y deja el
  formulario abierto con lo escrito; si es `400`, muestra los campos.

Los modales devuelven `Promise<string | null>` al guardar: `null` cierra, un
texto se muestra en el formulario. El id de cada registro nuevo se genera una
vez por formulario (`nuevoId()`), no al tocar guardar.

Las escuelas y el personal dados de baja vienen en el legajo pero se filtran
en las vistas; `SchoolList` permite verlos ("Ver dadas de baja").

Navegación: `currentView` (`dashboard` | `schools` | `school-detail`) y
`dashboardTab` (`overview` | `calendar` | `bitacora`).

### Componentes

| Componente | Rol |
|---|---|
| `Navbar`, `MobileBottomNav` | Navegación, cuenta con sesión y cerrar sesión, contador de no enviados, estado de conexión |
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
| `ExportImportModal` | Exportación JSON y CSV (la importación es solo por el servidor) |
| `Login` | Ingreso con usuario y contraseña |
| `BorradoresModal` | Lista de "no enviados": editar, enviar ahora, aplicar sobre la versión actual, descartar; los de otra cuenta aparte |
| `AvisoBorrador` | Franja "Hay cambios sin enviar en esta ficha" con "Abrir el borrador" |
| `PresenciaAviso` | "X está editando esta ficha" (latido cada 20 s) |
| `PWAInstall*`, `PWAPromptBanner` | Instalación de la PWA |

### Modelo de dominio

Los tipos de `src/types/index.ts` y los de `backend/internal/legajo/tipos.go`
son **espejo**, con los mismos nombres JSON; se sincronizan a mano. Las listas
cerradas (modalidad, rol, severidad…) existen tres veces: en el tipo TS, en
`validar.go` y en los `CHECK` de la migración. Si cambia una, cambian las tres.

`School.providers` (009) es la única excepción a "el PUT trae la ficha
entera": si no viene, el servidor **conserva** la lista guardada, para que un
"no enviado" o una copia del legajo anteriores al campo no la borren; `[]`
explícito sí la vacía. Por lo mismo, un campo nuevo en un cuerpo exige
desplegar Railway **antes** que Pages: el servidor viejo lo rechaza con 400.

Los contadores de `School` (`totalVisits`, `lastVisitDate`, `activeIssuesCount`)
los **deriva el servidor** en cada lectura; lo que mande la app se ignora.

## Backend

Ver [`backend/README.md`](backend/README.md) para la estructura y los comandos.
Lo que cruza todo:

- **El autor sale de la sesión**, nunca del cuerpo (`httpx.CuentaDe`). Un cuerpo
  con campos desconocidos se rechaza con 400.
- **La bitácora se escribe en la misma transacción que el cambio**
  (`bitacora.Escribir` pide una `pgx.Tx`) y un trigger impide editarla o
  borrarla.
- **Toda edición lleva `version`**: si no coincide, `409` con la versión actual,
  salvo que el contenido ya sea el enviado (reenvío de algo que sí se aplicó).
- **Toda alta es idempotente por id** (el id lo genera el dispositivo).
- `crear`/`editar` en `internal/legajo/escritura.go` son el motor común; cada
  entidad declara sus `operaciones`.

## Puntos calientes

- **`App.tsx` concentra toda la lógica de escritura** (`escribir()`): es donde
  un cambio rompe todo.
- **Tipos espejo TS/Go sin generación**: un campo agregado en un lado y no en el
  otro se rechaza como "campo desconocido" (400). Es ruidoso a propósito.
- **Rutas absolutas** en `index.html` y el manifest: rompen bajo el subpath de
  GitHub Pages (feature de despliegue).

## Límites externos

El frontend habla con su backend (`VITE_API_URL`) y con Google Fonts. El
backend, solo con su Postgres.

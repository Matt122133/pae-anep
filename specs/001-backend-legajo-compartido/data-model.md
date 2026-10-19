# Data model — 001

Esquema Postgres. Las migraciones viven en `backend/migrations/` (solo hacia
adelante, embebidas, aplicadas al arrancar). Nombres de tabla y columna en
español; el JSON de la API conserva los nombres en inglés de
`src/types/index.ts` para no tocar los componentes (el mapeo está en el
contrato).

## cuentas

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | text PK | UUID |
| `usuario` | text | único, normalizado a minúsculas, `[a-z0-9._-]{3,32}` |
| `nombre` | text | no vacío (nombre a mostrar) |
| `rol` | text | `CHECK IN ('Ecónoma del PAE','Licenciada en Nutrición')` |
| `hash_contrasena` | text | formato PHC argon2id |
| `activa` | boolean | default true |
| `creada_en` | timestamptz | |

`cuentas` reemplaza a `PAE_TEAM_MEMBERS`. Las cuentas se crean solo con
`cmd/cuentas`.

## sesiones

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | text PK | |
| `cuenta_id` | text FK → cuentas | `ON DELETE CASCADE` |
| `token_hash` | bytea | único (sha256 del token) |
| `creada_en`, `ultimo_uso` | timestamptz | vence si `ultimo_uso` + 30 días < ahora |

## intentos_ingreso

`usuario text, ip text, exito boolean, momento timestamptz`; índices por
`(usuario, momento)` y `(ip, momento)`. Purga a los 30 días.

## escuelas

Columnas de `School`: `id text PK`, `numero int UNIQUE`, `nombre`,
`departamento`, `ambito CHECK ('Rural','Urbana')`, `zona`, `inspector`,
`direccion`, `telefono`, `email`, `director`, `cocinera_responsable`,
`modalidad CHECK (lista de ModalityType)`, `comensales_alumnos int ≥ 0`,
`comensales_personal int ≥ 0`, `servicio_desayuno`, `servicio_almuerzo`,
`servicio_merienda` (boolean), `agua_ose boolean`, `rubro_agua boolean`,
`notas_agua`, `programa_leche CHECK (lista de MilkProgramType)`,
`leche_kg numeric ≥ 0`, `notas_leche`, `notas`, **`activo boolean`**,
**`version int`**, `actualizada_en`.

Derivados en lectura (no se guardan): `totalVisits` (visitas `Realizada`),
`lastVisitDate` (máxima fecha realizada), `activeIssuesCount` (incidencias no
`Resuelto`).

## personal

Columnas de `StaffMember`: `id text PK`, `escuela_id text FK → escuelas`
(asignación vigente), `nombre_completo`, `ci`, `rol CHECK (StaffRole)`,
`regimen CHECK (InstitutionContractType)`, `empresa`, `vence_carne_salud date`,
`vence_carne_manipulador date`, `bps CHECK (SocialSecurityStatus)`,
`telefono`, `notas`, **`activo boolean`**, **`version int`**.

## personal_asignaciones

`personal_id FK`, `escuela_id FK`, `desde date`, `hasta date NULL`. A lo sumo
una fila con `hasta` nulo por persona (índice único parcial). La importación
crea la asignación inicial con `desde` = fecha de importación.

## visitas

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | text PK | id generado en el dispositivo o del respaldo |
| `escuela_id` | text FK → escuelas | |
| `numero` | int | asignado por el servidor; `UNIQUE (escuela_id, numero)` |
| `fecha` | date | |
| `hora` | text | `HH:MM` |
| `estado` | text | `CHECK IN ('Realizada','Programada','Cancelada')` |
| `visitantes` | text[] | ids de cuentas, o ids históricos si son importadas |
| `comensales_reales` | int | ≥ 0 |
| `evaluacion_menu` | text | `CHECK` con las tres opciones |
| `contenido` | jsonb | el resto de `Visit` (ver contrato) |
| `version` | int | |
| `creada_por` | text FK → cuentas NULL | NULL si es importada |

No se guardan `isOfflinePendingSync`, `offlineSavedAt` ni `syncedAt`: eran del
simulador (FR-027).

## incidencias

Columnas de `SchoolIssue`: `id text PK`, `escuela_id FK`, `visita_id FK NULL`,
`titulo`, `descripcion`, `categoria CHECK (IssueCategory)`,
`severidad CHECK (IssueSeverity)`, `fecha_reporte date`,
`estado CHECK (IssueStatus)`, `fecha_resolucion date NULL`,
`notas_resolucion`, `resuelta_en_visita int NULL`, `version int`.
Regla: `estado = 'Resuelto'` ⇔ `fecha_resolucion` no nula.

## bitacora

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | text PK | |
| `momento` | timestamptz | hora del servidor (o la original si es importada) |
| `escuela_id` | text NULL | sin FK dura: una entrada sobrevive a todo |
| `escuela_numero`, `escuela_nombre` | | copia al momento del evento |
| `cuenta_id` | text NULL | NULL si es importada |
| `autor_nombre`, `autor_rol` | text | copia al momento del evento |
| `accion` | text | `CHECK (ActivityActionType)` + `'IMPORT'` |
| `categoria` | text | `CHECK (ActivityCategory)` |
| `etiqueta`, `etiquetas` | text, text[] | |
| `resumen` | text | |
| `detalle` | jsonb | lista de `{field, fieldLabel, oldValue, newValue}` |
| `notas` | text | |
| `importada` | boolean | |

**Trigger** `bitacora_inmutable`: `BEFORE UPDATE OR DELETE` → `RAISE
EXCEPTION`. Se copia autor y escuela (en vez de solo la FK) para que la entrada
diga lo que era cierto cuando se escribió.

## Transiciones

- Visita: `Programada → Realizada | Cancelada`. Al pasar a `Realizada` cuenta en
  los derivados de la escuela.
- Incidencia: `Pendiente → En Proceso → Resuelto`, y `Resuelto → Pendiente`
  (reabrir), como hoy.
- Escuela / personal: `activo true ⇄ false`.

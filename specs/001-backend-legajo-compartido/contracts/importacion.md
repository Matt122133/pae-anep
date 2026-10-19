# Contrato de importación — 001

Objetivo del script del dueño del repo (Excel + Word → JSON). Lo consume
`backend/cmd/importar` (FR-020 a FR-024).

```bash
cd backend
go run ./cmd/importar -archivo ../datos/legajo-real.json            # base vacía
go run ./cmd/importar -archivo ../datos/legajo-real.json -agregar   # base con datos
go run ./cmd/importar -archivo ../datos/legajo-real.json -validar   # solo valida, no escribe
```

**`datos/` está en `.gitignore`.** El archivo real nunca se versiona. El ejemplo
ficticio vive en `backend/cmd/importar/testdata/ejemplo.json`.

## Forma

Es la forma del respaldo que la app exporta hoy ("Exportar respaldo JSON",
`downloadJsonBackup` en `src/services/storage.ts`):

```json
{
  "schools": [ School ],
  "staff": [ StaffMember ],
  "visits": [ Visit ],
  "issues": [ SchoolIssue ],
  "activityLogs": [ ActivityLog ]
}
```

Los tipos son los de `src/types/index.ts`. Lo mínimo para que tu script sepa qué
es obligatorio:

- **`schools`** (obligatorio, ≥ 1): `id` (texto único; sugerido `esc-<número>`),
  `number` (entero único), `name`, `areaType` (`Rural` | `Urbana`), `modality`
  (una de la lista de `ModalityType`). El resto es opcional y toma el valor por
  defecto (texto vacío, `0`, `false`, `milkProgramType` = `Ninguno / Comedor
  Tradicional`). `totalVisits`, `lastVisitDate` y `activeIssuesCount` **se
  ignoran**: se calculan.
- **`staff`**: `id`, `schoolId` (tiene que existir en `schools`), `fullName`,
  `role`, `institutionType`, `socialSecurityStatus`. Fechas de carné en
  `YYYY-MM-DD` o vacías.
- **`visits`**: `id`, `schoolId`, `date` (`YYYY-MM-DD`), `status` (si falta:
  `Realizada`), `menuEvaluation`. `visitNumber` se respeta si viene y no choca;
  si falta, se asigna en orden de fecha. `visitors`: ids de usuario de cuentas
  existentes, o cualquier texto (se guarda como autoría histórica).
- **`issues`**: `id`, `schoolId`, `title`, `category`, `severity`, `status`,
  `reportedDate`.
- **`activityLogs`**: opcional. `timestamp` ISO, `userName`, `summary`,
  `actionType`, `category`. Quedan marcadas `importada`.

## Reglas

- Se valida **todo** antes de escribir; un error → no se carga nada, y el
  informe lista cada error como `visits[12].schoolId: escuela "esc-999" no
  existe`.
- Números de escuela, ids repetidos y referencias rotas son errores.
- Campos desconocidos se **avisan** (no son error): sirve para detectar typos
  del script.
- Al terminar imprime cuántos registros cargó de cada tipo y deja una entrada de
  bitácora `IMPORT`.

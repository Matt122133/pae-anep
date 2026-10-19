# Contrato HTTP — 001

Base: `VITE_API_URL`. JSON UTF-8. Toda ruta salvo `GET /salud` y
`POST /auth/ingresar` exige `Authorization: Bearer <token>`; sin él o con uno
inválido → `401 {"error":"sesion_invalida"}`.

Los cuerpos usan **los nombres de campo de `src/types/index.ts`** (`schoolId`,
`healthCardValidUntil`, …), para que el frontend no tenga que traducir.

## Errores

| Código | Cuerpo | Cuándo |
|---|---|---|
| 400 | `{"error":"invalido","campos":{"<campo>":"<motivo>"}}` | validación (FR-012) |
| 401 | `{"error":"sesion_invalida"}` | sin sesión, vencida, revocada |
| 401 | `{"error":"credenciales"}` | ingreso fallido o bloqueado (mismo mensaje, FR-005) |
| 404 | `{"error":"no_existe"}` | |
| 409 | `{"error":"conflicto","actual":{…}}` | versión vieja (FR-014) o id repetido con otro contenido |
| 500 | `{"error":"interno"}` | nunca con detalle interno |

## Salud e identidad

- `GET /salud` → `200 {"ok":true}` (sin datos, sin sesión).
- `POST /auth/ingresar` `{"usuario","contrasena"}` → `200 {"token","cuenta":{id,usuario,nombre,rol}}`.
- `POST /auth/salir` → `204`; revoca **esa** sesión.
- `GET /yo` → `200 {id,usuario,nombre,rol}`.

## Lectura del legajo

- `GET /legajo` → `200 { schools, staff, visits, issues, activityLogs, cuentas }`
  con la forma de `DatabaseState`. `schools` incluye los derivados
  (`totalVisits`, `lastVisitDate`, `activeIssuesCount`) y `active`. Por defecto
  solo activos; `?incluir_inactivos=1` trae todo. `activityLogs`: últimos 12
  meses. Cada registro editable trae `version`.
- `GET /bitacora?desde=&hasta=&escuela=` → entradas fuera de esa ventana.

## Escrituras

Todas devuelven el registro resultante (con `version` nueva) y generan su
entrada de bitácora en la misma transacción. **El servidor ignora** cualquier
campo de autor, momento, `version` de salida, número de visita o contador que
venga en el cuerpo.

| Método y ruta | Cuerpo | Notas |
|---|---|---|
| `POST /escuelas` | `School` con `id` | id del dispositivo; idempotente |
| `PUT /escuelas/{id}` | `School` + `version` | 409 si cambió |
| `DELETE /escuelas/{id}` | `{version}` | baja lógica |
| `POST /escuelas/{id}/reactivar` | `{version}` | |
| `POST /personal` | `StaffMember` con `id` | |
| `PUT /personal/{id}` | `StaffMember` + `version` | no cambia de escuela: eso es traslado |
| `DELETE /personal/{id}` | `{version}` | baja lógica |
| `POST /personal/{id}/traslado` | `{schoolId, fecha, version}` | FR-033; bitácora en ambas escuelas |
| `POST /visitas` | `{visit, newIssues:[…]}` | visita + incidencias nuevas en una transacción; número asignado por el servidor |
| `PUT /visitas/{id}` | `Visit` + `version` | incluye pasar de Programada a Realizada |
| `DELETE /visitas/{id}` | `{version}` | solo `Programada` o `Cancelada`; una realizada no se borra |
| `POST /incidencias` | `SchoolIssue` con `id` | |
| `PUT /incidencias/{id}` | `SchoolIssue` + `version` | cambio de estado incluido |
| `DELETE /incidencias/{id}` | `{version}` | |
| `POST /bitacora/notas` | `{id, schoolId?, summary, notes, tags}` | nota administrativa (FR-018) |

No existen `PUT` ni `DELETE` sobre `/bitacora` (→ `405`).

**Idempotencia de `POST` (FR-029)**: si el `id` ya existe y el contenido es
igual → `200` con el registro existente, sin nueva bitácora. Si es distinto →
`409`.

## Presencia (FR-034)

- `PUT /presencia/{tipo}/{id}` (tipo: `escuela`, `personal`, `visita`,
  `incidencia`) → `200 {"otros":[{"nombre":"Karina Rivero"}]}`. Latido cada 20 s.
- `DELETE /presencia/{tipo}/{id}` → `204`.

## CORS

Solo los orígenes de `CORS_ORIGENES`. Se permiten `Authorization` y
`Content-Type`; métodos `GET, POST, PUT, DELETE, OPTIONS`. Sin credenciales de
cookie.

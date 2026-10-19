# backend

El servicio HTTP del legajo compartido del PAE Tacuarembó. Go, sin framework,
con Postgres. Se despliega en Railway (el despliegue es un feature aparte).

Lo crea [`001-backend-legajo-compartido`](../specs/001-backend-legajo-compartido/plan.md)
y pone en efecto el
[ADR backend-persistence-stack](../docs/decisions/backend-persistence-stack.md).

## Qué hay adentro

```text
cmd/api/              El servicio: config → base → migraciones → rutas → servidor
cmd/cuentas/          Administración de cuentas (crear, resetear, desactivar, listar)
cmd/importar/         Carga del legajo real desde JSON, todo o nada
internal/config/      Entorno; no arranca si falta algo
internal/db/          Pool, migraciones con cerrojo, tareas periódicas (purgas)
internal/testdb/      Base de pruebas OBLIGATORIA (ver abajo)
internal/httpx/       CORS, errores del contrato, middleware de sesión
internal/auth/        Contraseñas (argon2id), sesiones, límites de intentos, /auth/*
internal/cuentas/     Las integrantes del equipo
internal/bitacora/    Diff campo a campo y escritura en la misma transacción
internal/legajo/      Escuelas, personal, traslados, visitas, incidencias, GET /legajo
internal/importacion/ Validación y carga del JSON de importación
internal/presencia/   "X está editando esta ficha", en memoria
migrations/           SQL embebido, solo hacia adelante
```

El corte es por dominio. El contrato HTTP está en
[`contracts/api.md`](../specs/001-backend-legajo-compartido/contracts/api.md) y el
esquema en [`data-model.md`](../specs/001-backend-legajo-compartido/data-model.md).

## Variables de entorno

Ninguna vive en el árbol: **el repo es público**. La plantilla con los nombres
está en [`.env.example`](.env.example).

| Variable | Obligatoria | Qué es |
|---|---|---|
| `DATABASE_URL` | sí | Conexión a Postgres. En Railway la provee la base |
| `CORS_ORIGENES` | sí | Orígenes permitidos, separados por coma (el sitio de Pages, `http://localhost:3000`) |
| `PORT` | no | Puerto. Railway lo inyecta. Por defecto `8080` |
| `SESION_INACTIVIDAD` | no | Vencimiento por inactividad. Por defecto `720h` (30 días) |
| `CONFIAR_PROXY` | no | IP del cliente desde `X-Forwarded-For`. Por defecto `true` (Railway tiene proxy) |

## Correrlo en local

```bash
cd backend
cp .env.example .env
./dev.sh          # levanta la base pae-pg-dev en :55443, migra y arranca en :8080
```

Las cuentas se crean con el comando (la contraseña se pide sin eco; también
acepta un pipe con la contraseña y su confirmación en dos líneas):

```bash
set -a; . ./.env; set +a
go run ./cmd/cuentas crear -usuario valentina -nombre "Valentina (prueba)" -rol "Ecónoma del PAE"
go run ./cmd/cuentas listar -todas
go run ./cmd/cuentas resetear -usuario valentina     # cierra todas sus sesiones
go run ./cmd/cuentas desactivar -usuario valentina   # no borra su autoría
```

Para tener datos, el ejemplo **ficticio**:

```bash
go run ./cmd/importar -archivo cmd/importar/testdata/ejemplo.json
```

El JSON real (con datos personales) va en `datos/` en la raíz del repo, que
está ignorado. Formato: [`contracts/importacion.md`](../specs/001-backend-legajo-compartido/contracts/importacion.md).
Conviene crear las cuentas **antes** de importar: así los visitantes y autores
históricos que coincidan con un usuario quedan asociados a su cuenta.

## Pruebas

```bash
docker run -d --name pae-pg-test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=pae_test -p 55442:5432 postgres:17
go test ./...
```

**Si la base de pruebas está apagada, las pruebas FALLAN; no se saltean.** Es a
propósito: en `flash-urbano` se salteaban solas y un `go test` verde no había
probado nada. Saltearlas exige decirlo: `PAE_SIN_DB=1 go test ./...`.

Puertos `55442` (pruebas) y `55443` (desarrollo), y no `55432`/`55433`: esos
los usa `flash-urbano` en esta misma máquina. La de pruebas se vacía en cada
corrida; no mezclarla con la de desarrollo.

Las pruebas de distintos paquetes se serializan con un cerrojo de Postgres
(`internal/testdb`), porque `go test ./...` corre cada paquete en su propio
proceso y todos vacían las mismas tablas.

## Trampas conocidas

- **`curl` en Windows recodifica la `ñ` de los argumentos.** Una contraseña con
  tilde mandada con `curl -d '...'` llega distinta y el ingreso falla. Mandar el
  cuerpo desde un archivo UTF-8 (`--data-binary @archivo.json`). Un navegador no
  tiene este problema.
- La bitácora tiene un trigger que rechaza `UPDATE` y `DELETE`. Para vaciar una
  base de desarrollo usar `TRUNCATE`.

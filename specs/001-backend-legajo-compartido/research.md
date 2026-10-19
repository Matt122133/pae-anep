# Research — 001 backend del legajo compartido

Decisiones técnicas del plan. Cada una: decisión, por qué, alternativas
descartadas. Las de producto están en `spec.md` (Clarifications).

## D1. Stack del servicio

**Decisión**: Go 1.26, `net/http` de la biblioteca estándar (el `ServeMux` con
patrones por método alcanza), `github.com/jackc/pgx/v5` para Postgres,
`golang.org/x/crypto` para el hash de contraseñas. Nada más.

**Por qué**: es el stack del ADR `backend-persistence-stack` y el de
`flash-urbano/backend`, que el dueño del repo ya opera en Railway. La estructura
se copia: `cmd/<binario>/`, `internal/<dominio>/`, `migrations/` embebidas.

**Alternativas**: framework HTTP (chi, echo) — no aporta nada que el mux estándar
no tenga para ~20 rutas; ORM — esconde el SQL justo donde importa (bitácora en
la misma transacción, chequeo de versión).

## D2. Hash de contraseñas

**Decisión**: argon2id (`golang.org/x/crypto/argon2`) con los parámetros mínimos
de OWASP (m = 19 MiB, t = 2, p = 1), sal aleatoria de 16 bytes, guardado en
formato PHC (`$argon2id$v=19$m=19456,t=2,p=1$<sal>$<hash>`), comparación en
tiempo constante. Mínimo 10 caracteres (FR-003).

**Por qué**: es la recomendación vigente para contraseñas nuevas; el formato
PHC guarda los parámetros y permite subirlos después sin romper hashes viejos.

**Alternativas**: bcrypt — igual de válido, pero trunca a 72 bytes y no deja
ajustar memoria. SHA-256 con sal — rápido, que es justo lo que no se quiere.

## D3. Sesiones

**Decisión**: token aleatorio de 32 bytes (base64url), devuelto una sola vez al
ingresar; en la base se guarda `sha256(token)`. Viaja en
`Authorization: Bearer <token>` (FR-007). Vence a los 30 días **sin uso**: cada
petición válida corre `ultimo_uso`, como máximo una escritura por sesión cada 5
minutos para no escribir en cada request. Resetear contraseña o desactivar la
cuenta borra todas sus sesiones (FR-006). Una tarea periódica purga vencidas.

**Por qué**: es el diseño de `flash-urbano` (`internal/auth/sesion.go`), probado
contra Safari y orígenes cruzados. 256 bits de entropía hacen innecesario un
hash lento para el token.

**Alternativas**: JWT — no se puede revocar sin una lista negra, que es volver a
tener tabla de sesiones; cookies — rotas entre orígenes distintos.

## D4. Límite de intentos de ingreso

**Decisión**: tabla `intentos_ingreso` (usuario normalizado, IP, éxito,
momento). Bloqueo si hay **5 fallos seguidos** del mismo usuario en los últimos
15 minutos, o **20 fallos** desde la misma IP en 15 minutos. Mientras está
bloqueado se responde lo mismo que a una contraseña incorrecta, sin verificar
el hash (FR-004, FR-005). Purga a los 30 días.

**Por qué**: en tabla y no en memoria para que sobreviva a un redeploy en
Railway. Mismo mensaje para todo para no confirmar qué usuarios existen.

## D5. Cómo se guarda cada entidad

**Decisión**:

- `escuelas`, `personal`, `incidencias`, `cuentas`: **columnas** tipadas, con
  `CHECK` para las listas cerradas (modalidad, rol, severidad, estado, …).
- `visitas`: columnas para lo que se filtra, ordena o valida contra otras tablas
  (escuela, número, fecha, hora, estado, visitantes, comensales, evaluación del
  menú) y **un `jsonb` `contenido`** con el resto del formulario (las ~35
  secciones de texto y el checklist de higiene).
- `bitacora`: columnas + `detalle jsonb` con los campos cambiados.

**Por qué**: el formulario de visita es lo que más va a cambiar (lo dicta la
práctica de campo y las circulares de DGEIP), y casi todos sus campos son texto
libre que nadie filtra. En `jsonb` agregar una sección no es una migración. Lo
que sí tiene reglas (a qué escuela pertenece, el número correlativo, el estado)
va en columnas con restricciones.

**Validación del `jsonb`**: el servicio decodifica `contenido` en un struct Go
con `DisallowUnknownFields` y valida las listas cerradas del checklist; un campo
desconocido se rechaza con su nombre. La forma la manda el código, no la base.

**Alternativa**: todo en columnas — ~45 columnas en `visitas` y una migración
por cada campo nuevo del formulario. Todo en `jsonb` — se pierden las
restricciones que protegen el número de visita y la referencia a la escuela.

## D6. Identificadores

**Decisión**: claves primarias `text`. Se aceptan los ids existentes del
respaldo (`esc-35`, `staff-…`) en la importación, y los registros nuevos usan un
UUID **generado en el dispositivo** (`crypto.randomUUID()`, con respaldo para
contexto no seguro como en `flash-urbano`). El número de escuela sigue siendo
único y aparte.

**Por qué**: el id generado en el dispositivo es lo que hace idempotente el
reenvío de un borrador (FR-029): un `POST` con un id que ya existe y el mismo
contenido devuelve el registro existente; con contenido distinto, `409`. Es
también la base que `002` necesita para la cola automática.

## D7. Concurrencia: versión por registro

**Decisión**: cada registro editable tiene `version integer`. Toda edición manda
la versión que leyó; el `UPDATE … WHERE id = $1 AND version = $2` actualiza y
suma uno, o no toca nada. Si no tocó nada: si el contenido actual ya es igual al
enviado (un reenvío de algo que sí se aplicó) responde `200`; si no, `409` con
la versión actual, para que la app muestre el aviso y deje reintentar sin perder
lo escrito (FR-014).

**Por qué**: control optimista, una columna, sin cerrojos. La co-edición en vivo
quedó para `003`.

## D8. Aviso de presencia (FR-034)

**Decisión**: **en memoria del proceso**, no en la base. La app manda un latido
`PUT /presencia/{tipo}/{id}` cada 20 s mientras una ficha está abierta en
edición y `DELETE` al cerrarla; la respuesta trae quién más tiene esa ficha con
latido de menos de 60 s. Un mapa con mutex y limpieza periódica.

**Por qué**: es información efímera y de cortesía; perderla en un reinicio no
importa. Railway corre una sola réplica (Principio III). Si algún día hay dos,
el aviso se degrada a parcial, no a incorrecto, y se anota.

**Alternativa**: WebSockets o SSE — es la infraestructura de `003`, no de un
aviso.

## D9. Bitácora inmutable y escrita por el servidor

**Decisión**: cada handler que escribe abre una transacción, aplica el cambio,
calcula el diff campo a campo **en el servidor** (valor anterior leído de la
base, no el que manda la app) y escribe la entrada de bitácora en la misma
transacción. El autor sale de la sesión. Un **trigger** en `bitacora` rechaza
todo `UPDATE` y `DELETE` (FR-017, FR-018).

**Por qué**: si cambio y bitácora no van juntos, puede existir uno sin el otro.
El trigger hace que la inmutabilidad no dependa de que ningún handler se olvide.
En Railway el servicio es dueño de las tablas, así que `REVOKE` no alcanza.

## D10. Contadores de escuela derivados

**Decisión**: `totalVisits`, `lastVisitDate` y `activeIssuesCount` dejan de
guardarse: los calcula la consulta que arma el legajo (agregados sobre visitas
realizadas e incidencias no resueltas). Se siguen entregando en el JSON con los
mismos nombres para no tocar los componentes.

**Por qué**: con 140 escuelas el costo es nulo, y desaparece toda una clase de
inconsistencias (FR-013). El número de visita correlativo sí se asigna al
insertar (`max + 1` por escuela dentro de la transacción, con índice único
`(escuela_id, numero)` y reintento ante choque).

## D11. Traslado de personal (FR-033)

**Decisión**: tabla `personal_asignaciones (personal_id, escuela_id, desde,
hasta)`. `personal.escuela_id` es la asignación vigente (la que tiene `hasta`
nulo). Un traslado es un endpoint propio que cierra la asignación vigente, abre
una nueva y deja entrada de bitácora en **las dos** escuelas. La persona es la
misma fila; nada se borra.

## D12. Bajas lógicas (FR-015)

**Decisión**: `activo boolean` en `escuelas` y `personal`. `DELETE` sobre esos
recursos pone `activo = false` y deja bitácora. Los listados filtran por activo
salvo que se pida `?incluir_inactivos=1`. Las visitas e incidencias se siguen
leyendo aunque su escuela esté inactiva. Visitas programadas e incidencias sí
se pueden borrar (como hoy), con bitácora.

## D13. Una lectura, muchas escrituras

**Decisión**: `GET /legajo` devuelve todo el legajo en la forma de
`DatabaseState` (`schools`, `staff`, `visits`, `issues`, `activityLogs`, más
`cuentas` para el selector de visitantes). Las escrituras son por recurso.

**Por qué**: el frontend ya funciona con un `DatabaseState` en memoria; cambiar
de dónde sale ese estado es un cambio chico en `App.tsx`, mientras que
paginar y cargar por pantalla sería reescribir los componentes. El volumen lo
permite: 140 escuelas y algunos cientos de visitas son pocos cientos de KB. La
bitácora se limita a los últimos 12 meses en esta respuesta y el resto se pide
aparte. Si el JSON pasa de ~2 MB, se revisa (anotar en tech-debt).

## D14. Borradores "no enviados" en el frontend (FR-028, FR-029)

**Decisión**: `src/services/borradores.ts` guarda en `localStorage` (clave
propia, versionada) una lista de operaciones fallidas: `{ id, tipo, metodo,
ruta, cuerpo, creadoEn, ultimoError }`. Cada operación tiene ya su id de
registro generado en el dispositivo (D6), así que reenviarla dos veces no
duplica. Un contador en la barra muestra cuántos hay; una pantalla los lista con
"Reenviar" y "Descartar" (con confirmación). Al cerrar sesión con borradores
pendientes, se avisa y se pide confirmar.

**Qué dispara un borrador**: error de red, `401` (sesión vencida: se guarda y se
pide reingresar) y `5xx`. Un `400` (dato inválido) o `409` (conflicto) **no** se
convierte en borrador: se muestra en el formulario abierto para corregir.

**Alternativa**: IndexedDB — más capacidad, más código; es la herramienta de
`002`, que va a necesitar una cola real. Para una lista corta de reenvío manual
`localStorage` alcanza.

## D15. Configuración

| Variable | Dónde | Obligatoria | Qué es |
|---|---|---|---|
| `DATABASE_URL` | backend | sí | Conexión a Postgres (la provee Railway) |
| `CORS_ORIGENES` | backend | sí | Orígenes permitidos, separados por coma |
| `PORT` | backend | no | Por defecto `8080` |
| `SESION_INACTIVIDAD` | backend | no | Por defecto `720h` (30 días) |
| `VITE_API_URL` | frontend (build) | sí | URL base del API; pública por definición |

El servicio lee solo del entorno y se niega a arrancar si falta una obligatoria.
`.env.example` documenta nombres, nunca valores.

## D16. Pruebas y el riesgo de "verde sin base"

**Decisión**: las pruebas que necesitan Postgres usan un helper
`internal/testdb` que conecta a `TEST_DATABASE_URL` y, **si no está definida,
usa la URL de la base de pruebas documentada** (`localhost:55432`). Si no puede
conectar, **falla**, no se saltea. Saltear exige decirlo: `PAE_SIN_DB=1`.

**Por qué**: en `flash-urbano` las pruebas se salteaban solas y un `verify:`
verde no había probado nada (ver `docs/processes/harness.md`). Acá el modo por
defecto es el seguro. Es el sensor que allá faltaba.

**Frontend**: se agrega Vitest con pruebas unitarias de `api.ts` y
`borradores.ts` (sin DOM: `fetch` simulado). La interfaz se verifica a mano con
`quickstart.md`.

## D17. Comandos de servidor

**Decisión**: tres binarios en `backend/cmd/`: `api` (el servicio),
`cuentas` (`crear`, `resetear`, `desactivar`, `listar`) e `importar`. La
contraseña se lee **de la entrada estándar sin eco**, nunca de un argumento,
para que no quede en el historial de la shell ni en la lista de procesos. En
Railway se corren con `railway run` o `railway ssh` (lo detalla el feature de
despliegue).

## D18. Arreglos de instalación del frontend que este plan necesita

`npm install` falla hoy (`ERESOLVE`, ver tech-debt). Como `verify:` instala y
corre pruebas del frontend, el plan sube `esbuild` en `devDependencies` a una
versión compatible con `vite@8` (o lo quita si nada lo usa directamente), y
**versiona `package-lock.json`**. Se aprovecha para quitar `@google/genai`,
`express`, `dotenv` y `@types/express`, que no usa ningún archivo. Es lo mínimo
para que `verify:` sea reproducible; no se tocan otras versiones.

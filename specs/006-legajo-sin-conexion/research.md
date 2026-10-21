# Research: Legajo sin conexión y envío automático

Decisiones técnicas para [spec.md](spec.md). Numeradas `R1…` para no chocar con
las `D1…` de [`001`](../001-backend-legajo-compartido/research.md).

## R1. El backend no cambia

**Decisión**: sin cambios de backend ni de migración.

**Por qué**: lo revisé contra el código de `001`; todas las escrituras que puede
mandar la cola ya toleran el reenvío:

| Operación | Reenvío de algo ya aplicado | Dónde |
|---|---|---|
| Alta (`POST` escuela, personal, visita, incidencia, nota) | mismo id y mismo contenido → devuelve el existente | `escritura.go` `crear` (D6) |
| Edición (`PUT`) | versión vieja pero contenido igual → devuelve el actual | `escritura.go` `editar` (D7) |
| Baja lógica (`DELETE` escuela/personal) | ya inactiva → devuelve el actual | `CambiarActivo*` |
| Borrado (`DELETE` visita/incidencia) | ya no existe → OK | `Borrar*` |
| Traslado | ya en la escuela destino → devuelve el actual | `Trasladar` |

El número de visita lo asigna el servidor (`visitas.go`, `max(numero)+1` con la
escuela tomada), así que dos visitas cargadas sin señal a la misma escuela salen
con números distintos. El que muestra el formulario sin señal es provisorio.

## R2. Dónde se guarda la copia del legajo: IndexedDB

**Decisión**: la copia va en **IndexedDB**, un solo almacén clave-valor con un
registro `{ cuentaId, recibidoEn, legajo }`, usando la API nativa en un módulo
chico (`src/services/copiaLegajo.ts`), **sin dependencia nueva**.

**Por qué**: el legajo no tiene fotos, pero crece con las visitas (cada una con
observaciones de texto). `localStorage` tiene un tope de unos 5 MB por origen,
compartido con la sesión y los borradores, y escribirlo es síncrono (bloquea la
interfaz con un JSON grande). Con ~140 escuelas y una visita por escuela al mes,
el legajo pasa ese tope en un par de años. IndexedDB guarda objetos sin
serializar a mano y su cuota es de cientos de MB. `001` (research D14) ya
anticipaba que IndexedDB era "la herramienta de 002".

**Alternativas**: `localStorage` (más simple, se rompe con el crecimiento);
la librería `idb-keyval` (~600 B, pero es una dependencia por 30 líneas).

**Fallo**: si IndexedDB no está disponible (modo privado en algunos navegadores)
o la escritura falla, la app sigue funcionando con señal y avisa una vez que
"este dispositivo no puede guardar el legajo para usarlo sin señal".

## R3. La cola sigue en `localStorage`, con cuenta y estado

**Decisión**: los borradores siguen en `localStorage` (`pae.borradores.v1`,
`src/services/borradores.ts`). Se agregan tres campos opcionales:
`cuentaId`, `estado` (`pendiente` | `rechazado`) y `motivoDependencia`. Los
borradores guardados por `001` sin `cuentaId` se asignan a la cuenta de la
sesión al primer arranque (migración en lectura; la clave no cambia).

**Por qué**: la cola es chica (decenas de elementos como mucho) y ya está
probada; la escritura síncrona de `localStorage` es justo lo que se quiere para
no perder un guardado si la pestaña se cierra enseguida (Principio I). Moverla
a IndexedDB agrega una ventana asíncrona sin ganar nada.

**Orden**: el orden de envío es `creadoEn`. Editar un borrador **conserva** su
`creadoEn` (hoy `guardarBorrador` lo pisa si no se pasa): así una visita
editada no se adelanta a la escuela de la que depende.

## R4. Motor de envío: un solo bucle por pestaña

**Decisión**: `src/services/envio.ts`, función pura `enviarCola()` que recorre
los borradores `pendiente` de la cuenta actual en orden de `creadoEn`, de a
uno, y para cada uno:

- **confirmado** → se borra de la cola.
- **red** → se frena todo (sin red no tiene sentido seguir) y se programa un
  reintento.
- **servidor (5xx)** → se frena y se reintenta con espera creciente.
- **sesión (401)** → se frena; la app pide reingresar (FR-013).
- **inválido (400) / conflicto (409)** → el borrador pasa a `rechazado` con el
  motivo, y **se sigue con el siguiente** (FR-011). Un rechazado no se
  reintenta solo: vuelve a `pendiente` solo cuando la usuaria lo edita o elige
  "Reenviar".

Devuelve el resumen `{ enviados, rechazados, frenadoPor }` para el aviso de
FR-020. En `App.tsx` un hook (`useEnvioAutomatico`) lo dispara:

- al abrir la app con sesión,
- en el evento `online`,
- después de cada guardado que quedó como borrador (para salir apenas haya red),
- con un temporizador mientras queden pendientes: 30 s, y con 5xx/red se dobla
  hasta 5 min (FR-015). Se vuelve a 30 s tras un envío que sale bien.

Un candado en memoria evita dos recorridos simultáneos en la misma pestaña.
Entre pestañas no hay candado: el servidor ya no duplica (R1) y un `PUT`
repetido con el mismo contenido devuelve OK.

**Alternativas**: Background Sync API (no funciona en Safari/iOS y la spec deja
fuera el envío con la app cerrada); un service worker propio (más superficie
para lo mismo).

## R5. "Hay wifi pero no hay internet": tiempo de espera en `pedir`

**Decisión**: `pedir` corta a los **15 s** con `AbortController` y lo trata
como `red`. La app **no** confía en `navigator.onLine` para decidir si hay
conexión: lo usa solo como disparador (`online`) y para el aviso; quien manda es
si el pedido sale.

**Por qué**: con un portal cautivo o wifi sin salida `navigator.onLine` es
`true` y `fetch` puede quedar colgado minutos; sin corte, la cola nunca avanza
ni se frena.

## R6. Arranque sin conexión

**Decisión**: con sesión guardada, la app **primero** pinta la copia (si es de
la misma cuenta) y **después** pide `GET /legajo`. Si el pedido sale, reemplaza
y guarda la copia; si falla por red/5xx, queda la copia con el aviso "Sin
conexión — datos del <fecha hora>"; si es 401, se pierde la sesión (como hoy).
Sin copia y sin red: mensaje "Para usar la app sin señal hace falta abrirla una
vez con conexión" con botón de reintentar.

El estado de la copia se expone como `origenDatos: 'servidor' | 'copia'` +
`copiaDel` en `App.tsx`; Navbar/MobileBottomNav muestran el aviso cuando es
`copia`. El app shell ya está precacheado por `vite-plugin-pwa` (005).

## R7. Editar un borrador en su formulario

**Decisión**: desde "No enviados", "Editar" abre el formulario que corresponde
según el prefijo de la `clave`, precargado con el `cuerpo`:

| Clave | Formulario | Precarga |
|---|---|---|
| `visita:<id>` (POST, `status: Realizada`) | `NewVisitModal` | `cuerpo.visit` + `cuerpo.newIssues` |
| `visita:<id>` (POST programada, o PUT) | `ScheduleVisitModal` (una instancia propia en `App.tsx`; la del calendario no se toca) | `cuerpo.visit` o `cuerpo` |
| `personal:<id>` | `StaffModal` | `cuerpo` |
| `incidencia:<id>` | `IssueModal` | `cuerpo` |
| `escuela:<id>` | `SchoolModal` | `cuerpo` |
| `nota:<id>` | edición en línea dentro de "No enviados" (resumen y texto) | `cuerpo` |
| `*-borrar:`, `*-baja:`, `personal-traslado:` | sin formulario | solo "Reenviar" / "Descartar" |

La app selecciona la escuela del borrador (los formularios cuelgan de la escuela
seleccionada) y abre el modal con un estado `abiertoDesde: 'borrador'`. Guardar
pasa por el mismo `escribir()`: si sale, el borrador desaparece; si no, se
**reemplaza** el mismo borrador (misma clave, `creadoEn` conservado, vuelve a
`pendiente`).

La nota no se edita en `ActivityLogView`: su formulario está mezclado con la
vista de la bitácora y precargarlo costaría más que dos campos en la lista.

Los modales que hoy solo editan registros del legajo reciben una prop opcional
`borrador` con los valores iniciales; donde ya hay `xToEdit` se reutiliza
pasando el `cuerpo` como registro a editar.

## R8. Ficha con borrador abierta desde el legajo (FR-021)

**Decisión**: al abrir un modal de edición para un registro, `App.tsx` busca un
borrador con su clave. Si existe y el modal no se abrió desde el borrador, le
pasa `avisoBorrador = { guardadoEn, onAbrir }`: el modal muestra un aviso arriba
con "Abrir el borrador". Al guardar, `escribir()` pide `confirm("Ya hay cambios
sin enviar en esta ficha (guardados el …). ¿Reemplazarlos por estos?")`; si no
confirma, no envía nada y el formulario queda abierto.

El aviso es un componente chico compartido (`AvisoBorrador.tsx`) para no
repetirlo en cinco modales.

## R9. Dependencias rechazadas (FR-012)

**Decisión**: si un borrador vuelve con 400 y su `cuerpo` referencia un
`schoolId` cuyo alta (`escuela:<schoolId>`) está `rechazado` en la cola, el
motivo se reemplaza por "Depende de la Escuela N° X, que todavía no se envió".
Es el único caso de dependencia real: personal, visitas e incidencias cuelgan de
una escuela; una incidencia nueva de una visita viaja dentro de la misma visita.

## R10. Cuenta distinta en el dispositivo (FR-005, FR-014)

**Decisión**: al ingresar, si la copia es de otra cuenta se borra y se pide la
nueva. Los borradores con otro `cuentaId` quedan en la lista agrupados como "De
otra cuenta (<nombre>)": no se envían ni se editan; solo se pueden descartar con
confirmación. Al cerrar sesión **no** se borra la copia (clarify Q1).

## R11. Indicadores (FR-019, FR-020)

**Decisión**: el contador de "No enviados" de Navbar/MobileBottomNav suma un
estado "Enviando…" mientras corre `enviarCola()`, y marca aparte los
rechazados ("1 para revisar"). Al terminar un recorrido con al menos un envío se
muestra el aviso existente (`avisar`) con "Se enviaron N" y, si corresponde,
"M necesitan revisión". No se agrega ningún texto "sincronizado" / "al día".

## R12. Pruebas

**Decisión**: lógica pura con vitest (sin DOM, como hoy): `envio.test.ts`
(orden, rechazado no frena, red frena, 401 frena, espera creciente, dependencia),
`borradores.test.ts` (migración de `cuentaId`, `creadoEn` conservado, estados),
`copiaLegajo.test.ts` con un IndexedDB falso inyectado (la función recibe la
fábrica), `api.test.ts` (corte a los 15 s → `red`). La interfaz se verifica a
mano con [quickstart.md](quickstart.md) (no hay sensor de interfaz: deuda
abierta en el tracker).

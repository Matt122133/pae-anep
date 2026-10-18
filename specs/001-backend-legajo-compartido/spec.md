# Feature Specification: Backend online para el legajo compartido

**Feature Branch**: `001-backend-legajo-compartido`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Backend online para el legajo compartido del PAE Tacuarembó. Servicio Go en Railway con Postgres; el frontend sigue estático (GitHub Pages) y pasa a leer y escribir contra la API en vez de localStorage. Alcance: (1) Login con usuario y contraseña, contraseñas guardadas con hash; sin registro público, sin 'me olvidé la contraseña'; las cuentas las crea/resetea una administradora con un comando del servidor. Sesión por token en encabezado Authorization (orígenes distintos). (2) API para escuelas, personal de cocina, visitas (realizadas y programadas), incidencias y bitácora; el autor de cada cambio y cada entrada de bitácora lo decide el servidor a partir de la sesión. La bitácora no se edita ni se borra. (3) Comando de importación que carga en la base un JSON con la forma del respaldo que ya exporta la app (schools, staff, visits, issues, activityLogs); el dueño del repo va a armar ese JSON con un script a partir de Excel y Word reales, y el archivo nunca entra al repo. (4) El frontend: pantalla de login, reemplazo de storage.ts por llamadas a la API, se quita el selector de 'usuaria activa' y la sincronización simulada. (5) Sin conexión NO hay sincronización en este feature (queda para 002): si guardar falla por falta de red, lo escrito no se pierde, queda como borrador local claramente marcado 'no enviado' y la usuaria puede reintentar a mano. Fuera de alcance: cola offline automática, recuperación de contraseña, despliegue (feature aparte), multi-departamento."

## Contexto

Hoy cada integrante del equipo técnico del PAE tiene **su propio legajo** en su
navegador. Lo que carga una no lo ve ninguna otra, borrar los datos del navegador
pierde todo, la "usuaria activa" se elige de una lista sin contraseña, y la
sincronización offline es una animación que no envía nada. Este feature hace que
las cuatro trabajen sobre **un solo legajo**, guardado en un servidor, con
identidad real.

**Decisión de alcance que tensiona la constitución.** El Principio I exige que lo
cargado sin señal no se pierda y llegue al servidor. El dueño del repo eligió
entregar primero el modo online (001) y la sincronización automática después
(002). Este spec cumple la mitad del principio que no se puede postergar —**lo
escrito nunca se pierde**— con borradores locales que se reenvían a mano, y
deja explícitamente para 002 la mitad que sí se puede postergar —que llegue solo—.
Lo que **no** queda permitido en ningún momento es mostrar como sincronizado algo
que el servidor no confirmó.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ingresar con mi usuario y ver el legajo compartido (Priority: P1)

Una ecónoma abre la app, ingresa su usuario y contraseña, y ve el catálogo de
escuelas, los legajos, las visitas, las incidencias y la bitácora **tal como
están en el servidor**, que es lo mismo que ven sus compañeras.

**Why this priority**: Sin identidad y sin datos compartidos no existe nada más
del feature. Es la diferencia entre cuatro legajos y uno.

**Independent Test**: Con dos cuentas en dos dispositivos distintos, ingresar
con ambas y comprobar que muestran exactamente las mismas escuelas, visitas e
incidencias, y que sin ingresar no se ve ningún dato.

**Acceptance Scenarios**:

1. **Given** una cuenta creada por la administradora, **When** la usuaria ingresa
   su usuario y contraseña correctos, **Then** entra a la app y ve los datos del
   servidor, con su nombre visible como la persona que está trabajando.
2. **Given** una contraseña incorrecta, **When** intenta ingresar, **Then** ve un
   mensaje que no revela si el error fue el usuario o la contraseña, y no entra.
3. **Given** que no hay sesión, **When** alguien abre la app o pide datos al
   servidor directamente, **Then** no recibe ningún dato del legajo.
4. **Given** una sesión abierta, **When** la usuaria cierra sesión, **Then** la app
   vuelve a la pantalla de ingreso y esa sesión deja de servir en el servidor.
5. **Given** una sesión abierta, **When** la usuaria cierra y vuelve a abrir la app
   en el mismo dispositivo, **Then** sigue adentro sin volver a escribir la
   contraseña, hasta que la sesión venza.

---

### User Story 2 - Cargar y editar, y que quede a mi nombre (Priority: P1)

La usuaria registra una visita, da de alta una auxiliar, edita los datos de una
escuela o cambia el estado de una incidencia. El cambio queda guardado en el
servidor, sus compañeras lo ven, y la bitácora dice que lo hizo **ella**, con el
detalle de qué campos cambiaron.

**Why this priority**: Es el trabajo diario del equipo y la razón de tener una
bitácora confiable (Principio II).

**Independent Test**: Con la cuenta A registrar una visita y editar una
auxiliar; con la cuenta B en otro dispositivo, recargar y ver la visita, la
auxiliar actualizada y dos entradas de bitácora atribuidas a A.

**Acceptance Scenarios**:

1. **Given** una sesión válida, **When** la usuaria guarda una visita nueva,
   **Then** el servidor la guarda, asigna su número correlativo dentro de la
   escuela, actualiza los contadores de la escuela, y registra una entrada de
   bitácora con su autoría.
2. **Given** cualquier alta, edición, baja o cambio de estado, **When** se guarda,
   **Then** la bitácora registra autor, fecha y hora del servidor, tipo de acción,
   escuela afectada y valor anterior y nuevo de cada campo cambiado.
3. **Given** una petición que dice venir de otra persona (por ejemplo un campo de
   autor en el cuerpo), **When** llega al servidor, **Then** el servidor la ignora
   y atribuye el cambio a la dueña de la sesión.
4. **Given** una entrada de bitácora existente, **When** alguien intenta
   modificarla o borrarla desde la app o directamente contra el servidor,
   **Then** el servidor lo rechaza.
5. **Given** que la usuaria A abrió la ficha de una auxiliar y la usuaria B guardó
   un cambio en esa misma ficha después, **When** A guarda, **Then** el servidor
   rechaza el guardado de A en vez de pisar el de B, y A ve un aviso que le
   permite ver la versión actual y reintentar sin perder lo que escribió.

---

### User Story 3 - Sin señal, lo escrito no se pierde (Priority: P2)

En una escuela rural sin cobertura la usuaria completa el formulario de visita y
toca guardar. El envío falla. La app le dice claramente que **no se envió**,
guarda lo escrito en el dispositivo como borrador "no enviado", y cuando vuelve
a tener señal ella lo reenvía con un toque.

**Why this priority**: Es la parte del Principio I que no se puede postergar.
Sin esto, el modo online haría perder trabajo de campo.

**Independent Test**: Cortar la red del dispositivo, completar y guardar una
visita, cerrar la app, volver a abrirla, restaurar la red y reenviar el
borrador; la visita aparece una sola vez en el servidor y en el otro
dispositivo.

**Acceptance Scenarios**:

1. **Given** que no hay conexión con el servidor, **When** la usuaria guarda
   cualquier formulario, **Then** ve un aviso inequívoco de que no se envió, y lo
   escrito queda como borrador en el dispositivo.
2. **Given** borradores no enviados, **When** la usuaria abre la app (incluso
   después de cerrarla o reiniciar el teléfono), **Then** ve cuántos hay y puede
   abrir la lista.
3. **Given** un borrador y conexión disponible, **When** la usuaria toca
   reenviar, **Then** se envía, desaparece de la lista solo si el servidor
   confirmó, y si se reenvía dos veces el servidor no lo duplica.
4. **Given** un borrador, **When** la usuaria decide descartarlo, **Then** se le
   pide confirmación antes de borrarlo del dispositivo.
5. **Given** cualquier estado, **When** se mira la app, **Then** en ningún lugar
   aparece "sincronizado" para algo que el servidor no confirmó; el simulador de
   sincronización y el interruptor de "modo offline simulado" ya no existen.

---

### User Story 4 - La administradora gestiona las cuentas (Priority: P2)

Quien administra el servidor crea la cuenta de cada integrante del equipo, le
asigna una contraseña inicial, y si alguien la olvida le pone una nueva. Lo hace
con un comando del servidor, no desde la app.

**Why this priority**: Sin cuentas no hay ingreso; pero son cuatro cuentas y se
crean una vez.

**Independent Test**: Correr el comando para crear una cuenta, ingresar con
ella; correr el comando de reseteo, comprobar que la contraseña vieja ya no
sirve y que las sesiones abiertas de esa cuenta se cerraron.

**Acceptance Scenarios**:

1. **Given** acceso al servidor, **When** la administradora crea una cuenta con
   usuario, nombre a mostrar y rol (Ecónoma del PAE o Licenciada en Nutrición),
   **Then** la cuenta puede ingresar con la contraseña indicada.
2. **Given** una cuenta existente, **When** la administradora resetea su
   contraseña, **Then** la contraseña anterior deja de servir y todas las
   sesiones abiertas de esa cuenta se cierran.
3. **Given** una cuenta, **When** la administradora la desactiva, **Then** no
   puede ingresar ni usar sesiones abiertas, pero su autoría en la bitácora y en
   las visitas se conserva.
4. **Given** la app, **When** cualquiera la usa, **Then** no existe pantalla de
   registro ni de recuperación de contraseña.

---

### User Story 5 - Cargar el catálogo real en la base (Priority: P2)

El dueño del repo arma, con un script propio, un JSON con las escuelas, el
personal y el historial reales (sacados de Excel y Word). Un comando del
servidor lo valida y lo carga en la base. El archivo nunca se versiona.

**Why this priority**: Sin datos reales el legajo compartido está vacío, pero se
corre una vez.

**Independent Test**: Correr la importación con un JSON de ejemplo ficticio en
una base vacía y ver los datos en la app; correrla con un JSON con errores y
comprobar que no se cargó nada y que el informe nombra cada error.

**Acceptance Scenarios**:

1. **Given** una base vacía y un JSON válido con la forma del respaldo que
   exporta la app, **When** se corre la importación, **Then** se cargan escuelas,
   personal, visitas, incidencias y bitácora, y el comando informa cuántos
   registros de cada tipo cargó.
2. **Given** un JSON con errores (campos obligatorios faltantes, valores fuera
   de las listas válidas, referencias a escuelas que no existen, números de
   escuela repetidos), **When** se corre la importación, **Then** no se carga
   nada y el informe lista cada error con su ubicación.
3. **Given** una base que ya tiene datos, **When** se corre la importación sin
   indicar explícitamente que se quiere agregar, **Then** se niega a correr.
4. **Given** entradas de bitácora históricas en el JSON, **When** se importan,
   **Then** conservan su autor y fecha originales y quedan marcadas como
   importadas; la importación misma queda registrada como un evento de
   bitácora.

---

### User Story 6 - Consultar el legajo sin señal (Priority: P3)

En la escuela sin cobertura, la usuaria necesita ver el legajo antes de
inspeccionar: quiénes son las auxiliares, cuándo vence su carné, qué
incidencias quedaron pendientes. La app le muestra la última copia que bajó,
marcada con la fecha y hora en que la bajó y como de solo lectura.

**Why this priority**: Muy útil en campo y barato porque la app ya guarda datos
localmente; pero el núcleo del feature funciona sin esto.

**Independent Test**: Con sesión y datos cargados, cortar la red, recargar la
app y abrir el legajo de una escuela: se ve, con la marca de "copia del
<fecha hora>, sin conexión".

**Acceptance Scenarios**:

1. **Given** que la usuaria ya cargó datos con conexión, **When** abre la app sin
   conexión, **Then** ve la última copia con una marca visible de su antigüedad.
2. **Given** la copia sin conexión, **When** intenta editar, **Then** lo que
   escriba sigue el camino de borradores de la Historia 3.
3. **Given** que la usuaria cierra sesión, **When** se cierra, **Then** la copia
   local de los datos del legajo se borra del dispositivo (los borradores no
   enviados se avisan antes de cerrar).

---

### Edge Cases

- **Sesión vencida con un formulario a medio llenar**: al guardar, el servidor
  rechaza por sesión vencida; lo escrito se conserva como borrador, la usuaria
  vuelve a ingresar y reenvía.
- **Intentos repetidos de ingreso**: después de varios intentos fallidos
  seguidos para un mismo usuario, el servidor rechaza temporalmente nuevos
  intentos de ese usuario, aunque la contraseña sea correcta.
- **Borrador de edición sobre un registro que otra cambió**: al reenviarlo se
  aplica la misma regla de conflicto de la Historia 2 (escenario 5).
- **Borrador de una visita a una escuela que otra dio de baja**: el reenvío
  falla con un mensaje claro y el borrador no se borra solo.
- **Respuesta perdida**: el servidor guardó pero la respuesta no llegó; el
  reenvío del mismo borrador no crea un duplicado.
- **Dos personas registran visita a la misma escuela a la vez**: ambas quedan,
  con números de visita distintos y correlativos.
- **El servidor no responde por un error propio** (no por falta de red): mismo
  tratamiento que sin conexión — borrador, aviso, reintento manual — con un
  mensaje que no culpa a la señal.
- **Datos de ejemplo**: en un servidor real nunca se cargan automáticamente los
  datos ficticios de `initialData`; sirven solo para desarrollo.

## Requirements *(mandatory)*

### Functional Requirements

**Identidad y sesiones**

- **FR-001**: El sistema MUST permitir ingresar con usuario y contraseña, y
  rechazar cualquier acceso a datos del legajo sin una sesión válida.
- **FR-002**: El sistema MUST guardar las contraseñas solo como hash con sal,
  con un algoritmo diseñado para contraseñas; nunca en claro ni reversible.
- **FR-003**: El sistema MUST exigir una contraseña inicial de al menos 10
  caracteres al crear o resetear una cuenta.
- **FR-004**: El sistema MUST limitar intentos de ingreso fallidos por usuario
  (5 seguidos bloquean ese usuario 15 minutos) y por origen.
- **FR-005**: El mensaje de ingreso fallido MUST ser el mismo para usuario
  inexistente y contraseña incorrecta.
- **FR-006**: Las sesiones MUST vencer a los 30 días de inactividad, MUST poder
  cerrarse desde la app, y MUST invalidarse todas al resetear la contraseña o
  desactivar la cuenta.
- **FR-007**: La credencial de sesión MUST viajar en un encabezado de la
  petición, no en una cookie, porque la app y el servidor están en orígenes
  distintos.
- **FR-008**: El servidor MUST aceptar peticiones del navegador solo desde los
  orígenes configurados (el sitio publicado y el entorno de desarrollo).
- **FR-009**: No MUST existir registro público ni recuperación de contraseña en
  la app. Crear, resetear y desactivar cuentas MUST hacerse con un comando del
  servidor.
- **FR-010**: Toda integrante con cuenta activa MUST tener los mismos permisos
  sobre el legajo; no hay roles con permisos distintos dentro de la app. El rol
  (Ecónoma / Licenciada en Nutrición) es informativo y se usa en informes y
  textos de visita.

**Legajo compartido**

- **FR-011**: El sistema MUST permitir listar, ver, crear, editar y dar de baja
  escuelas, personal de cocina, visitas (realizadas y programadas) e
  incidencias, con todos los campos que la app maneja hoy.
- **FR-012**: El servidor MUST validar cada escritura (campos obligatorios,
  valores dentro de las listas definidas, fechas válidas, referencias a
  escuelas existentes) y rechazar con un mensaje que nombre el campo.
- **FR-013**: El servidor MUST asignar el número de visita correlativo por
  escuela y mantener los contadores de la escuela (visitas realizadas, última
  visita, incidencias activas) consistentes con los datos, sin depender de que
  la app los mande bien.
- **FR-014**: Una edición MUST rechazarse si el registro cambió en el servidor
  desde que la usuaria lo cargó; nunca se pisa en silencio el cambio de otra.
- **FR-015**: Las bajas de escuelas y de personal MUST conservar la historia: un
  registro dado de baja deja de aparecer en los listados pero sus visitas,
  incidencias y entradas de bitácora siguen consultables.
- **FR-016**: La lista de integrantes del equipo que la app usa (por ejemplo
  para elegir quiénes hicieron una visita) MUST venir del servidor (cuentas
  activas), no de una lista fija en el código.

**Bitácora**

- **FR-017**: Cada alta, edición, baja y cambio de estado MUST generar en el
  servidor una entrada de bitácora con autor tomado de la sesión, fecha y hora
  del servidor, tipo de acción, categoría, escuela afectada y detalle de campos
  con valor anterior y nuevo.
- **FR-018**: Las usuarias MUST poder agregar notas administrativas a la
  bitácora; nadie MUST poder editar ni borrar ninguna entrada.
- **FR-019**: La bitácora MUST poder filtrarse y exportarse a CSV como hoy, a
  partir de los datos del servidor.

**Importación**

- **FR-020**: Un comando del servidor MUST importar un archivo JSON con la forma
  del respaldo que exporta la app hoy (escuelas, personal, visitas, incidencias,
  bitácora), validándolo completo antes de escribir.
- **FR-021**: La importación MUST ser todo o nada: con cualquier error no se
  carga nada y se informa cada error con su ubicación en el archivo.
- **FR-022**: La importación MUST negarse a correr sobre una base con datos del
  legajo salvo que se indique explícitamente agregar.
- **FR-023**: Las entradas de bitácora importadas MUST conservar autor y fecha
  originales y quedar marcadas como importadas; la importación MUST quedar
  registrada como un evento propio.
- **FR-024**: El formato de entrada de la importación MUST quedar documentado en
  el repo (campos, obligatorios, valores válidos) con un ejemplo **ficticio**,
  para que el script del dueño del repo tenga un objetivo claro. El archivo real
  MUST quedar fuera del control de versiones.

**Frontend**

- **FR-025**: La app MUST mostrar una pantalla de ingreso antes de cualquier
  dato, y el nombre de la usuaria con sesión en lugar del selector de "usuaria
  activa", que se elimina.
- **FR-026**: La app MUST leer y escribir el legajo contra el servidor; el
  almacenamiento local deja de ser la fuente de verdad.
- **FR-027**: La app MUST eliminar el simulador de sincronización, el
  interruptor de modo offline simulado y cualquier indicador de "sincronizado"
  que no corresponda a una confirmación del servidor.
- **FR-028**: Cuando un guardado falla por falta de conexión, sesión vencida o
  error del servidor, la app MUST conservar lo escrito como borrador local "no
  enviado", sobrevivir a cerrar la app, mostrar cuántos borradores hay, y
  permitir reenviarlos o descartarlos (con confirmación) a mano.
- **FR-029**: Reenviar un borrador MUST ser idempotente: cada borrador lleva un
  identificador generado en el dispositivo y el servidor no crea dos registros
  para el mismo identificador.
- **FR-030**: La app MUST mostrar sin conexión la última copia bajada del
  legajo, como solo lectura y con la fecha y hora de esa copia; al cerrar sesión
  esa copia se borra del dispositivo.
- **FR-031**: Exportar a CSV y JSON e imprimir el informe por escuela MUST seguir
  funcionando con los datos del servidor.
- **FR-032**: Importar un respaldo JSON desde la app MUST quedar deshabilitado;
  la carga masiva se hace solo con el comando del servidor (FR-020).

### Key Entities

- **Cuenta**: una integrante del equipo. Usuario único, nombre a mostrar, rol
  informativo, activa/desactivada, hash de contraseña. Reemplaza a
  `PAE_TEAM_MEMBERS`.
- **Sesión**: credencial emitida al ingresar, ligada a una cuenta, con
  vencimiento; se puede revocar.
- **Escuela**: la unidad del legajo (número único, nombre, ámbito, modalidad,
  inspector/a, comensales, servicios, agua, leche). Contadores derivados.
- **Personal de cocina**: pertenece a una escuela; datos personales (cédula,
  teléfono, carnés, BPS).
- **Visita**: pertenece a una escuela; realizada o programada; número
  correlativo por escuela; quiénes del equipo la hicieron (cuentas); todas las
  secciones del formulario actual.
- **Incidencia**: pertenece a una escuela y opcionalmente a la visita que la
  originó; categoría, severidad, estado, resolución.
- **Entrada de bitácora**: inmutable; autor (cuenta, o autor histórico si fue
  importada), momento, tipo de acción, categoría, etiquetas, escuela, detalle de
  campos, notas.
- **Borrador no enviado** (solo en el dispositivo): identificador propio, tipo
  de operación, contenido, momento, último error.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un cambio guardado por una integrante es visible para otra en otro
  dispositivo al recargar, en el 100 % de los casos probados.
- **SC-002**: El 100 % de las entradas de bitácora generadas desde la app
  quedan atribuidas a la dueña de la sesión, incluso si la petición declara
  otro autor.
- **SC-003**: Sin sesión válida, ninguna consulta al servidor devuelve datos del
  legajo (0 respuestas con datos en la prueba de acceso sin credencial a cada
  tipo de dato).
- **SC-004**: En la prueba sin red, 0 formularios guardados se pierden: todos
  quedan como borrador, sobreviven a cerrar la app, y al reenviarse aparecen
  exactamente una vez en el servidor aunque se reenvíen dos veces.
- **SC-005**: Una integrante puede ingresar y llegar al catálogo de escuelas en
  menos de 30 segundos desde un teléfono con conexión móvil normal.
- **SC-006**: Una importación con al menos un error deja la base sin cambios, y
  el informe nombra cada error; una importación del catálogo completo
  (≈140 escuelas con su personal e historial) termina sin intervención manual.
- **SC-007**: Ninguna pantalla muestra "sincronizado" para datos que el servidor
  no confirmó (revisión de todas las pantallas que hoy muestran estado de
  sincronización).

## Assumptions

- Las cuatro integrantes actuales (tres ecónomas y una licenciada en nutrición)
  son las únicas usuarias. No hay acceso para escuelas, auxiliares ni
  inspectores.
- "Administradora" es quien tiene acceso al servidor (hoy, el dueño del repo);
  no es un rol dentro de la app.
- El JSON de importación sigue la forma de `DatabaseState` que hoy produce
  "Exportar respaldo" (`schools`, `staff`, `visits`, `issues`, `activityLogs`).
  Las referencias a integrantes del equipo en visitas y bitácora (hoy ids como
  `valentina`) se asocian a cuentas por nombre de usuario; si no hay cuenta, la
  autoría histórica se conserva como texto.
- Volumen: ~140 escuelas, unas pocas por escuela de personal, decenas a cientos
  de visitas por año, cuatro usuarias concurrentes como máximo.
- Las usuarias ingresan con conexión al menos una vez antes de ir a campo.
- El despliegue (Railway y GitHub Pages, dominios, variables) es un feature
  aparte; este feature se prueba en local con una base Postgres de desarrollo.
- La sincronización automática de borradores es el feature 002. Hasta entonces
  el reenvío es manual.
- Backend en Go con Postgres, según
  [ADR backend-persistence-stack](../../docs/decisions/backend-persistence-stack.md);
  el detalle técnico va en el plan, no en este spec.

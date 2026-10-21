# Feature Specification: Legajo sin conexión y envío automático

**Feature Branch**: `006-legajo-sin-conexion`
**Created**: 2026-10-21
**Status**: Draft
**Input**: User description: "006 legajo sin conexión y sincronización automática (el "002" que nombran la constitución, el ADR y 001). (1) Copia del legajo en el dispositivo: sin señal la app abre y muestra el último legajo recibido, con la fecha de esa copia a la vista. (2) Lo que se guarda sin señal (o con 401/5xx) entra a una cola en el dispositivo que se envía sola al volver la conexión, en orden, sin duplicar (ids del dispositivo, ya idempotente en el servidor). (3) Un elemento rechazado (400 inválido, 409 conflicto) no frena a los demás; queda a la vista para resolverlo, y un 400 se puede abrir en el formulario para corregir (deuda de 001). (4) Nada se muestra "sincronizado" sin confirmación del servidor. (5) Sesión vencida durante la sincronización: se pide reingresar, la cola se conserva. Sin backend nuevo salvo que haga falta. Fuera de alcance: sync en segundo plano con la app cerrada, edición colaborativa en tiempo real, resaltar campos tras 409."

## Clarifications

### Session 2026-10-21

- Q: Al cerrar sesión, ¿qué pasa con la copia del legajo en el dispositivo? → A: **Se borra** (FR-006). Primero se eligió conservarla; el dueño lo cambió al ver que reingresar ya exige señal y el legajo se baja en ese momento, así que conservarla no aportaba y dejaba datos personales en el equipo.
- Q: Lo guardado sin señal, ¿se ve dentro del legajo o solo en "No enviados"? → A: **Solo en "No enviados"**, "a modo draft, como los emails cuando no los mandás, para que no se pierda nada" (FR-016).
- Q: ¿Qué elementos de "No enviados" se pueden abrir en el formulario: solo los rechazados o todos? → A: **Todos son editables**, como un borrador de correo (FR-016, FR-017). Un pedido de borrar/dar de baja no tiene formulario: solo se puede descartar.
- Q: Si una ficha tiene un borrador pendiente y se la vuelve a abrir desde el legajo, ¿qué muestra el formulario? → A: **Lo del servidor, con un aviso** de que hay un borrador sin enviar en esa ficha (y la opción de abrirlo); guardar ahí pide confirmar que se reemplaza el borrador (FR-021).
- Q: Al volver la señal, ¿los borradores se envían solos o esperan que la usuaria confirme? → A: **Se envían solos, sin confirmación, y al terminar se avisa** cuántos llegaron y cuántos necesitan revisión (FR-008, FR-020).
- Q: Si ingresa otra cuenta en el mismo equipo, ¿qué pasa con la copia? → A: Cada integrante usa **su propio dispositivo con su cuenta**; no se comparten. Por eso hay **una sola copia por dispositivo**: en el caso raro de que entre otra cuenta, la copia se reemplaza por la suya y los "No enviados" anteriores se conservan sin enviarse (FR-005, FR-014).

## Contexto

Es la segunda mitad del Principio I de la constitución, que `001` dejó
explícitamente para después (la constitución, el ADR `backend-persistence-stack`
y `001` lo llaman "`002`"; el número quedó tomado por un ajuste de interfaz).
Hoy, en una escuela sin señal, la app **no muestra el legajo** y lo que se
guarda queda como "no enviado" hasta que alguien lo reenvía a mano. El tracker
lo marca como riesgo **High**: no se puede usar en campo como única herramienta.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar el legajo sin señal (Priority: P1)

Una técnica llega a una escuela rural sin cobertura, abre la app y necesita ver
la ficha de la escuela, su personal (vencimientos de carné, BPS), las visitas
anteriores y las incidencias pendientes.

**Why this priority**: sin esto la app no sirve en el lugar donde más se usa.
Es lo mínimo que habilita el uso en campo.

**Independent Test**: con la app abierta una vez con señal, cortar la red,
cerrar y volver a abrir la app: se ve el legajo completo, con la fecha y hora de
la copia a la vista.

**Acceptance Scenarios**:

1. **Given** la usuaria ingresó y el legajo se cargó con señal, **When** cierra
   la app, se queda sin señal y la vuelve a abrir, **Then** ve el legajo tal
   como estaba en la última carga y un aviso "Sin conexión — datos del
   <fecha hora>".
2. **Given** la app muestra la copia del dispositivo, **When** vuelve la señal,
   **Then** el legajo se actualiza solo desde el servidor y el aviso desaparece.
3. **Given** la usuaria nunca cargó el legajo en este dispositivo (o lo borró),
   **When** abre la app sin señal, **Then** ve un mensaje claro de que hace
   falta conectarse al menos una vez; no una pantalla vacía ni un error técnico.

---

### User Story 2 - Lo cargado sin señal llega solo (Priority: P1)

La técnica registra una visita con observaciones e incidencias nuevas sin señal.
Más tarde, en la ruta o de vuelta en la oficina, el dispositivo recupera
conexión y la visita llega al servidor sin que ella tenga que acordarse de
reenviarla.

**Why this priority**: es el corazón del Principio I ("llega al servidor cuando
vuelve la red sin que nadie la reescriba"). Junto con la Historia 1 forma el MVP.

**Independent Test**: sin señal, guardar una visita y una nota de bitácora;
reconectar con la app abierta: ambas aparecen en el servidor una sola vez, en el
orden en que se guardaron, y salen de "No enviados".

**Acceptance Scenarios**:

1. **Given** no hay señal, **When** la usuaria guarda una visita, **Then** el
   formulario se cierra, la app avisa que quedó guardada en el dispositivo, el
   contador de "No enviados" sube y la visita está en esa lista (no en la ficha
   de la escuela hasta que el servidor la confirme).
2. **Given** hay elementos pendientes y la app está abierta, **When** vuelve la
   conexión, **Then** se envían solos, en el orden en que se guardaron, y cada
   uno sale de la lista solo cuando el servidor lo confirma.
3. **Given** hay elementos pendientes y la app estaba cerrada, **When** la
   usuaria la abre con señal, **Then** se envían solos al abrir.
4. **Given** un envío se cortó a mitad de camino (el servidor lo recibió pero la
   respuesta no llegó), **When** se reintenta, **Then** el servidor no lo
   duplica.
5. **Given** la app está enviando la cola, **When** la usuaria mira la barra,
   **Then** ve que se está enviando y cuántos quedan; nunca ve "sincronizado"
   o "al día" mientras quede algo sin confirmar.

---

### User Story 3 - Resolver lo que el servidor rechazó (Priority: P2)

Un elemento de la cola vuelve rechazado: un dato inválido (por ejemplo, la
escuela fue dada de baja mientras tanto) o un conflicto (otra persona editó la
misma ficha). El resto de la cola sigue su curso y ese elemento queda a la vista
para que la usuaria lo resuelva.

**Why this priority**: sin esto un rechazo puede bloquear todo o perderse en
silencio. Es menos frecuente que el caso feliz, por eso P2.

**Independent Test**: encolar tres elementos donde el segundo es inválido;
reconectar: el primero y el tercero llegan, el segundo queda en "No enviados"
con el motivo y la opción de abrirlo en el formulario.

**Acceptance Scenarios**:

1. **Given** la cola tiene un elemento que el servidor rechaza por inválido,
   **When** se envía la cola, **Then** los demás se envían igual y el rechazado
   queda marcado con el motivo en palabras de la usuaria.
2. **Given** un elemento rechazado por inválido, **When** la usuaria elige
   "Abrir en el formulario", **Then** se abre el formulario correspondiente con
   lo que había escrito, lo corrige, guarda, y el elemento sale de la lista al
   confirmarse.
3. **Given** un elemento rechazado por conflicto, **When** la usuaria lo abre,
   **Then** puede aplicar lo escrito sobre la versión actual (como en `001`) o
   descartarlo con confirmación.
4. **Given** un elemento rechazado, **Then** nunca se reintenta solo en loop ni
   se descarta sin que la usuaria lo confirme.

---

### User Story 4 - Sesión vencida con cosas pendientes (Priority: P3)

La sesión venció (30 días sin uso, o la administradora desactivó la cuenta)
mientras había elementos en la cola.

**Why this priority**: es raro, pero si pasa no se puede perder lo cargado.

**Independent Test**: con elementos pendientes, invalidar la sesión en el
servidor y reconectar: la app pide reingresar, la cola sigue intacta, y después
de ingresar se envía sola.

**Acceptance Scenarios**:

1. **Given** hay elementos pendientes, **When** el servidor responde que la
   sesión no es válida, **Then** la app frena el envío, pide reingresar y
   conserva la cola.
2. **Given** la usuaria reingresa con la misma cuenta, **Then** la cola se
   envía sola.
3. **Given** ingresa otra cuenta en el mismo dispositivo, **Then** la app
   avisa que hay elementos pendientes de otra persona y no los envía con la
   cuenta nueva (el autor lo decide la sesión: Principio II).

### Edge Cases

- **Señal intermitente**: el envío se corta a la mitad; lo no confirmado sigue en
  la cola y se reintenta en la próxima conexión, sin duplicar.
- **"Hay red pero no hay internet"** (wifi sin salida, portal cautivo): la app no
  confía solo en el indicador de conexión del dispositivo; un envío que falla
  por red cuenta como sin conexión.
- **El servidor está caído** (5xx) con señal: la cola se conserva y se reintenta
  más tarde, sin martillar al servidor.
- **Varias ediciones de la misma ficha sin señal**: hay un solo borrador por
  ficha. Editarlo desde "No enviados" lo actualiza; volver a abrir la ficha
  desde el legajo avisa que existe y pide confirmar antes de reemplazarlo
  (FR-021). Nunca se reemplaza en silencio.
- **Dependencias en la cola**: una escuela creada sin señal y después personal en
  esa escuela; se envían en orden y, si la escuela se rechaza, el personal se
  rechaza con un motivo comprensible en vez de un error técnico.
- **Almacenamiento del dispositivo lleno o bloqueado**: si no se puede guardar,
  la app lo dice antes de cerrar el formulario (como en `001`).
- **La copia está muy vieja** (días): la fecha queda a la vista; no hay vencimiento automático.
- **Dos pestañas abiertas**: no envían el mismo elemento dos veces de manera que
  se duplique (el servidor ya lo garantiza por el id).

## Requirements *(mandatory)*

### Functional Requirements

**Copia del legajo en el dispositivo**

- **FR-001**: Cada vez que el legajo se recibe del servidor, la app MUST guardar
  una copia en el dispositivo junto con la fecha y hora en que se recibió.
- **FR-002**: Sin conexión, la app MUST abrir mostrando esa copia, con la sesión
  guardada en el dispositivo, sin pedir la contraseña.
- **FR-003**: Mientras se muestra la copia, MUST estar a la vista que no hay
  conexión y de cuándo son los datos.
- **FR-004**: Al volver la conexión la app MUST recargar el legajo del servidor
  sin intervención de la usuaria.
- **FR-005**: Hay una sola copia por dispositivo y MUST pertenecer a la cuenta
  que la recibió: otra cuenta no la ve, y si ingresa (caso raro: cada
  integrante usa su propio dispositivo) la copia se reemplaza por la suya.
- **FR-006**: Al cerrar sesión la copia del legajo MUST borrarse del
  dispositivo. Los "No enviados" NO se borran (siguen siendo de esa cuenta y se
  envían cuando vuelva a ingresar). La copia se usa sin señal mientras la
  sesión siga abierta (vence a los 30 días sin uso).

**Cola de envío**

- **FR-007**: Todo guardado que no llega al servidor por falta de red, sesión
  inválida o error del servidor MUST quedar en la cola del dispositivo (lo que en
  `001` es "No enviados"), y sobrevivir a cerrar la app.
- **FR-008**: La app MUST enviar la cola sola cuando detecta que volvió la
  conexión, al abrirse con conexión, y periódicamente mientras esté abierta y
  queden pendientes.
- **FR-009**: Los elementos MUST enviarse en el orden en que se guardaron, de a
  uno, y un elemento MUST salir de la cola solo cuando el servidor lo confirma o
  la usuaria lo descarta con confirmación.
- **FR-010**: Reenviar un elemento MUST NOT generar registros duplicados.
- **FR-011**: Un elemento rechazado por inválido o por conflicto MUST NOT frenar
  a los demás ni reintentarse solo; queda marcado con el motivo.
- **FR-012**: Si un elemento depende de otro que fue rechazado (personal de una
  escuela que no llegó), MUST quedar marcado con un motivo que lo explique.
- **FR-013**: Ante una sesión inválida, el envío MUST frenarse, la cola
  conservarse y la app pedir reingresar; tras reingresar la misma cuenta, la
  cola se envía sola.
- **FR-014**: La cola MUST estar asociada a la cuenta que la generó; con otra
  cuenta, la app avisa que hay elementos de otra persona y no los envía.
- **FR-015**: Ante errores de red o del servidor, los reintentos MUST espaciarse
  (no reintentar en loop).
- **FR-016**: Los cambios guardados sin conexión MUST verse solo en "No
  enviados", como los borradores de un correo sin mandar: el legajo muestra
  únicamente lo que el servidor confirmó. Desde "No enviados" cada elemento se
  puede abrir en su formulario para revisarlo o seguir editándolo.

**Resolver rechazos**

- **FR-017**: Un elemento rechazado por inválido MUST poder abrirse en el
  formulario correspondiente con lo escrito, para corregirlo y guardarlo de
  nuevo (deuda de `001`).
- **FR-018**: Un elemento rechazado por conflicto MUST conservar las opciones de
  `001`: aplicarlo sobre la versión actual, o descartarlo con confirmación.

- **FR-021**: Al abrir desde el legajo una ficha que tiene un borrador
  pendiente, el formulario MUST mostrar los datos confirmados por el servidor
  con un aviso visible "Hay cambios sin enviar en esta ficha (guardados el
  <fecha hora>)" y la opción de abrir el borrador en su lugar. Guardar desde
  ahí MUST pedir confirmación de que reemplaza al borrador; sin confirmación,
  el borrador queda intacto.

**Indicadores**

- **FR-019**: La app MUST mostrar en todo momento la cantidad de elementos sin
  enviar y si se están enviando; MUST NOT mostrar "sincronizado", "al día" ni
  equivalentes mientras quede algo sin confirmar por el servidor.
- **FR-020**: Al terminar de enviar la cola, la app MUST avisar cuántos
  elementos llegaron y cuántos necesitan atención (p. ej. "Se enviaron 3; 1
  necesita revisión"). El envío no pide confirmación previa (FR-008).

### Key Entities

- **Copia del legajo**: el último legajo recibido del servidor, la cuenta a la
  que pertenece y la fecha y hora en que se recibió.
- **Elemento de la cola** (el "borrador no enviado" de `001`): qué operación es,
  su descripción para la usuaria, lo escrito, cuándo se guardó, la cuenta que lo
  generó, su estado (pendiente, enviando, rechazado) y el último motivo de error.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con la app usada al menos una vez con señal, el 100 % de las
  aperturas sin señal muestran el legajo completo con la fecha de la copia.
- **SC-002**: Una visita guardada sin señal llega al servidor dentro del minuto
  de recuperar la conexión con la app abierta, sin acción de la usuaria.
- **SC-003**: En una prueba con 10 elementos encolados y la conexión cortada y
  restablecida 3 veces durante el envío, el servidor termina con exactamente
  10 registros, sin duplicados.
- **SC-004**: Un elemento rechazado nunca impide que lleguen los demás, y nunca
  desaparece de la lista sin confirmación del servidor o de la usuaria.
- **SC-005**: En ningún momento de las pruebas aparece un indicador de
  "sincronizado" o "al día" con elementos sin confirmar.
- **SC-006**: Un elemento rechazado por inválido se corrige desde el formulario
  y llega al servidor sin volver a escribir lo que ya estaba.

## Assumptions

- La app ya se instala y abre sin conexión (la PWA guarda sus archivos); este
  feature agrega los **datos**, no el armado de la app.
- El servidor ya trata como idempotentes los envíos con id generado en el
  dispositivo (`001`, research D6); no se espera cambio de backend. Si el plan
  encuentra que hace falta, se nombra cuál.
- La sesión dura 30 días sin uso (servidor); sin conexión la app confía en la
  sesión guardada y la valida al volver la red.
- Un legajo de ~140 escuelas con su personal, visitas e incidencias entra en el
  almacenamiento de un navegador de escritorio o tablet.
- El envío ocurre con la app abierta. Con la app cerrada no se envía nada
  (fuera de alcance: no todos los navegadores lo permiten de forma confiable).
- Uso principal en escritorio y tablet, según lo dicho por el dueño del repo.
- Cada integrante usa su propio dispositivo con su cuenta; no se comparten.

## Fuera de alcance

- Envío en segundo plano con la app cerrada.
- Edición colaborativa en tiempo real.
- Resaltar qué campos cambió otra persona tras un conflicto (ítem Low del tracker).
- Cambios en el backend, salvo que el plan demuestre que hacen falta.

# Constitución de PAE-ANEP (Legajo Escolar PAE Tacuarembó)

## Principios

### I. El territorio manda: la visita se registra sin señal y no se pierde

La herramienta existe para que el equipo técnico del PAE registre lo que ve
**en la cocina de la escuela**, y muchas de esas cocinas son rurales y no tienen
cobertura. Una visita cargada sin conexión es un dato de primera clase, no un
caso borde: se guarda en el dispositivo, sobrevive a cerrar la app, y llega al
servidor cuando vuelve la red **sin que nadie la reescriba**.

Consecuencias que obligan:

- Ninguna pantalla de carga de campo (visita, observación, incidencia) puede
  depender de que una petición al servidor salga bien para no perder lo
  escrito.
- **La sincronización es real o no se muestra.** Un indicador de "sincronizado"
  que no corresponde a un dato confirmado por el servidor es un defecto, no un
  adorno. El simulador actual (`SyncModal`) se reemplaza, no se maquilla.
- Reintentar un envío nunca duplica: cada escritura offline lleva un
  identificador generado en el dispositivo y el servidor la trata como
  idempotente.

### II. Un solo legajo compartido, y cada cambio tiene autor

Hoy cada navegador tiene su propia copia de los datos. El propósito del backend
es que las cuatro integrantes del equipo trabajen **sobre el mismo legajo**. La
bitácora (`ActivityLog`) es el registro de auditoría de ese legajo: quién cambió
qué, cuándo, y el valor anterior.

- El autor de un cambio lo decide **el servidor a partir de la sesión**, nunca
  un campo que mande el navegador. Elegir "usuaria activa" de una lista no es
  identidad.
- Lo que el servidor registra en la bitácora no se edita ni se borra desde la
  app.
- Cuando dos personas tocan lo mismo, el conflicto se resuelve con una regla
  escrita en el spec correspondiente, no "gana el último" por accidente.

### III. Simplicidad antes que infraestructura (YAGNI)

Es **un equipo de cuatro personas, un departamento, unas 140 escuelas**. No es
una plataforma multi-departamento ni multi-inquilino. Nada de microservicios,
colas, multi-región ni abstracciones especulativas. Se agrega complejidad solo
cuando un requisito real y escrito la exige, y se nombra cuál.

### IV. Datos personales: el repositorio es público y el servidor es la frontera

El repositorio `Matt122133/pae-anep` es **público**. El legajo contiene datos
personales de terceros: nombre, cédula, teléfono, estado de BPS y vencimiento de
carné de salud de cocineras y auxiliares, además de datos de directores/as y de
la propia escuela. En Uruguay eso cae bajo la Ley 18.331 de Protección de Datos
Personales.

- **MUST NOT** versionar datos reales de personas (nombres, cédulas, teléfonos,
  mails) en el repositorio. Los datos de ejemplo (`src/data/initialData.ts`)
  son ficticios y tienen que seguir siéndolo. Datos reales se cargan en la base,
  nunca en el árbol.
- Ningún endpoint devuelve datos del legajo sin una sesión válida. No hay
  superficie pública de datos.
- Los secretos (URL de la base, claves de sesión, credenciales de correo) viven
  en las variables de entorno de Railway, nunca en el árbol.

### V. Hosting económico: el frontend en GitHub Pages, el backend en Railway

El costo importa. El frontend se publica como sitio estático en **GitHub
Pages** (gratis). El backend y su base de datos **Postgres** corren en
**Railway**, el único componente que cuesta dinero. Toda decisión que agregue
un servicio pago, o que mueva lectura de datos estáticos al servidor sin
necesidad, necesita un ADR.

Consecuencia arquitectónica: frontend y backend viven en **orígenes
distintos**. La credencial de sesión viaja en un encabezado, no en una cookie de
terceros, para no depender de las políticas de cookies cruzadas de los
navegadores (Safari en particular).

### VI. Mobile-first, pensada para la cocina

La app se usa de pie, en el celular, con las manos ocupadas y a veces con poca
luz. Formularios cortos por sección, botones grandes, validación clara, y nada
que exija una pantalla de escritorio para completar una visita. El informe
imprimible y los listados largos pueden ser de escritorio; la carga de campo no.

## Límites de alcance

Dos superficies, en un solo repositorio:

1. **Frontend (PWA)** — hoy en la raíz (`src/`, `index.html`, `vite.config.ts`):
   React 19 + Vite + Tailwind, instalable, con service worker. Catálogo de
   escuelas, legajo por escuela (personal, agua, leche), visitas técnicas con su
   formulario completo, agenda, incidencias, bitácora, indicadores, informe
   imprimible, exportación CSV/JSON.
2. **Backend** — `backend/`, a construir a partir del feature `001`. Persistencia
   compartida en Postgres, autenticación de las integrantes del equipo, API para
   las entidades del legajo y la sincronización de lo cargado offline.

Fuera de alcance mientras no haya un requisito escrito que lo pida: otros
departamentos, acceso para las escuelas o para las auxiliares, integración con
sistemas de ANEP/DGEIP, firma electrónica, almacenamiento de fotos.

**Gemini/IA no es parte del producto.** La dependencia `@google/genai` y la
variable `GEMINI_API_KEY` son restos de la plantilla de AI Studio y no se usan
en ningún archivo de `src/`. Usarlas requiere un spec propio.

## Flujo de desarrollo

Este repo corre el harness (ver `AGENTS.md`, `docs/processes/harness.md`) como
capa de gobierno sobre spec-kit. Todo feature pasa por Brief → Decide → Plan →
Execute; no hay código sin un `specs/<feature>/plan.md` activo y analizado; no
se edita fuera de su `covers:`; no está terminado hasta que su `verify:` da
verde.

## Gobierno

Esta constitución está por encima de cualquier práctica ad hoc. Enmendarla
requiere modificar este archivo y, si la enmienda revierte una decisión previa,
un ADR en `docs/decisions/`. `AGENTS.md` y el Constitution Check de la
plantilla de plan se remiten a este documento como máxima autoridad del repo.

**Version**: 1.0.0 | **Ratified**: 2026-10-18 | **Last Amended**: 2026-10-18

### Historial de enmiendas

- **1.0.0** (2026-10-18) — Ratificación inicial, al portar el harness desde
  `flash-urbano`. Principios derivados del estado actual de la app (prototipo
  completo en interfaz, sin backend) y del pedido del dueño del repo: hacerla
  robusta, con backend en Railway y frontend en GitHub Pages.

# Feature Specification: La barra superior entra en pantalla

**Created**: 2026-10-21 · **Status**: Draft

**Input**: Prueba de la interfaz de `006` en varios anchos (2026-10-21). La app
se usa en escritorio y tablet. La parte derecha de la barra superior (alertas,
respaldo, cuenta, "Nueva Escuela") se sale de la pantalla:

- tablet (768 y 1024 px), con señal: la página mide ~1150 px y hay que
  desplazarse de costado para llegar a la cuenta y a "Nueva Escuela";
- escritorio 1280 px sin señal: el aviso "Sin conexión — datos del …" de `006`
  empuja la cuenta afuera (no se llega a "Cerrar sesión");
- celular 390 px: la página mide 467 px.

En la franja inferior del celular dice "1 NO ENVIADOS" (plural con uno).

## Requirements

- **FR-001**: En 390, 768, 1024, 1280 y 1440 px de ancho, con señal y sin
  señal con no enviados, la página MUST NOT tener desplazamiento horizontal y
  el botón de la cuenta MUST quedar a la vista.
- **FR-002**: Cuando no entra el texto, los botones de la derecha muestran
  ícono y número; el texto completo queda en el `title` (al pasar el mouse).
  Ningún aviso desaparece: "Sin conexión", no enviados y "para revisar" se
  siguen viendo en todos los anchos.
- **FR-003**: "1 NO ENVIADOS" pasa a "1 NO ENVIADO".
- **FR-004**: Nada más cambia: ni colores, ni orden, ni qué botones hay.

## Success Criteria

- **SC-001**: Medido en navegador en los anchos de FR-001: `scrollWidth` igual
  al ancho de la ventana y el botón de la cuenta dentro de la pantalla.

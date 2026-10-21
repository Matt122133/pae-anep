# Quickstart: validar el legajo sin conexión

## Preparar

1. Postgres local y backend como en [`docs/processes/dev-setup.md`](../../docs/processes/dev-setup.md)
   (base `pae-pg-dev`, `CORS_ORIGENES=http://localhost:3000`).
2. `.env.local` con `VITE_API_URL=http://localhost:8080`; `npm run dev`.
3. Ingresar con una cuenta de prueba. DevTools → Network sirve para cortar la
   red ("Offline"); para "el servidor se cayó", detener el backend.

Automático: `npm run lint && npm test` (lógica de cola, copia, corte por tiempo).

## Escenarios (uno por historia de la spec)

| # | Pasos | Resultado esperado |
|---|---|---|
| 1 | Con red, cargar el legajo. Network → Offline. Recargar. | Se ve el legajo; aviso "Sin conexión — datos del <fecha hora>". |
| 2 | Volver a Online. | El aviso se va solo; el legajo se recarga. |
| 3 | DevTools → Application → IndexedDB → borrar la base `pae`; Network → Offline; recargar. | Mensaje "hace falta abrirla una vez con conexión", con reintentar. |
| 4 | Offline: registrar una visita y una nota. | Formulario se cierra; aviso de guardado en el dispositivo; "No enviados: 2"; la visita **no** aparece en la ficha. |
| 5 | Volver a Online con la app abierta. | En ≤ 1 min: "Enviando…", después "Se enviaron 2". La visita está en la ficha una sola vez. |
| 6 | Offline, guardar 3 cosas; cerrar la pestaña; abrirla con red. | Se envían solas al abrir. |
| 7 | Offline: alta de una escuela con número repetido + una incidencia en otra escuela + una nota. Online. | La escuela queda "para revisar" con el motivo; la incidencia y la nota llegan. |
| 8 | En el rechazado del paso 7: "Editar", corregir el número, guardar. | Llega; sale de la lista. |
| 9 | Offline, editar el teléfono de una persona. Abrir la misma ficha desde el legajo. | Aviso "Hay cambios sin enviar en esta ficha (guardados el …)" con "Abrir el borrador". Guardar pide confirmar el reemplazo; cancelar no toca el borrador. |
| 10 | Con un borrador pendiente, editar la misma ficha desde otra pestaña con red (versión nueva). Volver a enviar. | El borrador queda "para revisar" por conflicto; "Aplicar sobre la versión actual" lo manda. |
| 11 | Con pendientes, desactivar la cuenta o borrar su sesión en la base; volver a Online. | Pide reingresar; la lista sigue intacta; tras reingresar se envía sola. |
| 12 | Detener el backend con pendientes y red. | No se envía; la espera crece (Network: pedidos cada vez más espaciados, tope 5 min); nada dice "al día". |
| 13 | Con un pendiente guardado, cerrar sesión. Ver IndexedDB. Ingresar con **otra** cuenta. | La base `pae` quedó vacía al salir; con la otra cuenta, los "No enviados" de la anterior aparecen aparte y no se envían. |

## Prueba de duplicados (SC-003)

Offline, guardar 10 visitas. Online, y cortar/volver la red 3 veces mientras
dice "Enviando…". Al terminar, en la base:
`SELECT count(*) FROM visitas WHERE id IN (...)` = 10, sin repetidos.

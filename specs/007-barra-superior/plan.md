---
ticket: none
status: active
covers:
  - src/components/Navbar.tsx
  - src/components/MobileBottomNav.tsx
  - specs/007-barra-superior/
  - .specify/feature.json
verify: npm run lint && npm test && npm run build
analyzed: 2026-10-21 (plan lite; aprobado por el dueño del repo con "dale nomas")
---

# Implementation Plan: La barra superior entra en pantalla

Solo clases de Tailwind en `Navbar.tsx`: los textos de los botones de la
derecha ("alertas", "Respaldo / Excel", "Nueva Escuela", "no enviados", "datos
del …") se muestran desde un ancho mayor que hoy (`xl`/`2xl` según lo que entre)
y por debajo queda ícono + número, con el texto en `title`. Si con eso no
alcanza en tablet, el contenedor de la derecha pasa a `min-w-0` y los enlaces
del centro achican su separación. Sin elementos nuevos ni cambios de color.

En `MobileBottomNav.tsx`, el singular de "NO ENVIADOS".

Verificación: `verify:` y la medición de SC-001 con `playwright-core` en Edge
headless contra el build y el backend local, con y sin señal.

## Resultado (2026-10-21)

SC-001 medido (Edge headless, build + backend local, con señal y sin señal con
un no enviado): `scrollWidth` = ancho de la ventana y botón de la cuenta a la
vista en 390, 768, 1024, 1280, 1440, 1600 y 1920. Antes desbordaba en todos
los anchos sin señal (1440 → 1635 px).

Lo que hizo falta, más allá de los textos de la derecha:

- La barra tiene un máximo de 1280 de contenido, así que a partir de ahí no
  gana lugar: los textos "no enviados" y "alertas" quedan siempre como ícono +
  número, con el detalle (incluido "enviando…" y "para revisar") en `title`.
  "Sin conexión" se lee desde `2xl`; la fecha de la copia queda en el `title`
  y en la franja del celular.
- Los enlaces del centro muestran el texto desde `xl` y el nombre de la app
  junto al logo desde `lg`.

Queda igual que antes: a 1280 algunos textos ("Panel General", "Nueva
Escuela", "Respaldo / Excel") se parten en dos renglones. No es desborde y
viene de antes de 007.

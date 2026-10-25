# Feature Specification: Los tildes de comidas entran en la ficha de escuela

**Created**: 2026-10-24 · **Status**: Draft

**Input**: Prueba en producción (2026-10-24). En "Registrar Nueva Escuela",
bloque "Comensales y Servicios de Alimentación", el tilde "Merienda" se sale
del recuadro por la derecha. Los tres tildes (Desayuno, Almuerzo, Merienda)
van en una fila sin salto de renglón dentro de una columna de un tercio del
ancho, junto a las dos cantidades de comensales.

## Requirements

- **FR-001**: Los tres tildes MUST quedar dentro del recuadro del bloque en
  cualquier ancho; si no entran en una fila, pasan al renglón siguiente.
- **FR-002**: Nada más cambia: ni textos, ni colores, ni campos, ni lo que se
  guarda.

## Success Criteria

- **SC-001**: Medido en navegador con el formulario abierto a 390, 768, 1024,
  1280 y 1440 px: el borde derecho del tilde "Merienda" queda dentro del
  recuadro del bloque.

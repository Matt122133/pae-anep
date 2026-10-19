# Feature Specification: Sin avisos de "Instalar App"

**Feature Branch**: `002-sin-aviso-instalar`

**Created**: 2026-10-19

**Status**: Draft

**Input**: Pedido del dueño del repo, mirando la pantalla de inicio: "ese estilo de
publicidad me parece nefasto. Saquemos eso urgente de instalar la app. Va a ser
una web de escritorio y como mucho para tablet." Aclaró que el resto (colores,
cantidad de información) lo evalúa la dueña; acá solo se saca lo de instalar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La app no ofrece instalarse (Priority: P1)

Una integrante del equipo abre la app en la computadora o en una tablet y no ve
ningún aviso, franja ni botón que la invite a "instalar la app".

**Independent Test**: Abrir la app (con sesión) en escritorio y en ancho de
tablet y de teléfono: no aparece la franja superior ni ningún botón "Instalar".

**Acceptance Scenarios**:

1. **Given** la app abierta en escritorio, **When** carga el panel, **Then** no
   hay franja "¿Usar como App en tu PC?" ni botón "Instalar App" en la barra.
2. **Given** la app en ancho de tablet o teléfono, **When** se abre el menú,
   **Then** no hay opción de instalar.

## Requirements *(mandatory)*

- **FR-001**: La app MUST NOT mostrar la franja de invitación a instalar
  (`PWAPromptBanner`).
- **FR-002**: La app MUST NOT mostrar botones u opciones de "Instalar App" en la
  barra ni en el menú móvil.
- **FR-003**: El resto de la app MUST quedar igual: navegación, colores y
  contenido no cambian en este feature.

## Success Criteria *(mandatory)*

- **SC-001**: 0 apariciones de "Instalar" en la interfaz en escritorio, tablet y
  teléfono (verificado en navegador).

## Assumptions

- El service worker y el manifest quedan: no se ven, y el feature de lectura
  offline los va a necesitar. Solo se sacan los avisos de instalación.
- Público principal: escritorio, a lo sumo tablet (dicho por el dueño del repo).
- El feature de lectura y sincronización offline, que en `001` se llamaba "002",
  toma el próximo número libre.

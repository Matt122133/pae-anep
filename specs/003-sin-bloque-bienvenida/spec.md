# Feature Specification: Sin bloque de bienvenida en el panel

**Feature Branch**: `002-sin-aviso-instalar` (misma rama: ajustes de interfaz pedidos juntos)

**Created**: 2026-10-19

**Status**: Draft

**Input**: Pedido del dueño del repo sobre el bloque oscuro del panel ("Sistema de
Campo Activo · 140 Escuelas Monitoreadas", "Legajos y Control de Cocinas y
Comedores Escolares", con botones Explorar escuelas, Calendario, Bitácora,
+Escuela, Excel): "es todo información repetida que ya la tenés arriba".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El panel arranca directo en los indicadores (Priority: P1)

Al entrar, la integrante ve directamente el resumen de indicadores, sin un
bloque de presentación que repite los accesos de la barra.

**Independent Test**: Entrar a la app en escritorio, tablet y teléfono: el panel
empieza por "Resumen de Indicadores"; Escuelas, Calendario, Bitácora, Nueva
Escuela y Excel siguen accesibles desde la barra (o el menú, en anchos chicos).

**Acceptance Scenarios**:

1. **Given** la app con sesión, **When** se abre el panel, **Then** no aparece el
   bloque de bienvenida.
2. **Given** el panel, **When** se buscan los accesos que tenía el bloque,
   **Then** todos siguen disponibles en la barra o en el menú.

## Requirements *(mandatory)*

- **FR-001**: El panel MUST NOT mostrar el bloque de bienvenida.
- **FR-002**: Ningún acceso se pierde: los cinco del bloque existen en la barra
  de escritorio y en el menú móvil.
- **FR-003**: Nada más del panel cambia.

## Success Criteria *(mandatory)*

- **SC-001**: 0 apariciones de "Sistema de Campo Activo" y de "Legajos y Control
  de Cocinas" en el panel, en los tres anchos (verificado en navegador).

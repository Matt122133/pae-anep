# Feature Specification: Proveedores en la ficha de escuela

**Feature Branch**: `009-proveedores-escuela`

**Created**: 2026-10-26

**Status**: Draft

**Input**: Feedback de la dueña tras probar en producción (2026-10-26). En el
alta de una escuela agregar proveedores: por ahora una lista de nombres que
ella escribe, sin catálogo de proveedores; más adelante puede pasar a ser una
entidad propia (el usuario lo consulta con la dueña). El otro pedido del mismo
feedback, jardines, quedó aparte en `specs/010-jardines/`.

## Clarifications

### Session 2026-10-26

- Q: ¿Dónde se ven los proveedores? → A: En el formulario de alta/edición y en el bloque de datos de la pantalla de la escuela (junto a directora y cocinera); no en los informes imprimibles.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Anotar los proveedores de una escuela (Priority: P1)

En el alta y en la edición de una escuela, la ecónoma escribe los nombres de
los proveedores que la abastecen: agrega uno, agrega otro, quita alguno. Es
texto libre; no se elige de una lista.

**Why this priority**: es dato de trabajo que hoy no tiene dónde ir.

**Independent Test**: en una escuela, agregar dos proveedores, guardar, reabrir
la ficha y verlos; quitar uno, guardar, reabrir y ver solo el otro.

**Acceptance Scenarios**:

1. **Given** el formulario de una escuela, **When** la ecónoma escribe un
   nombre de proveedor y lo agrega, **Then** aparece en la lista de
   proveedores de esa escuela.
2. **Given** una escuela con proveedores, **When** quita uno y guarda,
   **Then** al reabrir la ficha ese proveedor ya no está y los demás sí.
3. **Given** una escuela sin proveedores, **When** se guarda, **Then** se
   guarda sin problema (la lista puede quedar vacía).
4. **Given** una escuela con proveedores, **When** otra cuenta abre el
   legajo, **Then** ve los mismos proveedores.
5. **Given** las escuelas existentes, **When** se publica esta función,
   **Then** todas quedan con la lista de proveedores vacía y el resto de sus
   datos sin cambios.

### Edge Cases

- Nombre de proveedor vacío o solo espacios: no se agrega.
- El mismo nombre dos veces en la misma escuela (ignorando mayúsculas y
  espacios de los bordes): no se agrega el repetido.
- Nombre muy largo: se acepta hasta 120 caracteres.
- Sin señal: el alta o edición con proveedores queda en "No enviados" y se
  envía sola al volver la red, como cualquier otra ficha.
- Una copia vieja de la app (sin esta función) o un "no enviado" guardado
  antes de publicarla que edita una escuela con proveedores no debe borrarle
  los proveedores.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El formulario de escuela (alta y edición) MUST tener una lista
  de proveedores donde se agregan y quitan nombres de texto libre.
- **FR-002**: La lista de proveedores MUST guardarse con la escuela en el
  legajo compartido y verse igual desde cualquier cuenta.
- **FR-003**: Nombres vacíos o repetidos en la misma escuela MUST NOT
  agregarse; cada nombre admite hasta 120 caracteres.
- **FR-004**: No hay catálogo de proveedores: el mismo nombre en dos escuelas
  son dos anotaciones independientes.
- **FR-005**: Alta y edición con proveedores MUST funcionar sin señal igual
  que el resto de la ficha (quedan en "No enviados").
- **FR-006**: Una edición que no trae la lista de proveedores MUST NOT
  borrar los proveedores ya guardados.
- **FR-007**: La pantalla de la escuela MUST mostrar la lista de
  proveedores en su bloque de datos; los informes imprimibles no cambian.

### Key Entities

- **Escuela**: institución del legajo. Gana una lista de proveedores.
- **Proveedor (anotación)**: un nombre escrito a mano dentro de una escuela.
  No existe fuera de ella.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La ecónoma agrega o quita un proveedor desde la ficha de la
  escuela sin salir del formulario, y lo guarda con el mismo "Guardar".
- **SC-002**: Proveedores agregados en una cuenta se ven idénticos al abrir la
  ficha desde otra cuenta.
- **SC-003**: Después de publicar, el 100% de las escuelas existentes conserva
  sus datos.

## Assumptions

- "Proveedores" del formulario de escuela son distintos de las notas de
  proveedores que ya existen en el registro de cada visita; esas no cambian.
- Los proveedores van en el mismo formulario y se guardan junto con el resto
  de la ficha (un solo "Guardar").
- Los proveedores se muestran en el orden en que se agregaron.
- Si más adelante los proveedores pasan a ser una entidad con su propia lista,
  es otro feature; las anotaciones de texto de este quedarán como punto de
  partida.

# Feature Specification: Jardines en el legajo

**Feature Branch**: `010-jardines` (sin crear)

**Created**: 2026-10-26

**Status**: Draft — en espera de la dueña

**Input**: Feedback de la dueña tras probar en producción (2026-10-26). En el
alta de una escuela dar la opción de agregar jardines, con el mismo
formulario. Separado de `009-proveedores-escuela` para no frenar ese.

## Pregunta abierta (bloquea clarify y plan)

[NEEDS CLARIFICATION: ¿qué es "agregar jardines"?]

| Opción | Respuesta | Qué implica |
|--------|-----------|-------------|
| A | El jardín es una institución propia (Jardín N° X) que se da de alta con el mismo formulario, eligiendo "Escuela" o "Jardín" | Cambio chico: un campo "tipo" en la ficha. Hoy el número de escuela es único en todo el legajo, así que Jardín 5 y Escuela 5 chocarían: la unicidad pasa a ser número + tipo. |
| B | El jardín pertenece a una escuela y se carga dentro del alta de esa escuela | Entidad nueva colgada de la escuela; hay que definir sus datos y si se visita o tiene incidencias propias. |

Inclinación del usuario (2026-10-26): A ("algo independiente"), pendiente de
confirmar con la dueña.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dar de alta un jardín (Priority: P1)

La ecónoma tiene a su cargo jardines de infantes además de escuelas, y hoy el
formulario de alta solo habla de "escuela". Quiere poder registrar un jardín
usando el mismo formulario que ya conoce.

**Independent Test**: dar de alta un jardín desde el formulario, verlo en el
legajo identificado como jardín, cerrar sesión, volver a entrar y que siga ahí.

**Acceptance Scenarios**:

1. **Given** el formulario de alta abierto, **When** la ecónoma registra un
   jardín y guarda, **Then** el jardín queda en el legajo y se distingue a
   simple vista de una escuela.
2. **Given** un jardín ya registrado, **When** se abre su ficha para editar,
   **Then** el formulario muestra los mismos datos y sigue siendo jardín.
3. **Given** las escuelas existentes, **When** se publica esta función,
   **Then** todas siguen siendo escuelas, sin cambios en sus datos.

## Requirements *(mandatory)*

- **FR-001**: El formulario de alta MUST permitir registrar jardines, según
  la respuesta a la pregunta abierta.
- **FR-002**: Un jardín MUST distinguirse de una escuela en el formulario,
  en el listado y en su ficha.
- **FR-003**: Las escuelas existentes MUST seguir siendo escuelas, sin
  cambios en sus datos.
- **FR-004**: El alta de un jardín MUST funcionar sin señal igual que la de
  una escuela.

## Success Criteria *(mandatory)*

- **SC-001**: La ecónoma registra un jardín con el mismo formulario que una
  escuela, sin pasos nuevos salvo indicar que es un jardín.
- **SC-002**: Después de publicar, el 100% de las escuelas existentes sigue
  figurando como escuela con sus datos intactos.

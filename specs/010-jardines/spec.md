# Feature Specification: Jardines en el legajo

**Feature Branch**: `010-jardines`

**Created**: 2026-10-26

**Status**: Draft

**Input**: Feedback de la dueña tras probar en producción (2026-10-26): "en el
alta de una escuela dar la opción de agregar jardines, con el mismo
formulario". Aclarado el mismo día: el jardín es **independiente** de la
escuela (no pertenece a ninguna), lleva **todo lo mismo** que una escuela y se
carga con **el mismo formulario**; son instituciones distintas.

## Clarifications

### Session 2026-10-26

- Q: ¿Un jardín puede tener el mismo número que una escuela? → A: No; el número es único entre todas las instituciones, como hoy.
- Q: ¿Dónde aparecen los jardines y cómo se cuentan? → A: Lo genérico pasa a decir "Instituciones" (barra, directorio, contador del panel, botón y título del alta); un solo directorio con filtro Todas / Escuelas / Jardines; cada institución concreta se nombra por su tipo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dar de alta un jardín (Priority: P1)

La ecónoma tiene a su cargo jardines de infantes además de escuelas. Quiere
registrar un jardín con el mismo formulario de alta, indicando que es un
jardín, y que desde ahí quede en el legajo con su número, sus datos de
comedor, agua, leche y proveedores, igual que una escuela.

**Why this priority**: sin esto los jardines no se pueden cargar.

**Independent Test**: dar de alta un jardín, verlo en el legajo identificado
como jardín, cerrar sesión, volver a entrar y que siga ahí.

**Acceptance Scenarios**:

1. **Given** el formulario de alta abierto, **When** la ecónoma elige
   "Jardín", completa los datos y guarda, **Then** el jardín queda en el
   legajo y se distingue a simple vista de una escuela.
2. **Given** un jardín ya registrado, **When** se abre su ficha para editar,
   **Then** el formulario muestra sus datos y sigue siendo jardín.
3. **Given** las escuelas existentes, **When** se publica esta función,
   **Then** todas siguen siendo escuelas, sin cambios en sus datos.
4. **Given** el formulario de alta, **When** no se toca la elección, **Then**
   se da de alta una escuela, como hasta ahora.

---

### User Story 2 - Trabajar con un jardín igual que con una escuela (Priority: P2)

Una vez dado de alta, el jardín tiene lo mismo que una escuela: personal de
cocina, visitas técnicas, incidencias, bitácora, informe imprimible y baja
lógica. Donde la app nombra a la institución, dice "Jardín N° X" en vez de
"Escuela N° X".

**Why this priority**: un jardín que solo se puede dar de alta no sirve para
trabajar; pero el alta (US1) ya permite cargar el padrón.

**Independent Test**: en un jardín, registrar una visita, una auxiliar y una
incidencia; ver que la pantalla, la bitácora y el informe lo nombran como
jardín.

**Acceptance Scenarios**:

1. **Given** un jardín, **When** se registra una visita, una auxiliar o una
   incidencia, **Then** se guardan y se ven igual que en una escuela.
2. **Given** un jardín, **When** se mira su pantalla, la bitácora o su
   informe, **Then** se lo nombra "Jardín N° X".
3. **Given** un jardín, **When** se lo da de baja, **Then** se comporta como
   la baja de una escuela (queda consultable, se puede reactivar).

### Edge Cases

- Sin señal: el alta o edición de un jardín queda en "No enviados" y se envía
  sola al volver la red, como una escuela.
- Una copia vieja de la app (o un "no enviado" anterior) que edita una
  institución sin decir si es escuela o jardín no le cambia el tipo.
- Directorio filtrado por "Jardines" sin ningún jardín cargado: muestra la
  lista vacía con un aviso corto, no un error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El formulario de alta MUST permitir elegir si la institución es
  una escuela o un jardín; por defecto, escuela.
- **FR-002**: Un jardín MUST tener los mismos datos que una escuela y las
  mismas funciones (personal, visitas, incidencias, bitácora, informe, baja).
- **FR-003**: Un jardín MUST distinguirse de una escuela en el formulario, en
  los listados y en su pantalla; donde se nombra la institución, "Jardín N°".
- **FR-004**: Las escuelas existentes MUST seguir siendo escuelas, sin cambios
  en sus datos.
- **FR-005**: El número MUST seguir siendo único entre todas las
  instituciones: no puede haber un jardín con el número de una escuela, ni al
  revés. Al intentarlo, el formulario avisa que el número ya existe.
- **FR-006**: Una edición que no indica el tipo MUST NOT cambiarlo.
- **FR-007**: El alta y edición de un jardín MUST funcionar sin señal igual
  que la de una escuela.
- **FR-008**: Los textos genéricos que hoy hablan de escuelas como conjunto
  MUST decir "Instituciones": el acceso de la barra (con su contador), el
  título del directorio, el contador del panel general, el botón de alta
  ("Nueva Institución") y el título del formulario de alta.
- **FR-009**: El directorio MUST listar escuelas y jardines juntos, con un
  filtro Todas / Escuelas / Jardines (por defecto, Todas).

### Key Entities

- **Institución del legajo**: escuela o jardín. Mismos datos (número, nombre,
  ámbito, modalidad, comensales, agua, leche, proveedores, notas) y mismas
  relaciones (personal, visitas, incidencias, bitácora).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La ecónoma registra un jardín con el mismo formulario que una
  escuela, con un solo paso extra: elegir "Jardín".
- **SC-002**: En toda pantalla donde aparece un jardín, se lo nombra como
  jardín (ninguna dice "Escuela N°" para un jardín).
- **SC-003**: Después de publicar, el 100% de las escuelas existentes sigue
  figurando como escuela con sus datos intactos.

## Assumptions

- El tipo (escuela o jardín) se elige en el alta y se puede corregir en la
  edición, por si se cargó mal.
- La lista de modalidades es la misma para escuelas y jardines; si la dueña
  pide modalidades propias de jardín, es otro cambio.
- Fuera de los lugares de FR-008, los textos de ayuda o descripciones que
  mencionan "escuelas" de pasada no se reescriben en este feature.

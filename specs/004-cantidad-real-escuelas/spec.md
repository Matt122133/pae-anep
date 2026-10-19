# Feature Specification: Cantidad real de escuelas en los textos

**Created**: 2026-10-19 · **Status**: Draft

**Input**: El dueño del repo, ante la observación de que "140 Escuelas" está escrito
fijo en la interfaz aunque la base tenga otra cantidad: "sí, cambialo a real".

## Requirements

- **FR-001**: Todo texto que hoy dice "140" como cantidad de escuelas MUST mostrar
  la cantidad real de escuelas cargadas (activas).
- **FR-002**: Los textos que no son una cantidad ("N° Escuela (1 - 140)" en el
  orden de la lista) dejan de nombrar un rango fijo.
- **FR-003**: Nada más cambia.

## Success Criteria

- **SC-001**: Con la base local de 3 escuelas, ningún texto de la interfaz dice
  "140" y la barra dice "3 Escuelas" (verificado en navegador).

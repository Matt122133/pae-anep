# Research: Jardines en el legajo

## R1. Columna `tipo` en `escuelas`

- **Decision**: migración `0003_tipo_institucion.sql`: `ALTER TABLE escuelas ADD COLUMN tipo text NOT NULL DEFAULT 'Escuela' CHECK (tipo IN ('Escuela', 'Jardín'))`. API: `schoolType` en `School` (Go y TS), lista cerrada en `validar.go` (`listaTipoInstitucion`). Ver [ADR jardin-tipo-de-institucion](../../docs/decisions/jardin-tipo-de-institucion.md).
- **Rationale**: mismos datos y mismas relaciones (FR-002); el número único entre todas (FR-005) ya lo da `escuelas_numero_key`.
- **Alternatives considered**: tabla aparte; renombrar a `instituciones` (en el ADR).
- Nombre del campo: `schoolType` y no `institutionType`, porque `StaffMember.institutionType` ya existe y significa el régimen laboral (DGEIP, tercerizada…).

## R2. Ausente no cambia el tipo

- **Decision**: igual que `providers` en 009: POST sin `schoolType` → `'Escuela'` (antes de insertar, para que el reenvío idéntico no dé conflicto); PUT sin `schoolType` → conserva el guardado (se suma al `ajustar` de `EditarEscuela`). En el navegador, `schoolType?` opcional; el formulario lo manda siempre que lo conoce y no lo manda si edita una ficha sin el campo y la usuaria no lo tocó.
- **Rationale**: FR-006; "no enviados" y copias anteriores no lo traen.

## R3. Un solo lugar arma el nombre

- **Decision**: `src/services/institucion.ts`: `tipoDe(s)` (`s.schoolType ?? 'Escuela'`), `nombreInstitucion(s)` → `"Escuela N° 5"` / `"Jardín N° 5"`, y `nombreInstitucionPorId(schools, id, numero)` para la bitácora, que solo trae `schoolId`/`schoolNumber` (busca el tipo en el legajo; si no la encuentra, "Escuela"). Los ~35 lugares que hoy escriben `Escuela N° {n}` pasan a usarlas. Test con vitest.
- **Rationale**: SC-002 ("ninguna pantalla dice Escuela N° para un jardín") solo se puede sostener con un único punto; el test fija el formato.
- Frases con artículo ("la Escuela N°", "a la Escuela N°"): `conArticulo(s)` → `"la Escuela N° 5"` / `"el Jardín N° 5"` y `aLa(s)` → `"a la Escuela N° 5"` / `"al Jardín N° 5"`, para los `confirm` y textos de borradores.

## R4. Bitácora del servidor

- **Decision**: los resúmenes que escribe el servidor (`escuelas.go`, traslado en `personal.go`) nombran por tipo: "Alta del jardín N° 5 - …", "Baja del jardín N° 5…", "Traslado de …: Jardín N° 5 → Escuela N° 7". Se agrega `Tipo` a `bitacora.Escuela` (solo en memoria, no se guarda; la bitácora ya guarda el resumen) y `escuelaDe` lo lee. Función `nombreInstitucion(tipo, numero)` en `legajo`.
- **Rationale**: SC-002 incluye la bitácora. Las entradas viejas no se tocan (Principio II: lo registrado no se edita).
- Error de número repetido: "ya existe una institución con ese número" (puede chocar contra un jardín).

## R5. "Instituciones" y filtro

- **Decision** (FR-008): pasan a "Instituciones": `Navbar` (acceso con contador, "Directorio de N Instituciones", "Nueva Institución" ×2), `MobileBottomNav` ("Instituciones"), `SchoolList` (título "Directorio Oficial • N Instituciones de Tacuarembó" y "de N instituciones"), `Dashboard` (contador del panel), `SchoolModal` (título del alta "Registrar Nueva Institución en Tacuarembó"). No se tocan exportación, indicadores ni textos de ayuda (Assumptions de la spec).
- **Decision** (FR-009): en `SchoolList`, un selector "Tipo" Todas / Escuelas / Jardines junto a los filtros existentes (ámbito, modalidad…), mismo estilo; por defecto Todas. Con filtro y sin resultados, se usa el vacío que el directorio ya muestra.
- En cada tarjeta/fila del directorio, el nombre ya pasa por `nombreInstitucion`, que basta para distinguir (FR-003) sin agregar etiquetas de color.

## R6. Formulario

- **Decision**: en `SchoolModal`, primer campo "Tipo de institución" (Escuela / Jardín, por defecto Escuela, editable al corregir). La etiqueta "N° de Escuela *" pasa a "Número *"; el nombre por defecto del alta y el título de la ficha usan el tipo elegido.

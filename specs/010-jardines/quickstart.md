# Quickstart: validar jardines

## Prerrequisitos

Como en 009: Postgres de pruebas `:55442` y de desarrollo `:55443`, `backend/dev.sh`, `npm run dev` con `.env.local` local, dos cuentas locales. Datos **ficticios**.

## Automático

`verify:` del plan (lint, vitest, build, `go vet`, `go test` con base).

## A mano / navegador

1. **Instituciones**: la barra, el menú del celular, el directorio, el panel y el botón de alta dicen "Instituciones" / "Nueva Institución"; el contador incluye escuelas y jardines. (FR-008)
2. **Alta por defecto**: abrir el alta sin tocar el tipo y guardar: es una escuela. (US1-4)
3. **Alta de jardín**: elegir "Jardín", número libre, guardar: el directorio lo muestra como "Jardín N° X". (US1-1)
4. **Número repetido**: alta de un jardín con el número de una escuela existente: el formulario avisa que el número ya existe. (FR-005)
5. **Filtro**: Todas / Escuelas / Jardines muestra lo que corresponde; Jardines sin jardines muestra el vacío. (FR-009)
6. **Ficha**: abrir el jardín: encabezado "Jardín N° X"; editar: el formulario muestra "Jardín". (US1-2)
7. **Trabajo**: registrar una visita, una auxiliar y una incidencia en el jardín; la pantalla, la bitácora (resumen "del jardín N° X") y el informe dicen "Jardín". (US2)
8. **Baja y reactivación** del jardín. (US2-3)
9. **Otra cuenta** ve el jardín como jardín. 
10. **Sin señal**: alta de un jardín offline → "No enviados" con texto "…Jardín N° X"; vuelve la red y se envía. (FR-007)
11. **PUT sin el campo** (cuerpo desde archivo): el jardín sigue siendo jardín. (FR-006)
12. **Escuelas existentes**: tras migrar, todas siguen siendo escuelas. (FR-004, SC-003)

# Quickstart: validar proveedores en la ficha de escuela

## Prerrequisitos

- Postgres de pruebas en `:55442` y de desarrollo en `:55443` (comandos en `backend/README.md`).
- Backend local (`backend/dev.sh`) y frontend (`npm run dev`) con `.env.local` apuntando a `http://localhost:8080`.
- Cuenta local de prueba. Nombres de proveedores **ficticios**.

## Automático

`verify:` del plan: lint, vitest, build, `go vet` y `go test` (con la base de pruebas levantada; sin ella falla, no se saltea).

## A mano

1. **Alta**: "Registrar Nueva Escuela", agregar "Proveedor Uno" y "Proveedor Dos", guardar. La pantalla de la escuela muestra ambos en el bloque de datos. (FR-001, FR-007)
2. **Vacío y repetido**: en el formulario, intentar agregar "   " y "proveedor uno": no se agregan. (FR-003)
3. **Quitar**: editar, quitar "Proveedor Uno", guardar, reabrir: queda solo "Proveedor Dos". (US1-2)
4. **Otra cuenta**: entrar con la segunda cuenta local y ver la misma lista. (FR-002, SC-002)
5. **Sin señal**: con la red cortada (DevTools → Offline), agregar "Proveedor Tres" y guardar: queda en "No enviados". Volver la red: se envía solo y el servidor la tiene. (FR-005)
6. **Edición sin el campo**: mandar a mano un PUT de esa escuela sin `providers` (cuerpo desde archivo, `--data-binary @x.json`): la lista sigue igual. (FR-006)
7. **Bitácora**: la entrada de la edición del paso 3 muestra "Proveedores" con las listas unidas por coma.
8. **Escuelas existentes**: tras migrar, una escuela vieja abre con la lista vacía y el resto de los datos igual. (SC-003)

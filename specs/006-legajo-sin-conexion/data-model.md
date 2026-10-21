# Data Model: Legajo sin conexión y envío automático

Todo vive **en el dispositivo**. El modelo del servidor (`src/types/index.ts` ↔
`backend/internal/legajo/tipos.go`) no cambia: ver [research R1](research.md#r1-el-backend-no-cambia).

## Copia del legajo (IndexedDB)

Base `pae`, versión 1, almacén `copia`, una sola clave `'legajo'`.

| Campo | Tipo | Regla |
|---|---|---|
| `cuentaId` | `string` | Cuenta de la sesión que la recibió (FR-005). |
| `recibidoEn` | `string` ISO | Momento en que el servidor la entregó; se muestra en el aviso (FR-003). |
| `legajo` | `Legajo` | Respuesta completa de `GET /legajo?incluir_inactivos=1`, incluidas `cuentas` (el equipo hace falta para mostrar visitantes). |

- Se **reemplaza** entera en cada `GET /legajo` que sale bien (FR-001). No hay
  fusión parcial.
- Se **lee** solo si `cuentaId` coincide con la sesión. Si no coincide, se
  borra al ingresar (research R10).
- **No** se borra al cerrar sesión (clarify Q1).

## Borrador / elemento de la cola (`localStorage`, `pae.borradores.v1`)

Extiende el `Borrador` de `001` (`src/services/borradores.ts`). Campos nuevos en
**negrita**; todos opcionales para leer lo que guardó `001`.

| Campo | Tipo | Regla |
|---|---|---|
| `clave` | `string` | `<tipo>:<id>`. Única: un borrador por ficha/operación. |
| `descripcion` | `string` | Texto para la lista. |
| `metodo`, `ruta`, `cuerpo` | — | El pedido tal cual se va a mandar. |
| `creadoEn` | ISO | Orden de envío. **Se conserva al editar** (research R3). |
| `ultimoError`, `tipoError` | — | Último motivo, en palabras de la usuaria. |
| **`cuentaId`** | `string` | Cuenta que lo generó. Los de `001` sin este campo se asignan a la sesión actual al leerlos. |
| **`estado`** | `'pendiente' \| 'rechazado'` | Ausente = `pendiente`. |
| **`actualizadoEn`** | ISO | Última edición; es el "guardados el <fecha hora>" de FR-021. |

### Estados

```text
            guardar sin red / 401 / 5xx
 (nada) ───────────────────────────────▶ pendiente
                                          │   ▲
     envío: 400 / 409 (o dependencia)     │   │ la usuaria edita o toca "Reenviar"
                                          ▼   │
                                        rechazado
 pendiente ── envío confirmado ─▶ (se borra)
 cualquiera ── "Descartar" confirmado ─▶ (se borra)
```

- `red`, `5xx` y `401` **no** cambian el estado: siguen `pendiente` y frenan el
  recorrido.
- Un `rechazado` nunca se reintenta solo (FR-011, US3-4).
- Un borrador de otra cuenta no cambia de estado ni se envía (FR-014).

## Estado de envío (memoria, `App.tsx`)

| Campo | Tipo | Uso |
|---|---|---|
| `origenDatos` | `'servidor' \| 'copia'` | Aviso "Sin conexión — datos del …" (FR-003). |
| `copiaDel` | ISO \| null | Fecha del aviso. |
| `enviando` | `boolean` | Indicador "Enviando…" (FR-019). |
| `proximoIntento` | ms | Espera actual: 30 s, se dobla hasta 5 min con red/5xx (FR-015). |

# Contrato: servicios del dispositivo

El feature no expone interfaces nuevas hacia afuera: la API HTTP es la de `001`
sin cambios ([research R1](../research.md#r1-el-backend-no-cambia)). Este
contrato fija las funciones que usa `App.tsx` y que prueban los tests, para que
las tareas no las rediseñen sobre la marcha.

## `src/services/copiaLegajo.ts` (nuevo)

```ts
interface Copia { cuentaId: string; recibidoEn: string; legajo: Legajo }

guardarCopia(c: Copia, idb?: IDBFactory): Promise<boolean>   // false = no se pudo
leerCopia(cuentaId: string, idb?: IDBFactory): Promise<Copia | null> // null si no hay o es de otra cuenta
borrarCopia(idb?: IDBFactory): Promise<void>
```

Nunca tira: los fallos de IndexedDB devuelven `false` / `null`.

## `src/services/borradores.ts` (se extiende)

```ts
listarBorradores(almacen?, cuentaActual?: string): Borrador[] // asigna cuentaId a los de 001
guardarBorrador(b, almacen?): boolean        // conserva creadoEn si ya existía; pone actualizadoEn; estado → 'pendiente'
marcarRechazado(clave, error: ErrorApi, motivo?: string, almacen?): void
buscarBorrador(clave, almacen?): Borrador | undefined
```

`descartarBorrador` y `reenviarBorrador` quedan como están (este último pasa a
`pendiente` al reenviar a mano).

## `src/services/envio.ts` (nuevo)

```ts
interface ResultadoEnvio {
  enviados: number;
  rechazados: number;                       // nuevos rechazos en este recorrido
  frenadoPor?: 'red' | 'servidor' | 'sesion';
}

enviarCola(cuentaId: string, op?: { enviar?: typeof pedir; almacen? }): Promise<ResultadoEnvio>
siguienteEspera(actualMs: number, r: ResultadoEnvio): number // 30 s … 5 min
```

## `src/services/api.ts` (se ajusta)

`pedir` corta a los 15 s (`AbortController`) y lo informa como
`ErrorApi('red')`. Opción `tiempoMs` para las pruebas.

## Interfaz

- `AvisoBorrador` (nuevo): `{ guardadoEn: string; onAbrir: () => void }`.
- `StaffModal`, `IssueModal`, `SchoolModal`, `ScheduleVisitModal`,
  `NewVisitModal`: prop opcional `avisoBorrador`; `NewVisitModal` además
  `borrador?: { visit: Visit; newIssues: SchoolIssue[] }` para precargar.
- `BorradoresModal`: "Editar" por elemento (`onEditar(b)`), edición en línea de
  notas, agrupado "De otra cuenta", estado `rechazado` con su motivo.
- `Navbar` / `MobileBottomNav`: `origenDatos`, `copiaDel`, `enviando`,
  `rechazados`.

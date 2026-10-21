// Borradores "no enviados" (FR-028, FR-029, research D14).
//
// Cuando un guardado no llega al servidor (sin señal, sesión vencida, error del
// servidor), lo escrito no se pierde: queda acá, en este dispositivo, hasta que
// la usuaria lo reenvíe o lo descarte. Sobrevive a cerrar la app.
//
// Reenviar es seguro: cada borrador lleva el id del registro generado en el
// dispositivo, y el servidor no crea dos registros con el mismo id. Un borrador
// solo se borra cuando el servidor CONFIRMÓ (o cuando la usuaria lo descarta):
// nunca se muestra como enviado algo que el servidor no aceptó (Principio I).
//
// Desde 006 la lista es la cola que src/services/envio.ts manda sola al volver
// la conexión, en orden de `creadoEn`. Un borrador rechazado (400/409) queda
// "para revisar" y no se reintenta solo hasta que la usuaria lo edita o lo
// reenvía. Cada borrador es de la cuenta que lo generó: con otra sesión no se
// envía (el autor lo decide la sesión, Principio II).

import { describirCampos, ErrorApi, pedir, TipoError } from './api';

export interface Borrador {
  /** Clave estable de la operación (p. ej. "visita:<id>"): repetir no duplica. */
  clave: string;
  /** Texto para la lista: "Visita a la Escuela N° 35". */
  descripcion: string;
  metodo: 'POST' | 'PUT' | 'DELETE';
  ruta: string;
  cuerpo: unknown;
  /** Orden de envío. Se conserva al editar el borrador. */
  creadoEn: string;
  ultimoError: string;
  tipoError?: TipoError;
  /** Cuenta que lo generó. Los guardados por 001 no lo traen: se asigna al leer. */
  cuentaId?: string;
  /** Ausente = 'pendiente'. En pantalla, 'rechazado' es "Para revisar". */
  estado?: EstadoBorrador;
  /** Última vez que se guardó o editó ("guardados el …"). */
  actualizadoEn?: string;
}

export type EstadoBorrador = 'pendiente' | 'rechazado';

export const CLAVE_BORRADORES = 'pae.borradores.v1';

type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

function almacenPorDefecto(): Almacen | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function leerLista(almacen: Almacen | undefined): Borrador[] {
  try {
    const crudo = almacen?.getItem(CLAVE_BORRADORES);
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

/**
 * Lista los borradores. Con `cuentaActual`, los que no tienen cuenta (guardados
 * por 001, cuando todavía no se registraba) pasan a ser de esa cuenta.
 */
export function listarBorradores(
  almacen: Almacen | undefined = almacenPorDefecto(),
  cuentaActual?: string,
): Borrador[] {
  const lista = leerLista(almacen);
  if (!cuentaActual || lista.every((b) => b.cuentaId)) return lista;
  const migrada = lista.map((b) => (b.cuentaId ? b : { ...b, cuentaId: cuentaActual }));
  guardarLista(migrada, almacen);
  return migrada;
}

export function buscarBorrador(clave: string, almacen: Almacen | undefined = almacenPorDefecto()): Borrador | undefined {
  return leerLista(almacen).find((b) => b.clave === clave);
}

function guardarLista(lista: Borrador[], almacen: Almacen | undefined): boolean {
  try {
    if (!almacen) return false;
    almacen.setItem(CLAVE_BORRADORES, JSON.stringify(lista));
    return true;
  } catch {
    return false;
  }
}

/**
 * Guarda (o reemplaza, si ya había uno con la misma clave) un borrador, que
 * queda pendiente. Reemplazar conserva el `creadoEn` original: un borrador
 * editado no se adelanta en la cola a otro del que depende.
 * Devuelve false si el dispositivo no pudo guardarlo: en ese caso la app tiene
 * que avisar que lo escrito NO quedó a salvo.
 */
export function guardarBorrador(
  b: Omit<Borrador, 'creadoEn'> & { creadoEn?: string },
  almacen: Almacen | undefined = almacenPorDefecto(),
): boolean {
  const lista = leerLista(almacen);
  const previo = lista.find((x) => x.clave === b.clave);
  const ahora = new Date().toISOString();
  const resto = lista.filter((x) => x.clave !== b.clave);
  resto.push({
    ...b,
    creadoEn: previo?.creadoEn ?? b.creadoEn ?? ahora,
    cuentaId: b.cuentaId ?? previo?.cuentaId,
    estado: 'pendiente',
    actualizadoEn: ahora,
  });
  return guardarLista(resto, almacen);
}

export function descartarBorrador(clave: string, almacen: Almacen | undefined = almacenPorDefecto()): void {
  guardarLista(leerLista(almacen).filter((x) => x.clave !== clave), almacen);
}

function actualizar(clave: string, cambios: Partial<Borrador>, almacen: Almacen | undefined): void {
  guardarLista(leerLista(almacen).map((x) => (x.clave === clave ? { ...x, ...cambios } : x)), almacen);
}

/** Anota el último error sin cambiar el estado (sin red, servidor caído, sesión). */
export function anotarError(clave: string, error: ErrorApi, almacen: Almacen | undefined = almacenPorDefecto()): void {
  actualizar(clave, { ultimoError: error.message, tipoError: error.tipo }, almacen);
}

/** El servidor lo rechazó (400/409): queda para revisar y no se reintenta solo. */
export function marcarRechazado(
  clave: string,
  error: ErrorApi,
  motivo?: string,
  almacen: Almacen | undefined = almacenPorDefecto(),
): void {
  actualizar(clave, { estado: 'rechazado', ultimoError: motivo ?? describirCampos(error), tipoError: error.tipo }, almacen);
}

export function esRechazo(e: ErrorApi): boolean {
  return e.tipo === 'invalido' || e.tipo === 'conflicto';
}

export type ResultadoReenvio<T> = { ok: true; respuesta: T } | { ok: false; error: ErrorApi };

/**
 * Reenvía un borrador (a mano, o desde la cola). Si el servidor confirma, se
 * borra. Si no, queda con el error a la vista; un 400 o 409 lo deja para
 * revisar, porque necesita que la usuaria lo abra en el formulario.
 */
export async function reenviarBorrador<T>(
  b: Borrador,
  opciones: { almacen?: Almacen; enviar?: typeof pedir } = {},
): Promise<ResultadoReenvio<T>> {
  const almacen = opciones.almacen ?? almacenPorDefecto();
  const enviar = opciones.enviar ?? pedir;
  // Reenviar a mano un rechazado es pedir que se intente de nuevo.
  if (b.estado === 'rechazado') actualizar(b.clave, { estado: 'pendiente' }, almacen);
  try {
    const respuesta = await enviar<T>(b.ruta, { metodo: b.metodo, cuerpo: b.cuerpo });
    descartarBorrador(b.clave, almacen);
    return { ok: true, respuesta };
  } catch (e) {
    const error = e instanceof ErrorApi ? e : new ErrorApi('servidor', String(e));
    if (esRechazo(error)) marcarRechazado(b.clave, error, undefined, almacen);
    else anotarError(b.clave, error, almacen);
    return { ok: false, error };
  }
}

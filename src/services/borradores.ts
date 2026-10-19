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
// La sincronización automática es el feature 002; acá el reenvío es manual.

import { ErrorApi, pedir, TipoError } from './api';

export interface Borrador {
  /** Clave estable de la operación (p. ej. "visita:<id>"): repetir no duplica. */
  clave: string;
  /** Texto para la lista: "Visita a la Escuela N° 35". */
  descripcion: string;
  metodo: 'POST' | 'PUT' | 'DELETE';
  ruta: string;
  cuerpo: unknown;
  creadoEn: string;
  ultimoError: string;
  tipoError?: TipoError;
}

export const CLAVE_BORRADORES = 'pae.borradores.v1';

type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

function almacenPorDefecto(): Almacen | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function listarBorradores(almacen: Almacen | undefined = almacenPorDefecto()): Borrador[] {
  try {
    const crudo = almacen?.getItem(CLAVE_BORRADORES);
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
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
 * Guarda (o reemplaza, si ya había uno con la misma clave) un borrador.
 * Devuelve false si el dispositivo no pudo guardarlo: en ese caso la app tiene
 * que avisar que lo escrito NO quedó a salvo.
 */
export function guardarBorrador(
  b: Omit<Borrador, 'creadoEn'> & { creadoEn?: string },
  almacen: Almacen | undefined = almacenPorDefecto(),
): boolean {
  const lista = listarBorradores(almacen).filter((x) => x.clave !== b.clave);
  lista.push({ ...b, creadoEn: b.creadoEn ?? new Date().toISOString() });
  return guardarLista(lista, almacen);
}

export function descartarBorrador(clave: string, almacen: Almacen | undefined = almacenPorDefecto()): void {
  guardarLista(listarBorradores(almacen).filter((x) => x.clave !== clave), almacen);
}

export type ResultadoReenvio<T> = { ok: true; respuesta: T } | { ok: false; error: ErrorApi };

/**
 * Reenvía un borrador. Si el servidor confirma, se borra. Si no, queda con el
 * error a la vista — incluidos 400 y 409, que necesitan que la usuaria lo
 * abra en el formulario y lo resuelva (research D14, U2).
 */
export async function reenviarBorrador<T>(
  b: Borrador,
  opciones: { almacen?: Almacen; enviar?: typeof pedir } = {},
): Promise<ResultadoReenvio<T>> {
  const almacen = opciones.almacen ?? almacenPorDefecto();
  const enviar = opciones.enviar ?? pedir;
  try {
    const respuesta = await enviar<T>(b.ruta, { metodo: b.metodo, cuerpo: b.cuerpo });
    descartarBorrador(b.clave, almacen);
    return { ok: true, respuesta };
  } catch (e) {
    const error = e instanceof ErrorApi ? e : new ErrorApi('servidor', String(e));
    const lista = listarBorradores(almacen).map((x) =>
      x.clave === b.clave ? { ...x, ultimoError: error.message, tipoError: error.tipo } : x,
    );
    guardarLista(lista, almacen);
    return { ok: false, error };
  }
}

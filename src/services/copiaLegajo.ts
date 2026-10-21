// Copia del legajo en el dispositivo (006, research R2).
//
// Cada vez que el servidor entrega el legajo se guarda acá, con la cuenta que
// lo recibió y cuándo. Sin conexión, la app muestra esta copia con la fecha a
// la vista. Hay una sola copia por dispositivo: se lee solo con la misma
// cuenta, y se borra al cerrar sesión o si ingresa otra cuenta (FR-005,
// FR-006). Los "no enviados" NO viven acá: son de borradores.ts.
//
// Va en IndexedDB y no en localStorage: el legajo crece con las visitas y
// localStorage tiene un tope de unos 5 MB compartido con la sesión y los
// borradores. Nada de esto tira: si el dispositivo no puede guardar, la app
// sigue andando con señal.

export interface Copia<L = unknown> {
  cuentaId: string;
  /** Cuándo la entregó el servidor (ISO). Es la fecha del aviso sin conexión. */
  recibidoEn: string;
  legajo: L;
}

/** Dónde se guarda la copia. Las pruebas inyectan uno en memoria. */
export interface AlmacenCopia {
  leer(): Promise<Copia | undefined>;
  guardar(c: Copia): Promise<void>;
  borrar(): Promise<void>;
}

const BASE = 'pae';
const ALMACEN = 'copia';
const CLAVE = 'legajo';

function abrir(idb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const pedido = idb.open(BASE, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(ALMACEN);
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rechazar(pedido.error);
    pedido.onblocked = () => rechazar(new Error('IndexedDB bloqueado'));
  });
}

async function operar<T>(
  idb: IDBFactory,
  modo: IDBTransactionMode,
  hacer: (almacen: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await abrir(idb);
  try {
    return await new Promise<T>((resolver, rechazar) => {
      const tx = db.transaction(ALMACEN, modo);
      const pedido = hacer(tx.objectStore(ALMACEN));
      tx.oncomplete = () => resolver(pedido.result as T);
      tx.onerror = () => rechazar(tx.error);
      tx.onabort = () => rechazar(tx.error ?? new Error('transacción abortada'));
    });
  } finally {
    db.close();
  }
}

/** La copia en IndexedDB del navegador; undefined si el entorno no lo tiene. */
export function almacenIndexedDB(): AlmacenCopia | undefined {
  let idb: IDBFactory | undefined;
  try {
    idb = globalThis.indexedDB;
  } catch {
    idb = undefined;
  }
  if (!idb) return undefined;
  const f = idb;
  return {
    leer: () => operar<Copia | undefined>(f, 'readonly', (a) => a.get(CLAVE)),
    guardar: (c) => operar<void>(f, 'readwrite', (a) => a.put(c, CLAVE)),
    borrar: () => operar<void>(f, 'readwrite', (a) => a.delete(CLAVE)),
  };
}

/** Guarda la copia. false = el dispositivo no pudo (sin IndexedDB, cuota, modo privado). */
export async function guardarCopia<L>(c: Copia<L>, almacen = almacenIndexedDB()): Promise<boolean> {
  if (!almacen) return false;
  try {
    await almacen.guardar(c);
    return true;
  } catch {
    return false;
  }
}

/** La copia de esta cuenta, o null si no hay, es de otra cuenta, o no se pudo leer. */
export async function leerCopia<L>(cuentaId: string, almacen = almacenIndexedDB()): Promise<Copia<L> | null> {
  if (!almacen) return null;
  try {
    const c = await almacen.leer();
    return c && c.cuentaId === cuentaId ? (c as Copia<L>) : null;
  } catch {
    return null;
  }
}

export async function borrarCopia(almacen = almacenIndexedDB()): Promise<void> {
  try {
    await almacen?.borrar();
  } catch {
    // Si no se puede borrar tampoco se podrá leer; no hay nada más que hacer.
  }
}

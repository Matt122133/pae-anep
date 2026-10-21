// Cliente HTTP del backend. Es la única puerta de la app hacia el servidor.
//
// Todo error sale como ErrorApi con un `tipo` que dice qué hacer con él:
//   - 'red'       no se llegó al servidor (sin señal, servidor caído)
//   - 'sesion'    401: la sesión no sirve; hay que volver a ingresar
//   - 'invalido'  400: datos a corregir; `campos` dice cuáles
//   - 'conflicto' 409: otra persona cambió el registro; `actual` es la versión vigente
//   - 'servidor'  5xx u otra respuesta inesperada
// Los borradores "no enviados" se crean para 'red', 'sesion' y 'servidor'
// (research D14); 'invalido' y 'conflicto' se muestran en el formulario.

import { leerSesion } from './sesion';

export type TipoError = 'red' | 'sesion' | 'invalido' | 'conflicto' | 'servidor';

export class ErrorApi extends Error {
  constructor(
    public tipo: TipoError,
    mensaje: string,
    public estado = 0,
    public campos: Record<string, string> = {},
    public actual: unknown = undefined,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

/** El mensaje con el detalle de cada campo rechazado, si el servidor lo dio. */
export function describirCampos(e: ErrorApi): string {
  const campos = Object.entries(e.campos).map(([c, m]) => `${c}: ${m}`);
  return campos.length ? `Hay datos para corregir — ${campos.join('; ')}` : e.message;
}

/** ¿Este error justifica guardar lo escrito como borrador "no enviado"? */
export function generaBorrador(e: unknown): boolean {
  return e instanceof ErrorApi && (e.tipo === 'red' || e.tipo === 'sesion' || e.tipo === 'servidor');
}

export function urlBase(): string {
  const url = (import.meta.env?.VITE_API_URL as string | undefined) ?? '';
  return url.replace(/\/+$/, '');
}

interface Opciones {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  cuerpo?: unknown;
  /** Token explícito; por defecto, el de la sesión guardada. */
  token?: string | null;
  fetchImpl?: typeof fetch;
  base?: string;
  /** Corte del pedido; por defecto TIEMPO_MAXIMO_MS. */
  tiempoMs?: number;
}

/**
 * Con un portal cautivo o wifi sin salida, `fetch` puede quedar colgado
 * minutos aunque el dispositivo diga que hay red. Pasado este tiempo el pedido
 * se corta y cuenta como sin conexión (research 006 R5).
 */
export const TIEMPO_MAXIMO_MS = 15_000;

export async function pedir<T>(ruta: string, op: Opciones = {}): Promise<T> {
  const base = op.base ?? urlBase();
  if (!base) {
    throw new ErrorApi('servidor', 'La app no tiene configurada la dirección del servidor (VITE_API_URL).');
  }
  const token = op.token === undefined ? leerSesion()?.token : op.token;
  const cabeceras: Record<string, string> = {};
  if (token) cabeceras['Authorization'] = `Bearer ${token}`;
  if (op.cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';

  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), op.tiempoMs ?? TIEMPO_MAXIMO_MS);
  let resp: Response;
  try {
    resp = await (op.fetchImpl ?? fetch)(base + ruta, {
      method: op.metodo ?? 'GET',
      headers: cabeceras,
      body: op.cuerpo === undefined ? undefined : JSON.stringify(op.cuerpo),
      signal: corte.signal,
    });
  } catch {
    throw new ErrorApi('red', 'No hay conexión con el servidor.');
  } finally {
    clearTimeout(reloj);
  }

  if (resp.status === 204) return undefined as T;

  let datos: any = null;
  try {
    datos = await resp.json();
  } catch {
    datos = null;
  }

  if (resp.ok) return datos as T;

  const codigo = datos?.error;
  switch (resp.status) {
    case 400:
      throw new ErrorApi('invalido', 'Hay datos para corregir.', 400, datos?.campos ?? {});
    case 401:
      if (codigo === 'credenciales') {
        throw new ErrorApi('invalido', 'Usuario o contraseña incorrectos.', 401);
      }
      throw new ErrorApi('sesion', 'Tu sesión venció. Volvé a ingresar.', 401);
    case 409:
      throw new ErrorApi('conflicto', 'Otra persona cambió este registro mientras lo editabas.', 409, {}, datos?.actual);
    default:
      throw new ErrorApi('servidor', 'El servidor no pudo procesar el pedido.', resp.status);
  }
}

/**
 * Id generado en el dispositivo (research D6). Es lo que hace que reenviar un
 * borrador no duplique. `crypto.randomUUID` no existe fuera de contexto seguro
 * (http:// en la LAN), así que hay respaldo con getRandomValues.
 */
export function nuevoId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

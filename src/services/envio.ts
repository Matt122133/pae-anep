// Envío automático de los "no enviados" (006, research R4).
//
// Recorre la cola de una cuenta en el orden en que se guardó, de a uno. Lo que
// el servidor confirma sale de la cola; nada sale sin confirmación (Principio
// I). Un rechazo (400/409) queda para revisar y no frena a los demás. Sin red,
// con el servidor caído o con la sesión vencida no tiene sentido seguir: se
// frena y se reintenta más tarde. Reenviar no duplica: cada borrador lleva el
// id del dispositivo y el servidor ya lo trata como idempotente (R1).

import { ErrorApi, pedir } from './api';
import { deLa } from './institucion';
import { SchoolType } from '../types';
import { anotarError, Borrador, descartarBorrador, esRechazo, listarBorradores, marcarRechazado } from './borradores';

export interface ResultadoEnvio {
  enviados: number;
  /** Rechazados en este recorrido. */
  rechazados: number;
  frenadoPor?: 'red' | 'servidor' | 'sesion';
}

type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

export const ESPERA_MINIMA_MS = 30_000;
export const ESPERA_MAXIMA_MS = 300_000;

/** Los pendientes de la cuenta, en orden de envío. */
export function pendientesDe(cuentaId: string, lista: Borrador[]): Borrador[] {
  return lista
    .filter((b) => b.cuentaId === cuentaId && (b.estado ?? 'pendiente') === 'pendiente')
    .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
}

function schoolIdDe(cuerpo: unknown): string | undefined {
  const c = cuerpo as { schoolId?: unknown; visit?: { schoolId?: unknown } } | null;
  const id = c?.schoolId ?? c?.visit?.schoolId;
  return typeof id === 'string' ? id : undefined;
}

/**
 * Si un borrador depende de una escuela cuyo alta también está rechazada en la
 * cola, el motivo real es ese (FR-012, R9), no el error técnico del servidor.
 */
function motivoDependencia(b: Borrador, lista: Borrador[]): string | undefined {
  const schoolId = schoolIdDe(b.cuerpo);
  if (!schoolId || b.clave === `escuela:${schoolId}`) return undefined;
  const alta = lista.find((x) => x.clave === `escuela:${schoolId}` && x.estado === 'rechazado');
  if (!alta) return undefined;
  const cuerpo = alta.cuerpo as { number?: number; schoolType?: SchoolType } | null;
  return `Depende ${deLa({ number: cuerpo?.number ?? NaN, schoolType: cuerpo?.schoolType }).replace('NaN', '?')}, que todavía no se envió.`;
}

export async function enviarCola(
  cuentaId: string,
  op: { enviar?: typeof pedir; almacen?: Almacen } = {},
): Promise<ResultadoEnvio> {
  const enviar = op.enviar ?? pedir;
  const r: ResultadoEnvio = { enviados: 0, rechazados: 0 };
  for (const b of pendientesDe(cuentaId, listarBorradores(op.almacen, cuentaId))) {
    try {
      await enviar(b.ruta, { metodo: b.metodo, cuerpo: b.cuerpo });
      descartarBorrador(b.clave, op.almacen);
      r.enviados++;
    } catch (e) {
      const error = e instanceof ErrorApi ? e : new ErrorApi('servidor', String(e));
      if (esRechazo(error)) {
        const motivo = error.tipo === 'invalido' ? motivoDependencia(b, listarBorradores(op.almacen)) : undefined;
        marcarRechazado(b.clave, error, motivo, op.almacen);
        r.rechazados++;
        continue;
      }
      anotarError(b.clave, error, op.almacen);
      r.frenadoPor = error.tipo === 'sesion' ? 'sesion' : error.tipo === 'red' ? 'red' : 'servidor';
      break;
    }
  }
  return r;
}

/**
 * Cuánto esperar hasta el próximo intento: 30 s mientras las cosas salen; con
 * la red o el servidor fallando, el doble cada vez hasta 5 min (FR-015).
 */
export function siguienteEspera(actualMs: number, r: ResultadoEnvio): number {
  if (r.frenadoPor === 'red' || r.frenadoPor === 'servidor') {
    return Math.min(Math.max(actualMs, ESPERA_MINIMA_MS / 2) * 2, ESPERA_MAXIMA_MS);
  }
  return ESPERA_MINIMA_MS;
}

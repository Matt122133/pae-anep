import { describe, expect, it } from 'vitest';
import { ErrorApi } from './api';
import {
  Borrador,
  CLAVE_BORRADORES,
  descartarBorrador,
  guardarBorrador,
  listarBorradores,
  reenviarBorrador,
} from './borradores';

function almacen() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

const base = {
  clave: 'visita:v-1',
  descripcion: 'Visita a la Escuela N° 1',
  metodo: 'POST' as const,
  ruta: '/visitas',
  cuerpo: { visit: { id: 'v-1' }, newIssues: [] },
  ultimoError: 'No hay conexión con el servidor.',
};

describe('borradores', () => {
  it('guarda, sobrevive a releer y reemplaza por clave', () => {
    const a = almacen();
    expect(guardarBorrador(base, a)).toBe(true);
    expect(guardarBorrador({ ...base, ultimoError: 'otro' }, a)).toBe(true);
    const lista = listarBorradores(a);
    expect(lista).toHaveLength(1);
    expect(lista[0].ultimoError).toBe('otro');
    // "Cerrar la app" es releer el almacenamiento desde cero.
    expect(JSON.parse(a.m.get(CLAVE_BORRADORES)!)).toHaveLength(1);
  });

  it('descartar lo quita', () => {
    const a = almacen();
    guardarBorrador(base, a);
    descartarBorrador(base.clave, a);
    expect(listarBorradores(a)).toEqual([]);
  });

  it('reenviar con éxito lo borra solo después de que el servidor confirma', async () => {
    const a = almacen();
    guardarBorrador(base, a);
    let enviado: unknown;
    const enviar = (async (_ruta: string, op: any) => {
      expect(listarBorradores(a)).toHaveLength(1); // todavía está mientras se envía
      enviado = op.cuerpo;
      return { visit: { id: 'v-1' } };
    }) as any;
    const r = await reenviarBorrador<{ visit: { id: string } }>(listarBorradores(a)[0], { almacen: a, enviar });
    expect(r.ok).toBe(true);
    expect(enviado).toEqual(base.cuerpo);
    expect(listarBorradores(a)).toEqual([]);
  });

  it('un 409 o un 400 al reenviar NO lo borra y deja el error a la vista', async () => {
    for (const err of [
      new ErrorApi('conflicto', 'Otra persona cambió este registro.', 409),
      new ErrorApi('invalido', 'Hay datos para corregir.', 400, { schoolId: 'escuela inactiva' }),
      new ErrorApi('red', 'No hay conexión con el servidor.'),
    ]) {
      const a = almacen();
      guardarBorrador(base, a);
      const enviar = (async () => {
        throw err;
      }) as any;
      const r = await reenviarBorrador(listarBorradores(a)[0] as Borrador, { almacen: a, enviar });
      expect(r.ok).toBe(false);
      const quedo = listarBorradores(a);
      expect(quedo).toHaveLength(1);
      expect(quedo[0].tipoError).toBe(err.tipo);
      expect(quedo[0].ultimoError).toBe(err.message);
    }
  });

  it('avisa si el dispositivo no pudo guardarlo', () => {
    const roto = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(guardarBorrador(base, roto)).toBe(false);
  });
});

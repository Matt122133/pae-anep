import { describe, expect, it } from 'vitest';
import { ErrorApi } from './api';
import { buscarBorrador, CLAVE_BORRADORES, guardarBorrador, listarBorradores } from './borradores';
import { enviarCola, ESPERA_MAXIMA_MS, ESPERA_MINIMA_MS, siguienteEspera } from './envio';

function almacen() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

function borrador(clave: string, creadoEn: string, extra: Record<string, unknown> = {}) {
  return {
    clave,
    descripcion: clave,
    metodo: 'POST' as const,
    ruta: `/${clave}`,
    cuerpo: {},
    ultimoError: '',
    cuentaId: 'c-1',
    creadoEn,
    ...extra,
  };
}

/** Un servidor falso: responde según la ruta y anota el orden. */
function servidor(respuestas: Record<string, ErrorApi | 'ok'> = {}) {
  const orden: string[] = [];
  const enviar = (async (ruta: string) => {
    orden.push(ruta);
    const r = respuestas[ruta] ?? 'ok';
    if (r !== 'ok') throw r;
    return {};
  }) as any;
  return { enviar, orden };
}

describe('enviarCola', () => {
  it('envía en el orden en que se guardó, aunque uno se haya editado después', async () => {
    const a = almacen();
    guardarBorrador(borrador('b', '2026-10-21T10:02:00Z'), a);
    guardarBorrador(borrador('a', '2026-10-21T10:01:00Z'), a);
    guardarBorrador(borrador('a', 'ignorado', { descripcion: 'editado' }), a); // editar no lo mueve
    const s = servidor();
    const r = await enviarCola('c-1', { enviar: s.enviar, almacen: a });
    expect(s.orden).toEqual(['/a', '/b']);
    expect(r).toEqual({ enviados: 2, rechazados: 0 });
    expect(listarBorradores(a)).toEqual([]);
  });

  it('un rechazado no frena a los demás y queda para revisar', async () => {
    const a = almacen();
    guardarBorrador(borrador('a', '1'), a);
    guardarBorrador(borrador('b', '2'), a);
    guardarBorrador(borrador('c', '3'), a);
    const s = servidor({ '/b': new ErrorApi('invalido', 'Hay datos para corregir.', 400) });
    const r = await enviarCola('c-1', { enviar: s.enviar, almacen: a });
    expect(r).toEqual({ enviados: 2, rechazados: 1 });
    expect(listarBorradores(a).map((b) => [b.clave, b.estado])).toEqual([['b', 'rechazado']]);
  });

  it('sin red se frena y todo sigue pendiente', async () => {
    const a = almacen();
    guardarBorrador(borrador('a', '1'), a);
    guardarBorrador(borrador('b', '2'), a);
    const s = servidor({ '/a': new ErrorApi('red', 'No hay conexión con el servidor.') });
    const r = await enviarCola('c-1', { enviar: s.enviar, almacen: a });
    expect(r.frenadoPor).toBe('red');
    expect(s.orden).toEqual(['/a']);
    expect(listarBorradores(a).map((b) => b.estado)).toEqual(['pendiente', 'pendiente']);
  });

  it('una sesión vencida frena y conserva la cola', async () => {
    const a = almacen();
    guardarBorrador(borrador('a', '1'), a);
    const s = servidor({ '/a': new ErrorApi('sesion', 'Tu sesión venció.', 401) });
    const r = await enviarCola('c-1', { enviar: s.enviar, almacen: a });
    expect(r.frenadoPor).toBe('sesion');
    expect(listarBorradores(a)).toHaveLength(1);
  });

  it('no envía los rechazados ni los de otra cuenta', async () => {
    const a = almacen();
    guardarBorrador(borrador('a', '1', { cuentaId: 'c-2' }), a);
    a.setItem(
      CLAVE_BORRADORES,
      JSON.stringify([...listarBorradores(a), { ...borrador('b', '2'), estado: 'rechazado' }]),
    );
    const s = servidor();
    const r = await enviarCola('c-1', { enviar: s.enviar, almacen: a });
    expect(s.orden).toEqual([]);
    expect(r).toEqual({ enviados: 0, rechazados: 0 });
  });

  it('reenviar algo que el servidor ya tenía (respuesta perdida) lo saca de la cola sin duplicar', async () => {
    const a = almacen();
    guardarBorrador(borrador('visita', '1'), a);
    // El servidor idempotente devuelve el registro existente: para la cola es un OK.
    const s = servidor();
    await enviarCola('c-1', { enviar: s.enviar, almacen: a });
    await enviarCola('c-1', { enviar: s.enviar, almacen: a });
    expect(s.orden).toEqual(['/visita']);
  });

  it('si la escuela de la que depende fue rechazada, el motivo lo dice', async () => {
    const a = almacen();
    guardarBorrador(borrador('escuela:e-9', '1', { cuerpo: { id: 'e-9', number: 141 } }), a);
    guardarBorrador(borrador('personal:p-1', '2', { cuerpo: { id: 'p-1', schoolId: 'e-9' } }), a);
    const invalido = new ErrorApi('invalido', 'Hay datos para corregir.', 400);
    const s = servidor({ '/escuela:e-9': invalido, '/personal:p-1': invalido });
    await enviarCola('c-1', { enviar: s.enviar, almacen: a });
    expect(buscarBorrador('personal:p-1', a)!.ultimoError).toBe(
      'Depende de la Escuela N° 141, que todavía no se envió.',
    );
    expect(buscarBorrador('escuela:e-9', a)!.ultimoError).toBe('Hay datos para corregir.');
  });
});

describe('siguienteEspera', () => {
  it('30 s si salió bien; con red o servidor caído se dobla hasta 5 min', () => {
    const fallo = { enviados: 0, rechazados: 0, frenadoPor: 'red' as const };
    let t = ESPERA_MINIMA_MS;
    const vistos: number[] = [];
    for (let i = 0; i < 6; i++) {
      t = siguienteEspera(t, fallo);
      vistos.push(t);
    }
    expect(vistos).toEqual([60_000, 120_000, 240_000, 300_000, 300_000, 300_000]);
    expect(siguienteEspera(ESPERA_MAXIMA_MS, { enviados: 1, rechazados: 0 })).toBe(ESPERA_MINIMA_MS);
    // Una sesión vencida no se reintenta por tiempo: espera a que reingrese.
    expect(siguienteEspera(120_000, { enviados: 0, rechazados: 0, frenadoPor: 'sesion' })).toBe(ESPERA_MINIMA_MS);
  });
});

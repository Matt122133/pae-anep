import { describe, expect, it } from 'vitest';
import { ErrorApi, generaBorrador, nuevoId, pedir } from './api';

const base = 'http://api.test';

function respuesta(estado: number, cuerpo?: unknown) {
  return async () =>
    new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), { status: estado });
}

async function error(p: Promise<unknown>): Promise<ErrorApi> {
  try {
    await p;
  } catch (e) {
    return e as ErrorApi;
  }
  throw new Error('se esperaba un error');
}

describe('pedir', () => {
  it('manda el token y el cuerpo', async () => {
    let visto: RequestInit | undefined;
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      visto = init;
      return new Response('{"ok":true}', { status: 200 });
    }) as unknown as typeof fetch;
    const r = await pedir<{ ok: boolean }>('/x', { base, token: 't1', metodo: 'POST', cuerpo: { a: 1 }, fetchImpl });
    expect(r.ok).toBe(true);
    expect((visto!.headers as Record<string, string>)['Authorization']).toBe('Bearer t1');
    expect(visto!.body).toBe('{"a":1}');
  });

  it('clasifica cada error', async () => {
    const casos: [number, unknown, string][] = [
      [400, { error: 'invalido', campos: { name: 'vacío' } }, 'invalido'],
      [401, { error: 'sesion_invalida' }, 'sesion'],
      [401, { error: 'credenciales' }, 'invalido'],
      [409, { error: 'conflicto', actual: { version: 3 } }, 'conflicto'],
      [500, { error: 'interno' }, 'servidor'],
    ];
    for (const [estado, cuerpo, tipo] of casos) {
      const e = await error(pedir('/x', { base, token: 't', fetchImpl: respuesta(estado, cuerpo) as any }));
      expect(e.tipo, `estado ${estado}`).toBe(tipo);
    }
    const inv = await error(pedir('/x', { base, token: 't', fetchImpl: respuesta(400, casos[0][1]) as any }));
    expect(inv.campos).toEqual({ name: 'vacío' });
    const conf = await error(pedir('/x', { base, token: 't', fetchImpl: respuesta(409, casos[3][1]) as any }));
    expect(conf.actual).toEqual({ version: 3 });
  });

  it('sin red es tipo red', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    expect((await error(pedir('/x', { base, token: 't', fetchImpl }))).tipo).toBe('red');
  });

  it('204 devuelve undefined', async () => {
    expect(await pedir('/x', { base, token: 't', fetchImpl: respuesta(204) as any })).toBeUndefined();
  });
});

describe('generaBorrador', () => {
  it('solo red, sesión y servidor', () => {
    expect(generaBorrador(new ErrorApi('red', ''))).toBe(true);
    expect(generaBorrador(new ErrorApi('sesion', ''))).toBe(true);
    expect(generaBorrador(new ErrorApi('servidor', ''))).toBe(true);
    expect(generaBorrador(new ErrorApi('invalido', ''))).toBe(false);
    expect(generaBorrador(new ErrorApi('conflicto', ''))).toBe(false);
    expect(generaBorrador(new Error('otro'))).toBe(false);
  });
});

describe('nuevoId', () => {
  it('genera UUIDs distintos con forma v4', () => {
    const a = nuevoId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(nuevoId()).not.toBe(a);
  });
});

import { describe, expect, it } from 'vitest';
import { borrarSesion, CLAVE_SESION, guardarSesion, leerSesion } from './sesion';

function almacen(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size;
    },
  };
}

const s = { token: 't', cuenta: { id: 'c1', usuario: 'valentina', nombre: 'V', rol: 'Ecónoma del PAE' } };

describe('sesión', () => {
  it('guarda, lee y borra', () => {
    const a = almacen();
    expect(leerSesion(a)).toBeNull();
    guardarSesion(s, a);
    expect(leerSesion(a)).toEqual(s);
    borrarSesion(a);
    expect(leerSesion(a)).toBeNull();
  });

  it('ignora basura', () => {
    const a = almacen();
    a.setItem(CLAVE_SESION, '{no es json');
    expect(leerSesion(a)).toBeNull();
    a.setItem(CLAVE_SESION, '{"token":""}');
    expect(leerSesion(a)).toBeNull();
  });

  it('no tira si el almacenamiento falla', () => {
    const roto = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    } as unknown as Storage;
    expect(leerSesion(roto)).toBeNull();
    expect(() => guardarSesion(s, roto)).not.toThrow();
    expect(() => borrarSesion(roto)).not.toThrow();
  });
});

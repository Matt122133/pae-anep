import { describe, expect, it } from 'vitest';
import { AlmacenCopia, borrarCopia, Copia, guardarCopia, leerCopia } from './copiaLegajo';

function enMemoria(): AlmacenCopia {
  let guardada: Copia | undefined;
  return {
    leer: async () => guardada,
    guardar: async (c) => {
      guardada = c;
    },
    borrar: async () => {
      guardada = undefined;
    },
  };
}

const roto: AlmacenCopia = {
  leer: async () => {
    throw new Error('IndexedDB no disponible');
  },
  guardar: async () => {
    throw new Error('QuotaExceededError');
  },
  borrar: async () => {
    throw new Error('IndexedDB no disponible');
  },
};

const copia: Copia<{ schools: unknown[] }> = {
  cuentaId: 'c-1',
  recibidoEn: '2026-10-21T12:00:00Z',
  legajo: { schools: [{ id: 'esc-1' }] },
};

describe('copia del legajo', () => {
  it('guarda y la misma cuenta la lee', async () => {
    const a = enMemoria();
    expect(await guardarCopia(copia, a)).toBe(true);
    expect(await leerCopia('c-1', a)).toEqual(copia);
  });

  it('otra cuenta no la ve', async () => {
    const a = enMemoria();
    await guardarCopia(copia, a);
    expect(await leerCopia('c-2', a)).toBeNull();
  });

  it('borrar la quita', async () => {
    const a = enMemoria();
    await guardarCopia(copia, a);
    await borrarCopia(a);
    expect(await leerCopia('c-1', a)).toBeNull();
  });

  it('si el dispositivo falla no tira: false / null', async () => {
    expect(await guardarCopia(copia, roto)).toBe(false);
    expect(await leerCopia('c-1', roto)).toBeNull();
    await expect(borrarCopia(roto)).resolves.toBeUndefined();
  });

  it('sin IndexedDB en el entorno (node) no hace nada', async () => {
    expect(await guardarCopia(copia)).toBe(false);
    expect(await leerCopia('c-1')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { agregarProveedor, quitarProveedor } from './proveedores';

describe('agregarProveedor', () => {
  it('agrega al final, recortado', () => {
    expect(agregarProveedor(['Proveedor Uno'], '  Proveedor Dos ')).toEqual(['Proveedor Uno', 'Proveedor Dos']);
  });

  it('ignora vacío y solo espacios', () => {
    const lista = ['Proveedor Uno'];
    expect(agregarProveedor(lista, '')).toBe(lista);
    expect(agregarProveedor(lista, '   ')).toBe(lista);
  });

  it('ignora repetidos sin distinguir mayúsculas', () => {
    const lista = ['Proveedor Uno'];
    expect(agregarProveedor(lista, ' proveedor UNO')).toBe(lista);
  });

  it('acepta hasta 120 caracteres y no más', () => {
    expect(agregarProveedor([], 'ñ'.repeat(120))).toHaveLength(1);
    expect(agregarProveedor([], 'ñ'.repeat(121))).toEqual([]);
  });
});

describe('quitarProveedor', () => {
  it('quita por índice y deja el resto en orden', () => {
    expect(quitarProveedor(['A', 'B', 'C'], 1)).toEqual(['A', 'C']);
  });
});

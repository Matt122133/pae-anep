import { describe, expect, it } from 'vitest';
import { School } from '../types';
import { aLa, conArticulo, deLa, deLaTipo, estaInstitucion, nombreInstitucion, nombreInstitucionPorId, tipoDe } from './institucion';

const escuela = { number: 5, schoolType: 'Escuela' as const };
const jardin = { number: 12, schoolType: 'Jardín' as const };
const sinTipo = { number: 7 };

describe('nombreInstitucion', () => {
  it('nombra por tipo', () => {
    expect(nombreInstitucion(escuela)).toBe('Escuela N° 5');
    expect(nombreInstitucion(jardin)).toBe('Jardín N° 12');
  });

  it('sin tipo (copia anterior a 010) es escuela', () => {
    expect(tipoDe(sinTipo)).toBe('Escuela');
    expect(nombreInstitucion(sinTipo)).toBe('Escuela N° 7');
  });

  it('artículos', () => {
    expect(conArticulo(escuela)).toBe('la Escuela N° 5');
    expect(conArticulo(jardin)).toBe('el Jardín N° 12');
    expect(aLa(escuela)).toBe('a la Escuela N° 5');
    expect(aLa(jardin)).toBe('al Jardín N° 12');
    expect(deLa(escuela)).toBe('de la Escuela N° 5');
    expect(deLa(jardin)).toBe('del Jardín N° 12');
    expect(estaInstitucion(escuela)).toBe('esta escuela');
    expect(estaInstitucion(jardin)).toBe('este jardín');
    expect(deLaTipo(jardin)).toBe('del jardín');
  });
});

describe('nombreInstitucionPorId', () => {
  const schools = [{ id: 'j-1', ...jardin }] as School[];

  it('toma el tipo del legajo', () => {
    expect(nombreInstitucionPorId(schools, 'j-1', 12)).toBe('Jardín N° 12');
  });

  it('si no la encuentra, escuela con el número dado', () => {
    expect(nombreInstitucionPorId(schools, 'otra', 3)).toBe('Escuela N° 3');
  });
});

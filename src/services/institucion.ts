// Cómo se nombra una institución del legajo (010). Todo texto que nombra a
// una escuela o jardín concreto pasa por acá, para que un jardín nunca diga
// "Escuela N°".
import { School, SchoolType } from '../types';

type ConTipo = Pick<School, 'number' | 'schoolType'>;

export function tipoDe(s: ConTipo | undefined): SchoolType {
  return s?.schoolType ?? 'Escuela';
}

/** "Escuela N° 5" / "Jardín N° 5". */
export function nombreInstitucion(s: ConTipo): string {
  return `${tipoDe(s)} N° ${s.number}`;
}

/** "la Escuela N° 5" / "el Jardín N° 5". */
export function conArticulo(s: ConTipo): string {
  return `${tipoDe(s) === 'Jardín' ? 'el' : 'la'} ${nombreInstitucion(s)}`;
}

/** "a la Escuela N° 5" / "al Jardín N° 5". */
export function aLa(s: ConTipo): string {
  return tipoDe(s) === 'Jardín' ? `al ${nombreInstitucion(s)}` : `a la ${nombreInstitucion(s)}`;
}

/** Para lo que solo trae id y número (bitácora, borradores): busca el tipo en
 * el legajo; si la institución no está, la nombra como escuela. */
export function nombreInstitucionPorId(schools: School[], id: string | undefined, numero: number | undefined): string {
  const s = id ? schools.find(x => x.id === id) : undefined;
  return nombreInstitucion({ number: s?.number ?? numero ?? 0, schoolType: s?.schoolType });
}

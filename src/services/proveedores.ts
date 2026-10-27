// Lista de proveedores de una escuela (009): nombres de texto libre, sin
// catálogo. Mismas reglas que ValidarEscuela en el servidor.

export const LARGO_MAXIMO_PROVEEDOR = 120;

/** Devuelve la lista con el nombre agregado al final, o la misma lista si el
 * nombre es vacío, pasa del largo o ya está (sin distinguir mayúsculas). */
export function agregarProveedor(lista: string[], nombre: string): string[] {
  const limpio = nombre.trim();
  if (!limpio || [...limpio].length > LARGO_MAXIMO_PROVEEDOR) return lista;
  const clave = limpio.toLowerCase();
  if (lista.some(p => p.toLowerCase() === clave)) return lista;
  return [...lista, limpio];
}

export function quitarProveedor(lista: string[], indice: number): string[] {
  return lista.filter((_, i) => i !== indice);
}

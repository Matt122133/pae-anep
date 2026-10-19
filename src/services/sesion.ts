// Sesión de la usuaria en este dispositivo: el token que emitió el servidor y
// los datos de su cuenta. Vive en localStorage para que cerrar y abrir la app
// no pida la contraseña de nuevo (US1, escenario 5).
//
// Todo acceso va en try/catch: en modo privado o con el almacenamiento
// bloqueado, localStorage puede tirar. Sin almacenamiento la app igual
// funciona; solo hay que volver a ingresar al recargar.

export interface CuentaSesion {
  id: string;
  usuario: string;
  nombre: string;
  rol: string;
}

export interface Sesion {
  token: string;
  cuenta: CuentaSesion;
}

export const CLAVE_SESION = 'pae.sesion.v1';

export function leerSesion(almacen: Storage | undefined = globalThis.localStorage): Sesion | null {
  try {
    const crudo = almacen?.getItem(CLAVE_SESION);
    if (!crudo) return null;
    const s = JSON.parse(crudo) as Partial<Sesion>;
    if (typeof s.token !== 'string' || !s.token || !s.cuenta || typeof s.cuenta.id !== 'string') {
      return null;
    }
    return s as Sesion;
  } catch {
    return null;
  }
}

export function guardarSesion(s: Sesion, almacen: Storage | undefined = globalThis.localStorage): void {
  try {
    almacen?.setItem(CLAVE_SESION, JSON.stringify(s));
  } catch {
    // Sin almacenamiento: la sesión dura lo que dure la pestaña.
  }
}

export function borrarSesion(almacen: Storage | undefined = globalThis.localStorage): void {
  try {
    almacen?.removeItem(CLAVE_SESION);
  } catch {
    // Nada que hacer.
  }
}

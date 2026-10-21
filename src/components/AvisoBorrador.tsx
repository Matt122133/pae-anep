import React from 'react';
import { CloudUpload } from 'lucide-react';
import { fechaCorta } from '../services/fechas';

export interface AvisoBorradorProps {
  /** Cuándo se guardó el borrador por última vez (ISO). */
  guardadoEn: string;
  onAbrir: () => void;
}

// Una ficha abierta desde el legajo que tiene un "no enviado" (006, FR-021):
// el formulario muestra lo del servidor y avisa que hay cambios propios sin
// enviar, con la opción de abrirlos en su lugar.
export function AvisoBorrador({ guardadoEn, onAbrir }: AvisoBorradorProps) {
  return (
    <div role="status" className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl px-3 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
      <span className="flex items-center gap-2 font-semibold">
        <CloudUpload className="w-4 h-4 shrink-0 text-amber-600" />
        Hay cambios sin enviar en esta ficha (guardados el {fechaCorta(guardadoEn)}).
      </span>
      <button
        type="button"
        onClick={onAbrir}
        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-bold"
      >
        Abrir el borrador
      </button>
    </div>
  );
}

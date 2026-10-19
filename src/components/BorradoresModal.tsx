import React, { useState } from 'react';
import { X, CloudUpload, Trash2, Loader2, AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';
import type { Borrador } from '../services/borradores';

interface BorradoresModalProps {
  borradores: Borrador[];
  isOnline: boolean;
  onClose: () => void;
  /** Reenvía tal cual. Devuelve null si el servidor confirmó, o el error. */
  onReenviar: (b: Borrador) => Promise<string | null>;
  /** Para un conflicto: reenvía aplicando lo escrito sobre la versión actual. */
  onAplicarSobreActual: (b: Borrador) => Promise<string | null>;
  onDescartar: (b: Borrador) => void;
}

// Lista de lo que NO llegó al servidor (FR-028). Reemplaza al simulador de
// sincronización: acá nada dice "sincronizado" hasta que el servidor confirma.
export function BorradoresModal({
  borradores,
  isOnline,
  onClose,
  onReenviar,
  onAplicarSobreActual,
  onDescartar,
}: BorradoresModalProps) {
  const [enCurso, setEnCurso] = useState<string | null>(null);

  const correr = async (b: Borrador, f: (b: Borrador) => Promise<string | null>) => {
    setEnCurso(b.clave);
    await f(b);
    setEnCurso(null);
  };

  const descartar = (b: Borrador) => {
    if (confirm(`¿Descartar "${b.descripcion}"? Lo escrito se borra de este dispositivo y no se puede recuperar.`)) {
      onDescartar(b);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <CloudUpload className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold">No enviados</h2>
              <p className="text-xs text-slate-400">Guardado en este dispositivo, todavía no en el servidor</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {!isOnline && (
            <p className="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2 flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0" />
              Sin conexión. Podés reenviar cuando vuelva la señal; mientras tanto, lo escrito está a salvo acá.
            </p>
          )}

          {borradores.length === 0 && (
            <p className="text-sm text-slate-600 text-center py-6">No hay nada pendiente: todo lo guardado llegó al servidor.</p>
          )}

          {borradores.map((b) => {
            const ocupado = enCurso === b.clave;
            const conflicto = b.tipoError === 'conflicto';
            const invalido = b.tipoError === 'invalido';
            return (
              <div key={b.clave} className="border border-slate-200 rounded-xl p-3 space-y-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{b.descripcion}</p>
                  <p className="text-[11px] text-slate-500">
                    Guardado el {new Date(b.creadoEn).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
                <p className={`text-xs flex items-start gap-1.5 ${conflicto || invalido ? 'text-rose-700' : 'text-amber-800'}`}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    {b.ultimoError}
                    {conflicto && ' Podés aplicar lo tuyo sobre la versión actual o descartarlo.'}
                    {invalido && ' Hay que corregirlo: volvé a cargarlo desde el formulario y descartá este borrador.'}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {!invalido && (
                    <button
                      type="button"
                      disabled={ocupado || !isOnline}
                      onClick={() => correr(b, conflicto ? onAplicarSobreActual : onReenviar)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      {conflicto ? 'Aplicar sobre la versión actual' : 'Reenviar'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => descartar(b)}
                    className="px-3 py-2 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    Descartar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

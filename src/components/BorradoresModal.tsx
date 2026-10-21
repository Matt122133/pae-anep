import React, { useState } from 'react';
import { X, CloudUpload, Trash2, Loader2, AlertTriangle, WifiOff, RefreshCw, Pencil, Save } from 'lucide-react';
import type { Borrador } from '../services/borradores';
import { fechaCorta } from '../services/fechas';

interface BorradoresModalProps {
  borradores: Borrador[];
  /** Cuenta de la sesión: los de otra cuenta se muestran aparte y no se envían (FR-014). */
  cuentaId: string;
  isOnline: boolean;
  onClose: () => void;
  /** Reenvía tal cual. Devuelve null si el servidor confirmó, o el error. */
  onReenviar: (b: Borrador) => Promise<string | null>;
  /** Para un conflicto: reenvía aplicando lo escrito sobre la versión actual. */
  onAplicarSobreActual: (b: Borrador) => Promise<string | null>;
  onDescartar: (b: Borrador) => void;
  /** Abre el borrador en su formulario (visita, personal, incidencia, escuela). */
  onEditar: (b: Borrador) => void;
  /** Guarda una nota editada acá mismo; vuelve a quedar pendiente. */
  onGuardarNota: (b: Borrador, summary: string, notes: string) => void;
}

type CuerpoNota = { summary?: string; notes?: string };

/** Los que tienen formulario. Bajas, borrados y traslados solo se reenvían o descartan. */
export function seEditaEnFormulario(b: Borrador): boolean {
  return /^(visita|personal|incidencia|escuela):/.test(b.clave);
}

// Lista de lo que NO llegó al servidor (FR-028). Se envía sola al haber
// conexión (006); acá nada dice "enviado" hasta que el servidor confirma. Cada
// elemento es un borrador: se puede editar, reenviar ya o descartar.
export function BorradoresModal({
  borradores,
  cuentaId,
  isOnline,
  onClose,
  onReenviar,
  onAplicarSobreActual,
  onDescartar,
  onEditar,
  onGuardarNota,
}: BorradoresModalProps) {
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [nota, setNota] = useState<{ clave: string; summary: string; notes: string } | null>(null);

  const mios = borradores.filter((b) => b.cuentaId === cuentaId);
  const deOtra = borradores.filter((b) => b.cuentaId !== cuentaId);

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

  const botonDescartar = (b: Borrador) => (
    <button
      type="button"
      disabled={enCurso === b.clave}
      onClick={() => descartar(b)}
      className="px-3 py-2 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1.5"
    >
      <Trash2 className="w-4 h-4" />
      Descartar
    </button>
  );

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
              Sin conexión. Se envían solos cuando vuelva la señal; mientras tanto, lo escrito está a salvo acá.
            </p>
          )}

          {mios.length === 0 && (
            <p className="text-sm text-slate-600 text-center py-6">No hay nada pendiente: todo lo guardado llegó al servidor.</p>
          )}

          {mios.map((b) => {
            const ocupado = enCurso === b.clave;
            const rechazado = b.estado === 'rechazado';
            const conflicto = rechazado && b.tipoError === 'conflicto';
            const editandoNota = nota?.clave === b.clave;
            const cuerpoNota = b.cuerpo as CuerpoNota;
            return (
              <div key={b.clave} className={`border rounded-xl p-3 space-y-2 ${rechazado ? 'border-rose-200' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{b.descripcion}</p>
                    <p className="text-[11px] text-slate-500">Guardado el {fechaCorta(b.actualizadoEn ?? b.creadoEn)}</p>
                  </div>
                  {rechazado && (
                    <span className="text-[10px] font-black uppercase bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full shrink-0">
                      Para revisar
                    </span>
                  )}
                </div>

                {b.ultimoError && (
                  <p className={`text-xs flex items-start gap-1.5 ${rechazado ? 'text-rose-700' : 'text-amber-800'}`}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      {b.ultimoError}
                      {conflicto && ' Podés aplicar lo tuyo sobre la versión actual, editarlo o descartarlo.'}
                      {rechazado && !conflicto && ' Editalo para corregirlo y se vuelve a enviar.'}
                    </span>
                  </p>
                )}

                {editandoNota && (
                  <div className="space-y-2">
                    <input
                      value={nota.summary}
                      onChange={(e) => setNota({ ...nota, summary: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      aria-label="Resumen de la nota"
                    />
                    <textarea
                      value={nota.notes}
                      onChange={(e) => setNota({ ...nota, notes: e.target.value })}
                      rows={3}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      aria-label="Texto de la nota"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {editandoNota ? (
                    <>
                      <button
                        type="button"
                        disabled={!nota.summary.trim()}
                        onClick={() => {
                          onGuardarNota(b, nota.summary.trim(), nota.notes.trim());
                          setNota(null);
                        }}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <Save className="w-4 h-4" />
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setNota(null)}
                        className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      {(seEditaEnFormulario(b) || b.clave.startsWith('nota:')) && (
                        <button
                          type="button"
                          disabled={ocupado}
                          onClick={() =>
                            b.clave.startsWith('nota:')
                              ? setNota({ clave: b.clave, summary: cuerpoNota.summary ?? '', notes: cuerpoNota.notes ?? '' })
                              : onEditar(b)
                          }
                          className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5"
                        >
                          <Pencil className="w-4 h-4" />
                          Editar
                        </button>
                      )}
                      {(!rechazado || conflicto) && (
                        <button
                          type="button"
                          disabled={ocupado || !isOnline}
                          onClick={() => correr(b, conflicto ? onAplicarSobreActual : onReenviar)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                        >
                          {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          {conflicto ? 'Aplicar sobre la versión actual' : 'Enviar ahora'}
                        </button>
                      )}
                      {botonDescartar(b)}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {deOtra.length > 0 && (
            <div className="pt-2 space-y-2">
              <p className="text-xs font-bold text-slate-600">
                De otra cuenta: se guardaron con otra sesión en este dispositivo y no se envían con la tuya.
              </p>
              {deOtra.map((b) => (
                <div key={b.clave} className="border border-slate-200 bg-slate-50 rounded-xl p-3 space-y-2">
                  <div>
                    <p className="text-sm font-bold text-slate-700">{b.descripcion}</p>
                    <p className="text-[11px] text-slate-500">Guardado el {fechaCorta(b.actualizadoEn ?? b.creadoEn)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">{botonDescartar(b)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

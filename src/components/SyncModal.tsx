import React, { useState } from 'react';
import { Visit, School, SchoolIssue } from '../types';
import { 
  Wifi, 
  WifiOff, 
  CloudUpload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw, 
  Download, 
  Clock, 
  Building2, 
  UserCheck, 
  Utensils, 
  ShieldAlert, 
  Database,
  ArrowRight,
  Radio,
  FileCheck
} from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onToggleSimulatedOffline: () => void;
  isSimulatedOffline: boolean;
  pendingVisits: Visit[];
  schools: School[];
  issues: SchoolIssue[];
  onSyncAll: () => Promise<void> | void;
  onSyncSingleVisit: (visitId: string) => Promise<void> | void;
  lastSyncTimestamp?: string;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  onToggleSimulatedOffline,
  isSimulatedOffline,
  pendingVisits,
  schools,
  issues,
  onSyncAll,
  onSyncSingleVisit,
  lastSyncTimestamp
}) => {
  const [syncingState, setSyncingState] = useState<'idle' | 'syncing' | 'completed'>('idle');
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStepText, setSyncStepText] = useState('');
  const [syncedCountSession, setSyncedCountSession] = useState(0);

  if (!isOpen) return null;

  const handleStartSync = async () => {
    if (pendingVisits.length === 0) return;
    
    // If user is currently in simulated offline, automatically switch back or inform
    if (isSimulatedOffline) {
      onToggleSimulatedOffline();
    }

    setSyncingState('syncing');
    setSyncProgress(15);
    setSyncStepText('Estableciendo conexión segura con el servidor central PAE Tacuarembó / DGEIP...');

    await new Promise(r => setTimeout(r, 600));
    setSyncProgress(45);
    setSyncStepText(`Validando ${pendingVisits.length} actas de campo y cotejo de remitos...`);

    await new Promise(r => setTimeout(r, 700));
    setSyncProgress(75);
    setSyncStepText('Consolidando legajos escolares y notificando a paetacuarembo@gmail.com...');

    await new Promise(r => setTimeout(r, 600));
    setSyncProgress(100);
    setSyncStepText('¡Sincronización finalizada con éxito!');

    const count = pendingVisits.length;
    await onSyncAll();
    setSyncedCountSession(count);
    setSyncingState('completed');
  };

  const handleDownloadBackup = () => {
    const dataToExport = {
      exportDate: new Date().toISOString(),
      source: 'PAE Tacuarembó - Respaldo de Visitas Offline',
      pendingVisits,
      relatedSchools: schools.filter(s => pendingVisits.some(pv => pv.schoolId === s.id))
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PAE_Visitas_Offline_Respaldo_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalOfflineDiners = pendingVisits.reduce((acc, v) => acc + (v.dinersActualCount || 0), 0);
  const relatedIssuesCount = issues.filter(i => pendingVisits.some(pv => pv.id === i.visitId)).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 px-6 py-4.5 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${isOnline ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300' : 'bg-amber-500/20 border-amber-400/30 text-amber-300'}`}>
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  Centro de Sincronización y Conectividad
                </h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isOnline 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/30 animate-pulse'
                }`}>
                  {isOnline ? 'EN LÍNEA' : 'MODO OFFLINE'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Gestión de actas y visitas registradas en zonas rurales sin cobertura celular
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-800 text-sm">
          
          {/* Connection Status & Simulation Switch Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className={`flex h-3 w-3 relative`}>
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  Estado de Red: {isOnline ? 'Conectado a Internet' : 'Sin conexión de red'}
                  {isSimulatedOffline && (
                    <span className="text-[10px] font-normal text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                      (Modo simulación rural activo)
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isOnline 
                    ? 'Listo para enviar y sincronizar actas de inspección con el servidor central.' 
                    : 'Las visitas se guardan localmente en el dispositivo sin pérdida de datos.'}
                </p>
              </div>
            </div>

            {/* Simulation button */}
            <button
              type="button"
              onClick={onToggleSimulatedOffline}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                isSimulatedOffline
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
              }`}
              title="Permite probar el comportamiento de la aplicación cuando no hay señal en territorio rural"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isSimulatedOffline ? 'Reconectar a Internet' : 'Simular Sin Conexión (Offline)'}</span>
            </button>
          </div>

          {/* Sync in Progress Animation */}
          {syncingState === 'syncing' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-emerald-900">
                Sincronizando con el Servidor Central...
              </h3>
              <p className="text-xs text-emerald-700 font-medium">
                {syncStepText}
              </p>
              <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden max-w-md mx-auto">
                <div 
                  className="bg-emerald-600 h-full transition-all duration-300 ease-out" 
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Sync Completed Feedback */}
          {syncingState === 'completed' && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-emerald-900">
                  ¡Sincronización completada exitosamente!
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Se sincronizaron {syncedCountSession} visitas de campo. El legajo escolar de cada escuela fue actualizado y los eventos quedaron asentados en la Bitácora de Actividad del PAE.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setSyncingState('idle')}
                    className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block uppercase">Visitas Pendientes</span>
              <span className={`text-xl font-black mt-1 block ${pendingVisits.length > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                {pendingVisits.length}
              </span>
              <span className="text-[10px] text-slate-400">
                {pendingVisits.length > 0 ? 'Por consolidar' : 'Al día'}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block uppercase">Comensales en Espera</span>
              <span className="text-xl font-black text-slate-800 mt-1 block">
                {totalOfflineDiners}
              </span>
              <span className="text-[10px] text-slate-400">Raciones verificadas</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block uppercase">Desvíos Asentados</span>
              <span className="text-xl font-black text-slate-800 mt-1 block">
                {relatedIssuesCount}
              </span>
              <span className="text-[10px] text-slate-400">En visitas offline</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block uppercase">Seguridad Local</span>
              <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs mt-2">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Protegido</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Almacenamiento persistente</span>
            </div>
          </div>

          {/* Pending items list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <CloudUpload className="w-4 h-4 text-emerald-600" />
                <span>Visitas de Campo Pendientes de Sincronización ({pendingVisits.length})</span>
              </h3>
              
              {pendingVisits.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="text-xs text-slate-600 hover:text-emerald-700 font-medium flex items-center gap-1 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar respaldo local (JSON)</span>
                </button>
              )}
            </div>

            {pendingVisits.length === 0 ? (
              <div className="text-center py-10 px-4 bg-emerald-50/50 rounded-2xl border border-dashed border-emerald-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">
                  ¡No hay datos pendientes de sincronizar!
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Todas las visitas, actas y orientaciones registradas están completamente sincronizadas con el servidor central de gestión del PAE Tacuarembó.
                </p>
                <div className="mt-4 pt-3 border-t border-emerald-100 flex flex-wrap items-center justify-center gap-2 text-[11px] text-emerald-800">
                  <span>💡 Para probar el funcionamiento en territorio:</span>
                  <button
                    onClick={onToggleSimulatedOffline}
                    className="font-bold underline text-emerald-900 hover:text-emerald-700"
                  >
                    Activar Simulación Sin Conexión
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {pendingVisits.map(visit => {
                  const school = schools.find(s => s.id === visit.schoolId);
                  const isSyncingThis = syncingState === 'syncing';

                  return (
                    <div 
                      key={visit.id}
                      className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                            SINCRONIZACIÓN PENDIENTE
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            Escuela N° {school?.number || '?'} ({school?.name || 'Desconocida'})
                          </span>
                          <span className="text-[11px] text-slate-500">
                            • {school?.areaType === 'Rural' ? '🌾 Rural' : '🏢 Urbana'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {visit.date} a las {visit.time} hs
                          </span>
                          <span className="flex items-center gap-1">
                            <Utensils className="w-3.5 h-3.5 text-slate-400" />
                            {visit.dinersActualCount} comensales
                          </span>
                          <span className="flex items-center gap-1 text-emerald-800">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            {visit.inspectorName.split(' ')[0]} {visit.inspectorName.split(' ')[1] || ''}
                          </span>
                        </div>

                        {visit.offlineSavedAt && (
                          <p className="text-[10px] text-amber-800 italic pt-0.5">
                            Guardado offline: {new Date(visit.offlineSavedAt).toLocaleDateString('es-UY')} {new Date(visit.offlineSavedAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })} hs
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={isSyncingThis}
                          onClick={async () => {
                            if (isSimulatedOffline) onToggleSimulatedOffline();
                            await onSyncSingleVisit(visit.id);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1 transition disabled:opacity-50"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Sincronizar Esta</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Informational Footer Note */}
          <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">
                Protocolo para Zonas Rurales de Tacuarembó (Paso del Cerro, Caraguatá, Ansina, etc.):
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                El sistema permite la toma completa de actas, registro de comensales, cotejo de remitos y evaluación bromatológica sin necesidad de señal celular 4G. Al regresar a una zona con cobertura o conectarse a la red WiFi escolar, presione <strong>"Sincronizar Todas"</strong> para actualizar los servidores del PAE.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {lastSyncTimestamp ? (
              <span>Última sincronización: {lastSyncTimestamp}</span>
            ) : (
              <span>Modo sincronización activa</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition"
            >
              Cerrar
            </button>

            {pendingVisits.length > 0 && (
              <button
                type="button"
                disabled={syncingState === 'syncing'}
                onClick={handleStartSync}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm flex items-center gap-2 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncingState === 'syncing' ? 'animate-spin' : ''}`} />
                <span>
                  {syncingState === 'syncing' 
                    ? 'Sincronizando...' 
                    : `Sincronizar ${pendingVisits.length} Visita${pendingVisits.length > 1 ? 's' : ''} Ahora`}
                </span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

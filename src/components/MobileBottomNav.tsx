import React from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Calendar, 
  PlusCircle, 
  History,
  AlertCircle,
  WifiOff,
  CloudUpload
} from 'lucide-react';
import { fechaCorta } from '../services/fechas';

interface MobileBottomNavProps {
  currentView: 'dashboard' | 'schools' | 'school-detail';
  dashboardTab?: 'overview' | 'calendar' | 'bitacora';
  onNavigate: (view: 'dashboard' | 'schools', tab?: 'overview' | 'calendar' | 'bitacora') => void;
  onOpenNewSchoolModal: () => void;
  onOpenExportModal: () => void;
  totalAlerts: number;
  isOnline?: boolean;
  borradoresCount?: number;
  onOpenBorradores?: () => void;
  /** Con valor, se muestra la copia del dispositivo recibida en esa fecha (006). */
  copiaDel?: string | null;
  enviando?: boolean;
  rechazados?: number;
  /** No enviados de otra cuenta en este dispositivo: se avisan, no se envían (FR-014). */
  deOtraCuenta?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  dashboardTab = 'overview',
  onNavigate,
  onOpenNewSchoolModal,
  onOpenExportModal,
  totalAlerts,
  isOnline = true,
  borradoresCount = 0,
  onOpenBorradores,
  copiaDel = null,
  enviando = false,
  rechazados = 0,
  deOtraCuenta = 0
}) => {
  const sinConexion = !isOnline || !!copiaDel;
  const isDashboardActive = currentView === 'dashboard' && dashboardTab === 'overview';
  const isCalendarActive = currentView === 'dashboard' && dashboardTab === 'calendar';
  const isBitacoraActive = currentView === 'dashboard' && dashboardTab === 'bitacora';
  const isSchoolsActive = currentView === 'schools' || currentView === 'school-detail';

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 text-white md:hidden shadow-lg pb-safe">
      {/* Mini Offline / Sync Status strip above nav bar on mobile */}
      {(sinConexion || borradoresCount > 0 || deOtraCuenta > 0) && (
        <div 
          onClick={onOpenBorradores}
          className="bg-amber-500 text-slate-950 px-3 py-1 text-[11px] font-extrabold flex items-center justify-between cursor-pointer border-b border-amber-600 shadow-xs"
        >
          <div className="flex items-center gap-1.5 truncate">
            {sinConexion ? (
              <WifiOff className="w-3.5 h-3.5 shrink-0 animate-pulse" />
            ) : (
              <CloudUpload className={`w-3.5 h-3.5 shrink-0 ${enviando ? 'animate-pulse' : ''}`} />
            )}
            <span className="truncate">
              {sinConexion
                ? copiaDel ? `Sin conexión — datos del ${fechaCorta(copiaDel)}` : 'Sin conexión: lo que guardes queda como no enviado'
                : enviando ? 'Enviando…'
                : borradoresCount > 0 ? `${borradoresCount} no enviado${borradoresCount > 1 ? 's' : ''}`
                : `${deOtraCuenta} de otra cuenta: no se envían con tu sesión`}
            </span>
          </div>
          <span className="text-[10px] bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded font-black shrink-0">
            {rechazados > 0 ? `${rechazados} PARA REVISAR` : borradoresCount > 0 ? `${borradoresCount} NO ENVIADOS` : sinConexion ? 'SIN CONEXIÓN' : 'OTRA CUENTA'}
          </span>
        </div>
      )}

      <nav className="flex items-center justify-around h-16 px-1">
        {/* 1. Dashboard / Panel */}
        <button
          type="button"
          onClick={() => onNavigate('dashboard', 'overview')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition ${
            isDashboardActive 
              ? 'text-emerald-400 font-bold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <LayoutDashboard className={`w-5 h-5 ${isDashboardActive ? 'scale-110' : ''} transition-transform`} />
            {isDashboardActive && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 leading-none tracking-tight">Panel</span>
        </button>

        {/* 2. Escuelas */}
        <button
          type="button"
          onClick={() => onNavigate('schools')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition ${
            isSchoolsActive 
              ? 'text-emerald-400 font-bold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Building2 className={`w-5 h-5 ${isSchoolsActive ? 'scale-110' : ''} transition-transform`} />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {totalAlerts > 9 ? '9+' : totalAlerts}
              </span>
            )}
            {isSchoolsActive && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 leading-none tracking-tight">Escuelas</span>
        </button>

        {/* 3. Calendario de Visitas */}
        <button
          type="button"
          onClick={() => onNavigate('dashboard', 'calendar')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition ${
            isCalendarActive 
              ? 'text-emerald-400 font-bold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Calendar className={`w-5 h-5 ${isCalendarActive ? 'scale-110' : ''} transition-transform`} />
            {isCalendarActive && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 leading-none tracking-tight">Agenda</span>
        </button>

        {/* 4. Bitácora de Actividad */}
        <button
          type="button"
          onClick={() => onNavigate('dashboard', 'bitacora')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition ${
            isBitacoraActive 
              ? 'text-emerald-400 font-bold' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <History className={`w-5 h-5 ${isBitacoraActive ? 'scale-110' : ''} transition-transform`} />
            {isBitacoraActive && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 leading-none tracking-tight">Bitácora</span>
        </button>

        {/* 5. Nueva Escuela / Registro */}
        <button
          type="button"
          onClick={onOpenNewSchoolModal}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-slate-400 hover:text-emerald-400 transition"
        >
          <PlusCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-[10px] mt-1 leading-none tracking-tight">+ Escuela</span>
        </button>
      </nav>
    </div>
  );
};

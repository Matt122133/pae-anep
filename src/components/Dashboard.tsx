import React, { useState } from 'react';
import { School, StaffMember, Visit, SchoolIssue, ActivityLog } from '../types';
import { getHealthCardStatus } from '../services/storage';
import { 
  Building2, 
  Users, 
  ClipboardCheck, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  ArrowUpRight, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Calendar, 
  LayoutDashboard, 
  Route, 
  Droplets, 
  Milk, 
  Eye, 
  CalendarCheck,
  History,
  Sparkles,
  Wifi,
  WifiOff,
  CloudUpload,
  RefreshCw,
  Radio
} from 'lucide-react';
import { VisitCalendar } from './VisitCalendar';
import { IndicatorsSummary } from './IndicatorsSummary';
import { ActivityLogView } from './ActivityLogView';

interface DashboardProps {
  schools: School[];
  staff: StaffMember[];
  visits: Visit[];
  issues: SchoolIssue[];
  activityLogs?: ActivityLog[];
  onAddManualLog?: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  onSelectSchool: (school: School) => void;
  onNavigateToSchools: (filter?: string) => void;
  onOpenNewSchoolModal: () => void;
  onOpenExportModal: () => void;
  onOpenReport?: (school: School) => void;
  onOpenNewVisit?: (school: School, defaultDate?: string, defaultTime?: string) => void;
  onSaveScheduledVisit: (visit: Visit) => void;
  onDeleteVisit?: (visitId: string) => void;
  dashboardTab?: 'overview' | 'calendar' | 'bitacora';
  onTabChange?: (tab: 'overview' | 'calendar' | 'bitacora') => void;
  activeUserId?: string;
  isOnline?: boolean;
  onOpenSyncModal?: () => void;
  onToggleSimulatedOffline?: () => void;
  isSimulatedOffline?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  schools,
  staff,
  visits,
  issues,
  activityLogs = [],
  onAddManualLog,
  onSelectSchool,
  onNavigateToSchools,
  onOpenNewSchoolModal,
  onOpenExportModal,
  onOpenReport,
  onOpenNewVisit,
  onSaveScheduledVisit,
  onDeleteVisit,
  dashboardTab,
  onTabChange,
  activeUserId = 'valentina',
  isOnline = true,
  onOpenSyncModal,
  onToggleSimulatedOffline,
  isSimulatedOffline = false
}) => {
  const [internalTab, setInternalTab] = useState<'overview' | 'calendar' | 'bitacora'>('overview');
  const activeTab = dashboardTab ?? internalTab;

  const handleTabChange = (tab: 'overview' | 'calendar' | 'bitacora') => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // Today reference
  const todayStr = new Date().toISOString().slice(0, 10);

  // Separate scheduled vs completed visits
  const scheduledVisits = visits.filter(v => v.status === 'Programada' || (!v.status && v.date > todayStr));
  const completedVisits = visits.filter(v => v.status === 'Realizada' || (!v.status && v.date <= todayStr));

  // Calculations
  const totalSchools = schools.length;
  const visitedSchoolsCount = schools.filter(s => s.totalVisits > 0).length;
  const pendingVisitsCount = totalSchools - visitedSchoolsCount;
  
  // Pending sync visits (performed offline)
  const pendingSyncVisits = visits.filter(v => v.isOfflinePendingSync === true);
  
  // Health cards calculation
  const expiredCards = staff.filter(s => getHealthCardStatus(s.healthCardValidUntil) === 'expired');
  const warningCards = staff.filter(s => getHealthCardStatus(s.healthCardValidUntil) === 'warning');

  // Issues calculation
  const pendingIssues = issues.filter(i => i.status === 'Pendiente');
  const inProgressIssues = issues.filter(i => i.status === 'En Proceso');
  const resolvedIssues = issues.filter(i => i.status === 'Resuelto');

  // Unauthorized food items count
  const allUnauthorized = visits.flatMap(v => v.unauthorizedItemsList || []);

  // Schools with critical issues
  const schoolsWithIssues = schools.filter(s => s.activeIssuesCount > 0);

  // Institution breakdown for staff
  const staffByInstitution = {
    DGEIP: staff.filter(s => s.institutionType === 'DGEIP').length,
    Tercerizadas: staff.filter(s => s.institutionType === 'Empresa Tercerizada').length,
    Fomento: staff.filter(s => s.institutionType === 'Comisión Fomento').length,
    Aportes: staff.filter(s => s.institutionType === 'Aportes Patronales').length,
    Otras: staff.filter(s => s.institutionType === 'Otra Empresa').length,
  };

  // Recent completed visits
  const recentVisits = [...completedVisits]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  // Upcoming scheduled visits
  const upcomingScheduled = [...scheduledVisits]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 p-6 sm:p-8 text-white shadow-lg border border-emerald-800/30">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Sistema de Campo Activo • 140 Escuelas Monitoreadas
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Legajos y Control de Cocinas y Comedores Escolares
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
            Reemplaza las planillas en papel y centraliza las 140 escuelas de Tacuarembó: registro de visitas, itinerario mensual de campo, cotejo de remitos y supervisión de agua y lácteos.
          </p>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-2.5 pt-2">
            <button
              onClick={() => onNavigateToSchools()}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-extrabold rounded-xl shadow-sm transition flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Search className="w-4 h-4" />
              <span>Explorar las 140 Escuelas</span>
            </button>
            <button
              onClick={() => handleTabChange('calendar')}
              className="px-4 py-2.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 text-xs sm:text-sm font-bold rounded-xl border border-sky-400/40 transition flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Calendar className="w-4 h-4 text-sky-300" />
              <span>Calendario de Visitas</span>
              {scheduledVisits.length > 0 && (
                <span className="text-[10px] bg-sky-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                  {scheduledVisits.length}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('bitacora')}
              className="px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs sm:text-sm font-bold rounded-xl border border-emerald-400/30 transition flex items-center justify-center gap-2 min-h-[44px]"
            >
              <History className="w-4 h-4 text-emerald-300" />
              <span>Bitácora</span>
              {activityLogs.length > 0 && (
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                  {activityLogs.length}
                </span>
              )}
            </button>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <button
                onClick={onOpenNewSchoolModal}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold rounded-xl border border-white/20 transition flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Plus className="w-4 h-4 text-emerald-300" />
                <span>+ Escuela</span>
              </button>
              <button
                onClick={onOpenExportModal}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold rounded-xl border border-white/20 transition flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                <span>Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-emerald-600/15 blur-3xl pointer-events-none"></div>
      </div>

      {/* Resumen de Indicadores con Recharts */}
      <IndicatorsSummary
        schools={schools}
        issues={issues}
        visits={visits}
        onNavigateToSchools={onNavigateToSchools}
      />

      {/* Estado de Conectividad & Sincronización de Campo (Modo Offline) */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        !isOnline || pendingSyncVisits.length > 0
          ? 'bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-100/50 border-amber-300'
          : 'bg-white border-slate-200/90'
      }`}>
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`p-3 rounded-xl shrink-0 ${
            !isOnline 
              ? 'bg-amber-500 text-slate-950 animate-bounce' 
              : pendingSyncVisits.length > 0 
              ? 'bg-amber-100 text-amber-800' 
              : 'bg-emerald-100 text-emerald-800'
          }`}>
            {!isOnline ? (
              <WifiOff className="w-5 h-5" />
            ) : pendingSyncVisits.length > 0 ? (
              <CloudUpload className="w-5 h-5 text-amber-600 animate-pulse" />
            ) : (
              <Wifi className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-slate-900">
                Estado de Conectividad & Sincronización de Campo
              </h3>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                isOnline 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                  : 'bg-amber-200 text-amber-950 border-amber-400'
              }`}>
                {isOnline ? '● EN LÍNEA' : '○ MODO OFFLINE (RURAL)'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {pendingSyncVisits.length > 0 ? (
                <span>
                  Hay <strong>{pendingSyncVisits.length} visita{pendingSyncVisits.length > 1 ? 's' : ''}</strong> de campo realizada{pendingSyncVisits.length > 1 ? 's' : ''} sin conexión pendiente{pendingSyncVisits.length > 1 ? 's' : ''} de sincronizar con el servidor central PAE Tacuarembó.
                </span>
              ) : (
                <span>
                  Todas las actas, remitos e inspecciones del departamento están consolidadas y sincronizadas al día.
                </span>
              )}
            </p>
            {pendingSyncVisits.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-500 font-semibold">Escuelas con visitas offline:</span>
                {pendingSyncVisits.map(pv => {
                  const sc = schools.find(s => s.id === pv.schoolId);
                  return (
                    <button
                      key={pv.id}
                      onClick={() => sc && onSelectSchool(sc)}
                      className="text-[10px] bg-white hover:bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-amber-300 font-bold transition flex items-center gap-1"
                    >
                      <span>Escuela N° {sc?.number || '?'}</span>
                      <ChevronRight className="w-2.5 h-2.5 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          {onToggleSimulatedOffline && (
            <button
              type="button"
              onClick={onToggleSimulatedOffline}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 shadow-2xs transition flex items-center gap-1.5"
              title="Permite simular la pérdida de cobertura en territorio rural"
            >
              <Radio className="w-3.5 h-3.5 text-slate-500" />
              <span>{isSimulatedOffline ? 'Reconectar Online' : 'Simular Modo Offline'}</span>
            </button>
          )}

          {onOpenSyncModal && (
            <button
              type="button"
              onClick={onOpenSyncModal}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                pendingSyncVisits.length > 0
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>
                {pendingSyncVisits.length > 0 
                  ? `Sincronizar ${pendingSyncVisits.length} Pendiente${pendingSyncVisits.length > 1 ? 's' : ''}` 
                  : 'Centro de Sincronización'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Schools */}
        <div 
          onClick={() => onNavigateToSchools('all')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-500 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Universo Escolar</span>
            <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{totalSchools}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{visitedSchoolsCount} con visitas</span>
            <span className="font-semibold text-emerald-600">
              {Math.round((visitedSchoolsCount / totalSchools) * 100)}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${(visitedSchoolsCount / totalSchools) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Total Staff & Health Card Alerts */}
        <div 
          onClick={() => onNavigateToSchools('carne_alert')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-500 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Auxiliares de Cocina</span>
            <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-amber-50 group-hover:text-amber-700 transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{staff.length}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            {expiredCards.length > 0 ? (
              <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[11px]">
                {expiredCards.length} carné vencido
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold">Carnés al día</span>
            )}
            {warningCards.length > 0 && (
              <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                {warningCards.length} por vencer
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-3 flex items-center justify-between">
            <span>DGEIP: {staffByInstitution.DGEIP}</span>
            <span>Tercerizadas: {staffByInstitution.Tercerizadas}</span>
          </div>
        </div>

        {/* Visitas & Itinerario */}
        <div 
          onClick={() => handleTabChange('calendar')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-sky-500 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Itinerario y Visitas</span>
            <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-sky-50 group-hover:text-sky-700 transition">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-teal-800">{completedVisits.length}</span>
            <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
              +{scheduledVisits.length} en agenda
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            <span>{pendingVisitsCount} escuelas por visitar este ciclo</span>
          </div>
          <div className="text-[11px] text-sky-700 font-bold mt-3 flex items-center gap-1 group-hover:translate-x-0.5 transition">
            <span>Abrir Calendario Mensual</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Observaciones y Problemas */}
        <div 
          onClick={() => onNavigateToSchools('issues')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-rose-500 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Seguimiento Casos</span>
            <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-rose-50 group-hover:text-rose-700 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-700">{pendingIssues.length}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span className="text-amber-600 font-semibold">{inProgressIssues.length} en proceso</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold">{resolvedIssues.length} resueltos</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-3">
            {allUnauthorized.length > 0 ? (
              <span className="text-rose-600 font-bold">
                {allUnauthorized.length} compras no autorizadas
              </span>
            ) : (
              <span className="text-emerald-600">Sin compras ilegales</span>
            )}
          </div>
        </div>
      </div>

      {/* Main View Switcher Tabs: Overview vs Calendario de Visitas vs Bitácora */}
      <div className="bg-slate-200/70 p-1.5 rounded-2xl flex items-center gap-1 max-w-xl">
        <button
          onClick={() => handleTabChange('overview')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Resumen y Alertas</span>
        </button>

        <button
          onClick={() => handleTabChange('calendar')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
            activeTab === 'calendar'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Calendario</span>
          {scheduledVisits.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'calendar' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-900'
            }`}>
              {scheduledVisits.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('bitacora')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
            activeTab === 'bitacora'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className={`w-4 h-4 ${activeTab === 'bitacora' ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span>Bitácora de Actividad</span>
          {activityLogs.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'bitacora' ? 'bg-emerald-400 text-slate-950' : 'bg-slate-300 text-slate-800'
            }`}>
              {activityLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: OVERVIEW (Resumen Ejecutivo y Casos Críticos) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Field Itinerary Highlight Banner in Overview */}
          <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-emerald-950 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-sky-800/40">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">
                  Itinerario de Campo Programado
                </span>
                <span className="text-[10px] bg-sky-500/20 border border-sky-400/30 text-sky-200 px-2 py-0.5 rounded-full font-bold">
                  {scheduledVisits.length} visitas en agenda
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Planifica las rutas de las Ecónomas y coordina con los inspectores de zona para el seguimiento de comedores rurales y urbanos.
              </p>
            </div>

            <button
              onClick={() => handleTabChange('calendar')}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <span>Ver Calendario Mensual</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Escuelas Prioritarias / Con Problemas Abiertos */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                      Escuelas con Observaciones o Casos Pendientes de Resolución
                    </h2>
                    <p className="text-xs text-slate-500">
                      Requieren seguimiento en la próxima visita para verificar si se resolvieron los desvíos.
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigateToSchools('issues')}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    Ver todas ({schoolsWithIssues.length})
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {schoolsWithIssues.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                    ¡Excelente! No hay escuelas con problemas pendientes en este momento.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schoolsWithIssues.slice(0, 5).map(s => {
                      const schoolIssues = issues.filter(i => i.schoolId === s.id && i.status !== 'Resuelto');
                      return (
                        <div
                          key={s.id}
                          onClick={() => onSelectSchool(s)}
                          className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-slate-50/50 transition cursor-pointer flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900">
                                Escuela N° {s.number} - {s.name}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                s.areaType === 'Rural' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                              }`}>
                                {s.areaType}
                              </span>
                              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                                {s.activeIssuesCount} caso(s)
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {s.zone} • Directora: {s.principalName}
                            </p>
                            <div className="text-xs text-slate-700 pt-1">
                              <strong>Observación principal:</strong>{' '}
                              {schoolIssues[0]?.title || 'Ver legajo'}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg group-hover:bg-emerald-100 transition">
                              Abrir Legajo
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Staff Distribution by Institution */}
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  Distribución de Auxiliares por Régimen Contractual
                </h3>
                <p className="text-xs text-slate-500">
                  Personal de cocina relevado según pertenencia (DGEIP, empresas contratadas, comisión fomento).
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
                    <span className="text-xs text-blue-900 font-bold block">DGEIP</span>
                    <span className="text-2xl font-black text-blue-700">{staffByInstitution.DGEIP}</span>
                    <span className="text-[10px] text-blue-600 block mt-0.5">Presupuestadas</span>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
                    <span className="text-xs text-purple-900 font-bold block">Tercerizadas</span>
                    <span className="text-2xl font-black text-purple-700">{staffByInstitution.Tercerizadas}</span>
                    <span className="text-[10px] text-purple-600 block mt-0.5">Licitaciones</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                    <span className="text-xs text-amber-900 font-bold block">Comisión Fomento</span>
                    <span className="text-2xl font-black text-amber-700">{staffByInstitution.Fomento}</span>
                    <span className="text-[10px] text-amber-600 block mt-0.5">Apoyo escolar</span>
                  </div>
                  <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-center">
                    <span className="text-xs text-teal-900 font-bold block">Aportes / Otras</span>
                    <span className="text-2xl font-black text-teal-700">
                      {staffByInstitution.Aportes + staffByInstitution.Otras}
                    </span>
                    <span className="text-[10px] text-teal-600 block mt-0.5">Convenios</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Upcoming Itinerary + Alertas de Carnés */}
            <div className="space-y-6">
              
              {/* Upcoming Itinerary Widget */}
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Route className="w-4 h-4 text-sky-600" />
                    Próximas Visitas en Itinerario
                  </h3>
                  <button
                    onClick={() => handleTabChange('calendar')}
                    className="text-xs font-bold text-sky-700 hover:text-sky-900"
                  >
                    Ver todas
                  </button>
                </div>

                {upcomingScheduled.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay visitas programadas próximas.</p>
                ) : (
                  <div className="space-y-2.5">
                    {upcomingScheduled.map(v => {
                      const sc = schools.find(s => s.id === v.schoolId);
                      return (
                        <div
                          key={v.id}
                          onClick={() => handleTabChange('calendar')}
                          className="p-3 bg-sky-50/70 hover:bg-sky-100/80 rounded-xl border border-sky-200 text-xs cursor-pointer transition space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sky-950">
                              Escuela N° {sc?.number} — {sc?.name}
                            </span>
                            <span className="text-[10px] bg-sky-200 text-sky-900 font-black px-1.5 py-0.5 rounded">
                              {v.date.slice(5)} ({v.time})
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] truncate">
                            {v.itineraryNotes || sc?.zone}
                          </p>
                          {v.scheduledObjective && (
                            <p className="text-sky-900 text-[11px] italic truncate">
                              Obj: {v.scheduledObjective}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Health Card Expiration Alert */}
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Alertas Sanitarias de Auxiliares
                  </h3>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                    {expiredCards.length + warningCards.length} alertas
                  </span>
                </div>

                {expiredCards.length === 0 && warningCards.length === 0 ? (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Todos los carnés de salud se encuentran vigentes.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {expiredCards.map(st => {
                      const sc = schools.find(s => s.id === st.schoolId);
                      return (
                        <div 
                          key={st.id} 
                          onClick={() => sc && onSelectSchool(sc)}
                          className="p-3 bg-rose-50 hover:bg-rose-100/80 rounded-xl border border-rose-200 text-xs cursor-pointer transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-950">{st.fullName}</span>
                            <span className="text-[10px] bg-rose-200 text-rose-900 font-extrabold px-1.5 py-0.5 rounded">
                              VENCIDO
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1">
                            Escuela N° {sc?.number} • {st.role} ({st.institutionType})
                          </p>
                          <p className="text-rose-700 font-semibold mt-0.5">
                            Venció: {st.healthCardValidUntil}
                          </p>
                        </div>
                      );
                    })}

                    {warningCards.map(st => {
                      const sc = schools.find(s => s.id === st.schoolId);
                      return (
                        <div 
                          key={st.id} 
                          onClick={() => sc && onSelectSchool(sc)}
                          className="p-3 bg-amber-50 hover:bg-amber-100/80 rounded-xl border border-amber-200 text-xs cursor-pointer transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-950">{st.fullName}</span>
                            <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-1.5 py-0.5 rounded">
                              POR VENCER
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1">
                            Escuela N° {sc?.number} • {st.role}
                          </p>
                          <p className="text-amber-800 font-semibold mt-0.5">
                            Vence: {st.healthCardValidUntil}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Visits Feed */}
              <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Últimas Visitas Realizadas
                </h3>

                {recentVisits.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay visitas recientes registradas.</p>
                ) : (
                  <div className="space-y-3">
                    {recentVisits.map(v => {
                      const sc = schools.find(s => s.id === v.schoolId);
                      return (
                        <div
                          key={v.id}
                          onClick={() => sc && onSelectSchool(sc)}
                          className="p-3 bg-slate-50 hover:bg-emerald-50/60 rounded-xl border border-slate-200 hover:border-emerald-300 text-xs cursor-pointer transition space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">
                              Escuela N° {sc?.number} (Visita #{v.visitNumber})
                            </span>
                            <span className="text-slate-500 font-medium">{v.date}</span>
                          </div>
                          <p className="text-slate-600 truncate">
                            {v.inspectorName}
                          </p>
                          <p className="text-emerald-800 font-medium truncate">
                            Menú: {v.menuServed}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
          {/* Quick Bitácora Summary in Overview */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Bitácora de Actividad Reciente en Legajos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Últimas modificaciones, actualizaciones de comedores y resoluciones de casos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('bitacora')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                <span>Ver Bitácora Completa ({activityLogs.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {activityLogs.slice(0, 3).map(log => {
                const sc = schools.find(s => s.id === log.schoolId);
                return (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900">{log.userName}</span>
                        <span className="text-slate-400">•</span>
                        {log.schoolNumber && (
                          <span 
                            onClick={() => sc && onSelectSchool(sc)}
                            className="font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            Escuela N° {log.schoolNumber}
                          </span>
                        )}
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{new Date(log.timestamp).toLocaleDateString('es-UY', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="font-medium text-slate-700 truncate">{log.summary}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto shrink-0">
                      {log.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CALENDARIO DE VISITAS E ITINERARIO */}
      {activeTab === 'calendar' && (
        <VisitCalendar
          schools={schools}
          visits={visits}
          onSelectSchool={onSelectSchool}
          onOpenReport={onOpenReport}
          onOpenNewVisit={onOpenNewVisit}
          onSaveScheduledVisit={onSaveScheduledVisit}
          onDeleteVisit={onDeleteVisit}
          activeUserId={activeUserId}
        />
      )}

      {/* TAB 3: BITÁCORA DE ACTIVIDAD */}
      {activeTab === 'bitacora' && (
        <ActivityLogView
          logs={activityLogs}
          schools={schools}
          onSelectSchool={onSelectSchool}
          onAddManualLog={onAddManualLog}
          activeUserId={activeUserId}
        />
      )}

    </div>
  );
};

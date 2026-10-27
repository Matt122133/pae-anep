import React, { useState } from 'react';
import { School, StaffMember, Visit, SchoolIssue, ActivityLog } from '../types';
import { formatHealthCardBadge, getHealthCardStatus } from '../services/storage';
import { SchoolReportModal } from './SchoolReportModal';
import { ActivityLogView } from './ActivityLogView';
import { 
  Building2, 
  Users, 
  ClipboardCheck, 
  AlertTriangle, 
  UtensilsCrossed, 
  Printer, 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  FileText, 
  ArrowLeft,
  Sparkles,
  ChevronRight,
  Info,
  Download,
  Settings2,
  ShieldCheck,
  UserCheck,
  Droplets,
  Milk,
  History,
  CloudUpload,
  WifiOff,
  RefreshCw
} from 'lucide-react';

interface SchoolDetailProps {
  school: School;
  staff: StaffMember[];
  visits: Visit[];
  issues: SchoolIssue[];
  activityLogs?: ActivityLog[];
  onAddManualLog?: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  activeUserId?: string;
  onBack: () => void;
  onEditSchool: (school: School) => void;
  onOpenNewVisit: () => void;
  onOpenAddStaff: () => void;
  onEditStaff: (staff: StaffMember) => void;
  onDeleteStaff: (staffId: string) => void;
  onOpenAddIssue: () => void;
  onEditIssue: (issue: SchoolIssue) => void;
  onDeleteIssue: (issueId: string) => void;
  onToggleIssueStatus: (issueId: string) => void;
  isOnline?: boolean;
}

export type SchoolSubcategory = 
  | 'ficha' 
  | 'auxiliares' 
  | 'visitas' 
  | 'seguimiento' 
  | 'remitos_alimentos' 
  | 'acta_impresion'
  | 'bitacora';

export const SchoolDetail: React.FC<SchoolDetailProps> = ({
  school,
  staff,
  visits,
  issues,
  activityLogs = [],
  onAddManualLog,
  activeUserId,
  onBack,
  onEditSchool,
  onOpenNewVisit,
  onOpenAddStaff,
  onEditStaff,
  onDeleteStaff,
  onOpenAddIssue,
  onEditIssue,
  onDeleteIssue,
  onToggleIssueStatus,
  isOnline = true,
}) => {
  const [activeTab, setActiveTab] = useState<SchoolSubcategory>('ficha');
  const [selectedVisitForActa, setSelectedVisitForActa] = useState<string>(
    visits.length > 0 ? visits[visits.length - 1].id : ''
  );
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportPreviewMode, setReportPreviewMode] = useState<'integral' | 'acta'>('integral');

  // Filter issues
  const pendingIssues = issues.filter(i => i.status !== 'Resuelto');
  const resolvedIssues = issues.filter(i => i.status === 'Resuelto');

  // Count visits pending offline synchronization for this school

  // Logs for this specific school
  const schoolLogs = (activityLogs || []).filter(l => l.schoolId === school.id);

  // Count unauthorized food alerts in this school
  const allUnauthorized = visits.flatMap(v => v.unauthorizedItemsList || []);

  const currentActaVisit = visits.find(v => v.id === selectedVisitForActa) || visits[visits.length - 1];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Breadcrumb & School Header Banner */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Directorio de Escuelas
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold bg-white text-slate-900 hover:bg-emerald-50 hover:text-emerald-950 px-3.5 py-1.5 rounded-lg shadow-sm transition"
                title="Generar informe técnico imprimible o exportable a PDF con toda la información"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                Informe Completo / PDF
              </button>
              <button
                onClick={() => onEditSchool(school)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition"
              >
                <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                Editar Legajo
              </button>
              <button
                onClick={onOpenNewVisit}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Nueva Visita a Cocina
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                  Escuela N° {school.number}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  school.areaType === 'Rural' 
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30' 
                    : 'bg-blue-500/30 text-blue-200 border border-blue-400/30'
                }`}>
                  {school.areaType === 'Rural' ? '🌾 Escuela Rural' : '🏢 Escuela Urbana'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  school.modality === 'Tiempo Completo'
                    ? 'bg-purple-500/40 text-purple-200 border-purple-400/50'
                    : school.modality === 'Tiempo Extendido'
                    ? 'bg-indigo-500/40 text-indigo-200 border-indigo-400/50'
                    : school.modality === 'Escuelas de Educación Especial' || (school.modality as string) === 'Especial'
                    ? 'bg-rose-500/40 text-rose-200 border-rose-400/50'
                    : school.modality === 'Escuelas de Educación Artística (EDEA)'
                    ? 'bg-fuchsia-500/40 text-fuchsia-200 border-fuchsia-400/50'
                    : school.modality === 'TPA'
                    ? 'bg-cyan-500/40 text-cyan-200 border-cyan-400/50'
                    : 'bg-slate-700/80 text-slate-200 border-slate-600'
                }`}>
                  Modalidad: {school.modality}
                </span>
                <span className="text-xs text-slate-400">
                  Tacuarembó • {school.zone}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {school.name}
              </h1>
              
              {/* Tacuarembó Specific Highlights Bar */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300 mt-2">
                {school.assignedInspector && (
                  <span className="flex items-center gap-1 text-emerald-300 font-medium bg-white/10 px-2 py-0.5 rounded-md">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {school.assignedInspector}
                  </span>
                )}
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${
                  school.waterPurchaseAllowance 
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30' 
                    : 'bg-sky-500/20 text-sky-200'
                }`}>
                  <Droplets className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  {school.waterPurchaseAllowance ? 'Recibe Rubro Agua Potable' : 'Conexión Red OSE'}
                </span>
                <span className="flex items-center gap-1 bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-md">
                  <Milk className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  {school.milkProgramType} ({school.milkPowderKg} kg/mes)
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 mt-2 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {school.address || 'Sin dirección cargada'}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {school.phone || 'Sin teléfono'}
                </span>
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-white/10 p-3 rounded-xl backdrop-blur-xs border border-white/10 text-center shrink-0">
              <div className="px-2">
                <div className="text-lg sm:text-2xl font-black text-white">{visits.length}</div>
                <div className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">Visitas</div>
              </div>
              <div className="px-2 border-x border-white/10">
                <div className="text-lg sm:text-2xl font-black text-emerald-400">{staff.length}</div>
                <div className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">Auxiliares</div>
              </div>
              <div className="px-2">
                <div className={`text-lg sm:text-2xl font-black ${pendingIssues.length > 0 ? 'text-amber-400' : 'text-emerald-300'}`}>
                  {pendingIssues.length}
                </div>
                <div className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">Pendientes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Subcategory Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 overflow-x-auto scrollbar-none">
          {[
            { id: 'ficha', label: 'Ficha del Legajo', icon: Building2, count: null },
            { id: 'auxiliares', label: 'Auxiliares y Personal', icon: Users, count: staff.length },
            { 
              id: 'visitas', 
              label: 'Visitas de Campo', 
              icon: ClipboardCheck, 
              count: visits.length
            },
            { id: 'seguimiento', label: 'Seguimiento de Casos', icon: AlertTriangle, count: pendingIssues.length > 0 ? pendingIssues.length : null, alert: pendingIssues.length > 0 },
            { id: 'remitos_alimentos', label: 'Remitos y Alimentos', icon: UtensilsCrossed, count: allUnauthorized.length > 0 ? allUnauthorized.length : null, alert: allUnauthorized.length > 0 },
            { id: 'bitacora', label: 'Bitácora del Legajo', icon: History, count: schoolLogs.length > 0 ? schoolLogs.length : null },
            { id: 'acta_impresion', label: 'Informe y PDF', icon: Printer, count: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SchoolSubcategory)}
                className={`py-3.5 px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    tab.alert 
                      ? 'bg-rose-100 text-rose-800' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subcategory 1: Ficha General del Legajo */}
      {activeTab === 'ficha' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                Información Institucional del Comedor
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">Maestra Directora / Encargada</span>
                  <span className="font-semibold text-slate-900 text-base">{school.principalName || 'No asignada'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">Encargada de Cocina</span>
                  <span className="font-semibold text-slate-900 text-base">{school.headCookName || 'No asignada'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 sm:col-span-2">
                  <span className="text-xs text-slate-500 block">Proveedores</span>
                  <span className="font-semibold text-slate-900">
                    {school.providers?.length ? school.providers.join(', ') : 'Sin proveedores registrados'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">Correo Electrónico Institucional</span>
                  <span className="font-semibold text-slate-900">{school.email || 'Sin correo registrado'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">Ámbito Departamental</span>
                  <span className="font-semibold text-slate-900">{school.areaType} ({school.zone || 'Tacuarembó'})</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">Inspector/a de Escuela Asignado/a</span>
                  <span className="font-semibold text-slate-900">{school.assignedInspector || 'No asignado/a'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block">Modalidad de la Escuela</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      school.modality === 'Tiempo Completo'
                        ? 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold'
                        : school.modality === 'Tiempo Extendido'
                        ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                        : school.modality === 'Escuelas de Educación Especial' || (school.modality as string) === 'Especial'
                        ? 'bg-rose-100 text-rose-900 border-rose-300 font-extrabold'
                        : school.modality === 'Escuelas de Educación Artística (EDEA)'
                        ? 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300 font-extrabold'
                        : school.modality === 'TPA'
                        ? 'bg-cyan-100 text-cyan-900 border-cyan-300 font-extrabold'
                        : school.modality === 'Aprender'
                        ? 'bg-teal-100 text-teal-900 border-teal-300'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                    }`}>
                      {school.modality}
                    </span>
                    {school.modality === 'Tiempo Completo' && (
                      <span className="text-[11px] text-purple-800 font-medium">Jornada completa PAE</span>
                    )}
                    {(school.modality === 'Escuelas de Educación Especial' || (school.modality as string) === 'Especial') && (
                      <span className="text-[11px] text-rose-800 font-medium">Menúes adaptados a necesidades singulares</span>
                    )}
                    {school.modality === 'Escuelas de Educación Artística (EDEA)' && (
                      <span className="text-[11px] text-fuchsia-800 font-medium">Educación artística y comedor escolar</span>
                    )}
                    {school.modality === 'TPA' && (
                      <span className="text-[11px] text-cyan-800 font-medium">Talleres de Producción y Aprendizaje</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tarjeta Departamental Tacuarembó: Suministro de Agua y Programa de Leche */}
              <div className="pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`p-4 rounded-xl border ${
                    school.waterPurchaseAllowance 
                      ? 'bg-amber-50/70 border-amber-300' 
                      : 'bg-sky-50/70 border-sky-300'
                  }`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Droplets className={`w-5 h-5 ${school.waterPurchaseAllowance ? 'text-amber-700' : 'text-sky-700'}`} />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Suministro de Agua
                      </h3>
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      {school.hasWaterSupply ? 'Conexión regular a red OSE' : 'Sin conexión de red OSE'}
                    </p>
                    <p className={`text-xs mt-1 font-semibold ${school.waterPurchaseAllowance ? 'text-amber-900' : 'text-slate-600'}`}>
                      {school.waterPurchaseAllowance ? '✓ Recibe Rubro PAE para compra de agua potable' : '• Abastecimiento de red convencional'}
                    </p>
                    {school.waterNotes && (
                      <p className="text-[11px] text-slate-600 mt-2 bg-white/70 p-2 rounded border border-slate-200">
                        {school.waterNotes}
                      </p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border bg-amber-50/70 border-amber-300">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Milk className="w-5 h-5 text-amber-700" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Programa de Leche Escolar
                      </h3>
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      {school.milkProgramType}
                    </p>
                    <p className="text-xs mt-1 font-semibold text-amber-900">
                      Cuota asignada: <strong>{school.milkPowderKg} kg/mes</strong> de leche en polvo
                    </p>
                    {school.milkNotes && (
                      <p className="text-[11px] text-slate-600 mt-2 bg-white/70 p-2 rounded border border-slate-200">
                        {school.milkNotes}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Servicios Alimentarios Brindados
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                    school.mealServices.breakfast 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {school.mealServices.breakfast ? '✓' : '✗'} Desayuno Escolar
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                    school.mealServices.lunch 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {school.mealServices.lunch ? '✓' : '✗'} Almuerzo Principal
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                    school.mealServices.snack 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {school.mealServices.snack ? '✓' : '✗'} Merienda
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Referencias y Antecedentes de la Escuela
                </h3>
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/70 text-slate-700 text-sm leading-relaxed">
                  {school.notes || 'No hay notas particulares registradas para esta escuela.'}
                </div>
              </div>
            </div>

            {/* Quick staff snapshot */}
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  Resumen de Auxiliares de Cocina ({staff.length})
                </h2>
                <button
                  onClick={() => setActiveTab('auxiliares')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  Ver detalle de auxiliares
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {staff.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <p className="text-xs text-slate-500">No hay auxiliares cargadas aún en esta escuela.</p>
                  <button
                    onClick={onOpenAddStaff}
                    className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    + Cargar la primera auxiliar
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {staff.map(s => {
                    const badge = formatHealthCardBadge(s.healthCardValidUntil);
                    return (
                      <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-slate-900">{s.fullName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badge.color}`}>
                              {badge.status === 'expired' ? 'Carné Vencido' : badge.status === 'warning' ? 'Carné por vencer' : 'Carné OK'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{s.role} • <strong className="text-slate-700">{s.institutionType}</strong> {s.enterpriseName ? `(${s.enterpriseName})` : ''}</p>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2">
                          CI: {s.ci}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Key Diner Numbers & Quick Stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                Capacidad Comensal
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <span className="text-xs font-semibold text-emerald-900">Alumnos Comensales</span>
                  <span className="text-xl font-black text-emerald-700">{school.studentDinersCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-700">Docentes y Auxiliares</span>
                  <span className="text-lg font-bold text-slate-800">{school.staffDinersCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Total Raciones Diarias</span>
                  <span className="text-xl font-black text-emerald-400">
                    {school.studentDinersCount + school.staffDinersCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Last Visit Alert Card */}
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Estado de Visitas Técnicas
              </h3>
              
              {visits.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs text-slate-600">
                    <strong>Última Visita:</strong> {school.lastVisitDate} (Visita #{visits[visits.length - 1].visitNumber})
                  </div>
                  <div className="text-xs text-slate-600">
                    <strong>A cargo de:</strong> {visits[visits.length - 1].inspectorName}
                  </div>
                  <div className="text-xs text-slate-600">
                    <strong>Menú servido:</strong> {visits[visits.length - 1].menuServed}
                  </div>
                  <button
                    onClick={() => setActiveTab('visitas')}
                    className="w-full mt-2 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                  >
                    Ver Historial Completo de Visitas
                  </button>
                </div>
              ) : (
                <div className="text-center py-4 bg-amber-50/60 rounded-xl border border-amber-200">
                  <p className="text-xs text-amber-800 font-medium">Esta escuela no registra visitas este año.</p>
                  <button
                    onClick={onOpenNewVisit}
                    className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline"
                  >
                    Registrar primera visita
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subcategory 2: Auxiliares y Personal de Cocina */}
      {activeTab === 'auxiliares' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  Legajo de Auxiliares y Ayudantes de Cocina
                </h2>
                <p className="text-xs text-slate-500">
                  Centralización de personal, institución de pertenencia (DGEIP, tercerizada, comisión fomento), aportes y vencimiento de carné de salud.
                </p>
              </div>
              <button
                onClick={onOpenAddStaff}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Agregar Auxiliar a esta Escuela
              </button>
            </div>

            {staff.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">No hay auxiliares registradas aún</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Cargue los datos del personal de cocina para controlar los carnés de salud y la dependencia de contratación.
                </p>
                <button
                  onClick={onOpenAddStaff}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                >
                  + Cargar Auxiliar
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {staff.map(member => {
                  const healthBadge = formatHealthCardBadge(member.healthCardValidUntil);
                  const foodBadge = formatHealthCardBadge(member.foodHandlerCardValidUntil);

                  return (
                    <div
                      key={member.id}
                      className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs p-4 flex flex-col justify-between transition hover:shadow-xs"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              {member.role}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 mt-1">
                              {member.fullName}
                            </h3>
                            <p className="text-xs text-slate-500">
                              Documento: <strong className="text-slate-700">{member.ci}</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onEditStaff(member)}
                              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                              title="Editar datos"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar a ${member.fullName} del legajo?`)) {
                                  onDeleteStaff(member.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Eliminar auxiliar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Institution and Contractor Info */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Institución / Dependencia:</span>
                            <span className="font-bold text-slate-800">{member.institutionType}</span>
                          </div>
                          {member.enterpriseName && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Empresa Tercerizada:</span>
                              <span className="font-semibold text-emerald-800">{member.enterpriseName}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-500">Aportes / BPS:</span>
                            <span className={`font-semibold ${
                              member.socialSecurityStatus === 'Al día / Registrado' 
                                ? 'text-emerald-700' 
                                : 'text-amber-700'
                            }`}>
                              {member.socialSecurityStatus}
                            </span>
                          </div>
                          {member.phone && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Teléfono:</span>
                              <span className="text-slate-700">{member.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Health Card Badges */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">Carné de Salud:</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${healthBadge.color}`}>
                              {healthBadge.label}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">Manipulación Alimentos:</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${foodBadge.color}`}>
                              {foodBadge.label}
                            </span>
                          </div>
                        </div>

                        {member.notes && (
                          <p className="text-xs text-slate-500 italic bg-amber-50/40 p-2 rounded border border-amber-100">
                            {member.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subcategory 3: Visitas de Campo & Historial */}
      {activeTab === 'visitas' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                  Historial de Visitas de Campo a la Cocina Escolar
                </h2>
                <p className="text-xs text-slate-500">
                  Registro cronológico de inspecciones, revisión de menú servido, remitos de compra y sugerencias al personal.
                </p>
              </div>
              <button
                onClick={onOpenNewVisit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Registrar Nueva Visita
              </button>
            </div>

            {visits.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <ClipboardCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">No se han registrado visitas aún</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Registre la primera visita a la cocina para cotejar menú, remitos y diálogo con el equipo.
                </p>
                <button
                  onClick={onOpenNewVisit}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                >
                  + Registrar Visita
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {[...visits].reverse().map(visit => (
                  <div
                    key={visit.id}
                    className="border rounded-xl p-5 shadow-2xs transition border-slate-200 bg-white hover:border-emerald-300"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-emerald-700 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                            Visita Oficial N° {visit.visitNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{visit.date} a las {visit.time} hs</span>

                          {visit.unauthorizedItemsFound && (
                            <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              Alimento NO autorizado detectado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          <strong>Técnico / Visitador:</strong> {visit.inspectorName} ({visit.inspectorRole})
                        </p>
                        <p className="text-xs text-slate-500">
                          <strong>Recibido por:</strong> {visit.attendedBy}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedVisitForActa(visit.id);
                            setActiveTab('acta_impresion');
                          }}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Imprimir / Ver Acta
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                        <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                          Revisión de Menú y Comensales
                        </span>
                        <p><strong>Planificado:</strong> {visit.menuPlanned}</p>
                        <p><strong>Servido:</strong> {visit.menuServed}</p>
                        <p>
                          <strong>Evaluación:</strong>{' '}
                          <span className={`font-semibold ${
                            visit.menuEvaluation === 'Adecuado y Variado' ? 'text-emerald-700' : 'text-amber-700'
                          }`}>
                            {visit.menuEvaluation}
                          </span>
                        </p>
                        <p><strong>Comensales atendidos:</strong> {visit.dinersActualCount} raciones</p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                        <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                          Revisión de Remitos de Compra
                        </span>
                        <p className="text-slate-700">{visit.deliveryNotesDetails}</p>
                        <div className="pt-1 flex items-center gap-1.5 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Remitos debidamente archivados y cotejados</span>
                        </div>
                      </div>
                    </div>

                    {/* Unauthorized items if any */}
                    {visit.unauthorizedItemsFound && visit.unauthorizedItemsList.length > 0 && (
                      <div className="mt-3 p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs space-y-1">
                        <span className="font-bold text-rose-900 block">Detalle de Alimentos No Autorizados:</span>
                        {visit.unauthorizedItemsList.map((item, idx) => (
                          <div key={idx} className="text-rose-800">
                            • <strong>{item.item}</strong> ({item.category}): {item.reason}. <em>Acción tomada: {item.actionTaken}</em>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Meeting Minutes and Suggestions */}
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200">
                        <strong className="text-blue-950 block mb-1">Lo que se habló en la visita:</strong>
                        <p className="text-slate-700 leading-relaxed">{visit.meetingMinutes}</p>
                      </div>
                      <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
                        <strong className="text-emerald-950 block mb-1">Sugerencias y Recomendaciones:</strong>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-line">{visit.suggestions}</p>
                      </div>
                    </div>

                    {visit.generalObservations && (
                      <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <strong>Observaciones pertinentes:</strong> {visit.generalObservations}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subcategory 4: Seguimiento de Observaciones & Problemas */}
      {activeTab === 'seguimiento' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Seguimiento de Observaciones, Problemas y Sugerencias
                </h2>
                <p className="text-xs text-slate-500">
                  Control estricto de si los problemas y desvíos detectados han sido resueltos en visitas posteriores.
                </p>
              </div>
              <button
                onClick={onOpenAddIssue}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Registrar Nuevo Caso / Problema
              </button>
            </div>

            {/* Quick Stats on Issues */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-xs text-rose-700 font-semibold block">Pendientes de Solución</span>
                <span className="text-2xl font-black text-rose-800">
                  {issues.filter(i => i.status === 'Pendiente').length}
                </span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-xs text-amber-700 font-semibold block">En Proceso / Con Trámite</span>
                <span className="text-2xl font-black text-amber-800">
                  {issues.filter(i => i.status === 'En Proceso').length}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-xs text-emerald-700 font-semibold block">Problemas Resueltos</span>
                <span className="text-2xl font-black text-emerald-800">
                  {issues.filter(i => i.status === 'Resuelto').length}
                </span>
              </div>
            </div>

            {issues.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">Sin observaciones ni problemas pendientes</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  La cocina de la escuela opera en conformidad con las directivas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {issues.map(issue => {
                  const isResolved = issue.status === 'Resuelto';
                  const isPending = issue.status === 'Pendiente';

                  return (
                    <div
                      key={issue.id}
                      className={`p-4 rounded-xl border transition ${
                        isResolved 
                          ? 'bg-slate-50/80 border-slate-200 opacity-80' 
                          : isPending 
                            ? 'bg-white border-rose-200 shadow-2xs' 
                            : 'bg-white border-amber-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              isResolved 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                                : isPending 
                                  ? 'bg-rose-100 text-rose-800 border-rose-200' 
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {issue.status}
                            </span>
                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                              {issue.category}
                            </span>
                            <span className={`text-[10px] font-bold ${
                              issue.severity === 'Crítica' ? 'text-rose-600' : 'text-slate-500'
                            }`}>
                              Severidad: {issue.severity}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Reportado: {issue.reportedDate}
                            </span>
                          </div>

                          <h3 className={`text-sm font-bold ${isResolved ? 'line-through text-slate-600' : 'text-slate-900'}`}>
                            {issue.title}
                          </h3>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {issue.description}
                          </p>

                          {/* Resolution Notes if resolved */}
                          {isResolved && (
                            <div className="mt-2 text-xs bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-emerald-900">
                              <strong>✓ Constatado Resuelto ({issue.resolvedDate || 'Fecha registrada'}):</strong>{' '}
                              {issue.resolutionNotes || 'Verificado en visita de campo que el problema fue solucionado.'}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                          <button
                            onClick={() => onToggleIssueStatus(issue.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              isResolved
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {isResolved ? 'Reabrir Caso' : 'Marcar como Resuelto'}
                          </button>
                          <button
                            onClick={() => onEditIssue(issue)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                            title="Editar caso"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('¿Desea eliminar este registro de observación?')) {
                                onDeleteIssue(issue.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Eliminar caso"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subcategory 5: Control de Remitos y Alimentos No Autorizados */}
      {activeTab === 'remitos_alimentos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-rose-600" />
                Control Bromatológico de Remitos y Alimentos No Autorizados
              </h2>
              <p className="text-xs text-slate-500">
                Auditoría continua de compras de comestibles para asegurar que no se utilicen alimentos fuera del pliego o prohibidos por las guías nutricionales escolares.
              </p>
            </div>

            {/* Historical Alert summary */}
            {allUnauthorized.length > 0 ? (
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-3">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <span>Se han registrado {allUnauthorized.length} detección(es) de alimentos no autorizados en esta escuela</span>
                </div>
                <div className="space-y-2">
                  {allUnauthorized.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-rose-200 text-xs shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-950 text-sm">{item.item}</span>
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1"><strong>Infracción observada:</strong> {item.reason}</p>
                      <p className="text-slate-600"><strong>Medida aplicada:</strong> {item.actionTaken}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">Sin registros de alimentos no autorizados</h4>
                  <p className="text-xs text-emerald-800">
                    Las compras inspeccionadas en los remitos coinciden con los pliegos y pautas nutricionales vigentes.
                  </p>
                </div>
              </div>
            )}

            {/* Remitos inspection log */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
                Historial de Remitos Cotejados en Visitas
              </h3>
              {visits.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No hay visitas con remitos archivados todavía.</p>
              ) : (
                <div className="space-y-3">
                  {visits.map(v => (
                    <div key={v.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Visita N° {v.visitNumber} ({v.date})</span>
                        <span className="text-slate-500 font-medium">Revisó: {v.inspectorName}</span>
                      </div>
                      <p className="text-slate-700">{v.deliveryNotesDetails}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subcategory 6: Acta Oficial / Informe Integral para Imprimir / PDF */}
      {activeTab === 'acta_impresion' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-emerald-600" />
                  Informes Técnicos & Exportación PDF
                </h2>
                <p className="text-xs text-slate-500">
                  Compile toda la información de la escuela (ficha, auxiliares, visitas e incidencias) en formato limpio para informes o actas de supervisión.
                </p>
              </div>

              {/* Mode switch & print button */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs">
                  <button
                    onClick={() => setReportPreviewMode('integral')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      reportPreviewMode === 'integral'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Informe Integral Completo
                  </button>
                  <button
                    onClick={() => setReportPreviewMode('acta')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      reportPreviewMode === 'acta'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Acta de Visita Individual
                  </button>
                </div>

                {reportPreviewMode === 'acta' && visits.length > 1 && (
                  <select
                    value={selectedVisitForActa}
                    onChange={e => setSelectedVisitForActa(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                  >
                    {visits.map(v => (
                      <option key={v.id} value={v.id}>
                        Visita N° {v.visitNumber} ({v.date})
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  title="Abrir personalizador de informe con filtros y notas"
                >
                  <Settings2 className="w-4 h-4 text-emerald-600" />
                  <span>Personalizar</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Guardar en PDF</span>
                </button>
              </div>
            </div>

            {/* View 1: INFORME TÉCNICO INTEGRAL COMPLETO */}
            {reportPreviewMode === 'integral' && (
              <div 
                id="school-printable-report"
                className="border border-slate-300 rounded-xl p-8 bg-white max-w-4xl mx-auto shadow-sm text-xs print:border-0 print:shadow-none print:p-0 print:max-w-none space-y-6"
              >
                {/* Official Header */}
                <div className="border-b-2 border-slate-900 pb-4 text-center">
                  <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">
                    República Oriental del Uruguay • Administración Nacional de Educación Pública (ANEP)
                  </div>
                  <div className="text-xs font-extrabold tracking-wide uppercase text-slate-700">
                    Dirección General de Educación Inicial y Primaria (DGEIP)
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mt-1 mb-1">
                    Informe Técnico Integral de Cocina y Comedor Escolar
                  </h1>
                  <div className="text-xs text-slate-600 font-medium">
                    Programa de Alimentación Escolar (PAE) • Legajo Técnico de Centro N° {school.number}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                    <span><strong>Fecha de Emisión:</strong> {new Date().toISOString().slice(0, 10)}</span>
                    <span><strong>Jurisdicción:</strong> {school.zone} ({school.department})</span>
                    <span><strong>Modalidad:</strong> {school.modality}</span>
                  </div>
                </div>

                {/* Resumen Ejecutivo */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 print-avoid-break">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Escuela</span>
                      <span className="text-base font-black text-emerald-800">N° {school.number}</span>
                      <span className="text-[10px] text-slate-500 block truncate">{school.name}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Comensales</span>
                      <span className="text-base font-black text-slate-800">{school.studentDinersCount}</span>
                      <span className="text-[10px] text-slate-500 block">+{school.staffDinersCount} adultos</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Visitas</span>
                      <span className="text-base font-black text-teal-800">{visits.length}</span>
                      <span className="text-[10px] text-slate-500 block">{school.lastVisitDate ? `Últ: ${school.lastVisitDate}` : 'Sin visitas'}</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Auxiliares</span>
                      <span className="text-base font-black text-slate-800">{staff.length}</span>
                      <span className="text-[10px] text-slate-500 block">
                        {staff.some(s => getHealthCardStatus(s.healthCardValidUntil) === 'expired') ? (
                          <span className="text-rose-700 font-bold">Carné vencido</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Carnés al día</span>
                        )}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Casos Abiertos</span>
                      <span className={`text-base font-black ${pendingIssues.length > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {pendingIssues.length}
                      </span>
                      <span className="text-[10px] text-slate-500 block">{resolvedIssues.length} resueltos</span>
                    </div>
                  </div>
                </div>

                {/* 1. Datos Institucionales */}
                <div className="pb-4 border-b border-slate-200 print-avoid-break">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 mb-2">
                    1. Datos Institucionales y Organización del Servicio de Alimentación
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <p><strong>Nombre del Centro:</strong> {school.name}</p>
                    <p><strong>Modalidad Educativa:</strong> {school.modality}</p>
                    <p><strong>Dirección:</strong> {school.address || 'Sin registrar'}</p>
                    <p><strong>Teléfono / Contacto:</strong> {school.phone || 'Sin registrar'} {school.email ? `• ${school.email}` : ''}</p>
                    <p><strong>Maestra Directora:</strong> {school.principalName || 'No asignada'}</p>
                    <p><strong>Encargada de Cocina:</strong> {school.headCookName || 'No asignada'}</p>
                    <p><strong>Servicios Brindados:</strong> {
                      [
                        school.mealServices.breakfast && 'Desayuno',
                        school.mealServices.lunch && 'Almuerzo',
                        school.mealServices.snack && 'Merienda'
                      ].filter(Boolean).join(' • ') || 'Sin especificar'
                    }</p>
                    <p><strong>Capacidad de Raciones:</strong> {school.studentDinersCount} estudiantes (+ {school.staffDinersCount} docentes/auxiliares)</p>
                  </div>
                  {school.notes && (
                    <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                      <strong>Observaciones del Centro:</strong> {school.notes}
                    </div>
                  )}
                </div>

                {/* 2. Nómina de Auxiliares */}
                <div className="pb-4 border-b border-slate-200 print-avoid-break">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                      2. Nómina de Personal de Cocina y Requisitos Sanitarios ({staff.length})
                    </h3>
                  </div>

                  {staff.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No hay auxiliares de cocina registradas en el legajo de esta escuela.</p>
                  ) : (
                    <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800">
                          <th className="border border-slate-300 p-1.5">Nombre y Apellido</th>
                          <th className="border border-slate-300 p-1.5">Cédula</th>
                          <th className="border border-slate-300 p-1.5">Rol / Tarea</th>
                          <th className="border border-slate-300 p-1.5">Régimen Institucional</th>
                          <th className="border border-slate-300 p-1.5">Carné de Salud</th>
                          <th className="border border-slate-300 p-1.5">Manipulador</th>
                          <th className="border border-slate-300 p-1.5">Aportes / BPS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staff.map(st => {
                          const healthStatus = getHealthCardStatus(st.healthCardValidUntil);
                          return (
                            <tr key={st.id} className="hover:bg-slate-50">
                              <td className="border border-slate-300 p-1.5 font-bold text-slate-900">{st.fullName}</td>
                              <td className="border border-slate-300 p-1.5 text-slate-600">{st.ci}</td>
                              <td className="border border-slate-300 p-1.5">{st.role}</td>
                              <td className="border border-slate-300 p-1.5">
                                {st.institutionType}
                                {st.enterpriseName ? <span className="block text-[10px] text-slate-500">({st.enterpriseName})</span> : null}
                              </td>
                              <td className="border border-slate-300 p-1.5">
                                <span className={`font-semibold ${
                                  healthStatus === 'expired' 
                                    ? 'text-rose-700 font-bold' 
                                    : healthStatus === 'warning' 
                                      ? 'text-amber-700 font-bold' 
                                      : 'text-slate-700'
                                }`}>
                                  {st.healthCardValidUntil}
                                </span>
                                {healthStatus === 'expired' && <span className="text-[9px] block text-rose-800 font-bold uppercase">[VENCIDO]</span>}
                                {healthStatus === 'warning' && <span className="text-[9px] block text-amber-800 font-bold uppercase">[POR VENCER]</span>}
                              </td>
                              <td className="border border-slate-300 p-1.5">{st.foodHandlerCardValidUntil || 'No reg.'}</td>
                              <td className="border border-slate-300 p-1.5 text-[10px]">{st.socialSecurityStatus}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* 3. Historial de Visitas */}
                <div className="pb-4 border-b border-slate-200">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 mb-2 print-avoid-break">
                    3. Historial Consolidado de Visitas Técnicas ({visits.length})
                  </h3>

                  {visits.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No se han registrado visitas técnicas a este centro educativo a la fecha.</p>
                  ) : (
                    <div className="space-y-3">
                      <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800">
                            <th className="border border-slate-300 p-1.5 text-center">N°</th>
                            <th className="border border-slate-300 p-1.5">Fecha</th>
                            <th className="border border-slate-300 p-1.5">Técnico</th>
                            <th className="border border-slate-300 p-1.5">Menú Servido</th>
                            <th className="border border-slate-300 p-1.5">Evaluación</th>
                            <th className="border border-slate-300 p-1.5 text-center">Comensales</th>
                            <th className="border border-slate-300 p-1.5">Bromatología Cocina</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visits.map(v => (
                            <tr key={v.id} className="hover:bg-slate-50 print-avoid-break">
                              <td className="border border-slate-300 p-1.5 font-bold text-slate-900 text-center">#{v.visitNumber}</td>
                              <td className="border border-slate-300 p-1.5 whitespace-nowrap">{v.date}</td>
                              <td className="border border-slate-300 p-1.5">{v.inspectorName}</td>
                              <td className="border border-slate-300 p-1.5 font-medium">{v.menuServed}</td>
                              <td className="border border-slate-300 p-1.5">{v.menuEvaluation}</td>
                              <td className="border border-slate-300 p-1.5 text-center font-bold">{v.dinersActualCount}</td>
                              <td className="border border-slate-300 p-1.5 text-[10px]">
                                Frío: {v.hygieneChecklist.coldChain} • Limp: {v.hygieneChecklist.cleanliness} • Cofia: {v.hygieneChecklist.uniformAndCaps}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Summary of suggestions */}
                      <div className="space-y-2 pt-1">
                        {visits.map(v => (
                          <div key={v.id} className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] print-avoid-break">
                            <div className="flex items-center justify-between font-bold text-slate-900 mb-0.5">
                              <span>Visita N° {v.visitNumber} ({v.date}) — Inspector: {v.inspectorName}</span>
                              <span className="text-slate-500 font-normal">Atendió: {v.attendedBy}</span>
                            </div>
                            {v.suggestions && (
                              <p className="text-slate-700"><strong>Recomendaciones / Sugerencias:</strong> {v.suggestions}</p>
                            )}
                            {v.meetingMinutes && (
                              <p className="text-slate-600 mt-0.5"><strong>Minuta:</strong> {v.meetingMinutes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Incidencias y Seguimiento */}
                <div className="pb-4 border-b border-slate-200 print-avoid-break">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                      4. Registro Consolidado de Incidencias y Seguimiento de Casos ({issues.length})
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      {pendingIssues.length} pendientes • {resolvedIssues.length} resueltos
                    </span>
                  </div>

                  {issues.length === 0 ? (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-xs flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>No existen incidencias ni observaciones registradas para esta escuela.</span>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800">
                          <th className="border border-slate-300 p-1.5">Fecha</th>
                          <th className="border border-slate-300 p-1.5">Incidencia / Desvío</th>
                          <th className="border border-slate-300 p-1.5">Categoría</th>
                          <th className="border border-slate-300 p-1.5">Severidad</th>
                          <th className="border border-slate-300 p-1.5">Estado</th>
                          <th className="border border-slate-300 p-1.5">Resolución / Seguimiento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issues.map(iss => (
                          <tr key={iss.id} className="hover:bg-slate-50 print-avoid-break">
                            <td className="border border-slate-300 p-1.5 whitespace-nowrap text-slate-600">{iss.reportedDate}</td>
                            <td className="border border-slate-300 p-1.5">
                              <span className="font-bold text-slate-900 block">{iss.title}</span>
                              <span className="text-slate-600 text-[10px]">{iss.description}</span>
                            </td>
                            <td className="border border-slate-300 p-1.5">{iss.category}</td>
                            <td className="border border-slate-300 p-1.5">
                              <span className={`font-semibold ${
                                iss.severity === 'Crítica' ? 'text-rose-700' : iss.severity === 'Media' ? 'text-amber-700' : 'text-slate-700'
                              }`}>
                                {iss.severity}
                              </span>
                            </td>
                            <td className="border border-slate-300 p-1.5">
                              <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                iss.status === 'Resuelto' 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                  : iss.status === 'En Proceso'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}>
                                {iss.status}
                              </span>
                            </td>
                            <td className="border border-slate-300 p-1.5 text-[10px]">
                              {iss.status === 'Resuelto' ? (
                                <div>
                                  <span className="font-semibold text-emerald-800">Resuelto el {iss.resolvedDate || 'Fecha no esp.'}</span>
                                  {iss.resolutionNotes && <p className="text-slate-600">{iss.resolutionNotes}</p>}
                                </div>
                              ) : (
                                <span className="text-amber-800 italic">Pendiente de verificación en próxima visita</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* 5. Remitos y Alimentos no autorizados */}
                <div className="pb-4 border-b border-slate-200 print-avoid-break">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 mb-2">
                    5. Verificación de Remitos de Compra y Alimentos de Compra No Autorizada
                  </h3>

                  {allUnauthorized.length > 0 ? (
                    <div className="space-y-2">
                      <div className="p-2 bg-rose-50 border border-rose-300 rounded text-rose-900 text-xs">
                        <strong>ALERTA BROMATOLÓGICA / NUTRICIONAL:</strong> Se han detectado {allUnauthorized.length} producto(s) en remitos que no se ajustan a las pautas del Programa de Alimentación Escolar.
                      </div>
                      <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800">
                            <th className="border border-slate-300 p-1.5">Alimento Detectado</th>
                            <th className="border border-slate-300 p-1.5">Categoría</th>
                            <th className="border border-slate-300 p-1.5">Motivo de Infracción</th>
                            <th className="border border-slate-300 p-1.5">Medida Técnica Aplicada</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allUnauthorized.map((u, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="border border-slate-300 p-1.5 font-bold text-rose-950">{u.item}</td>
                              <td className="border border-slate-300 p-1.5">{u.category}</td>
                              <td className="border border-slate-300 p-1.5 text-slate-700">{u.reason}</td>
                              <td className="border border-slate-300 p-1.5 text-slate-700">{u.actionTaken}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                      ✓ <strong>Conformidad en Remitos:</strong> Durante las inspecciones realizadas, los remitos y compras cotejadas se ajustan a las pautas nutricionales vigentes de la DGEIP. No se hallaron ultraprocesados, fiambres ni aderezos no permitidos.
                    </p>
                  )}
                </div>

                {/* Bloque de Firmas Oficiales */}
                <div className="pt-8 print-avoid-break">
                  <div className="grid grid-cols-2 gap-12 text-center text-xs">
                    <div>
                      <div className="border-t border-slate-600 pt-2 mx-auto max-w-[240px]">
                        <p className="font-bold text-slate-900">Lic. Inspector / Nutricionista</p>
                        <p className="text-slate-500 text-[11px]">Técnico en Alimentación Escolar</p>
                        <p className="text-slate-400 text-[10px]">Programa de Alimentación Escolar - DGEIP</p>
                      </div>
                    </div>

                    <div>
                      <div className="border-t border-slate-600 pt-2 mx-auto max-w-[240px]">
                        <p className="font-bold text-slate-900">{school.principalName || 'Dirección Escolar'}</p>
                        <p className="text-slate-500 text-[11px]">Por Escuela N° {school.number} - {school.name}</p>
                        <p className="text-slate-400 text-[10px]">Firma, Aclaración y Sello del Centro</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
                    Documento emitido a través del Sistema Digital de Legajos de Cocinas y Comedores Escolares (ANEP - DGEIP) • Hoja Oficial de Supervisión
                  </div>
                </div>
              </div>
            )}

            {/* View 2: ACTA DE VISITA INDIVIDUAL */}
            {reportPreviewMode === 'acta' && (
              <div>
                {currentActaVisit ? (
                  <div 
                    id="school-printable-report"
                    className="border border-slate-300 rounded-xl p-8 bg-white max-w-3xl mx-auto shadow-sm print:border-0 print:shadow-none print:p-0"
                  >
                    {/* Official Header */}
                    <div className="border-b-2 border-slate-800 pb-4 text-center space-y-1">
                      <div className="text-xs font-bold tracking-widest uppercase text-slate-500">
                        Administración Nacional de Educación Pública - DGEIP
                      </div>
                      <h1 className="text-xl font-black text-slate-900 uppercase">
                        Acta de Supervisión y Asesoría Técnica a Comedor Escolar
                      </h1>
                      <div className="text-xs text-slate-600">
                        Inspección Bromatológica y Nutricional de Cocina y Servicio de Alimentación
                      </div>
                    </div>

                    {/* Meta details table */}
                    <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-200">
                      <div>
                        <p><strong>Escuela:</strong> N° {school.number} - "{school.name}"</p>
                        <p><strong>Modalidad:</strong> {school.modality}</p>
                        <p><strong>Dirección:</strong> {school.address} ({school.zone})</p>
                        <p><strong>Directora:</strong> {school.principalName}</p>
                      </div>
                      <div>
                        <p><strong>Acta de Visita N°:</strong> {currentActaVisit.visitNumber}</p>
                        <p><strong>Fecha y Hora:</strong> {currentActaVisit.date} - {currentActaVisit.time} hs</p>
                        <p><strong>Técnico Actuante:</strong> {currentActaVisit.inspectorName}</p>
                        <p><strong>Presentes en Escuela:</strong> {currentActaVisit.attendedBy}</p>
                      </div>
                    </div>

                    {/* Section: Menú y Raciones */}
                    <div className="py-3 border-b border-slate-200 text-xs space-y-1">
                      <h3 className="font-bold uppercase text-slate-800">1. Menú y Raciones Servidas</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <p><strong>Planificado:</strong> {currentActaVisit.menuPlanned}</p>
                        <p><strong>Servido:</strong> {currentActaVisit.menuServed}</p>
                        <p><strong>Evaluación:</strong> {currentActaVisit.menuEvaluation}</p>
                        <p><strong>Comensales atendidos:</strong> {currentActaVisit.dinersActualCount} alumnos</p>
                      </div>
                    </div>

                    {/* Section: Remitos y Compras */}
                    <div className="py-3 border-b border-slate-200 text-xs space-y-1">
                      <h3 className="font-bold uppercase text-slate-800">2. Revisión de Remitos de Compra y Alimentos</h3>
                      <p>{currentActaVisit.deliveryNotesDetails}</p>
                      {currentActaVisit.unauthorizedItemsFound ? (
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-900 mt-1">
                          <strong>ALIMENTOS DE COMPRA NO AUTORIZADA DETECTADOS:</strong>
                          {currentActaVisit.unauthorizedItemsList.map((i, idx) => (
                            <div key={idx}>• {i.item} ({i.category}) - {i.reason} [Acción: {i.actionTaken}]</div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-emerald-800 font-semibold">✓ No se detectaron alimentos no autorizados en cocina ni remitos.</p>
                      )}
                    </div>

                    {/* Section: Bromatología */}
                    <div className="py-3 border-b border-slate-200 text-xs space-y-2">
                      <h3 className="font-bold uppercase text-slate-800">3. Estado Bromatológico e Higiénico de la Cocina</h3>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div className="p-1.5 bg-slate-50 border rounded">
                          Cadena de frío: <strong>{currentActaVisit.hygieneChecklist.coldChain}</strong>
                        </div>
                        <div className="p-1.5 bg-slate-50 border rounded">
                          Separación crudo/cocido: <strong>{currentActaVisit.hygieneChecklist.rawCookedSeparation}</strong>
                        </div>
                        <div className="p-1.5 bg-slate-50 border rounded">
                          Higiene e instalaciones: <strong>{currentActaVisit.hygieneChecklist.cleanliness}</strong>
                        </div>
                        <div className="p-1.5 bg-slate-50 border rounded">
                          Uniformes y cofias: <strong>{currentActaVisit.hygieneChecklist.uniformAndCaps}</strong>
                        </div>
                        <div className="p-1.5 bg-slate-50 border rounded">
                          Agua clorada / segura: <strong>{currentActaVisit.hygieneChecklist.potableWaterChlorine}</strong>
                        </div>
                        <div className="p-1.5 bg-slate-50 border rounded">
                          Manejo de residuos: <strong>{currentActaVisit.hygieneChecklist.wasteDisposal}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Section: Auxiliares en Planta */}
                    <div className="py-3 border-b border-slate-200 text-xs space-y-1">
                      <h3 className="font-bold uppercase text-slate-800">4. Auxiliares de Cocina Constatadas</h3>
                      <table className="w-full text-left text-[11px] border border-slate-200 mt-1">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="p-1 border">Nombre</th>
                            <th className="p-1 border">Rol</th>
                            <th className="p-1 border">Institución</th>
                            <th className="p-1 border">Carné Salud</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staff.map(st => (
                            <tr key={st.id}>
                              <td className="p-1 border font-medium">{st.fullName} (CI {st.ci})</td>
                              <td className="p-1 border">{st.role}</td>
                              <td className="p-1 border">{st.institutionType} {st.enterpriseName ? `(${st.enterpriseName})` : ''}</td>
                              <td className="p-1 border">{st.healthCardValidUntil}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Section: Minuta y Sugerencias */}
                    <div className="py-3 border-b border-slate-200 text-xs space-y-2">
                      <div>
                        <h3 className="font-bold uppercase text-slate-800">5. Temas Dialogados en la Visita</h3>
                        <p className="text-slate-700 whitespace-pre-line mt-1">{currentActaVisit.meetingMinutes}</p>
                      </div>
                      <div>
                        <h3 className="font-bold uppercase text-slate-800">6. Sugerencias y Recomendaciones Realizadas</h3>
                        <p className="text-slate-700 whitespace-pre-line mt-1">{currentActaVisit.suggestions}</p>
                      </div>
                    </div>

                    {/* Signatures */}
                    <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs">
                      <div className="border-t border-slate-400 pt-2">
                        <p className="font-bold text-slate-900">{currentActaVisit.inspectorName}</p>
                        <p className="text-slate-500">{currentActaVisit.inspectorRole}</p>
                      </div>
                      <div className="border-t border-slate-400 pt-2">
                        <p className="font-bold text-slate-900">{school.principalName || 'Dirección Escolar'}</p>
                        <p className="text-slate-500">Por Escuela N° {school.number}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    Registre al menos una visita para generar el acta de inspección individual.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subcategory: Bitácora de Actividad del Legajo */}
      {activeTab === 'bitacora' && (
        <ActivityLogView
          logs={activityLogs}
          schools={[school]}
          scopedSchoolId={school.id}
          onAddManualLog={onAddManualLog}
          activeUserId={activeUserId}
        />
      )}

      {/* School Report Modal for Customization and Fullscreen Export */}
      {isReportModalOpen && (
        <SchoolReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          school={school}
          staff={staff}
          visits={visits}
          issues={issues}
        />
      )}
    </div>
  );
};


import React, { useState, useMemo } from 'react';
import { School, SchoolIssue, Visit, ModalityType } from '../types';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  Filter, 
  ChevronRight,
  Info,
  School as SchoolIcon
} from 'lucide-react';

interface IndicatorsSummaryProps {
  schools: School[];
  issues: SchoolIssue[];
  visits: Visit[];
  onNavigateToSchools: (filter?: string) => void;
}

export const IndicatorsSummary: React.FC<IndicatorsSummaryProps> = ({
  schools,
  issues,
  visits,
  onNavigateToSchools
}) => {
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<'Todas' | 'Rural' | 'Urbana'>('Todas');

  // Map schools by ID for fast lookup
  const schoolMap = useMemo(() => {
    const map = new Map<string, School>();
    schools.forEach(s => map.set(s.id, s));
    return map;
  }, [schools]);

  // Filtered issues based on selected area
  const filteredIssues = useMemo(() => {
    if (selectedAreaFilter === 'Todas') return issues;
    return issues.filter(i => {
      const sc = schoolMap.get(i.schoolId);
      return sc?.areaType === selectedAreaFilter;
    });
  }, [issues, schoolMap, selectedAreaFilter]);

  // Resolution metrics
  const totalIssues = filteredIssues.length;
  const resolvedCount = filteredIssues.filter(i => i.status === 'Resuelto').length;
  const pendingCount = filteredIssues.filter(i => i.status === 'Pendiente').length;
  const inProgressCount = filteredIssues.filter(i => i.status === 'En Proceso').length;
  const openCount = pendingCount + inProgressCount;

  const resolutionRate = totalIssues > 0 ? Math.round((resolvedCount / totalIssues) * 100) : 100;
  const resolvedRate = totalIssues > 0 ? Math.round((resolvedCount / totalIssues) * 100) : 100;
  const inProgressRate = totalIssues > 0 ? Math.round((inProgressCount / totalIssues) * 100) : 0;
  const pendingRate = totalIssues > 0 ? Math.round((pendingCount / totalIssues) * 100) : 0;
  const ratioText = totalIssues > 0 ? `${resolvedCount} / ${totalIssues}` : '0 / 0';

  // Schools without active observations
  const cleanSchoolsCount = schools.filter(s => {
    if (selectedAreaFilter !== 'Todas' && s.areaType !== selectedAreaFilter) return false;
    return s.activeIssuesCount === 0;
  }).length;

  const totalFilteredSchools = selectedAreaFilter === 'Todas' 
    ? schools.length 
    : schools.filter(s => s.areaType === selectedAreaFilter).length;

  const cleanSchoolsRate = totalFilteredSchools > 0 
    ? Math.round((cleanSchoolsCount / totalFilteredSchools) * 100) 
    : 100;

  // Unauthorized food resolution rate
  const unauthorizedIssues = filteredIssues.filter(i => i.category === 'Alimentos no autorizados');
  const unauthorizedResolved = unauthorizedIssues.filter(i => i.status === 'Resuelto').length;
  const unauthorizedRate = unauthorizedIssues.length > 0 
    ? Math.round((unauthorizedResolved / unauthorizedIssues.length) * 100) 
    : 100;

  // Modality distribution breakdown
  const modalityList: ModalityType[] = [
    'Tiempo Completo',
    'Tiempo Extendido',
    'Escuelas de Educación Especial',
    'Escuelas de Educación Artística (EDEA)',
    'TPA',
    'Aprender',
    'Común',
    'Rural',
    'Práctica'
  ];

  const modalityStats = useMemo(() => {
    return modalityList.map(mod => {
      const matchingSchools = schools.filter(s => {
        if (selectedAreaFilter !== 'Todas' && s.areaType !== selectedAreaFilter) return false;
        if (mod === 'Escuelas de Educación Especial') {
          return s.modality === 'Escuelas de Educación Especial' || (s.modality as string) === 'Especial' || (s.modality as string) === 'Educación Especial';
        }
        if (mod === 'Escuelas de Educación Artística (EDEA)') {
          return s.modality === 'Escuelas de Educación Artística (EDEA)' || (s.modality as string) === 'EDEA';
        }
        return s.modality === mod;
      });

      const totalDiners = matchingSchools.reduce((acc, s) => acc + s.studentDinersCount, 0);
      const activeIssues = matchingSchools.reduce((acc, s) => acc + s.activeIssuesCount, 0);

      return {
        modality: mod,
        count: matchingSchools.length,
        totalDiners,
        activeIssues
      };
    }).filter(m => m.count > 0);
  }, [schools, selectedAreaFilter]);

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-slate-200/90 space-y-4 sm:space-y-6">
      
      {/* Header with Title and Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Resumen de Indicadores y Ratio de Resolución
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas de control higiénico-sanitario, modalidades de atención y resolución de casos en comedores escolares.
          </p>
        </div>

        {/* Filter by School Area */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">Ámbito:</span>
          </span>
          {(['Todas', 'Rural', 'Urbana'] as const).map(area => (
            <button
              key={area}
              onClick={() => setSelectedAreaFilter(area)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                selectedAreaFilter === area
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {area === 'Todas' ? 'Todas' : area === 'Rural' ? '🌾 Rurales' : '🏢 Urbanas'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Micro-Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        
        {/* Ratio Resueltos vs Pendientes */}
        <div className="bg-emerald-50/70 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-200/80 relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Resolución</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-3xl font-black text-emerald-950">
            {ratioText}
          </div>
          <div className="text-[11px] sm:text-xs text-emerald-800 font-semibold mt-1 truncate">
            <span>{resolvedCount} resueltos</span>
            <span className="mx-1 text-emerald-400">•</span>
            <span className="text-rose-700">{pendingCount} pend.</span>
          </div>
          {/* Subtle progress track */}
          <div className="w-full bg-emerald-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-emerald-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${resolutionRate}%` }}
            ></div>
          </div>
        </div>

        {/* Escuelas Sin Observaciones Activas */}
        <div className="bg-sky-50/70 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-sky-200/80">
          <div className="flex items-center justify-between text-sky-800 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Comedores al Día</span>
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-3xl font-black text-sky-950">
            {cleanSchoolsCount} <span className="text-xs font-normal text-sky-700">/ {totalFilteredSchools}</span>
          </div>
          <div className="text-[11px] sm:text-xs text-sky-800 font-semibold mt-1 truncate">
            <span>{cleanSchoolsRate}% sin observaciones</span>
          </div>
          <div className="w-full bg-sky-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-sky-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${cleanSchoolsRate}%` }}
            ></div>
          </div>
        </div>

        {/* Subsanación de Alimentos No Autorizados */}
        <div className="bg-amber-50/70 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-200/80">
          <div className="flex items-center justify-between text-amber-900 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Alim. No Autorizados</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          </div>
          <div className="text-xl sm:text-3xl font-black text-amber-950">
            {unauthorizedRate}% <span className="text-xs font-normal text-amber-700">subsanados</span>
          </div>
          <div className="text-[11px] sm:text-xs text-amber-800 font-semibold mt-1 truncate">
            <span>{unauthorizedResolved} de {unauthorizedIssues.length} retirados</span>
          </div>
          <div className="w-full bg-amber-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-amber-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${unauthorizedRate}%` }}
            ></div>
          </div>
        </div>

        {/* Casos Abiertos / Acción Rápida */}
        <div className="bg-rose-50/70 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-rose-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-rose-800 mb-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Casos Abiertos</span>
              <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            </div>
            <div className="text-xl sm:text-3xl font-black text-rose-950">
              {openCount} <span className="text-xs font-normal text-rose-700">abiertos</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-rose-700 mt-0.5 truncate">
              {inProgressCount} en proceso • {pendingCount} pend.
            </p>
          </div>

          <button
            onClick={() => onNavigateToSchools('issues')}
            className="mt-2 text-[11px] sm:text-xs font-bold text-rose-800 hover:text-rose-950 flex items-center justify-between bg-white/80 hover:bg-white p-1 sm:p-1.5 rounded-lg sm:rounded-xl border border-rose-200 transition"
          >
            <span>Ver casos en legajos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* SECTION 2: RATIO DE RESOLUCIÓN (SIN GRÁFICA) + MODALIDADES DISPLAY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 pt-1 sm:pt-2">
        
        {/* Left: Ratio Global Resueltos vs Pendientes (Sin gráfica) */}
        <div className="lg:col-span-5 bg-slate-50/70 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Ratio de Resolución ({schools.length} Escuelas)</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {totalIssues} {totalIssues === 1 ? 'observación' : 'observaciones'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Estado de regularización de desvíos detectados en visitas de supervisión técnica.
            </p>

            {/* Métrica Principal Resumen */}
            <div className="mt-3 bg-white p-3.5 rounded-xl border border-slate-200/80">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-bold text-slate-600">Eficacia Global</span>
                <span className="text-2xl font-black text-emerald-800">{resolutionRate}%</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                {resolvedCount} de {totalIssues} observaciones cerradas favorablemente
              </p>

              {/* Barra segmentada horizontal discreta */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${totalIssues > 0 ? (resolvedCount / totalIssues) * 100 : 100}%` }} 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  title={`Resueltos: ${resolvedCount}`}
                />
                <div 
                  style={{ width: `${totalIssues > 0 ? (inProgressCount / totalIssues) * 100 : 0}%` }} 
                  className="bg-amber-400 h-full transition-all duration-500" 
                  title={`En Proceso: ${inProgressCount}`}
                />
                <div 
                  style={{ width: `${totalIssues > 0 ? (pendingCount / totalIssues) * 100 : 0}%` }} 
                  className="bg-rose-500 h-full transition-all duration-500" 
                  title={`Pendientes: ${pendingCount}`}
                />
              </div>
            </div>

            {/* Desglose Cuantitativo por Estado */}
            <div className="mt-2.5 space-y-1.5">
              {/* Resueltos */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-emerald-200/70 hover:bg-emerald-50/30 transition">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">Casos Resueltos</span>
                    <span className="text-[10px] text-slate-500">Regularizados y archivados</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-800 block leading-tight">{resolvedCount}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{resolvedRate}%</span>
                </div>
              </div>

              {/* En Proceso */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-amber-200/70 hover:bg-amber-50/30 transition">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">En Proceso de Corrección</span>
                    <span className="text-[10px] text-slate-500">Con plazo de descargo activo</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-amber-800 block leading-tight">{inProgressCount}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{inProgressRate}%</span>
                </div>
              </div>

              {/* Pendientes */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-rose-200/70 hover:bg-rose-50/30 transition">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">Pendientes de Acción</span>
                    <span className="text-[10px] text-slate-500">Requieren visita prioritaria</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-rose-800 block leading-tight">{pendingCount}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{pendingRate}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Botón de acceso a legajos */}
          <button
            onClick={() => onNavigateToSchools('issues')}
            className="w-full mt-3 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center justify-between"
          >
            <span>Ver detalle de casos en legajos</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Right: School Modality Breakdown (Tiempo Completo, Tiempo Extendido, etc.) */}
        <div className="lg:col-span-7 bg-slate-50/70 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <SchoolIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Modalidades de Escuelas y Cobertura</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Distribución institucional (Tiempo Completo, Tiempo Extendido, Aprender, etc.) y comensales.
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                {totalFilteredSchools} escuelas
              </span>
            </div>

            {/* Modalities Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 mt-3">
              {modalityStats.map(mod => {
                const isTiempoCompleto = mod.modality === 'Tiempo Completo';
                const isTiempoExtendido = mod.modality === 'Tiempo Extendido';
                const isEspecial = mod.modality === 'Escuelas de Educación Especial';
                const isEdea = mod.modality === 'Escuelas de Educación Artística (EDEA)';
                const isTpa = mod.modality === 'TPA';

                return (
                  <div
                    key={mod.modality}
                    onClick={() => onNavigateToSchools(`modality:${mod.modality}`)}
                    className={`p-2.5 sm:p-3 rounded-xl border transition cursor-pointer flex items-center justify-between group ${
                      isTiempoCompleto
                        ? 'bg-purple-50/80 border-purple-200 hover:border-purple-400 hover:bg-purple-100/70 shadow-2xs'
                        : isTiempoExtendido
                        ? 'bg-indigo-50/80 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-100/70 shadow-2xs'
                        : isEspecial
                        ? 'bg-rose-50/80 border-rose-200 hover:border-rose-400 hover:bg-rose-100/70 shadow-2xs'
                        : isEdea
                        ? 'bg-fuchsia-50/80 border-fuchsia-200 hover:border-fuchsia-400 hover:bg-fuchsia-100/70 shadow-2xs'
                        : isTpa
                        ? 'bg-cyan-50/80 border-cyan-200 hover:border-cyan-400 hover:bg-cyan-100/70 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-black ${
                          isTiempoCompleto 
                            ? 'text-purple-950' 
                            : isTiempoExtendido 
                            ? 'text-indigo-950' 
                            : isEspecial
                            ? 'text-rose-950'
                            : isEdea
                            ? 'text-fuchsia-950'
                            : isTpa
                            ? 'text-cyan-950'
                            : 'text-slate-900'
                        }`}>
                          {mod.modality}
                        </span>
                        {isTiempoCompleto && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-200 text-purple-900">
                            Prioritario PAE
                          </span>
                        )}
                        {isEspecial && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-200 text-rose-900">
                            Menúes Adaptados
                          </span>
                        )}
                        {isTpa && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-cyan-200 text-cyan-900">
                            Talleres
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        <span>{mod.totalDiners.toLocaleString()} alumnos</span>
                        {mod.activeIssues > 0 && (
                          <span className="text-rose-600 font-bold ml-1.5">
                            • {mod.activeIssues} {mod.activeIssues === 1 ? 'caso' : 'casos'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-lg font-black text-slate-900 leading-none block">
                          {mod.count}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          escuelas
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer note with quick action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] sm:text-[11px] text-slate-500 pt-3 border-t border-slate-200/80 mt-3">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Toca cualquier modalidad para filtrar directamente las escuelas del departamento.</span>
            </span>
            <button
              onClick={() => onNavigateToSchools('all')}
              className="text-emerald-700 hover:text-emerald-800 font-bold underline sm:no-underline text-left sm:text-right"
            >
              Ver todas las escuelas →
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

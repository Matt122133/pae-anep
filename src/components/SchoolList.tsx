import React, { useState, useMemo } from 'react';
import { School, StaffMember, SchoolIssue, Visit } from '../types';
import { getHealthCardStatus } from '../services/storage';
import { 
  Search, 
  Filter, 
  Building2, 
  MapPin, 
  Calendar, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Utensils, 
  ArrowUpDown, 
  LayoutGrid, 
  List,
  Plus,
  Printer,
  Droplets,
  Milk,
  UserCheck,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CalendarDays,
  Sparkles,
  RotateCcw
} from 'lucide-react';

interface SchoolListProps {
  schools: School[];
  staff: StaffMember[];
  issues?: SchoolIssue[];
  visits?: Visit[];
  onSelectSchool: (school: School) => void;
  onOpenNewSchoolModal: () => void;
  onOpenReport?: (school: School) => void;
  initialFilter?: string;
}

export type RiskLevelFilter = 'Todos' | 'alto' | 'medio' | 'bajo' | 'con_observaciones' | 'alerta_carne';
export type VisitDateFilter = 'Todas' | 'sin_visita' | 'menos_30' | '30_60' | 'mas_60' | 'este_mes' | 'rango';

export const SchoolList: React.FC<SchoolListProps> = ({
  schools: todasLasEscuelas,
  staff,
  issues = [],
  visits = [],
  onSelectSchool,
  onOpenNewSchoolModal,
  onOpenReport,
  initialFilter
}) => {
  // Las dadas de baja no aparecen salvo que se pidan: siguen consultables
  // (baja lógica, FR-015).
  const [verInactivas, setVerInactivas] = useState(false);
  const schools = useMemo(
    () => (verInactivas ? todasLasEscuelas : todasLasEscuelas.filter(s => s.active !== false)),
    [todasLasEscuelas, verInactivas],
  );
  const cantidadInactivas = todasLasEscuelas.filter(s => s.active === false).length;
  const parseInitialFilters = (filter?: string) => {
    let modality = 'Todas';
    let risk: RiskLevelFilter = 'Todos';
    let visitDate: VisitDateFilter = 'Todas';
    let area: 'Todas' | 'Rural' | 'Urbana' = 'Todas';
    let water: 'Todas' | 'allowance' | 'ose' = 'Todas';

    if (filter) {
      if (filter.startsWith('modality:')) {
        let m = filter.replace('modality:', '');
        if (m === 'Especial' || m === 'Educación Especial') m = 'Escuelas de Educación Especial';
        if (m === 'EDEA') m = 'Escuelas de Educación Artística (EDEA)';
        modality = m;
      } else if (filter === 'unvisited') {
        visitDate = 'sin_visita';
      } else if (filter === 'visited') {
        visitDate = 'menos_30';
      } else if (filter === 'issues') {
        risk = 'con_observaciones';
      } else if (filter === 'carne_alert') {
        risk = 'alerta_carne';
      } else if (filter === 'Rural' || filter === 'Urbana') {
        area = filter;
      } else if (filter === 'allowance') {
        water = 'allowance';
      }
    }

    return { modality, risk, visitDate, area, water };
  };

  const parsed = parseInitialFilters(initialFilter);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<'Todas' | 'Rural' | 'Urbana'>(parsed.area);
  const [selectedModality, setSelectedModality] = useState<string>(parsed.modality);
  const [selectedRisk, setSelectedRisk] = useState<RiskLevelFilter>(parsed.risk);
  const [selectedVisitDate, setSelectedVisitDate] = useState<VisitDateFilter>(parsed.visitDate);
  const [visitDateFrom, setVisitDateFrom] = useState('');
  const [visitDateTo, setVisitDateTo] = useState('');
  const [selectedWater, setSelectedWater] = useState<'Todas' | 'allowance' | 'ose'>(parsed.water);
  const [selectedInspector, setSelectedInspector] = useState('Todas');
  const [sortBy, setSortBy] = useState<'number' | 'last_visit_desc' | 'last_visit_asc' | 'visits' | 'issues' | 'diners'>('number');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(
    parsed.modality !== 'Todas' || parsed.risk !== 'Todos' || parsed.visitDate !== 'Todas'
  );

  // Sync if initialFilter prop changes
  React.useEffect(() => {
    if (initialFilter) {
      const p = parseInitialFilters(initialFilter);
      setSelectedModality(p.modality);
      setSelectedRisk(p.risk);
      setSelectedVisitDate(p.visitDate);
      setSelectedArea(p.area);
      setSelectedWater(p.water);
      if (p.modality !== 'Todas' || p.risk !== 'Todos' || p.visitDate !== 'Todas') {
        setShowAdvancedFilters(true);
      }
    }
  }, [initialFilter]);

  // Map schoolId -> staff with warning/expired health cards
  const healthAlertSchoolIds = useMemo(() => {
    const alertIds = new Set<string>();
    staff.forEach(s => {
      const status = getHealthCardStatus(s.healthCardValidUntil);
      if (status === 'expired' || status === 'warning') {
        alertIds.add(s.schoolId);
      }
    });
    return alertIds;
  }, [staff]);

  // Map schoolId -> staff count
  const staffCountMap = useMemo(() => {
    const map = new Map<string, number>();
    staff.forEach(s => {
      map.set(s.schoolId, (map.get(s.schoolId) || 0) + 1);
    });
    return map;
  }, [staff]);

  // Map schoolId -> latest visit info
  const schoolLastVisitMap = useMemo(() => {
    const today = new Date();
    const map = new Map<string, { date: string | null; daysAgo: number | null; visitCount: number }>();

    schools.forEach(school => {
      // Find all completed visits for this school
      const schoolVisits = visits.filter(v => v.schoolId === school.id && v.status !== 'Cancelada');
      let latestDateStr = school.lastVisitDate || null;

      schoolVisits.forEach(v => {
        if (!latestDateStr || v.date > latestDateStr) {
          latestDateStr = v.date;
        }
      });

      let daysAgo: number | null = null;
      if (latestDateStr) {
        const vDate = new Date(latestDateStr + 'T12:00:00');
        if (!isNaN(vDate.getTime())) {
          const diffMs = today.getTime() - vDate.getTime();
          daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }
      }

      map.set(school.id, {
        date: latestDateStr,
        daysAgo,
        visitCount: Math.max(school.totalVisits, schoolVisits.length)
      });
    });

    return map;
  }, [schools, visits]);

  // Map schoolId -> Observation Risk info
  const schoolRiskMap = useMemo(() => {
    const map = new Map<string, {
      level: 'alto' | 'medio' | 'bajo';
      totalActive: number;
      criticalCount: number;
      mediumCount: number;
      lightCount: number;
    }>();

    schools.forEach(school => {
      const schoolIssues = issues.filter(i => i.schoolId === school.id && i.status !== 'Resuelto');
      const totalActive = schoolIssues.length > 0 ? schoolIssues.length : school.activeIssuesCount;
      const criticalCount = schoolIssues.filter(i => i.severity === 'Crítica').length;
      const mediumCount = schoolIssues.filter(i => i.severity === 'Media').length;
      const lightCount = schoolIssues.filter(i => i.severity === 'Leve').length;

      let level: 'alto' | 'medio' | 'bajo' = 'bajo';
      if (criticalCount > 0 || totalActive >= 3) {
        level = 'alto';
      } else if (totalActive > 0) {
        level = 'medio';
      }

      map.set(school.id, {
        level,
        totalActive,
        criticalCount,
        mediumCount,
        lightCount
      });
    });

    return map;
  }, [schools, issues]);

  // Unique inspectors
  const inspectors = useMemo(() => {
    const set = new Set(schools.map(s => s.assignedInspector).filter(Boolean) as string[]);
    return ['Todas', ...Array.from(set).sort()];
  }, [schools]);

  // Modalities list
  const modalities = useMemo(() => {
    return [
      'Todas',
      'Tiempo Completo',
      'Tiempo Extendido',
      'Escuelas de Educación Especial',
      'Escuelas de Educación Artística (EDEA)',
      'TPA',
      'Aprender',
      'Rural',
      'Común',
      'Práctica'
    ];
  }, []);

  // Counts for filters
  const ruralCount = useMemo(() => schools.filter(s => s.areaType === 'Rural').length, [schools]);
  const urbanaCount = useMemo(() => schools.filter(s => s.areaType === 'Urbana').length, [schools]);
  const waterAllowanceCount = useMemo(() => schools.filter(s => s.waterPurchaseAllowance).length, [schools]);

  const modalityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    modalities.forEach(m => {
      if (m === 'Todas') {
        counts[m] = schools.length;
      } else if (m === 'Escuelas de Educación Especial') {
        counts[m] = schools.filter(s => s.modality === 'Escuelas de Educación Especial' || (s.modality as string) === 'Especial' || (s.modality as string) === 'Educación Especial').length;
      } else if (m === 'Escuelas de Educación Artística (EDEA)') {
        counts[m] = schools.filter(s => s.modality === 'Escuelas de Educación Artística (EDEA)' || (s.modality as string) === 'EDEA').length;
      } else {
        counts[m] = schools.filter(s => s.modality === m).length;
      }
    });
    return counts;
  }, [schools, modalities]);

  const riskCounts = useMemo(() => {
    let alto = 0;
    let medio = 0;
    let bajo = 0;
    let conObs = 0;
    schools.forEach(s => {
      const risk = schoolRiskMap.get(s.id);
      if (risk) {
        if (risk.level === 'alto') alto++;
        else if (risk.level === 'medio') medio++;
        else bajo++;
        if (risk.totalActive > 0) conObs++;
      }
    });
    return { alto, medio, bajo, conObs, alertaCarne: healthAlertSchoolIds.size };
  }, [schools, schoolRiskMap, healthAlertSchoolIds]);

  const visitDateCounts = useMemo(() => {
    let sinVisita = 0;
    let menos30 = 0;
    let entre30y60 = 0;
    let mas60 = 0;
    let esteMes = 0;
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);

    schools.forEach(s => {
      const vInfo = schoolLastVisitMap.get(s.id);
      if (!vInfo || !vInfo.date || vInfo.visitCount === 0) {
        sinVisita++;
      } else {
        if (vInfo.daysAgo !== null && vInfo.daysAgo <= 30) menos30++;
        if (vInfo.daysAgo !== null && vInfo.daysAgo > 30 && vInfo.daysAgo <= 60) entre30y60++;
        if (vInfo.daysAgo !== null && vInfo.daysAgo > 60) mas60++;
        if (vInfo.date.startsWith(currentMonthPrefix)) esteMes++;
      }
    });

    return { sinVisita, menos30, entre30y60, mas60, esteMes };
  }, [schools, schoolLastVisitMap]);

  // Current Month string for label
  const currentMonthName = useMemo(() => {
    return new Intl.DateTimeFormat('es-UY', { month: 'long' }).format(new Date());
  }, []);

  // Filtered schools
  const filteredSchools = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);

    return schools.filter(s => {
      // Search term (multi-field)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const numQuery = query.replace(/^n[°ºo]?\s*/i, '').trim();

        const matchesNumber = s.number.toString() === numQuery || s.number.toString().includes(numQuery);
        const matchesName = s.name.toLowerCase().includes(query);
        const matchesAddress = s.address.toLowerCase().includes(query);
        const matchesZone = (s.zone || '').toLowerCase().includes(query);
        const matchesPrincipal = s.principalName.toLowerCase().includes(query);
        const matchesCook = s.headCookName.toLowerCase().includes(query);
        const matchesInspector = (s.assignedInspector || '').toLowerCase().includes(query);
        const matchesModality = s.modality.toLowerCase().includes(query);

        if (!matchesNumber && !matchesName && !matchesAddress && !matchesZone && !matchesPrincipal && !matchesCook && !matchesInspector && !matchesModality) {
          return false;
        }
      }

      // Area filter
      if (selectedArea !== 'Todas' && s.areaType !== selectedArea) {
        return false;
      }

      // Modality filter
      if (selectedModality !== 'Todas') {
        if (selectedModality === 'Escuelas de Educación Especial' || selectedModality === 'Especial') {
          if (s.modality !== 'Escuelas de Educación Especial' && (s.modality as string) !== 'Especial' && (s.modality as string) !== 'Educación Especial') return false;
        } else if (selectedModality === 'Escuelas de Educación Artística (EDEA)' || selectedModality === 'EDEA') {
          if (s.modality !== 'Escuelas de Educación Artística (EDEA)' && (s.modality as string) !== 'EDEA') return false;
        } else if (s.modality !== selectedModality) {
          return false;
        }
      }

      // Observation Risk filter
      const riskInfo = schoolRiskMap.get(s.id);
      if (selectedRisk === 'alto' && riskInfo?.level !== 'alto') return false;
      if (selectedRisk === 'medio' && riskInfo?.level !== 'medio') return false;
      if (selectedRisk === 'bajo' && riskInfo?.level !== 'bajo') return false;
      if (selectedRisk === 'con_observaciones' && (!riskInfo || riskInfo.totalActive === 0)) return false;
      if (selectedRisk === 'alerta_carne' && !healthAlertSchoolIds.has(s.id)) return false;

      // Last visit date filter
      const visitInfo = schoolLastVisitMap.get(s.id);
      if (selectedVisitDate === 'sin_visita') {
        if (visitInfo && visitInfo.date && visitInfo.visitCount > 0) return false;
      } else if (selectedVisitDate === 'menos_30') {
        if (!visitInfo || !visitInfo.date || visitInfo.daysAgo === null || visitInfo.daysAgo > 30) return false;
      } else if (selectedVisitDate === '30_60') {
        if (!visitInfo || !visitInfo.date || visitInfo.daysAgo === null || visitInfo.daysAgo <= 30 || visitInfo.daysAgo > 60) return false;
      } else if (selectedVisitDate === 'mas_60') {
        // More than 60 days without visit
        if (!visitInfo || !visitInfo.date || visitInfo.daysAgo === null || visitInfo.daysAgo <= 60) return false;
      } else if (selectedVisitDate === 'este_mes') {
        if (!visitInfo || !visitInfo.date || !visitInfo.date.startsWith(currentMonthPrefix)) return false;
      } else if (selectedVisitDate === 'rango') {
        if (visitDateFrom && (!visitInfo || !visitInfo.date || visitInfo.date < visitDateFrom)) return false;
        if (visitDateTo && (!visitInfo || !visitInfo.date || visitInfo.date > visitDateTo)) return false;
      }

      // Water supply filter
      if (selectedWater === 'allowance' && !s.waterPurchaseAllowance) return false;
      if (selectedWater === 'ose' && !s.hasWaterSupply) return false;

      // Inspector filter
      if (selectedInspector !== 'Todas' && s.assignedInspector !== selectedInspector) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'number') return a.number - b.number;
      if (sortBy === 'visits') return b.totalVisits - a.totalVisits;
      if (sortBy === 'issues') {
        const riskA = schoolRiskMap.get(a.id)?.totalActive || a.activeIssuesCount;
        const riskB = schoolRiskMap.get(b.id)?.totalActive || b.activeIssuesCount;
        return riskB - riskA;
      }
      if (sortBy === 'diners') return b.studentDinersCount - a.studentDinersCount;
      if (sortBy === 'last_visit_desc') {
        const dateA = schoolLastVisitMap.get(a.id)?.date || '';
        const dateB = schoolLastVisitMap.get(b.id)?.date || '';
        return dateB.localeCompare(dateA);
      }
      if (sortBy === 'last_visit_asc') {
        const dateA = schoolLastVisitMap.get(a.id)?.date || '9999-99-99';
        const dateB = schoolLastVisitMap.get(b.id)?.date || '9999-99-99';
        return dateA.localeCompare(dateB);
      }
      return 0;
    });
  }, [
    schools,
    searchTerm,
    selectedArea,
    selectedModality,
    selectedRisk,
    selectedVisitDate,
    visitDateFrom,
    visitDateTo,
    selectedWater,
    selectedInspector,
    sortBy,
    schoolRiskMap,
    schoolLastVisitMap,
    healthAlertSchoolIds
  ]);

  // Count active filters for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (selectedArea !== 'Todas') count++;
    if (selectedModality !== 'Todas') count++;
    if (selectedRisk !== 'Todos') count++;
    if (selectedVisitDate !== 'Todas') count++;
    if (selectedWater !== 'Todas') count++;
    if (selectedInspector !== 'Todas') count++;
    return count;
  }, [searchTerm, selectedArea, selectedModality, selectedRisk, selectedVisitDate, selectedWater, selectedInspector]);

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedArea('Todas');
    setSelectedModality('Todas');
    setSelectedRisk('Todos');
    setSelectedVisitDate('Todas');
    setVisitDateFrom('');
    setVisitDateTo('');
    setSelectedWater('Todas');
    setSelectedInspector('Todas');
    setSortBy('number');
  };

  const formatDateDisplay = (dateStr?: string | null) => {
    if (!dateStr) return 'Sin visitas';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Search and Filters Main Container */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200/90 space-y-4">
        
        {/* Top Header with Title, Mode & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
                Directorio Oficial • 140 Escuelas de Tacuarembó
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                PAE • DGEIP
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Supervisión de comedores escolares, relevamiento higiénico-sanitario, control de menús y seguimiento de itinerario.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              className="p-2 sm:px-3 sm:py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition min-h-[44px]"
              title={viewMode === 'grid' ? 'Cambiar a vista de tabla' : 'Cambiar a vista de tarjetas'}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
              <span className="hidden sm:inline">{viewMode === 'grid' ? 'Ver Tabla' : 'Ver Tarjetas'}</span>
            </button>

            <button
              onClick={onOpenNewSchoolModal}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Escuela</span>
            </button>
          </div>
        </div>

        {/* 1. BARRA DE BÚSQUEDA PROMINENTE Y RESPONSIVE */}
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por N° escuela, nombre, modalidad (ej: Tiempo Completo), inspector, cocinera..."
              className="w-full pl-11 pr-24 py-3 bg-slate-50 border border-slate-300 hover:border-slate-400 focus:border-emerald-600 focus:bg-white rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:ring-4 focus:ring-emerald-500/10 outline-none transition placeholder:text-slate-400 min-h-[46px]"
            />
            
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-lg transition min-w-[32px] min-h-[32px] flex items-center justify-center"
                  title="Borrar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <span className="hidden sm:inline-block text-[11px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-lg">
                {filteredSchools.length} {filteredSchools.length === 1 ? 'escuela' : 'escuelas'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. BARRA DE ACCIONES DE FILTRO: BOTÓN DE FILTROS AVANZADOS + CHIPS RÁPIDOS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          
          {/* Quick primary filters: Ámbito y Filtros Avanzados Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Toggle Button Filtros Avanzados */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition min-h-[40px] border ${
                showAdvancedFilters || activeFiltersCount > 0
                  ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filtros Avanzados</span>
              {activeFiltersCount > 0 && (
                <span className="bg-emerald-400 text-emerald-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
              {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Ámbito Selector Rápido */}
            <div className="flex items-center bg-slate-100/90 rounded-xl p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedArea('Todas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[32px] ${
                  selectedArea === 'Todas'
                    ? 'bg-white text-slate-900 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({schools.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedArea('Rural')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[32px] flex items-center gap-1 ${
                  selectedArea === 'Rural'
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'text-amber-900 hover:text-amber-950'
                }`}
              >
                🌾 Rurales ({ruralCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedArea('Urbana')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[32px] flex items-center gap-1 ${
                  selectedArea === 'Urbana'
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'text-blue-900 hover:text-blue-950'
                }`}
              >
                🏢 Urbanas ({urbanaCount})
              </button>
            </div>

            {/* Rubro Agua Rápido */}
            <button
              type="button"
              onClick={() => setSelectedWater(selectedWater === 'allowance' ? 'Todas' : 'allowance')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border min-h-[40px] ${
                selectedWater === 'allowance'
                  ? 'bg-sky-700 text-white border-sky-800 shadow-2xs'
                  : 'bg-white text-sky-900 hover:bg-sky-50 border-sky-300'
              }`}
              title="Escuelas que reciben rubro PAE para compra de agua potable"
            >
              <Droplets className="w-3.5 h-3.5 text-sky-500" />
              <span>Rubro Agua ({waterAllowanceCount})</span>
            </button>
          </div>

          {/* Quick Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline font-semibold">Ordenar:</span>
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-2 rounded-xl border border-slate-300 w-full sm:w-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer w-full"
              >
                <option value="number">N° Escuela (1 - 140)</option>
                <option value="last_visit_desc">Última Visita (Más reciente)</option>
                <option value="last_visit_asc">Última Visita (Más antigua / Sin visita)</option>
                <option value="issues">Nivel de Riesgo (Más casos abiertos)</option>
                <option value="visits">Más Visitas Realizadas</option>
                <option value="diners">Más Alumnos Comensales</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. PANEL EXPANDIBLE DE FILTROS AVANZADOS */}
        {showAdvancedFilters && (
          <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50 to-emerald-50/20 rounded-2xl border border-emerald-100/90 space-y-4 animate-in slide-in-from-top-2 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Criterios de Filtrado Avanzado
                </h3>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs text-rose-700 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restablecer todos
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* FILTRO 1: MODALIDAD EDUCATIVA */}
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    Modalidad Escolar:
                  </span>
                  {selectedModality !== 'Todas' && (
                    <span className="text-[10px] text-emerald-700 font-bold uppercase">Filtrado</span>
                  )}
                </label>
                <select
                  value={selectedModality}
                  onChange={e => setSelectedModality(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {modalities.map(mod => (
                    <option key={mod} value={mod}>
                      {mod === 'Todas' 
                        ? `Todas las Modalidades (${schools.length})` 
                        : mod === 'Tiempo Completo' 
                        ? `⭐ Tiempo Completo (${modalityCounts[mod] || 0})` 
                        : `${mod} (${modalityCounts[mod] || 0})`}
                    </option>
                  ))}
                </select>

                {/* Quick modality chips */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {[
                    { key: 'Tiempo Completo', label: '⭐ T. Completo' },
                    { key: 'Tiempo Extendido', label: 'T. Extendido' },
                    { key: 'Escuelas de Educación Especial', label: 'Ed. Especial' },
                    { key: 'Escuelas de Educación Artística (EDEA)', label: 'EDEA (Artística)' },
                    { key: 'TPA', label: 'TPA' },
                    { key: 'Aprender', label: 'Aprender' },
                    { key: 'Rural', label: 'Rural' },
                    { key: 'Común', label: 'Común' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedModality(selectedModality === key ? 'Todas' : key)}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition border ${
                        selectedModality === key
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                      }`}
                    >
                      {label} ({modalityCounts[key] || 0})
                    </button>
                  ))}
                </div>
              </div>

              {/* FILTRO 2: NIVEL DE RIESGO DE OBSERVACIONES */}
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    Riesgo de Observaciones:
                  </span>
                  {selectedRisk !== 'Todos' && (
                    <span className="text-[10px] text-rose-700 font-bold uppercase">Filtrado</span>
                  )}
                </label>
                <select
                  value={selectedRisk}
                  onChange={e => setSelectedRisk(e.target.value as RiskLevelFilter)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Todos">Todos los Niveles de Riesgo</option>
                  <option value="alto">🔴 Alto Riesgo / Casos Críticos ({riskCounts.alto})</option>
                  <option value="medio">🟡 Riesgo Medio / Con Casos ({riskCounts.medio})</option>
                  <option value="bajo">🟢 Bajo Riesgo / Al Día ({riskCounts.bajo})</option>
                  <option value="con_observaciones">⚠️ Cualquier Observación Pendiente ({riskCounts.conObs})</option>
                  <option value="alerta_carne">📋 Alerta de Carné de Auxiliares ({riskCounts.alertaCarne})</option>
                </select>

                <div className="flex flex-wrap gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedRisk(selectedRisk === 'alto' ? 'Todos' : 'alto')}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold border transition ${
                      selectedRisk === 'alto'
                        ? 'bg-rose-700 text-white border-rose-800'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    🔴 Alto ({riskCounts.alto})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRisk(selectedRisk === 'medio' ? 'Todos' : 'medio')}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold border transition ${
                      selectedRisk === 'medio'
                        ? 'bg-amber-600 text-white border-amber-700'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    🟡 Medio ({riskCounts.medio})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRisk(selectedRisk === 'bajo' ? 'Todos' : 'bajo')}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold border transition ${
                      selectedRisk === 'bajo'
                        ? 'bg-emerald-700 text-white border-emerald-800'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    🟢 Al Día ({riskCounts.bajo})
                  </button>
                </div>
              </div>

              {/* FILTRO 3: FECHA DE ÚLTIMA VISITA */}
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                    Fecha de Última Visita:
                  </span>
                  {selectedVisitDate !== 'Todas' && (
                    <span className="text-[10px] text-blue-700 font-bold uppercase">Filtrado</span>
                  )}
                </label>
                <select
                  value={selectedVisitDate}
                  onChange={e => setSelectedVisitDate(e.target.value as VisitDateFilter)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Todas">Cualquier Fecha de Visita</option>
                  <option value="sin_visita">🚨 Sin Visitas Registradas ({visitDateCounts.sinVisita})</option>
                  <option value="menos_30">📅 Visitadas en últimos 30 días ({visitDateCounts.menos30})</option>
                  <option value="30_60">⏳ Entre 30 y 60 días ({visitDateCounts.entre30y60})</option>
                  <option value="mas_60">⚠️ Más de 60 días sin visita ({visitDateCounts.mas60})</option>
                  <option value="este_mes">🗓️ En este mes ({currentMonthName}) ({visitDateCounts.esteMes})</option>
                  <option value="rango">📆 Rango de fechas específico...</option>
                </select>

                {/* Sub-inputs if range is selected */}
                {selectedVisitDate === 'rango' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block">Desde:</span>
                      <input
                        type="date"
                        value={visitDateFrom}
                        onChange={e => setVisitDateFrom(e.target.value)}
                        className="w-full p-1 text-[11px] border border-slate-200 rounded bg-slate-50"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block">Hasta:</span>
                      <input
                        type="date"
                        value={visitDateTo}
                        onChange={e => setVisitDateTo(e.target.value)}
                        className="w-full p-1 text-[11px] border border-slate-200 rounded bg-slate-50"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedVisitDate(selectedVisitDate === 'sin_visita' ? 'Todas' : 'sin_visita')}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold border transition ${
                      selectedVisitDate === 'sin_visita'
                        ? 'bg-rose-700 text-white border-rose-800'
                        : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    🚨 Sin Visita ({visitDateCounts.sinVisita})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVisitDate(selectedVisitDate === 'mas_60' ? 'Todas' : 'mas_60')}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold border transition ${
                      selectedVisitDate === 'mas_60'
                        ? 'bg-amber-600 text-white border-amber-700'
                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    ⚠️ &gt;60 días ({visitDateCounts.mas60})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVisitDate(selectedVisitDate === 'menos_30' ? 'Todas' : 'menos_30')}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold border transition ${
                      selectedVisitDate === 'menos_30'
                        ? 'bg-emerald-700 text-white border-emerald-800'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    📅 &lt;30 días ({visitDateCounts.menos30})
                  </button>
                </div>
              </div>

              {/* FILTRO 4: INSPECTOR/A DE ZONA */}
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                    Inspector/a de Zona:
                  </span>
                  {selectedInspector !== 'Todas' && (
                    <span className="text-[10px] text-teal-700 font-bold uppercase">Filtrado</span>
                  )}
                </label>
                <select
                  value={selectedInspector}
                  onChange={e => setSelectedInspector(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 truncate"
                >
                  {inspectors.map(ins => (
                    <option key={ins} value={ins}>
                      {ins === 'Todas' ? 'Todos los Inspectores de Zona' : ins}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 pt-0.5">
                  Supervisión técnica de zona en Tacuarembó.
                </p>
              </div>

              {/* FILTRO 5: SUMINISTRO DE AGUA */}
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-sky-600" />
                    Abastecimiento de Agua:
                  </span>
                  {selectedWater !== 'Todas' && (
                    <span className="text-[10px] text-sky-700 font-bold uppercase">Filtrado</span>
                  )}
                </label>
                <select
                  value={selectedWater}
                  onChange={e => setSelectedWater(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Todas">Todos los Sistemas de Agua</option>
                  <option value="allowance">Reciben Rubro Compra Agua ({waterAllowanceCount})</option>
                  <option value="ose">Conexión por Red OSE ({schools.length - waterAllowanceCount})</option>
                </select>
                <p className="text-[10px] text-slate-500 pt-0.5">
                  Importante para escuelas rurales sin agua corriente de red.
                </p>
              </div>

              {/* FILTRO 6: ACCIÓN RÁPIDA */}
              <div className="space-y-2 bg-emerald-900 text-white p-3.5 rounded-xl border border-emerald-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-200">
                    Resultados del Filtro
                  </h4>
                  <p className="text-xl font-black mt-1">
                    {filteredSchools.length} <span className="text-xs font-normal text-emerald-300">de {schools.length} escuelas</span>
                  </p>
                  {cantidadInactivas > 0 && (
                    <label className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-200 cursor-pointer">
                      <input type="checkbox" checked={verInactivas} onChange={e => setVerInactivas(e.target.checked)} />
                      Ver dadas de baja ({cantidadInactivas})
                    </label>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition text-center"
                  >
                    Restablecer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilters(false)}
                    className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-lg transition text-center"
                  >
                    Cerrar Panel
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 4. BARRA DE FILTROS ACTIVOS CON BADGES DISMISSIBLES */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Filtros aplicados:</span>

            {searchTerm.trim() && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold">
                Búsqueda: &ldquo;{searchTerm}&rdquo;
                <button type="button" onClick={() => setSearchTerm('')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedArea !== 'Todas' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 font-bold">
                Ámbito: {selectedArea}
                <button type="button" onClick={() => setSelectedArea('Todas')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedModality !== 'Todas' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 font-bold">
                Modalidad: {selectedModality}
                <button type="button" onClick={() => setSelectedModality('Todas')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedRisk !== 'Todos' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-900 border border-rose-200 font-bold">
                Riesgo: {selectedRisk === 'alto' ? 'Alto Riesgo' : selectedRisk === 'medio' ? 'Riesgo Medio' : selectedRisk === 'bajo' ? 'Al Día' : selectedRisk === 'con_observaciones' ? 'Con Observaciones' : 'Alerta Carné'}
                <button type="button" onClick={() => setSelectedRisk('Todos')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedVisitDate !== 'Todas' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-bold">
                Última Visita: {selectedVisitDate === 'sin_visita' ? 'Sin Visitas' : selectedVisitDate === 'menos_30' ? '< 30 días' : selectedVisitDate === '30_60' ? '30-60 días' : selectedVisitDate === 'mas_60' ? '> 60 días' : selectedVisitDate === 'este_mes' ? 'Este Mes' : 'Rango'}
                <button type="button" onClick={() => { setSelectedVisitDate('Todas'); setVisitDateFrom(''); setVisitDateTo(''); }} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedWater !== 'Todas' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-900 border border-sky-200 font-bold">
                Agua: {selectedWater === 'allowance' ? 'Rubro Compra Agua' : 'Red OSE'}
                <button type="button" onClick={() => setSelectedWater('Todas')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedInspector !== 'Todas' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 font-bold">
                Inspector: {selectedInspector}
                <button type="button" onClick={() => setSelectedInspector('Todas')} className="hover:text-rose-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={resetAllFilters}
              className="text-xs text-rose-700 hover:text-rose-800 font-extrabold ml-1 hover:underline flex items-center gap-0.5"
            >
              Limpiar todo
            </button>
          </div>
        )}

      </div>

      {/* RESULTADO VACÍO */}
      {filteredSchools.length === 0 && (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            No se encontraron escuelas con los criterios seleccionados
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Prueba ajustando el término de búsqueda o cambiando los filtros avanzados de modalidad, nivel de riesgo o fecha de última visita.
          </p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer todos los filtros
          </button>
        </div>
      )}

      {/* 5. VISTA DE TARJETAS (GRID VIEW) */}
      {viewMode === 'grid' && filteredSchools.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchools.map(school => {
            const hasHealthAlert = healthAlertSchoolIds.has(school.id);
            const staffCount = staffCountMap.get(school.id) || 0;
            const visitInfo = schoolLastVisitMap.get(school.id);
            const riskInfo = schoolRiskMap.get(school.id);

            return (
              <div
                key={school.id}
                onClick={() => onSelectSchool(school)}
                className="bg-white rounded-3xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition cursor-pointer p-5 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  
                  {/* Card Header: School Number, Badges, and Risk Level */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 group-hover:bg-emerald-700 group-hover:text-white transition">
                          N° {school.number}
                        </span>

                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          school.areaType === 'Rural' 
                            ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                        }`}>
                          {school.areaType === 'Rural' ? '🌾 Rural' : '🏢 Urbana'}
                        </span>

                        {/* Modality Badge with standout styling */}
                        <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          school.modality === 'Tiempo Completo'
                            ? 'bg-purple-100 text-purple-950 border-purple-300 shadow-2xs'
                            : school.modality === 'Tiempo Extendido'
                            ? 'bg-indigo-100 text-indigo-950 border-indigo-300'
                            : school.modality === 'Escuelas de Educación Especial' || (school.modality as string) === 'Especial'
                            ? 'bg-rose-100 text-rose-950 border-rose-300'
                            : school.modality === 'Escuelas de Educación Artística (EDEA)'
                            ? 'bg-fuchsia-100 text-fuchsia-950 border-fuchsia-300'
                            : school.modality === 'TPA'
                            ? 'bg-cyan-100 text-cyan-950 border-cyan-300'
                            : school.modality === 'Aprender'
                            ? 'bg-teal-100 text-teal-950 border-teal-300'
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {school.modality === 'Tiempo Completo' ? '⭐ Tiempo Completo' : school.modality}
                        </span>

                        {school.waterPurchaseAllowance && (
                          <span className="text-[10px] bg-sky-100 text-sky-900 border border-sky-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5" title="Recibe rubro para compra de agua potable">
                            <Droplets className="w-2.5 h-2.5 text-sky-600" />
                            Rubro Agua
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-base text-slate-900 group-hover:text-emerald-700 transition leading-snug">
                        {school.name}
                      </h3>
                    </div>

                    {/* Risk Level Badge */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {riskInfo?.level === 'alto' ? (
                        <span className="text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Alto Riesgo ({riskInfo.totalActive})
                        </span>
                      ) : riskInfo?.level === 'medio' ? (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {riskInfo.totalActive} caso(s)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Al día
                        </span>
                      )}

                      {hasHealthAlert && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                          Carné Alerta
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inspector and Locality */}
                  <div className="text-xs text-slate-500 space-y-1">
                    <p className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{school.address} {school.zone ? `(${school.zone})` : ''}</span>
                    </p>
                    {school.assignedInspector && (
                      <p className="flex items-center gap-1 text-slate-600">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate text-[11px] font-medium">{school.assignedInspector}</span>
                      </p>
                    )}
                  </div>

                  {/* Principal & Cook */}
                  <div className="text-xs text-slate-600 space-y-0.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <p className="truncate"><strong>Directora:</strong> {school.principalName}</p>
                    <p className="truncate"><strong>Encargada Cocina:</strong> {school.headCookName}</p>
                  </div>

                  {/* Milk Program & Water */}
                  <div className="flex items-center justify-between text-[11px] bg-amber-50/60 px-2.5 py-1 rounded-xl border border-amber-100 text-amber-950 font-medium">
                    <span className="flex items-center gap-1">
                      <Milk className="w-3 h-3 text-amber-700" />
                      {school.milkProgramType}
                    </span>
                    <span className="font-bold">{school.milkPowderKg} kg leche/mes</span>
                  </div>

                  {/* FECHA DE ÚLTIMA VISITA DESTACADA */}
                  <div className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                    !visitInfo?.date || visitInfo.visitCount === 0
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                      : visitInfo.daysAgo !== null && visitInfo.daysAgo > 60
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-emerald-50/50 border-emerald-100 text-emerald-900'
                  }`}>
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="font-semibold truncate">
                        {!visitInfo?.date || visitInfo.visitCount === 0
                          ? 'Sin visitas registradas'
                          : `Última visita: ${formatDateDisplay(visitInfo.date)}`}
                      </span>
                    </div>

                    {visitInfo && visitInfo.daysAgo !== null && visitInfo.daysAgo !== undefined && visitInfo.date && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white/80 shrink-0">
                        {visitInfo.daysAgo === 0 
                          ? 'Hoy' 
                          : visitInfo.daysAgo === 1 
                          ? 'Ayer' 
                          : `Hace ${visitInfo.daysAgo} d`}
                      </span>
                    )}
                  </div>

                </div>

                {/* Card Footer: Diners, Staff & Reports */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1" title="Alumnos comensales">
                      <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                      <strong>{school.studentDinersCount}</strong>
                    </span>
                    <span className="flex items-center gap-1" title="Auxiliares de cocina">
                      <Users className="w-3.5 h-3.5 text-teal-600" />
                      <span>{staffCount} aux</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenReport && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReport(school);
                        }}
                        title="Ver Devolución Oficial / Imprimir Informe PDF"
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    )}
                    {school.totalVisits > 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        {school.totalVisits} visita(s)
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">0 visitas</span>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 6. VISTA DE TABLA (TABLE VIEW) */}
      {viewMode === 'table' && filteredSchools.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3">N°</th>
                  <th className="p-3">Nombre Escuela</th>
                  <th className="p-3">Ámbito</th>
                  <th className="p-3">Modalidad</th>
                  <th className="p-3">Nivel de Riesgo</th>
                  <th className="p-3">Última Visita</th>
                  <th className="p-3">Inspector/a de Zona</th>
                  <th className="p-3">Agua Potable</th>
                  <th className="p-3">Programa Leche</th>
                  <th className="p-3 text-center">Comensales</th>
                  <th className="p-3 text-center">Visitas</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchools.map(school => {
                  const staffCount = staffCountMap.get(school.id) || 0;
                  const visitInfo = schoolLastVisitMap.get(school.id);
                  const riskInfo = schoolRiskMap.get(school.id);

                  return (
                    <tr
                      key={school.id}
                      onClick={() => onSelectSchool(school)}
                      className="hover:bg-slate-50/80 cursor-pointer transition"
                    >
                      <td className="p-3 font-black text-slate-900">#{school.number}</td>
                      <td className="p-3 font-bold text-slate-900">
                        {school.name}
                        <span className="block text-[11px] text-slate-400 font-normal">{school.address}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          school.areaType === 'Rural' 
                            ? 'bg-amber-100 text-amber-900' 
                            : 'bg-blue-100 text-blue-900'
                        }`}>
                          {school.areaType}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
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
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {school.modality === 'Tiempo Completo' ? '⭐ T. Completo' : school.modality}
                        </span>
                      </td>

                      {/* Riesgo de Observaciones */}
                      <td className="p-3">
                        {riskInfo?.level === 'alto' ? (
                          <span className="text-[10px] font-black bg-rose-100 text-rose-900 px-2 py-0.5 rounded-full border border-rose-200">
                            🔴 Alto ({riskInfo.totalActive})
                          </span>
                        ) : riskInfo?.level === 'medio' ? (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                            🟡 Medio ({riskInfo.totalActive})
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                            🟢 Al día
                          </span>
                        )}
                      </td>

                      {/* Última Visita */}
                      <td className="p-3">
                        {visitInfo && visitInfo.date ? (
                          <div>
                            <span className="font-semibold text-slate-900">{formatDateDisplay(visitInfo.date)}</span>
                            {visitInfo.daysAgo !== null && visitInfo.daysAgo !== undefined && (
                              <span className="block text-[10px] text-slate-400">
                                {visitInfo.daysAgo === 0 ? 'Hoy' : `Hace ${visitInfo.daysAgo} días`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sin visitas</span>
                        )}
                      </td>

                      <td className="p-3 text-slate-600 truncate max-w-[160px]">
                        {school.assignedInspector || '-'}
                      </td>
                      <td className="p-3">
                        {school.waterPurchaseAllowance ? (
                          <span className="text-sky-900 font-bold bg-sky-50 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border border-sky-200">
                            <Droplets className="w-3 h-3 text-sky-600" /> Rubro Agua
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Red OSE</span>
                        )}
                      </td>
                      <td className="p-3 text-[11px] text-slate-700">
                        {school.milkProgramType} ({school.milkPowderKg} kg)
                      </td>
                      <td className="p-3 font-semibold text-slate-800 text-center">{school.studentDinersCount}</td>
                      <td className="p-3 font-bold text-emerald-700 text-center">{school.totalVisits}</td>
                      <td className="p-3 text-right">
                        {onOpenReport && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenReport(school);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Ver Devolución Oficial / Imprimir"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

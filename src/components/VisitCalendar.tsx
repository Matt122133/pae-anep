import React, { useState, useMemo } from 'react';
import { School, Visit, VisitStatus } from '../types';
import { aLa } from '../services/institucion';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Building2, 
  FileText, 
  Printer, 
  Search, 
  Filter, 
  List, 
  LayoutGrid, 
  Route, 
  Users, 
  Utensils, 
  Droplets, 
  Milk, 
  AlertTriangle, 
  X, 
  Eye, 
  Edit3, 
  Trash2,
  CalendarCheck,
  Compass,
  Info
} from 'lucide-react';
import { ScheduleVisitModal } from './ScheduleVisitModal';

interface VisitCalendarProps {
  schools: School[];
  visits: Visit[];
  onSelectSchool: (school: School) => void;
  onOpenReport?: (school: School) => void;
  onOpenNewVisit?: (school: School, defaultDate?: string, defaultTime?: string) => void;
  onSaveScheduledVisit: (visit: Visit) => Promise<string | null>;
  onDeleteVisit?: (visitId: string) => void;
  activeUserId?: string;
}

export const VisitCalendar: React.FC<VisitCalendarProps> = ({
  schools,
  visits,
  onSelectSchool,
  onOpenReport,
  onOpenNewVisit,
  onSaveScheduledVisit,
  onDeleteVisit,
  activeUserId = ''
}) => {
  // Current date anchor (defaults to current system date)
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth()); // 0-indexed (8 = Septiembre)
  
  // Selected Day Modal
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Schedule Modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleModalDate, setScheduleModalDate] = useState<string | undefined>(undefined);
  const [scheduleModalSchoolId, setScheduleModalSchoolId] = useState<string | undefined>(undefined);
  const [visitToEdit, setVisitToEdit] = useState<Visit | null>(null);

  // Filters
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');
  const [statusFilter, setStatusFilter] = useState<'Todas' | 'Programada' | 'Realizada'>('Todas');
  const [areaFilter, setAreaFilter] = useState<'Todas' | 'Rural' | 'Urbana'>('Todas');
  const [inspectorFilter, setInspectorFilter] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState('');

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // School dictionary for fast lookups
  const schoolMap = useMemo(() => {
    const map = new Map<string, School>();
    schools.forEach(s => map.set(s.id, s));
    return map;
  }, [schools]);

  // Unique inspectors
  const inspectors = useMemo(() => {
    const set = new Set(schools.map(s => s.assignedInspector).filter(Boolean) as string[]);
    return ['Todas', ...Array.from(set)];
  }, [schools]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleGoToToday = () => {
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  // Month names in Spanish
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const monthLabel = `${monthNames[currentMonth]} ${currentYear}`;
  const currentMonthKey = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;

  // Visits in this month
  const monthVisits = useMemo(() => {
    return visits.filter(v => v.date.startsWith(currentMonthKey));
  }, [visits, currentMonthKey]);

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return monthVisits.filter(v => {
      const school = schoolMap.get(v.schoolId);
      const isProgramada = v.status === 'Programada' || (!v.status && v.date > todayStr);
      const effectiveStatus: VisitStatus = isProgramada ? 'Programada' : 'Realizada';

      // Status filter
      if (statusFilter !== 'Todas' && effectiveStatus !== statusFilter) {
        return false;
      }

      // Area filter
      if (areaFilter !== 'Todas' && school?.areaType !== areaFilter) {
        return false;
      }

      // Inspector filter
      if (inspectorFilter !== 'Todas' && school?.assignedInspector !== inspectorFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesNumber = school?.number.toString().includes(q);
        const matchesName = school?.name.toLowerCase().includes(q);
        const matchesZone = school?.zone?.toLowerCase().includes(q);
        const matchesObj = v.scheduledObjective?.toLowerCase().includes(q);
        const matchesItinerary = v.itineraryNotes?.toLowerCase().includes(q);
        if (!matchesNumber && !matchesName && !matchesZone && !matchesObj && !matchesItinerary) {
          return false;
        }
      }

      return true;
    });
  }, [monthVisits, schoolMap, statusFilter, areaFilter, inspectorFilter, searchTerm, todayStr]);

  // Group filtered visits by date YYYY-MM-DD
  const visitsByDate = useMemo(() => {
    const map = new Map<string, Visit[]>();
    filteredVisits.forEach(v => {
      const list = map.get(v.date) || [];
      list.push(v);
      map.set(v.date, list);
    });
    return map;
  }, [filteredVisits]);

  // Monthly KPI metrics
  const monthStats = useMemo(() => {
    let realizadas = 0;
    let programadas = 0;
    let rurales = 0;
    let urbanas = 0;
    let totalDiners = 0;

    monthVisits.forEach(v => {
      const school = schoolMap.get(v.schoolId);
      const isProgramada = v.status === 'Programada' || (!v.status && v.date > todayStr);
      if (isProgramada) {
        programadas++;
      } else {
        realizadas++;
      }

      if (school) {
        if (school.areaType === 'Rural') rurales++;
        else urbanas++;
        totalDiners += (v.dinersActualCount || school.studentDinersCount || 0);
      }
    });

    return {
      total: monthVisits.length,
      realizadas,
      programadas,
      rurales,
      urbanas,
      totalDiners
    };
  }, [monthVisits, schoolMap, todayStr]);

  // Generate calendar days for the current month
  // Monday = 0 ... Sunday = 6
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // In JS: 0=Sunday, 1=Monday, ..., 6=Saturday.
    // Convert to Monday=0, ..., Sunday=6:
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isPast: boolean;
    }[] = [];

    // Days from previous month
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${(prevMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr
      });
    }

    // Days of current month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr
      });
    }

    // Trailing days from next month to complete standard 35 or 42 grid
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr
      });
    }

    return cells;
  }, [currentYear, currentMonth, todayStr]);

  // Selected Day Visits
  const selectedDayVisits = useMemo(() => {
    if (!selectedDateStr) return [];
    return visits.filter(v => v.date === selectedDateStr);
  }, [visits, selectedDateStr]);

  const openScheduleForDay = (dateStr: string) => {
    setScheduleModalDate(dateStr);
    setScheduleModalSchoolId(undefined);
    setVisitToEdit(null);
    setIsScheduleModalOpen(true);
  };

  const handleEditScheduledVisit = (v: Visit) => {
    setVisitToEdit(v);
    setIsScheduleModalOpen(true);
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 space-y-6">
      
      {/* Header with Title and Month Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <CalendarIcon className="w-5 h-5 text-emerald-700" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Calendario de Visitas e Itinerario de Campo
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              PAE Tacuarembó
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Planificación y seguimiento mensual de visitas técnicas realizadas y programadas a comedores escolares.
          </p>
        </div>

        {/* Month Navigation & Add Schedule Button */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center justify-between sm:justify-start bg-slate-100/90 rounded-2xl p-1 border border-slate-200">
            <button
              onClick={handlePrevMonth}
              title="Mes Anterior"
              className="p-2 sm:p-1.5 hover:bg-white text-slate-700 rounded-xl transition shadow-2xs hover:text-slate-900 min-w-[36px] flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs sm:text-sm font-extrabold text-slate-900 min-w-[120px] text-center select-none">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              title="Mes Siguiente"
              className="p-2 sm:p-1.5 hover:bg-white text-slate-700 rounded-xl transition shadow-2xs hover:text-slate-900 min-w-[36px] flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGoToToday}
              className="flex-1 sm:flex-initial px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition text-center min-h-[40px] flex items-center justify-center"
            >
              Hoy
            </button>

            <button
              onClick={() => {
                setScheduleModalDate(todayStr);
                setScheduleModalSchoolId(undefined);
                setVisitToEdit(null);
                setIsScheduleModalOpen(true);
              }}
              className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>Programar Visita</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Statistics KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/70">
          <span className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
            Total en {monthNames[currentMonth]}
          </span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
            {monthStats.total} <span className="text-[10px] sm:text-xs font-normal text-slate-400">visitas</span>
          </div>
        </div>

        <div className="bg-emerald-50/60 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-emerald-200/70">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Realizadas</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-900 mt-0.5">
            {monthStats.realizadas}
          </div>
        </div>

        <div className="bg-sky-50/60 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-sky-200/70">
          <div className="flex items-center justify-between text-sky-800">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">En Itinerario</span>
            <Clock className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-sky-900 mt-0.5">
            {monthStats.programadas}
          </div>
        </div>

        <div className="bg-amber-50/60 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-amber-200/70">
          <span className="text-[10px] sm:text-[11px] text-amber-900 font-bold uppercase tracking-wider block">
            Ámbito Escolar
          </span>
          <div className="text-[11px] sm:text-xs font-bold text-amber-950 mt-1 flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span>🌾 {monthStats.rurales}</span>
            <span>•</span>
            <span>🏢 {monthStats.urbanas}</span>
          </div>
        </div>

        <div className="bg-teal-50/60 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-teal-200/70 col-span-2 sm:col-span-1">
          <span className="text-[10px] sm:text-[11px] text-teal-900 font-bold uppercase tracking-wider block">
            Comensales Mes
          </span>
          <div className="text-lg sm:text-2xl font-black text-teal-900 mt-0.5">
            {monthStats.totalDiners.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter and View Controls Toolbar */}
      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status and Area Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Estado:
          </span>
          {(['Todas', 'Programada', 'Realizada'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                statusFilter === st
                  ? st === 'Programada'
                    ? 'bg-sky-700 text-white shadow-2xs'
                    : st === 'Realizada'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st === 'Todas' ? 'Todas' : st === 'Programada' ? '🕒 Programadas' : '✅ Realizadas'}
            </button>
          ))}

          <span className="text-slate-300 mx-1">|</span>

          {/* Area Filter */}
          {(['Todas', 'Rural', 'Urbana'] as const).map(area => (
            <button
              key={area}
              onClick={() => setAreaFilter(area)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                areaFilter === area
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {area === 'Todas' ? 'Rural + Urbana' : area === 'Rural' ? '🌾 Rurales' : '🏢 Urbanas'}
            </button>
          ))}
        </div>

        {/* Search, Inspector and View Switcher */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <div className="relative flex-1 sm:flex-initial min-w-[140px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar N°, escuela..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-48"
            />
          </div>

          <select
            value={inspectorFilter}
            onChange={e => setInspectorFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none min-w-[120px] max-w-[160px] truncate"
          >
            {inspectors.map(ins => (
              <option key={ins} value={ins}>
                {ins === 'Todas' ? 'Inspectores' : ins}
              </option>
            ))}
          </select>

          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5 shrink-0">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                viewMode === 'calendar' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vista Grilla de Calendario"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Mes</span>
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                viewMode === 'agenda' ? 'bg-emerald-100 text-emerald-900' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vista Agenda / Lista Cronológica"
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: MONTHLY CALENDAR GRID */}
      {viewMode === 'calendar' && (
        <div className="w-full">
          {/* Mobile touch hint */}
          <div className="sm:hidden flex items-center gap-1.5 text-[11px] text-slate-500 mb-2 px-1">
            <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Toca un día para ver su itinerario detallado o agendar visitas.</span>
          </div>

          <div className="w-full border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 bg-slate-800 text-white text-center text-[10px] sm:text-xs font-extrabold uppercase tracking-wider py-2 sm:py-2.5">
              <span><span className="sm:hidden">Lun</span><span className="hidden sm:inline">Lunes</span></span>
              <span><span className="sm:hidden">Mar</span><span className="hidden sm:inline">Martes</span></span>
              <span><span className="sm:hidden">Mié</span><span className="hidden sm:inline">Miércoles</span></span>
              <span><span className="sm:hidden">Jue</span><span className="hidden sm:inline">Jueves</span></span>
              <span><span className="sm:hidden">Vie</span><span className="hidden sm:inline">Viernes</span></span>
              <span className="text-slate-300"><span className="sm:hidden">Sáb</span><span className="hidden sm:inline">Sábado</span></span>
              <span className="text-slate-300"><span className="sm:hidden">Dom</span><span className="hidden sm:inline">Domingo</span></span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 bg-slate-100">
              {calendarCells.map((cell, idx) => {
                const dayVisits = visitsByDate.get(cell.dateStr) || [];
                const hasVisits = dayVisits.length > 0;
                const scheduledCount = dayVisits.filter(v => v.status === 'Programada' || (!v.status && v.date > todayStr)).length;
                const completedCount = dayVisits.filter(v => v.status === 'Realizada' || (!v.status && v.date <= todayStr)).length;

                return (
                  <div
                    key={`${cell.dateStr}-${idx}`}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className={`min-h-[58px] sm:min-h-[110px] p-1 sm:p-2 flex flex-col justify-between transition cursor-pointer relative group ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-50/60 text-slate-400'
                        : cell.isToday
                        ? 'bg-emerald-50/40'
                        : 'bg-white hover:bg-slate-50/80 active:bg-slate-100'
                    }`}
                  >
                    {/* Day Number and Badges */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] sm:text-xs font-bold inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full ${
                          cell.isToday
                            ? 'bg-emerald-600 text-white shadow-xs font-black'
                            : cell.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {/* Desktop Quick Add Button on Hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openScheduleForDay(cell.dateStr);
                        }}
                        className="hidden sm:block opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-100 rounded-md transition"
                        title={`Agendar visita para el ${cell.dateStr}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* MOBILE DISPLAY: Compact dots and badges */}
                    <div className="sm:hidden flex flex-col items-center justify-center gap-0.5 mt-0.5">
                      {hasVisits ? (
                        <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-md">
                          {scheduledCount > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" title={`${scheduledCount} programadas`} />
                          )}
                          {completedCount > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={`${completedCount} realizadas`} />
                          )}
                          <span className="text-[9px] font-extrabold text-slate-700 leading-none">
                            {dayVisits.length}
                          </span>
                        </div>
                      ) : (
                        <div className="h-4" />
                      )}
                    </div>

                    {/* DESKTOP DISPLAY: Day Visits List */}
                    <div className="hidden sm:block mt-1 space-y-1 flex-1 overflow-y-auto max-h-[85px] pr-0.5">
                      {dayVisits.map(v => {
                        const school = schoolMap.get(v.schoolId);
                        const isProgramada = v.status === 'Programada' || (!v.status && v.date > todayStr);
                        const isRural = school?.areaType === 'Rural';

                        return (
                          <div
                            key={v.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDateStr(cell.dateStr);
                            }}
                            className={`p-1.5 rounded-lg border text-[11px] leading-tight transition cursor-pointer ${
                              isProgramada
                                ? 'bg-sky-50/90 border-sky-300 text-sky-950 hover:bg-sky-100'
                                : 'bg-emerald-50/90 border-emerald-300 text-emerald-950 hover:bg-emerald-100'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 font-bold">
                              <span className="truncate">
                                {isRural ? '🌾' : '🏢'} N° {school?.number || '?'} {school?.name || 'Escuela'}
                              </span>
                              <span className="text-[9px] shrink-0 font-extrabold opacity-80">
                                {v.time}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] mt-0.5 text-slate-500">
                              <span className="truncate max-w-[90px]">
                                {v.itineraryNotes ? v.itineraryNotes.split('(')[0] : school?.zone || ''}
                              </span>
                              <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                isProgramada ? 'bg-sky-200 text-sky-900' : 'bg-emerald-200 text-emerald-900'
                              }`}>
                                {isProgramada ? 'Prog.' : 'Real.'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop subtle footer count if crowded */}
                    {dayVisits.length > 2 && (
                      <span className="hidden sm:block text-[10px] font-bold text-slate-500 text-center mt-1">
                        +{dayVisits.length - 2} más
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: AGENDA / ITINERARIO CHRONOLOGICAL LIST */}
      {viewMode === 'agenda' && (
        <div className="space-y-4">
          {filteredVisits.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-600">No hay visitas agendadas que coincidan con los filtros para este mes.</p>
              <button
                onClick={() => openScheduleForDay(todayStr)}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                Programar Nueva Visita
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              {filteredVisits
                .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                .map(v => {
                  const school = schoolMap.get(v.schoolId);
                  const isProgramada = v.status === 'Programada' || (!v.status && v.date > todayStr);

                  return (
                    <div
                      key={v.id}
                      className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Left: Date badge & Basic Info */}
                      <div className="flex items-start gap-3.5">
                        <div className={`p-2.5 rounded-2xl text-center shrink-0 border min-w-[70px] ${
                          isProgramada
                            ? 'bg-sky-50 border-sky-200 text-sky-900'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        }`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider block">
                            {new Date(v.date + 'T12:00:00').toLocaleDateString('es-UY', { weekday: 'short' })}
                          </span>
                          <span className="text-lg font-black block leading-none my-0.5">
                            {v.date.split('-')[2]}
                          </span>
                          <span className="text-[10px] font-bold block opacity-80">
                            {v.time}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                              N° {school?.number}
                            </span>
                            <h4 
                              onClick={() => school && onSelectSchool(school)}
                              className="font-extrabold text-sm text-slate-900 hover:text-emerald-700 cursor-pointer transition"
                            >
                              {school?.name}
                            </h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              school?.areaType === 'Rural' 
                                ? 'bg-amber-100 text-amber-900' 
                                : 'bg-blue-100 text-blue-900'
                            }`}>
                              {school?.areaType === 'Rural' ? '🌾 Rural' : '🏢 Urbana'}
                            </span>
                            {school?.modality && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
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
                                  : 'bg-slate-100 text-slate-800 border-slate-200'
                              }`}>
                                {school.modality === 'Tiempo Completo' ? '⭐ T. Completo' : school.modality}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isProgramada 
                                ? 'bg-sky-100 text-sky-800 border border-sky-200' 
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {isProgramada ? '🕒 Programada' : '✅ Realizada'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {school?.address} ({school?.zone})
                            </span>
                            <span>•</span>
                            <span>Directora: {school?.principalName}</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold">{school?.studentDinersCount} comensales</span>
                          </p>

                          {/* Circuit / Itinerary route notes */}
                          {v.itineraryNotes && (
                            <div className="text-[11px] text-sky-900 font-medium flex items-center gap-1 bg-sky-50/60 px-2 py-0.5 rounded-md border border-sky-100 inline-flex mt-1">
                              <Route className="w-3 h-3 text-sky-600" />
                              <span>Itinerario: {v.itineraryNotes}</span>
                            </div>
                          )}

                          {/* Scheduled Objective */}
                          {v.scheduledObjective && (
                            <p className="text-xs text-slate-600 italic">
                              <strong>Objetivo:</strong> {v.scheduledObjective}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {isProgramada ? (
                          <>
                            {onOpenNewVisit && school && (
                              <button
                                onClick={() => onOpenNewVisit(school, v.date, v.time)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                                title="Iniciar y registrar la visita oficial"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Realizar Visita</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleEditScheduledVisit(v)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                              title="Reagendar / Modificar Fecha u Horario"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {onDeleteVisit && (
                              <button
                                onClick={() => {
                                  if (confirm(`¿Desea cancelar y eliminar la visita programada ${school ? aLa(school) : 'a la institución'}?`)) {
                                    onDeleteVisit(v.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                                title="Cancelar Programación"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {onOpenReport && school && (
                              <button
                                onClick={() => onOpenReport(school)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                                title="Ver Devolución Oficial / Imprimir Informe"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Devolución Oficial</span>
                              </button>
                            )}
                          </>
                        )}

                        {school && (
                          <button
                            onClick={() => onSelectSchool(school)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition"
                            title="Abrir Legajo de Escuela"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: DAY DETAIL PANEL (When clicking a day in the calendar) */}
      {selectedDateStr && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest block">
                  Itinerario del Día
                </span>
                <h3 className="text-xl font-black text-white capitalize mt-0.5">
                  {new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('es-UY', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDateStr(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">
                  {selectedDayVisits.length} visita(s) registrada(s) para este día
                </span>

                <button
                  onClick={() => openScheduleForDay(selectedDateStr)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar Visita a este Día</span>
                </button>
              </div>

              {selectedDayVisits.length === 0 ? (
                <div className="py-10 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    No hay visitas agendadas para el {selectedDateStr}.
                  </p>
                  <button
                    onClick={() => openScheduleForDay(selectedDateStr)}
                    className="mt-1 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Agendar Visita en este Día
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayVisits.map(v => {
                    const school = schoolMap.get(v.schoolId);
                    const isProgramada = v.status === 'Programada' || (!v.status && v.date > todayStr);

                    return (
                      <div
                        key={v.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-xs transition space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                                N° {school?.number}
                              </span>
                              <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                                {school?.name}
                              </h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                school?.areaType === 'Rural' 
                                  ? 'bg-amber-100 text-amber-900' 
                                  : 'bg-blue-100 text-blue-900'
                              }`}>
                                {school?.areaType === 'Rural' ? '🌾 Rural' : '🏢 Urbana'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{school?.address} ({school?.zone})</span>
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-xs font-black text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200">
                              {v.time} hs
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isProgramada ? 'bg-sky-100 text-sky-900 border border-sky-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}>
                              {isProgramada ? '🕒 Programada' : '✅ Realizada'}
                            </span>
                          </div>
                        </div>

                        {/* Route and Objective if programmed */}
                        {v.itineraryNotes && (
                          <div className="text-xs text-sky-950 bg-sky-50 p-2 rounded-xl border border-sky-200 flex items-center gap-1.5 font-medium">
                            <Route className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                            <span><strong>Ruta:</strong> {v.itineraryNotes}</span>
                          </div>
                        )}

                        {v.scheduledObjective && (
                          <div className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                            <strong>Objetivo previsto:</strong> {v.scheduledObjective}
                          </div>
                        )}

                        {/* Completed visit highlights */}
                        {!isProgramada && (
                          <div className="text-xs text-slate-600 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 space-y-1">
                            <p><strong>Menú servido:</strong> {v.menuServed}</p>
                            <p><strong>Comensales atendidos:</strong> {v.dinersActualCount} niños</p>
                            {v.initialFieldObservations && (
                              <p className="text-slate-500 italic mt-0.5">
                                "{v.initialFieldObservations.slice(0, 140)}..."
                              </p>
                            )}
                          </div>
                        )}

                        {/* School details pills */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200/80">
                          <span>Directora: <strong>{school?.principalName}</strong></span>
                          <span>•</span>
                          <span>Comensales: <strong>{school?.studentDinersCount}</strong></span>
                          <span>•</span>
                          <span>Inspector/a: <strong>{school?.assignedInspector}</strong></span>
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                          <div className="flex items-center gap-2">
                            {school && (
                              <button
                                onClick={() => {
                                  setSelectedDateStr(null);
                                  onSelectSchool(school);
                                }}
                                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver Legajo de Escuela</span>
                              </button>
                            )}

                            {!isProgramada && onOpenReport && school && (
                              <button
                                onClick={() => {
                                  setSelectedDateStr(null);
                                  onOpenReport(school);
                                }}
                                className="text-xs font-bold text-slate-700 hover:text-emerald-800 flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg transition"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Devolución Oficial</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isProgramada && (
                              <>
                                {onOpenNewVisit && school && (
                                  <button
                                    onClick={() => {
                                      setSelectedDateStr(null);
                                      onOpenNewVisit(school, v.date, v.time);
                                    }}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Realizar Visita</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleEditScheduledVisit(v)}
                                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
                                  title="Modificar fecha u horario"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {onDeleteVisit && (
                                  <button
                                    onClick={() => {
                                      if (confirm('¿Desea cancelar esta visita programada?')) {
                                        onDeleteVisit(v.id);
                                        setSelectedDateStr(null);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title="Eliminar programación"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setSelectedDateStr(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SCHEDULE VISIT MODAL */}
      {isScheduleModalOpen && (
        <ScheduleVisitModal
          isOpen={isScheduleModalOpen}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setVisitToEdit(null);
          }}
          schools={schools}
          onSaveScheduledVisit={onSaveScheduledVisit}
          initialDate={scheduleModalDate}
          initialSchoolId={scheduleModalSchoolId}
          visitToEdit={visitToEdit}
          activeUserId={activeUserId}
        />
      )}

    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  ActivityLog, 
  School, 
  PAE_TEAM_MEMBERS, 
  ActivityActionType, 
  ActivityCategory,
  ActivityEventTag,
  ACTIVITY_EVENT_TAG_STYLES,
  ActivityTagStyle
} from '../types';
import { downloadActivityLogsCsv } from '../services/storage';
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Building2, 
  Download, 
  Plus, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  UtensilsCrossed, 
  Clock, 
  ShieldCheck, 
  Printer, 
  FileText, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  Info,
  Droplets,
  Milk,
  Eye,
  RefreshCw
} from 'lucide-react';

interface ActivityLogViewProps {
  logs: ActivityLog[];
  schools: School[];
  onSelectSchool?: (school: School) => void;
  onAddManualLog?: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  scopedSchoolId?: string; // If supplied, restrict and focus on this school
  activeUserId?: string;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({
  logs,
  schools,
  onSelectSchool,
  onAddManualLog,
  scopedSchoolId,
  activeUserId = 'valentina'
}) => {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>(scopedSchoolId || 'all');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  // Modal for new administrative note
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [noteSchoolId, setNoteSchoolId] = useState<string>(scopedSchoolId || (schools[0]?.id || ''));
  const [noteCategory, setNoteCategory] = useState<ActivityCategory>('Nota Administrativa');
  const [noteEventTag, setNoteEventTag] = useState<string>('Acuerdo Administrativo');
  const [noteSelectedTags, setNoteSelectedTags] = useState<string[]>(['Acuerdo Administrativo']);
  const [noteCustomTag, setNoteCustomTag] = useState('');
  const [noteSummary, setNoteSummary] = useState('');
  const [noteDetailsText, setNoteDetailsText] = useState('');

  const scopedSchool = scopedSchoolId ? schools.find(s => s.id === scopedSchoolId) : null;

  // Toggle detail expansion
  const toggleExpand = (id: string) => {
    setExpandedLogIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Expand all / collapse all
  const handleExpandAll = () => {
    if (expandedLogIds.size === filteredLogs.length) {
      setExpandedLogIds(new Set());
    } else {
      setExpandedLogIds(new Set(filteredLogs.map(l => l.id)));
    }
  };

  // Date threshold helper
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Scoped school
      if (scopedSchoolId && log.schoolId !== scopedSchoolId) {
        return false;
      }

      // School filter (if not scoped)
      if (!scopedSchoolId && selectedSchoolFilter !== 'all' && log.schoolId !== selectedSchoolFilter) {
        return false;
      }

      // User filter
      if (selectedUserFilter !== 'all' && log.userId !== selectedUserFilter) {
        return false;
      }

      // Category filter
      if (selectedCategoryFilter !== 'all' && log.category !== selectedCategoryFilter) {
        return false;
      }

      // Event tag filter
      if (selectedTagFilter !== 'all') {
        const hasTag = log.eventTag === selectedTagFilter || (log.tags && log.tags.includes(selectedTagFilter));
        if (!hasTag) return false;
      }

      // Action type filter
      if (selectedActionFilter !== 'all' && log.actionType !== selectedActionFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const logTime = new Date(log.timestamp).getTime();
        if (dateFilter === 'today' && logTime < todayStart) return false;
        if (dateFilter === 'week' && logTime < weekStart) return false;
        if (dateFilter === 'month' && logTime < monthStart) return false;
      }

      // Text search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesSummary = log.summary.toLowerCase().includes(query);
        const matchesSchoolName = (log.schoolName || '').toLowerCase().includes(query);
        const matchesSchoolNum = log.schoolNumber?.toString().includes(query);
        const matchesAuthor = log.userName.toLowerCase().includes(query);
        const matchesNotes = (log.notes || '').toLowerCase().includes(query);
        const matchesTag = (log.eventTag || '').toLowerCase().includes(query) ||
          (log.tags || []).some(t => t.toLowerCase().includes(query));
        const matchesDetails = (log.details || []).some(
          d => d.fieldLabel.toLowerCase().includes(query) || 
               String(d.oldValue || '').toLowerCase().includes(query) ||
               String(d.newValue || '').toLowerCase().includes(query)
        );

        if (!matchesSummary && !matchesSchoolName && !matchesSchoolNum && !matchesAuthor && !matchesNotes && !matchesDetails && !matchesTag) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, scopedSchoolId, selectedSchoolFilter, selectedUserFilter, selectedCategoryFilter, selectedTagFilter, selectedActionFilter, dateFilter, searchTerm]);

  // Tag frequency statistics for badges & quick filters
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach(l => {
      const activeTags = (l.tags && l.tags.length > 0) ? l.tags : (l.eventTag ? [l.eventTag] : []);
      activeTags.forEach(t => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return counts;
  }, [logs]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const todayCount = logs.filter(l => new Date(l.timestamp).getTime() >= todayStart).length;
    const visitsCount = logs.filter(l => l.actionType === 'VISIT_LOG').length;
    const updatesCount = logs.filter(l => l.actionType === 'UPDATE').length;
    const criticalVisitsCount = logs.filter(l => l.eventTag === 'Visita crítica' || (l.tags && l.tags.includes('Visita crítica'))).length;
    const staffChangesCount = logs.filter(l => l.eventTag === 'Cambio de personal' || (l.tags && l.tags.includes('Cambio de personal'))).length;
    const institutionalUpdatesCount = logs.filter(l => l.eventTag === 'Actualización institucional' || (l.tags && l.tags.includes('Actualización institucional'))).length;
    const issuesCount = logs.filter(l => l.category === 'Seguimiento de Casos').length;
    const userBreakdown: Record<string, number> = {};
    logs.forEach(l => {
      userBreakdown[l.userName] = (userBreakdown[l.userName] || 0) + 1;
    });

    return { total, todayCount, visitsCount, updatesCount, criticalVisitsCount, staffChangesCount, institutionalUpdatesCount, issuesCount, userBreakdown };
  }, [logs, todayStart]);

  // Format time relative
  const formatRelativeTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const diffMs = Date.now() - d.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMin < 2) return 'Recién';
      if (diffMin < 60) return `Hace ${diffMin} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      return d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const formatExactDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('es-UY')} a las ${d.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })} hs`;
    } catch {
      return isoString;
    }
  };

  // Action badge renderer
  const renderActionBadge = (actionType: ActivityActionType) => {
    switch (actionType) {
      case 'CREATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Plus className="w-3 h-3 text-emerald-600" />
            Alta
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Sparkles className="w-3 h-3 text-blue-600" />
            Modificación
          </span>
        );
      case 'DELETE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <X className="w-3 h-3 text-rose-600" />
            Baja
          </span>
        );
      case 'STATUS_CHANGE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300">
            <CheckCircle2 className="w-3 h-3 text-teal-600" />
            Resolución / Estado
          </span>
        );
      case 'VISIT_LOG':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <UtensilsCrossed className="w-3 h-3 text-purple-600" />
            Visita Registrada
          </span>
        );
      case 'ADMIN_NOTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <FileText className="w-3 h-3 text-amber-600" />
            Asiento Administrativo
          </span>
        );
      case 'SYNC_OFFLINE_DATA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <RefreshCw className="w-3 h-3 text-amber-700" />
            Sincronización Offline
          </span>
        );
    }
  };

  const renderEventTagBadge = (tag: string, interactive: boolean = true) => {
    const style: ActivityTagStyle = ACTIVITY_EVENT_TAG_STYLES[tag] || {
      label: tag,
      bg: 'bg-slate-50',
      text: 'text-slate-800',
      border: 'border-slate-300',
      dot: 'bg-slate-500',
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 ring-slate-400/20',
      description: 'Etiqueta de evento',
      emoji: '🏷️'
    };

    const isSelected = selectedTagFilter === tag;

    if (interactive) {
      return (
        <button
          key={tag}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedTagFilter(isSelected ? 'all' : tag);
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer select-none shadow-2xs ${
            isSelected 
              ? `${style.badgeClass} ring-2 ring-emerald-500 shadow-sm font-black scale-105` 
              : `${style.badgeClass} hover:opacity-90 hover:scale-[1.02]`
          }`}
          title={`Filtrar por evento: ${tag} (${style.description})`}
        >
          <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0 animate-pulse`} />
          <span>{tag}</span>
        </button>
      );
    }

    return (
      <span
        key={tag}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${style.badgeClass}`}
      >
        <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0`} />
        <span>{tag}</span>
      </span>
    );
  };

  const renderCategoryBadge = (category: ActivityCategory) => {
    const categoryColors: Record<ActivityCategory, string> = {
      'Legajo Institucional': 'bg-slate-100 text-slate-800 border-slate-200',
      'Auxiliares y Personal': 'bg-emerald-50 text-emerald-800 border-emerald-200',
      'Visitas de Campo': 'bg-sky-50 text-sky-800 border-sky-200',
      'Seguimiento de Casos': 'bg-amber-50 text-amber-800 border-amber-200',
      'Agua y Leche': 'bg-cyan-50 text-cyan-800 border-cyan-200',
      'Remitos y Alimentos': 'bg-indigo-50 text-indigo-800 border-indigo-200',
      'Nota Administrativa': 'bg-purple-50 text-purple-800 border-purple-200',
      'Sincronización Offline': 'bg-amber-50 text-amber-900 border-amber-300'
    };

    return (
      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${categoryColors[category] || 'bg-slate-100 text-slate-700'}`}>
        {category}
      </span>
    );
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteSummary.trim()) return;

    const school = schools.find(s => s.id === noteSchoolId);
    const activeUser = PAE_TEAM_MEMBERS.find(m => m.id === activeUserId) || PAE_TEAM_MEMBERS[0];

    const finalTags = Array.from(new Set([
      noteEventTag,
      ...noteSelectedTags,
      ...(noteCustomTag.trim() ? [noteCustomTag.trim()] : [])
    ])).filter(Boolean);

    if (onAddManualLog) {
      onAddManualLog({
        schoolId: school?.id,
        schoolNumber: school?.number,
        schoolName: school?.name,
        userId: activeUser.id,
        userName: activeUser.name,
        userRole: activeUser.role,
        actionType: 'ADMIN_NOTE',
        category: noteCategory,
        eventTag: noteEventTag,
        tags: finalTags,
        summary: noteSummary.trim(),
        details: [],
        notes: noteDetailsText.trim() || undefined
      });
    }

    setNoteSummary('');
    setNoteDetailsText('');
    setNoteCustomTag('');
    setNoteSelectedTags(['Acuerdo Administrativo']);
    setNoteEventTag('Acuerdo Administrativo');
    setIsAddNoteModalOpen(false);
  };

  const resetFilters = () => {
    setSearchTerm('');
    if (!scopedSchoolId) setSelectedSchoolFilter('all');
    setSelectedUserFilter('all');
    setSelectedCategoryFilter('all');
    setSelectedTagFilter('all');
    setSelectedActionFilter('all');
    setDateFilter('all');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <History className="w-3.5 h-3.5" />
              <span>Transparencia & Trazabilidad de Gestión • PAE Tacuarembó</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {scopedSchool ? (
                <>Bitácora del Legajo: Escuela N° {scopedSchool.number}</>
              ) : (
                <>Bitácora de Actividad del Sistema</>
              )}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
              {scopedSchool ? (
                <>Registro cronológico auditable de todas las modificaciones, inspecciones, altas de personal y resoluciones en {scopedSchool.name}.</>
              ) : (
                <>Registro inmutable de cambios importantes en legajos: quién modificó, fecha, hora y detalle de valores alterados en la red de 140 comedores.</>
              )}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onAddManualLog && (
              <button
                type="button"
                onClick={() => setIsAddNoteModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Asentar Nota en Bitácora</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => downloadActivityLogsCsv(filteredLogs)}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold rounded-xl border border-white/20 transition flex items-center gap-2"
              title="Descargar registro de actividad en formato CSV"
            >
              <Download className="w-4 h-4 text-emerald-300" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold rounded-xl border border-white/20 transition flex items-center gap-2 print:hidden"
              title="Imprimir informe de bitácora"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>

        {/* Global Statistics Mini-Bar (if not scoped) */}
        {!scopedSchoolId && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-6 pt-5 border-t border-white/10 text-xs">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-slate-400 block text-[11px] font-medium">Total Registros</span>
              <span className="text-xl font-black text-white">{stats.total}</span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">Asientos auditables</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTagFilter(selectedTagFilter === 'Visita crítica' ? 'all' : 'Visita crítica')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                selectedTagFilter === 'Visita crítica'
                  ? 'bg-rose-500/30 border-rose-400 ring-2 ring-rose-400'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-1 text-rose-300 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Visitas Críticas</span>
              </div>
              <span className="text-xl font-black text-rose-300">{stats.criticalVisitsCount}</span>
              <span className="text-[10px] text-slate-300 block mt-0.5">Inspecciones de urgencia</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTagFilter(selectedTagFilter === 'Cambio de personal' ? 'all' : 'Cambio de personal')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                selectedTagFilter === 'Cambio de personal'
                  ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-1 text-amber-300 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Cambio Personal</span>
              </div>
              <span className="text-xl font-black text-amber-300">{stats.staffChangesCount}</span>
              <span className="text-[10px] text-slate-300 block mt-0.5">Altas / Bajas auxiliares</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTagFilter(selectedTagFilter === 'Actualización institucional' ? 'all' : 'Actualización institucional')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                selectedTagFilter === 'Actualización institucional'
                  ? 'bg-blue-500/30 border-blue-400 ring-2 ring-blue-400'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-1 text-blue-300 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Actualiz. Institucional</span>
              </div>
              <span className="text-xl font-black text-blue-300">{stats.institutionalUpdatesCount}</span>
              <span className="text-[10px] text-slate-300 block mt-0.5">Matrícula y modalidad</span>
            </button>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-slate-400 block text-[11px] font-medium">Casos / Desvíos</span>
              <span className="text-xl font-black text-purple-300">{stats.issuesCount}</span>
              <span className="text-[10px] text-slate-300 block mt-0.5">Observaciones gestionadas</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por etiqueta de evento, detalle de cambio, escuela N°, autor/a o notas..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Date Filters */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start md:self-auto overflow-x-auto max-w-full">
            {[
              { id: 'all', label: 'Todo el historial' },
              { id: 'today', label: 'Hoy' },
              { id: 'week', label: 'Últimos 7 días' },
              { id: 'month', label: 'Últimos 30 días' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  dateFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Tag / Event Type Filter Bar (Color Chips) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wide">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              <span>Etiquetas de Evento (Filtro Rápido por Color):</span>
            </span>
            {selectedTagFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedTagFilter('all')}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold inline-flex items-center gap-1 self-start sm:self-auto"
              >
                <X className="w-3 h-3" />
                <span>Quitar filtro de etiqueta</span>
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedTagFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedTagFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs scale-102'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Todos los eventos</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedTagFilter === 'all' ? 'bg-white/20 text-white font-extrabold' : 'bg-slate-200 text-slate-600'}`}>
                {logs.length}
              </span>
            </button>

            {Object.keys(ACTIVITY_EVENT_TAG_STYLES).map(tagKey => {
              const tagStyle = ACTIVITY_EVENT_TAG_STYLES[tagKey];
              const count = tagCounts[tagKey] || 0;
              const isSelected = selectedTagFilter === tagKey;

              return (
                <button
                  key={tagKey}
                  type="button"
                  onClick={() => setSelectedTagFilter(isSelected ? 'all' : tagKey)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    isSelected
                      ? `${tagStyle.badgeClass} ring-2 ring-emerald-500 shadow-xs scale-105 font-black`
                      : `${tagStyle.badgeClass} hover:opacity-100 opacity-85 hover:scale-[1.02]`
                  }`}
                  title={`${tagKey}: ${tagStyle.description}`}
                >
                  <span className={`w-2 h-2 rounded-full ${tagStyle.dot} shrink-0`} />
                  <span>{tagStyle.emoji} {tagKey}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${isSelected ? 'bg-black/15 text-slate-900' : 'bg-black/5 text-slate-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          {/* School filter (if not scoped) */}
          {!scopedSchoolId && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">
                Filtrar por Escuela
              </label>
              <select
                value={selectedSchoolFilter}
                onChange={e => setSelectedSchoolFilter(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Todas las Escuelas (140)</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>
                    Escuela N° {s.number} - {s.name.slice(0, 26)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User / Responsible filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              Autor / Miembro PAE
            </label>
            <select
              value={selectedUserFilter}
              onChange={e => setSelectedUserFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Todos los miembros del equipo</option>
              {PAE_TEAM_MEMBERS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.badge})
                </option>
              ))}
            </select>
          </div>

          {/* Event Tag filter dropdown */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              Etiqueta de Evento
            </label>
            <select
              value={selectedTagFilter}
              onChange={e => setSelectedTagFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Todas las etiquetas ({logs.length})</option>
              {Object.keys(ACTIVITY_EVENT_TAG_STYLES).map(k => (
                <option key={k} value={k}>
                  {ACTIVITY_EVENT_TAG_STYLES[k].emoji} {k} ({tagCounts[k] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              Categoría
            </label>
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Todas las categorías</option>
              <option value="Legajo Institucional">Legajo Institucional</option>
              <option value="Auxiliares y Personal">Auxiliares y Personal</option>
              <option value="Visitas de Campo">Visitas de Campo</option>
              <option value="Seguimiento de Casos">Seguimiento de Casos</option>
              <option value="Agua y Leche">Agua y Leche</option>
              <option value="Remitos y Alimentos">Remitos y Alimentos</option>
              <option value="Sincronización Offline">Sincronización Offline</option>
              <option value="Nota Administrativa">Nota Administrativa</option>
            </select>
          </div>

          {/* Action type filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              Tipo de Acción
            </label>
            <select
              value={selectedActionFilter}
              onChange={e => setSelectedActionFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Todos los tipos de acción</option>
              <option value="CREATE">Alta / Creación</option>
              <option value="UPDATE">Modificación de datos</option>
              <option value="DELETE">Baja / Eliminación</option>
              <option value="STATUS_CHANGE">Cambio de Estado / Resolución</option>
              <option value="VISIT_LOG">Visita de Inspección</option>
              <option value="SYNC_OFFLINE_DATA">Sincronización Offline</option>
              <option value="ADMIN_NOTE">Asiento Administrativo</option>
            </select>
          </div>
        </div>

        {/* Results summary and expand/collapse control */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span>
              Mostrando <strong>{filteredLogs.length}</strong> de <strong>{logs.length}</strong> eventos registrados
            </span>
            {(searchTerm || selectedSchoolFilter !== (scopedSchoolId || 'all') || selectedUserFilter !== 'all' || selectedCategoryFilter !== 'all' || selectedTagFilter !== 'all' || selectedActionFilter !== 'all' || dateFilter !== 'all') && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-emerald-700 hover:text-emerald-800 font-bold underline ml-2"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {filteredLogs.length > 0 && (
            <button
              type="button"
              onClick={handleExpandAll}
              className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
            >
              {expandedLogIds.size === filteredLogs.length ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Contraer detalles</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Expandir todos los detalles</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Timeline */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No se encontraron registros de actividad con los filtros seleccionados
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Intenta cambiar los términos de búsqueda o restablecer los filtros de fecha, escuela y categoría.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition inline-block"
          >
            Restablecer todos los filtros
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map(log => {
            const isExpanded = expandedLogIds.has(log.id);
            const userObj = PAE_TEAM_MEMBERS.find(m => m.id === log.userId);
            const userAvatarColor = userObj?.avatarColor || 'bg-slate-700 text-white';
            const hasDetails = (log.details && log.details.length > 0) || log.notes;

            return (
              <div 
                key={log.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition overflow-hidden"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    
                    {/* Author & Header */}
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-xl ${userAvatarColor} flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}>
                        {log.userName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>

                      {/* Content Info */}
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                            {log.userName}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            • {log.userRole}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            ({formatRelativeTime(log.timestamp)})
                          </span>
                        </div>

                        {/* Summary */}
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                          {log.summary}
                        </h4>

                        {/* Badges Bar: Event Tag, School, Action, Category */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {/* Event Tag Badges (Color-coded and clickable) */}
                          {((log.tags && log.tags.length > 0) ? log.tags : (log.eventTag ? [log.eventTag] : [])).map(tag => (
                            renderEventTagBadge(tag, true)
                          ))}

                          {/* School Badge */}
                          {log.schoolNumber ? (
                            <button
                              type="button"
                              onClick={() => {
                                const sc = schools.find(s => s.id === log.schoolId);
                                if (sc && onSelectSchool) {
                                  onSelectSchool(sc);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition"
                              title="Ver ficha completa de la escuela"
                            >
                              <Building2 className="w-3 h-3 text-emerald-600" />
                              <span>Escuela N° {log.schoolNumber}</span>
                              {log.schoolName && (
                                <span className="text-slate-500 font-normal hidden md:inline">
                                  ({log.schoolName})
                                </span>
                              )}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Gestión Central
                            </span>
                          )}

                          {renderActionBadge(log.actionType)}
                          {renderCategoryBadge(log.category)}
                        </div>
                      </div>
                    </div>

                    {/* Timestamp & Toggle Button */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-[11px] text-slate-400 font-medium text-right">
                        {formatExactDate(log.timestamp)}
                      </div>

                      {hasDetails && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(log.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition flex items-center gap-1"
                        >
                          <span>{isExpanded ? 'Ocultar' : 'Ver detalle'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Details Area */}
                  {isExpanded && hasDetails && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 bg-slate-50/70 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5">
                      {/* Fields Diff Table */}
                      {log.details && log.details.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500 block">
                            Valores Modificados:
                          </span>
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs">
                            {log.details.map((diff, idx) => (
                              <div key={idx} className="p-2.5 sm:px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                <span className="font-bold text-slate-700 sm:w-1/3">
                                  {diff.fieldLabel || diff.field}
                                </span>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {diff.oldValue !== undefined && diff.oldValue !== null && (
                                    <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 line-through text-[11px] truncate">
                                      {String(diff.oldValue)}
                                    </span>
                                  )}
                                  {diff.oldValue !== undefined && diff.oldValue !== null && (
                                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                  )}
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px] truncate">
                                    {String(diff.newValue ?? '(eliminado / vacío)')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes / Context */}
                      {log.notes && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                          <span className="font-bold text-slate-700 block mb-0.5">
                            Observación o Justificación:
                          </span>
                          <p className="text-slate-600 leading-relaxed italic">
                            "{log.notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Asentar Nota Administrativa en Bitácora */}
      {isAddNoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base">Asentar Nota en Bitácora</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddNoteModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  Esta nota se registrará de forma auditable bajo la firma del usuario activo en el sistema, vinculándose al legajo escolar seleccionado.
                </p>
              </div>

              {/* School Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Escuela a la que corresponde la nota <span className="text-rose-500">*</span>
                </label>
                <select
                  value={noteSchoolId}
                  onChange={e => setNoteSchoolId(e.target.value)}
                  disabled={!!scopedSchoolId}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>
                      Escuela N° {s.number} - {s.name} ({s.areaType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Event Tag / Color Tag Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 block text-xs">
                    Tipo de Evento (Etiqueta de Color) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Permite filtrar en bitácora</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.keys(ACTIVITY_EVENT_TAG_STYLES).map(tagKey => {
                    const tagStyle = ACTIVITY_EVENT_TAG_STYLES[tagKey];
                    const isSelected = noteEventTag === tagKey;
                    return (
                      <button
                        key={tagKey}
                        type="button"
                        onClick={() => {
                          setNoteEventTag(tagKey);
                          setNoteSelectedTags([tagKey]);
                          // Auto sync suggested category
                          if (tagKey === 'Visita crítica') setNoteCategory('Visitas de Campo');
                          else if (tagKey === 'Cambio de personal') setNoteCategory('Auxiliares y Personal');
                          else if (tagKey === 'Actualización institucional') setNoteCategory('Legajo Institucional');
                          else if (tagKey === 'Control Bromatológico') setNoteCategory('Agua y Leche');
                          else if (tagKey === 'Gestión de Alimentos') setNoteCategory('Remitos y Alimentos');
                          else if (tagKey === 'Incidencia o Reclamo') setNoteCategory('Seguimiento de Casos');
                          else if (tagKey === 'Acuerdo Administrativo') setNoteCategory('Nota Administrativa');
                        }}
                        className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2 cursor-pointer ${
                          isSelected
                            ? `${tagStyle.badgeClass} ring-2 ring-emerald-500 shadow-xs font-bold`
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${tagStyle.dot} mt-1 shrink-0 ${isSelected ? 'animate-pulse' : ''}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <span>{tagStyle.emoji}</span>
                            <span className="truncate">{tagKey}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                            {tagStyle.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Live Preview of Tag */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px] font-medium">Etiqueta activa para este asiento:</span>
                  <div>
                    {renderEventTagBadge(noteEventTag, false)}
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Categoría del Registro
                </label>
                <select
                  value={noteCategory}
                  onChange={e => setNoteCategory(e.target.value as ActivityCategory)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Nota Administrativa">Nota Administrativa / Trámite</option>
                  <option value="Legajo Institucional">Legajo Institucional / Comedor</option>
                  <option value="Auxiliares y Personal">Auxiliares y Personal de Cocina</option>
                  <option value="Visitas de Campo">Visitas de Campo e Inspección</option>
                  <option value="Seguimiento de Casos">Seguimiento de Casos / Observaciones</option>
                  <option value="Agua y Leche">Agua Potable y Programa de Leche</option>
                  <option value="Remitos y Alimentos">Remitos y Control de Proveedores</option>
                </select>
              </div>

              {/* Summary */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Resumen de la Acción / Asunto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={noteSummary}
                  onChange={e => setNoteSummary(e.target.value)}
                  placeholder="Ej: Notificación de la Directora sobre entrega de carne vacuna"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Details / Notes */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Detalle y Justificación
                </label>
                <textarea
                  value={noteDetailsText}
                  onChange={e => setNoteDetailsText(e.target.value)}
                  rows={4}
                  placeholder="Describa los antecedentes, comunicaciones mantenidas, acuerdos con la escuela o resoluciones adoptadas..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddNoteModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!noteSummary.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Guardar Asiento en Bitácora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

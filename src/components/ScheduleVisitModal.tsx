import React, { useState, useEffect } from 'react';
import { School, Visit, formatTeamVisitors } from '../types';
import { nombreInstitucion, tipoDe } from '../services/institucion';
import { useEquipo } from '../services/equipo';
import { nuevoId } from '../services/api';
import { TeamVisitorSelector } from './TeamVisitorSelector';
import { 
  X, 
  Calendar, 
  Clock, 
  Building2, 
  MapPin, 
  Droplets, 
  Milk, 
  Search, 
  Route, 
  FileText,
  UserCheck,
  Save,
  CheckCircle2
} from 'lucide-react';
import { AvisoBorrador, AvisoBorradorProps } from './AvisoBorrador';

interface ScheduleVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  /** Devuelve null si se guardó (o quedó como borrador), o el error a mostrar. */
  onSaveScheduledVisit: (visit: Visit) => Promise<string | null>;
  initialDate?: string;
  initialSchoolId?: string;
  visitToEdit?: Visit | null;
  /** Hay un "no enviado" de esta ficha (006, FR-021). */
  avisoBorrador?: AvisoBorradorProps;
  activeUserId?: string;
}

export const ScheduleVisitModal: React.FC<ScheduleVisitModalProps> = ({
  isOpen,
  onClose,
  schools,
  onSaveScheduledVisit,
  initialDate,
  initialSchoolId,
  visitToEdit,
  avisoBorrador,
  activeUserId = ''
}) => {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    visitToEdit ? visitToEdit.schoolId : initialSchoolId || (schools[0]?.id || '')
  );
  const [schoolSearch, setSchoolSearch] = useState('');
  
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(visitToEdit ? visitToEdit.date : initialDate || todayStr);
  const [time, setTime] = useState(visitToEdit ? visitToEdit.time : '10:30');
  
  const initialVisitors = visitToEdit?.visitors && visitToEdit.visitors.length > 0 
    ? visitToEdit.visitors 
    : [activeUserId].filter(Boolean);
  const equipo = useEquipo();
  const initialTeam = formatTeamVisitors(initialVisitors, equipo);
  // Id estable por formulario: reintentar no duplica (FR-029).
  const [nuevoVisitId] = useState(() => nuevoId());
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const [selectedVisitors, setSelectedVisitors] = useState<string[]>(initialVisitors);
  const [inspectorName, setInspectorName] = useState(
    visitToEdit?.inspectorName || initialTeam.inspectorName
  );
  const [inspectorRole, setInspectorRole] = useState(
    visitToEdit?.inspectorRole || initialTeam.inspectorRole
  );
  const [nutritionistName, setNutritionistName] = useState(
    visitToEdit?.nutritionistName || initialTeam.nutritionistName
  );
  const [scheduledObjective, setScheduledObjective] = useState(
    visitToEdit?.scheduledObjective || 'Supervisión regular de cocina comedor, cotejo de remitos y condiciones higiénico-sanitarias'
  );
  const [itineraryNotes, setItineraryNotes] = useState(
    visitToEdit?.itineraryNotes || ''
  );

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);

  useEffect(() => {
    if (visitToEdit) {
      setSelectedSchoolId(visitToEdit.schoolId);
      setDate(visitToEdit.date);
      setTime(visitToEdit.time);
      if (visitToEdit.visitors && visitToEdit.visitors.length > 0) {
        setSelectedVisitors(visitToEdit.visitors);
      }
      setInspectorName(visitToEdit.inspectorName);
      setInspectorRole(visitToEdit.inspectorRole || 'Ecónomas del Programa de Alimentación Escolar (PAE Tacuarembó)');
      setNutritionistName(visitToEdit.nutritionistName || initialTeam.nutritionistName);
      setScheduledObjective(visitToEdit.scheduledObjective || '');
      setItineraryNotes(visitToEdit.itineraryNotes || '');
    } else if (initialSchoolId) {
      setSelectedSchoolId(initialSchoolId);
    }
  }, [visitToEdit, initialSchoolId]);

  useEffect(() => {
    if (initialDate && !visitToEdit) {
      setDate(initialDate);
    }
  }, [initialDate, visitToEdit]);

  if (!isOpen) return null;

  // Filter schools for selector
  const filteredSchools = schools.filter(s => {
    if (!schoolSearch.trim()) return true;
    const q = schoolSearch.toLowerCase();
    return s.number.toString().includes(q) || 
           s.name.toLowerCase().includes(q) || 
           (s.address && s.address.toLowerCase().includes(q)) ||
           (s.zone && s.zone.toLowerCase().includes(q));
  });

  const predefinedObjectives = [
    'Supervisión regular de cocina comedor, cotejo de remitos y condiciones higiénico-sanitarias',
    'Relevamiento y control del rubro para compra de agua potable (Escuela Rural)',
    'Verificación de carné de salud y buenas prácticas de manufactura de auxiliares',
    'Auditoría de planilla de registros mensuales y remitos (Circular N° 6/2024)',
    'Seguimiento a desvío de alimentos no autorizados y recomendaciones de menú',
    'Supervisión de cuota mensual y almacenamiento de Leche en Polvo',
    'Evaluación de equipamiento de cocina, menage y solicitudes de reposición'
  ];

  const predefinedRoutes = [
    'Circuito Ruta 5 Norte (Curtina - Peralta - Paso del Cerro)',
    'Circuito Ruta 26 Este (Caraguatá - Las Toscas - Ansina)',
    'Circuito Paso de los Toros y San Gregorio de Polanco',
    'Circuito Tacuarembó Capital (Escuelas Urbanas)',
    'Circuito Ruta 31 (Sauce de Batoví - Cuchilla del Ombú)'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;

    const newVisit: Visit = {
      id: visitToEdit ? visitToEdit.id : nuevoVisitId,
      version: visitToEdit?.version,
      schoolId: selectedSchool.id,
      visitNumber: visitToEdit ? visitToEdit.visitNumber : selectedSchool.totalVisits + 1,
      date,
      time,
      status: 'Programada',
      scheduledObjective,
      itineraryNotes,
      visitors: selectedVisitors,
      inspectorName: inspectorName.trim(),
      inspectorRole: inspectorRole.trim(),
      nutritionistName: nutritionistName.trim(),
      assignedSchoolInspector: selectedSchool.assignedInspector,
      attendedBy: `Maestro/a Director/a ${selectedSchool.principalName}`,
      
      // Default placeholders for scheduled state
      menuPlanned: 'Planificación según recetario oficial PAE',
      menuServed: 'A verificar en el día de la visita',
      menuEvaluation: 'Adecuado y Variado',
      dinersActualCount: selectedSchool.studentDinersCount,
      actualAdultsCount: selectedSchool.staffDinersCount || 3,
      hygieneChecklist: {
        coldChain: 'Bien',
        rawCookedSeparation: 'Bien',
        cleanliness: 'Bien',
        uniformAndCaps: 'Bien',
        potableWaterChlorine: selectedSchool.hasWaterSupply ? 'Bien' : 'Regular',
        wasteDisposal: 'Bien'
      },
      deliveryNotesChecked: false,
      deliveryNotesDetails: 'Cotejo previsto en instancia de campo',
      unauthorizedItemsFound: false,
      unauthorizedItemsList: [],
      meetingMinutes: '',
      suggestions: '',
      generalObservations: `Visita programada en itinerario de campo. Objetivo: ${scheduledObjective}`
    };

    setGuardando(true);
    setErrorGuardado(null);
    const error = await onSaveScheduledVisit(newVisit);
    setGuardando(false);
    if (error) {
      setErrorGuardado(error);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest block">
                Itinerario de Campo • PAE Tacuarembó
              </span>
              <h2 className="text-xl font-black text-white">
                {visitToEdit ? 'Modificar Visita Programada' : 'Agendar / Programar Visita a Escuela'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {avisoBorrador && <AvisoBorrador {...avisoBorrador} />}
          
          {/* Escuela Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Seleccionar Escuela ({schools.length} disponibles):</span>
              {selectedSchool && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                  selectedSchool.areaType === 'Rural' 
                    ? 'bg-amber-100 text-amber-900' 
                    : 'bg-blue-100 text-blue-900'
                }`}>
                  {selectedSchool.areaType === 'Rural' ? `🌾 ${tipoDe(selectedSchool)} Rural` : `🏢 ${tipoDe(selectedSchool)} Urbana`}
                </span>
              )}
            </label>

            {!visitToEdit && (
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por número, nombre o localidad..."
                  value={schoolSearch}
                  onChange={e => setSchoolSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            )}

            <select
              value={selectedSchoolId}
              onChange={e => setSelectedSchoolId(e.target.value)}
              disabled={!!visitToEdit}
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-100"
            >
              {filteredSchools.map(s => (
                <option key={s.id} value={s.id}>
                  {nombreInstitucion(s)} - {s.name} ({s.areaType}) - {s.zone}
                </option>
              ))}
            </select>

            {/* Selected School Quick Card */}
            {selectedSchool && (
              <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900">
                    {nombreInstitucion(selectedSchool)} — {selectedSchool.name}
                  </span>
                  <span className="text-slate-500 font-medium">
                    {selectedSchool.studentDinersCount} comensales
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedSchool.address} ({selectedSchool.zone})</span>
                  </p>
                  <p className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{selectedSchool.assignedInspector}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/80">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                    selectedSchool.waterPurchaseAllowance 
                      ? 'bg-amber-100 text-amber-900' 
                      : 'bg-sky-100 text-sky-900'
                  }`}>
                    <Droplets className="w-3 h-3 text-sky-600" />
                    {selectedSchool.waterPurchaseAllowance ? 'Recibe Rubro Agua' : 'Red OSE'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1">
                    <Milk className="w-3 h-3 text-amber-700" />
                    {selectedSchool.milkProgramType} ({selectedSchool.milkPowderKg} kg)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Directora: <strong>{selectedSchool.principalName}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Fecha Planificada de Visita:
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Hora Prevista (Llegada / Almuerzo):
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Circuito o Ruta de Itinerario */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-emerald-600" />
              Circuito de Ruta / Itinerario de Campo:
            </label>
            <input
              type="text"
              placeholder="Ej: Circuito Ruta 26 Este (Caraguatá - Ansina)..."
              value={itineraryNotes}
              onChange={e => setItineraryNotes(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none mb-1.5"
            />
            {/* Quick circuit suggestions */}
            <div className="flex flex-wrap gap-1">
              {predefinedRoutes.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setItineraryNotes(r)}
                  className="text-[10px] bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200 transition"
                >
                  {r.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Objetivo Planificado */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Objetivo / Motivo Principal de la Visita:
            </label>
            <textarea
              rows={2}
              required
              value={scheduledObjective}
              onChange={e => setScheduledObjective(e.target.value)}
              placeholder="Indicar el foco de la visita técnica..."
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none mb-1.5"
            />
            {/* Quick objective pills */}
            <div className="flex flex-wrap gap-1">
              {predefinedObjectives.map((obj, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setScheduledObjective(obj)}
                  className="text-[10px] bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200 transition truncate max-w-xs"
                >
                  {obj}
                </button>
              ))}
            </div>
          </div>

          {/* Selector de Técnicos / Visitadores PAE */}
          <TeamVisitorSelector
            selectedMemberIds={selectedVisitors}
            activeUserId={activeUserId}
            label="Técnico(s) / Visitador(es) del PAE Tacuarembó"
            onChange={({ selectedMemberIds, inspectorName: insName, inspectorRole: insRole, nutritionistName: nutName }) => {
              setSelectedVisitors(selectedMemberIds);
              setInspectorName(insName);
              setInspectorRole(insRole);
              setNutritionistName(nutName);
            }}
          />

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2.5 disabled:opacity-60 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{guardando ? 'Guardando…' : visitToEdit ? 'Guardar Cambios' : 'Agendar en Itinerario'}</span>
            </button>
            {errorGuardado && <span role="alert" className="text-xs font-semibold text-rose-700">{errorGuardado}</span>}
          </div>

        </form>

      </div>
    </div>
  );
};

export type ModalityType = 
  | 'Tiempo Completo' 
  | 'Tiempo Extendido' 
  | 'Común' 
  | 'Aprender' 
  | 'Escuelas de Educación Especial'
  | 'Escuelas de Educación Artística (EDEA)'
  | 'TPA'
  | 'Rural' 
  | 'Práctica'
  | 'Especial'; // Alias de compatibilidad retroactiva

export type InstitutionContractType = 
  | 'DGEIP' 
  | 'Empresa Tercerizada' 
  | 'Comisión Fomento' 
  | 'Aportes Patronales' 
  | 'Otra Empresa';

export type StaffRole = 
  | 'Cocinera Titular' 
  | 'Auxiliar de Cocina' 
  | 'Ayudante de Cocina' 
  | 'Encargada de Comedor';

export type SocialSecurityStatus = 
  | 'Al día / Registrado' 
  | 'Pendiente de Regularización' 
  | 'En trámite';

export interface StaffMember {
  id: string;
  schoolId: string;
  fullName: string;
  ci: string;
  role: StaffRole;
  institutionType: InstitutionContractType;
  enterpriseName?: string; // Si es tercerizada u otra
  healthCardValidUntil: string; // YYYY-MM-DD
  foodHandlerCardValidUntil: string; // YYYY-MM-DD
  socialSecurityStatus: SocialSecurityStatus;
  phone?: string;
  notes?: string;
  active: boolean;
  version?: number;
}

export type HygieneRating = 'Bien' | 'Regular' | 'Deficiente';

export interface HygieneChecklist {
  coldChain: HygieneRating;
  rawCookedSeparation: HygieneRating;
  cleanliness: HygieneRating;
  uniformAndCaps: HygieneRating;
  potableWaterChlorine: HygieneRating;
  wasteDisposal: HygieneRating;
}

export interface UnauthorizedItem {
  id: string;
  item: string;
  category: 'Fiambres/Embutidos' | 'Bebidas Azucaradas' | 'Ultraprocesados/Golosinas' | 'Aderezos no autorizados' | 'Lácteos no pasteurizados' | 'Otro';
  reason: string;
  actionTaken: string;
}

export type VisitStatus = 'Realizada' | 'Programada' | 'Cancelada';

export interface Visit {
  id: string;
  schoolId: string;
  visitNumber: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status?: VisitStatus; // 'Realizada' (pasada) o 'Programada' (itinerario futuro)
  scheduledObjective?: string; // Motivo u objetivo planificado para la visita
  itineraryNotes?: string; // Notas de ruta / circuito (ej. Circuito Ruta 5, Circuito Caraguatá)
  visitors?: string[]; // IDs de miembros del equipo que realizaron la visita (e.g. ['valentina', 'karina'])
  inspectorName: string; // p. ej. "Ecónomas del PAE <nombre> y <nombre>"
  inspectorRole: string; // e.g. Ecónomas del Programa de Alimentación Escolar (PAE Tacuarembó)
  nutritionistName?: string; // p. ej. "Lic. en Nutrición <nombre>"
  assignedSchoolInspector?: string; // Inspector/a de Escuela o Zona
  attendedBy: string; // Maestro/a Director/a, etc.
  
  
  // Apartado previo de observaciones de campo (para integrar en la devolución)
  initialFieldObservations?: string;

  // Menú y comensales
  menuPlanned: string;
  menuServed: string;
  menuEvaluation: 'Adecuado y Variado' | 'Aceptable con Ajustes' | 'No cumple gramajes/guías';
  dinersActualCount: number; // Asistencia real niños
  actualAdultsCount?: number; // Asistencia real adultos

  // Auxiliares
  staffHygieneNotes?: string; // (DGEIP y/u otra empresa) uniforme completo, uso de alhajas, uñas pintadas, carnés vigentes

  // Higiene edilicia
  facilityHygieneNotes?: string; // Condiciones edilicias cocina y comedor en cada área
  hygieneChecklist: HygieneChecklist;

  // Almacenamiento
  storageNotes?: string; // orden, envases, alimentos de compra no autorizada, fechas de vencimiento

  // Servicio y mesas
  serviceNotes?: string; // Horarios, orden, conductas, buenos hábitos, temperaturas, docente responsable, mesas completas

  // Equipamiento y menage
  equipmentNotes?: string; // necesidades, solicitudes y/o recibidos

  // Proveedores
  providersNotes?: string; // Repartidores, proveedores locales

  // Menú del día detallado
  lunchMenu?: string;
  breakfastOrSnackMenu?: string;

  // Menú de la semana
  weeklyMenuDates?: string; // e.g. 22/09 al 26/09
  weeklyMenuMonday?: string;
  weeklyMenuTuesday?: string;
  weeklyMenuWednesday?: string;
  weeklyMenuThursday?: string;
  weeklyMenuFriday?: string;

  // Cumplimiento y variabilidad
  recipeCompliance?: string; // Cumple con los recetarios y planificación
  foodVariabilityAndDesserts?: string; // Variabilidad y frecuencias de alimentos y postres
  menuVariabilitySuggestions?: string; // Sugerencias al respecto

  // Registros y Remitos
  monthlySheetsSentToEmail?: boolean | string; // Se envía mensual a paetacuarembo@gmail.com
  kitchenLogbooksInOrder?: boolean | string; // Cuadernos al día Art. 14 Circular N°6/2024
  recordsNotes?: string; // Se observa en los registros
  deliveryNotesChecked: boolean;
  deliveryNotesDetails: string;

  // Alimentos no autorizados
  unauthorizedPurchasesInRecords?: string; // Ver pág 80 "Los Nuevos Sabores" o pág 71 "Las delicias de mi Escuela"
  unauthorizedItemsFound: boolean;
  unauthorizedItemsList: UnauthorizedItem[];

  // Meriendas y cantina
  snackAndBreakfastRecorded?: string;
  healthySnackNotes?: string;
  schoolCanteenNotes?: string; // Cantina escolar
  homeSnackNotes?: string; // Merienda traída desde el hogar

  // Menúes especiales
  specialMenusNotes?: string; // Respuesta a patología, certificado médico y acta pág 14 Circular N°6/2024

  // Personal y cierre
  staffFeedbackNotes?: string; // Observaciones y sugerencias por parte del personal
  meetingMinutes: string;
  suggestions: string;
  generalObservations: string;
  issuesFollowUpSummary?: string;
  /** Versión del servidor, para el control de edición concurrente (FR-014). */
  version?: number;
}

export type IssueStatus = 'Pendiente' | 'En Proceso' | 'Resuelto';
export type IssueSeverity = 'Leve' | 'Media' | 'Crítica';
export type IssueCategory = 
  | 'Higiene e Inocuidad' 
  | 'Alimentos no autorizados' 
  | 'Documentación de Auxiliares' 
  | 'Equipamiento/Infraestructura' 
  | 'Menú/Gramajes' 
  | 'Gestión de Remitos' 
  | 'Otro';

export interface SchoolIssue {
  id: string;
  schoolId: string;
  visitId?: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  reportedDate: string;
  status: IssueStatus;
  resolvedDate?: string;
  resolutionNotes?: string;
  resolvedInVisitNumber?: number;
  version?: number;
}

export type SchoolAreaType = 'Rural' | 'Urbana';
export type MilkProgramType = 'Programa de Leche Escolar' | 'Programa de Copa de Leche' | 'Ambos' | 'Ninguno / Comedor Tradicional';

export interface School {
  id: string;
  number: number;
  name: string;
  department: string; // e.g. Tacuarembó
  areaType: SchoolAreaType; // En Tacuarembó se dividen en Rural o Urbana
  zone?: string; // Referencia opcional (ej. Ciudad de Tacuarembó, Paso de los Toros, Caraguatá)
  assignedInspector: string; // Inspector/a de Escuela asignado/a
  address: string;
  phone: string;
  email: string;
  principalName: string;
  headCookName: string;
  modality: ModalityType;
  studentDinersCount: number;
  staffDinersCount: number;
  mealServices: {
    breakfast: boolean;
    lunch: boolean;
    snack: boolean;
  };

  // Suministro de agua y rubro para compra de agua (especial para escuelas rurales)
  hasWaterSupply: boolean; // ¿Cuenta con suministro de agua de red (OSE)?
  waterPurchaseAllowance: boolean; // ¿Recibe rubro para compra de agua potable?
  waterNotes?: string; // Detalle de compra de agua (bidones, aljibe, etc.)

  // Programa de Leche / Leche en Polvo
  milkProgramType: MilkProgramType; // Programa de Leche Escolar o Copa de Leche
  milkPowderKg: number; // Cantidad de leche en polvo que recibe en kg/mes
  milkNotes?: string;

  notes: string;
  /** Nombres de proveedores, texto libre (009). Opcional: las copias del
   * legajo y los "no enviados" anteriores no lo traen, y sin el campo el
   * servidor conserva la lista guardada. */
  providers?: string[];
  lastVisitDate?: string;
  totalVisits: number;
  activeIssuesCount: number;
  /** Baja lógica (FR-015). */
  active?: boolean;
  version?: number;
}

export interface PaeTeamMember {
  id: string;
  name: string;
  role: 'Ecónoma del PAE' | 'Licenciada en Nutrición';
  title: string;
  badge: string;
  shortName: string;
  avatarColor: string;
}

// Colores de avatar por posición: el equipo ya no es una lista fija en el
// código, viene del servidor (cuentas activas, FR-016).
const COLORES_EQUIPO = [
  'bg-emerald-600 text-white',
  'bg-teal-600 text-white',
  'bg-amber-600 text-white',
  'bg-indigo-600 text-white',
  'bg-rose-600 text-white',
  'bg-sky-600 text-white',
];

export interface CuentaEquipo {
  id: string;
  usuario: string;
  nombre: string;
  rol: string;
}

/** Convierte las cuentas del servidor en la forma que usan los componentes. */
export function equipoDesdeCuentas(cuentas: CuentaEquipo[]): PaeTeamMember[] {
  return cuentas.map((c, i) => {
    const esNutri = c.rol === 'Licenciada en Nutrición';
    return {
      id: c.id,
      name: c.nombre,
      role: esNutri ? 'Licenciada en Nutrición' : 'Ecónoma del PAE',
      title: esNutri
        ? 'Licenciada en Nutrición - PAE Tacuarembó'
        : 'Ecónoma del Programa de Alimentación Escolar (PAE Tacuarembó)',
      badge: esNutri ? 'Lic. Nutrición' : 'Ecónoma PAE',
      shortName: esNutri ? `Lic. ${c.nombre}` : c.nombre,
      avatarColor: COLORES_EQUIPO[i % COLORES_EQUIPO.length],
    };
  });
}

function unirNombres(nombres: string[]): string {
  return nombres.join(', ').replace(/, ([^,]*)$/, ' y $1');
}

/**
 * Arma los textos de "quiénes visitaron" a partir de los ids elegidos y del
 * equipo actual. Ya no tiene nombres escritos en el código (repo público).
 */
export function formatTeamVisitors(
  selectedMemberIds: string[],
  equipo: PaeTeamMember[],
): { inspectorName: string; inspectorRole: string; nutritionistName: string } {
  const elegidos = equipo.filter((m) => selectedMemberIds.includes(m.id));
  const nutri = equipo.find((m) => m.role === 'Licenciada en Nutrición');
  const nutritionistName = nutri ? `Lic. en Nutrición ${nutri.name}` : '';
  if (elegidos.length === 0) {
    return { inspectorName: '', inspectorRole: 'Equipo Técnico del Programa de Alimentación Escolar (PAE Tacuarembó)', nutritionistName };
  }
  const economas = elegidos.filter((m) => m.role === 'Ecónoma del PAE').map((m) => m.name);
  const nutris = elegidos.filter((m) => m.role === 'Licenciada en Nutrición').map((m) => m.name);
  const partes: string[] = [];
  if (economas.length) partes.push(`${economas.length > 1 ? 'Ecónomas del PAE' : 'Ecónoma del PAE'} ${unirNombres(economas)}`);
  if (nutris.length) partes.push(`Lic. en Nutrición ${unirNombres(nutris)}`);
  const inspectorRole =
    elegidos.length > 1
      ? 'Equipo Técnico del Programa de Alimentación Escolar (PAE Tacuarembó)'
      : elegidos[0].title;
  return { inspectorName: partes.join(' y '), inspectorRole, nutritionistName };
}

export type ActivityActionType = 
  | 'CREATE'          // Alta / Creación
  | 'UPDATE'          // Modificación de datos
  | 'DELETE'          // Baja / Eliminación
  | 'STATUS_CHANGE'   // Cambio de estado (e.g. Resolución de caso)
  | 'VISIT_LOG'       // Visita de inspección registrada
  | 'SYNC_OFFLINE_DATA' // Sincronización de visitas realizadas offline
  | 'ADMIN_NOTE';     // Asiento / Nota de gestión administrativa

export type ActivityCategory = 
  | 'Legajo Institucional'
  | 'Auxiliares y Personal'
  | 'Visitas de Campo'
  | 'Seguimiento de Casos'
  | 'Agua y Leche'
  | 'Remitos y Alimentos'
  | 'Sincronización Offline'
  | 'Nota Administrativa';

export type ActivityEventTag = 
  | 'Visita crítica'
  | 'Cambio de personal'
  | 'Actualización institucional'
  | 'Control Bromatológico'
  | 'Gestión de Alimentos'
  | 'Incidencia o Reclamo'
  | 'Acuerdo Administrativo';

export interface ActivityTagStyle {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  badgeClass: string;
  description: string;
  emoji: string;
}

export const ACTIVITY_EVENT_TAG_STYLES: Record<string, ActivityTagStyle> = {
  'Visita crítica': {
    label: 'Visita crítica',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-300',
    dot: 'bg-rose-600',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 ring-rose-500/20',
    description: 'Inspecciones urgentes, desvíos higiénicos severos o suspensión preventiva',
    emoji: '🔴'
  },
  'Cambio de personal': {
    label: 'Cambio de personal',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    dot: 'bg-amber-600',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 ring-amber-500/20',
    description: 'Altas, bajas, suplencias, licencias médicas o renovación de carné de salud',
    emoji: '🟠'
  },
  'Actualización institucional': {
    label: 'Actualización institucional',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-300',
    dot: 'bg-blue-600',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 ring-blue-500/20',
    description: 'Cambio de matrícula, modalidad pedagógica, director/a o datos del comedor',
    emoji: '🔵'
  },
  'Control Bromatológico': {
    label: 'Control Bromatológico',
    bg: 'bg-cyan-50',
    text: 'text-cyan-800',
    border: 'border-cyan-300',
    dot: 'bg-cyan-600',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300 ring-cyan-500/20',
    description: 'Calidad de agua, leche en polvo, desinfección de tanques y cadena de frío',
    emoji: '🩵'
  },
  'Gestión de Alimentos': {
    label: 'Gestión de Alimentos',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    dot: 'bg-emerald-600',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-emerald-500/20',
    description: 'Cotejo de remitos, proveedores locales, víveres secos y balance mensual',
    emoji: '🟢'
  },
  'Incidencia o Reclamo': {
    label: 'Incidencia o Reclamo',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-300',
    dot: 'bg-purple-600',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 ring-purple-500/20',
    description: 'Averías de equipamiento, gas, heladeras o desvíos nutricionales',
    emoji: '🟣'
  },
  'Acuerdo Administrativo': {
    label: 'Acuerdo Administrativo',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    dot: 'bg-slate-600',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 ring-slate-500/20',
    description: 'Coordinación con Inspección, resoluciones conjuntas y actas de comisiones',
    emoji: '⚪'
  }
};

export interface SyncStatusInfo {
  isOnline: boolean;
  pendingSyncCount: number;
  lastSyncTimestamp?: string;
  isSyncing: boolean;
}

export interface ActivityChangeDetail {
  field: string;
  fieldLabel: string;
  oldValue?: string | number | boolean | null;
  newValue?: string | number | boolean | null;
}

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO date string e.g. 2026-09-24T11:45:00.000Z
  schoolId?: string; // ID de la escuela
  schoolNumber?: number; // N° de escuela
  schoolName?: string; // Nombre de la escuela
  userId: string; // 'valentina' | 'shaja' | 'karina' | 'laura'
  userName: string; // nombre de la cuenta autora (lo pone el servidor)
  userRole: string; // e.g. 'Ecónoma del PAE'
  actionType: ActivityActionType;
  category: ActivityCategory;
  eventTag?: string; // Etiqueta o tipo de evento (e.g. 'Visita crítica', 'Cambio de personal', 'Actualización institucional')
  tags?: string[]; // Conjunto de etiquetas de color asociadas al evento
  summary: string; // e.g. "Actualización de carné de salud de Auxiliar María Silva"
  details?: ActivityChangeDetail[]; // Lista de campos modificados
  notes?: string; // Observaciones adicionales o justificativo
}

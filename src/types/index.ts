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
  inspectorName: string; // e.g. Ecónomas del PAE Valentina Suárez y Karina Rivero
  inspectorRole: string; // e.g. Ecónomas del Programa de Alimentación Escolar (PAE Tacuarembó)
  nutritionistName?: string; // Lic. en Nutrición Laura Cuadrado
  assignedSchoolInspector?: string; // Inspector/a de Escuela o Zona
  attendedBy: string; // Maestro/a Director/a, etc.
  
  // Conectividad y Sincronización Offline (para visitas en territorio rural sin cobertura)
  isOfflinePendingSync?: boolean; // Verdadero si se realizó/guardó sin conexión y está pendiente de sincronización
  offlineSavedAt?: string; // Marca temporal ISO de cuando se guardó offline en el dispositivo
  syncedAt?: string; // Marca temporal ISO de cuando se sincronizó con el servidor central DGEIP/PAE
  
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
  lastVisitDate?: string;
  totalVisits: number;
  activeIssuesCount: number;
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

export const PAE_TEAM_MEMBERS: PaeTeamMember[] = [
  {
    id: 'valentina',
    name: 'Valentina Suárez',
    role: 'Ecónoma del PAE',
    title: 'Ecónoma del Programa de Alimentación Escolar (PAE Tacuarembó)',
    badge: 'Ecónoma PAE',
    shortName: 'Valentina Suárez',
    avatarColor: 'bg-emerald-600 text-white'
  },
  {
    id: 'shaja',
    name: 'Shaja Rodríguez',
    role: 'Ecónoma del PAE',
    title: 'Ecónoma del Programa de Alimentación Escolar (PAE Tacuarembó)',
    badge: 'Ecónoma PAE',
    shortName: 'Shaja Rodríguez',
    avatarColor: 'bg-teal-600 text-white'
  },
  {
    id: 'karina',
    name: 'Karina Rivero',
    role: 'Ecónoma del PAE',
    title: 'Ecónoma del Programa de Alimentación Escolar (PAE Tacuarembó)',
    badge: 'Ecónoma PAE',
    shortName: 'Karina Rivero',
    avatarColor: 'bg-amber-600 text-white'
  },
  {
    id: 'laura',
    name: 'Laura Cuadrado',
    role: 'Licenciada en Nutrición',
    title: 'Licenciada en Nutrición - PAE Tacuarembó',
    badge: 'Lic. Nutrición',
    shortName: 'Lic. Laura Cuadrado',
    avatarColor: 'bg-indigo-600 text-white'
  }
];

export function formatTeamVisitors(selectedMemberIds: string[]): { inspectorName: string; inspectorRole: string; nutritionistName: string } {
  const ids = selectedMemberIds && selectedMemberIds.length > 0 ? selectedMemberIds : ['valentina'];
  const members = PAE_TEAM_MEMBERS.filter(m => ids.includes(m.id));
  
  if (members.length === 0) {
    return {
      inspectorName: 'Ecónoma del PAE Valentina Suárez',
      inspectorRole: 'Ecónomas del Programa de Alimentación Escolar (PAE Tacuarembó)',
      nutritionistName: 'Lic. en Nutrición Laura Cuadrado'
    };
  }

  const economas = members.filter(m => m.role === 'Ecónoma del PAE');
  const hasNutritionist = members.some(m => m.id === 'laura');

  let namesStr = '';

  if (members.length === 4) {
    namesStr = 'Equipo Técnico PAE: Ecónomas Valentina Suárez, Shaja Rodríguez, Karina Rivero y Lic. en Nutrición Laura Cuadrado';
  } else if (economas.length > 0 && hasNutritionist) {
    const economasNames = economas.map(e => e.name).join(', ').replace(/, ([^,]*)$/, ' y $1');
    const economasPrefix = economas.length > 1 ? 'Ecónomas del PAE' : 'Ecónoma del PAE';
    namesStr = `${economasPrefix} ${economasNames} y Lic. en Nutrición Laura Cuadrado`;
  } else if (economas.length > 0) {
    const economasNames = economas.map(e => e.name).join(', ').replace(/, ([^,]*)$/, ' y $1');
    const economasPrefix = economas.length > 1 ? 'Ecónomas del PAE' : 'Ecónoma del PAE';
    namesStr = `${economasPrefix} ${economasNames}`;
  } else {
    namesStr = 'Lic. en Nutrición Laura Cuadrado';
  }

  let roleStr = '';
  if (members.length > 1) {
    roleStr = 'Equipo Técnico del Programa de Alimentación Escolar (PAE Tacuarembó)';
  } else if (hasNutritionist) {
    roleStr = 'Licenciada en Nutrición - PAE Tacuarembó';
  } else {
    roleStr = 'Ecónoma del Programa de Alimentación Escolar (PAE Tacuarembó)';
  }

  return {
    inspectorName: namesStr,
    inspectorRole: roleStr,
    nutritionistName: 'Lic. en Nutrición Laura Cuadrado'
  };
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
  userName: string; // e.g. 'Valentina Suárez'
  userRole: string; // e.g. 'Ecónoma del PAE'
  actionType: ActivityActionType;
  category: ActivityCategory;
  eventTag?: string; // Etiqueta o tipo de evento (e.g. 'Visita crítica', 'Cambio de personal', 'Actualización institucional')
  tags?: string[]; // Conjunto de etiquetas de color asociadas al evento
  summary: string; // e.g. "Actualización de carné de salud de Auxiliar María Silva"
  details?: ActivityChangeDetail[]; // Lista de campos modificados
  notes?: string; // Observaciones adicionales o justificativo
}

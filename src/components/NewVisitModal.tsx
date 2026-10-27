import React, { useState } from 'react';
import { Visit, School, UnauthorizedItem, HygieneRating, SchoolIssue, formatTeamVisitors } from '../types';
import { nombreInstitucion, tipoDe } from '../services/institucion';
import { useEquipo } from '../services/equipo';
import { nuevoId } from '../services/api';
import { TeamVisitorSelector } from './TeamVisitorSelector';
import { 
  X, 
  ClipboardCheck, 
  Plus, 
  Trash2, 
  Utensils, 
  FileText, 
  Sparkles,
  MessageSquare,
  ShieldAlert,
  Save,
  CheckCircle2,
  Calendar,
  Clock,
  Eye,
  BookOpen,
  Droplets,
  Milk,
  AlertTriangle,
  WifiOff,
  CloudUpload
} from 'lucide-react';

interface NewVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  existingVisitsCount: number;
  /** Devuelve null si se guardó (o quedó como borrador), o el error a mostrar. */
  onSaveVisit: (visit: Visit, newIssues: SchoolIssue[]) => Promise<string | null>;
  activeUserId?: string;
  initialDate?: string;
  initialTime?: string;
  isOnline?: boolean;
  /** Un "no enviado" que se edita (006): precarga todo y guarda con el mismo id. */
  borrador?: { visit: Visit; newIssues: SchoolIssue[] };
}

export const NewVisitModal: React.FC<NewVisitModalProps> = ({
  isOpen,
  onClose,
  school,
  existingVisitsCount,
  onSaveVisit,
  activeUserId = '',
  initialDate,
  initialTime,
  isOnline = true,
  borrador
}) => {
  const v: Partial<Visit> | undefined = borrador?.visit;
  const nextVisitNumber = existingVisitsCount + 1;
  const today = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toTimeString().slice(0, 5);

  const [activeTab, setActiveTab] = useState<'borrador' | 'menu' | 'higiene' | 'registros' | 'preview'>('borrador');

  // Encabezado oficial Tacuarembó y equipo visitador
  const equipo = useEquipo();
  // Id generado UNA vez por formulario: reintentar el guardado manda el mismo
  // id y el servidor no duplica la visita (FR-029). Editar un borrador conserva
  // su id: guardar reemplaza ese mismo borrador.
  const [visitId] = useState(() => borrador?.visit.id ?? nuevoId());
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const initialVisitors = [activeUserId].filter(Boolean);
  const initialTeam = formatTeamVisitors(initialVisitors, equipo);
  const [selectedVisitors, setSelectedVisitors] = useState<string[]>(v?.visitors ?? (initialVisitors));
  const [date, setDate] = useState(v?.date ?? (initialDate || today));
  const [time, setTime] = useState(v?.time ?? (initialTime || currentTime));
  const [inspectorName, setInspectorName] = useState(v?.inspectorName ?? (initialTeam.inspectorName));
  const [inspectorRole, setInspectorRole] = useState(v?.inspectorRole ?? (initialTeam.inspectorRole));
  const [nutritionistName, setNutritionistName] = useState(v?.nutritionistName ?? (initialTeam.nutritionistName));
  const [assignedSchoolInspector, setAssignedSchoolInspector] = useState(v?.assignedSchoolInspector ?? (school.assignedInspector || 'Inspector/a de Zona Tacuarembó'));
  const [attendedBy, setAttendedBy] = useState(v?.attendedBy ?? (`Maestro/a Director/a ${school.principalName} y Cocinera ${school.headCookName}`));

  // 1. APARTADO PREVIO DE OBSERVACIONES Y ORIENTACIONES (solicitado expresamente por el usuario)
  const [initialFieldObservations, setInitialFieldObservations] = useState(v?.initialFieldObservations ?? (
    `Se realiza la visita técnica en compañía del equipo escolar. Se observa un clima ordenado en el comedor y buena predisposición del personal auxiliar en cocina. Se brinda orientación en cuanto a frecuencias del menú y almacenamiento.`
  ));

  // 2. Asistencia y Nómina
  const [dinersActualCount, setDinersActualCount] = useState(v?.dinersActualCount ?? (school.studentDinersCount));
  const [actualAdultsCount, setActualAdultsCount] = useState(v?.actualAdultsCount ?? (school.staffDinersCount || 3));

  // 3. Auxiliares
  const [staffHygieneNotes, setStaffHygieneNotes] = useState(v?.staffHygieneNotes ?? (
    'Auxiliares con uniforme completo reglamentario (delantal y cofia cubriendo la totalidad del cabello). Sin alhajas visibles ni uñas pintadas. Carnés de salud y de manipulación de alimentos vigentes.'
  ));

  // 4. Higiene
  const [facilityHygieneNotes, setFacilityHygieneNotes] = useState(v?.facilityHygieneNotes ?? (
    'Condiciones edilicias de cocina y comedor en buen estado general en cada una de sus áreas. Superficies limpias, pisos desinfectados y ventilación adecuada.'
  ));
  const [coldChain, setColdChain] = useState<HygieneRating>(v?.hygieneChecklist?.coldChain ?? ('Bien'));
  const [rawCookedSeparation, setRawCookedSeparation] = useState<HygieneRating>(v?.hygieneChecklist?.rawCookedSeparation ?? ('Bien'));
  const [cleanliness, setCleanliness] = useState<HygieneRating>(v?.hygieneChecklist?.cleanliness ?? ('Bien'));
  const [uniformAndCaps, setUniformAndCaps] = useState<HygieneRating>(v?.hygieneChecklist?.uniformAndCaps ?? ('Bien'));
  const [potableWaterChlorine, setPotableWaterChlorine] = useState<HygieneRating>(v?.hygieneChecklist?.potableWaterChlorine ?? (school.hasWaterSupply ? 'Bien' : 'Regular'));
  const [wasteDisposal, setWasteDisposal] = useState<HygieneRating>(v?.hygieneChecklist?.wasteDisposal ?? ('Bien'));

  // 5. Almacenamiento
  const [storageNotes, setStorageNotes] = useState(v?.storageNotes ?? (
    'Almacenamiento en frío y seco en condiciones adecuadas. Alimentos ordenados en estanterías elevadas, envases cerrados y rotulados. Fechas de vencimiento vigentes. No se observan alimentos de compra no autorizada.'
  ));

  // 6. Servicio
  const [serviceNotes, setServiceNotes] = useState(v?.serviceNotes ?? (
    'Horarios cumplidos con puntualidad. Buen orden y hábitos de higiene (lavado de manos previo). Temperaturas seguras en alimentos servidos (>65°C). Docente presente y responsable del comedor. Se consumen todos los alimentos en el recinto. Mesas completas: plato principal, jarra de agua potable, pan, postre, servilletas y cubiertos acordes a la preparación.'
  ));

  // 7. Equipamiento y Menage
  const [equipmentNotes, setEquipmentNotes] = useState(v?.equipmentNotes ?? (
    school.areaType === 'Rural'
      ? 'Equipamiento acorde a la matrícula rural. Se verifica funcionamiento de refrigerador y cocina. Menage completo para alumnos y docentes.'
      : 'Equipamiento industrial en correcto estado operativo. Vajilla y menage en cantidad suficiente.'
  ));

  // 8. Proveedores
  const [providersNotes, setProvidersNotes] = useState(v?.providersNotes ?? (
    'Proveedores locales de Tacuarembó entregan mercadería según cronograma estipulado. Se controlan remitos y condiciones organolépticas en la recepción.'
  ));

  // 9. Menú del día
  const [lunchMenu, setLunchMenu] = useState(v?.lunchMenu ?? ('Cazuela de legumbres (lentejas) con carne magra vacuna, hortalizas de estación y arroz + Manzana fresca.'));
  const [breakfastOrSnackMenu, setBreakfastOrSnackMenu] = useState(v?.breakfastOrSnackMenu ?? (
    school.milkProgramType.includes('Copa de Leche') 
      ? 'Copa de leche tibia enriquecida con pan con dulce de membrillo casero.'
      : 'Leche caliente con panificados saludables.'
  ));
  const [menuPlanned, setMenuPlanned] = useState(v?.menuPlanned ?? ('Cazuela de legumbres con carne magra y vegetales + Fruta'));
  const [menuServed, setMenuServed] = useState(v?.menuServed ?? (''));
  const [menuEvaluation, setMenuEvaluation] = useState<Visit['menuEvaluation']>(v?.menuEvaluation ?? ('Adecuado y Variado'));

  // 10. Menú semanal
  const [weeklyMenuDates, setWeeklyMenuDates] = useState(v?.weeklyMenuDates ?? ('15/09 al 19/09'));
  const [weeklyMenuMonday, setWeeklyMenuMonday] = useState(v?.weeklyMenuMonday ?? ('Milanesas de carne al horno con puré mixto de calabaza y papa + Naranja'));
  const [weeklyMenuTuesday, setWeeklyMenuTuesday] = useState(v?.weeklyMenuTuesday ?? ('Pastel de carne con base de puré y hortalizas + Banana'));
  const [weeklyMenuWednesday, setWeeklyMenuWednesday] = useState(v?.weeklyMenuWednesday ?? ('Cazuela de lentejas y vegetales con arroz + Manzana'));
  const [weeklyMenuThursday, setWeeklyMenuThursday] = useState(v?.weeklyMenuThursday ?? ('Pollo al horno con ensalada de zanahoria, remolacha y choclo + Mandarina'));
  const [weeklyMenuFriday, setWeeklyMenuFriday] = useState(v?.weeklyMenuFriday ?? ('Torta de verduras con queso magro y arroz primavera + Ensalada de frutas'));

  // 11. Cumplimiento y Variabilidad
  const [recipeCompliance, setRecipeCompliance] = useState(v?.recipeCompliance ?? ('Se cumple con los Recetarios oficiales ("Los Nuevos Sabores de mi Escuela" y "Las delicias de mi Escuela") y la planificación del menú.'));
  const [foodVariabilityAndDesserts, setFoodVariabilityAndDesserts] = useState(v?.foodVariabilityAndDesserts ?? ('Se tiene en cuenta la variabilidad y frecuencias de los diferentes tipos de alimentos en todos los tiempos de comida brindados, incluyendo la frecuencia de frutas frescas como postre.'));
  const [menuVariabilitySuggestions, setMenuVariabilitySuggestions] = useState(v?.menuVariabilitySuggestions ?? ('Siempre tratar de incluir variedad de alimentos, alternando la presentación a los efectos de evitar la monotonía, tanto en almuerzo como en desayuno o merienda.'));

  // 12. Registros y Remitos
  const [monthlySheetsSentToEmail, setMonthlySheetsSentToEmail] = useState<string>((typeof v?.monthlySheetsSentToEmail === 'string' ? v.monthlySheetsSentToEmail : undefined) ?? ('Sí, se envía Planilla de Registro Diario de Menú y boletas de manera mensual al correo paetacuarembo@gmail.com, como se solicita.'));
  const [kitchenLogbooksInOrder, setKitchenLogbooksInOrder] = useState<string>((typeof v?.kitchenLogbooksInOrder === 'string' ? v.kitchenLogbooksInOrder : undefined) ?? ('Sí, en cuanto a cuadernos de registro y de remitos en cocina están presentes, completos, en buen estado y al día. Art. 14- De los Registros, de la Circular N°6 del 23 de Febrero del 2024.'));
  const [recordsNotes, setRecordsNotes] = useState(v?.recordsNotes ?? ('Registros prolijos y rubricados diariamente. Coincidencia entre menú planificado y registros asentados.'));
  const [deliveryNotesChecked, setDeliveryNotesChecked] = useState(v?.deliveryNotesChecked ?? (true));
  const [deliveryNotesDetails, setDeliveryNotesDetails] = useState(v?.deliveryNotesDetails ?? ('Remitos firmados con fecha y sello al ingreso. Fechas de vencimiento y lote cotejados.'));

  // 13. Alimentos no autorizados
  const [unauthorizedPurchasesInRecords, setUnauthorizedPurchasesInRecords] = useState(v?.unauthorizedPurchasesInRecords ?? ('No se observan alimentos de compra No Autorizada en los registros (cotejado con pág. 80 de "Los Nuevos Sabores de mi Escuela" y pág. 71 de "Las delicias de mi Escuela").'));
  const [unauthorizedItemsFound, setUnauthorizedItemsFound] = useState(v?.unauthorizedItemsFound ?? (false));
  const [unauthorizedList, setUnauthorizedList] = useState<UnauthorizedItem[]>(v?.unauthorizedItemsList ?? ([]));
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<UnauthorizedItem['category']>('Fiambres/Embutidos');
  const [newItemReason, setNewItemReason] = useState('Alimento procesado prohibido por normativa PAE.');
  const [newItemAction, setNewItemAction] = useState('Se retira del depósito y se asienta en acta.');

  // 14. Meriendas y Cantina
  const [snackAndBreakfastRecorded, setSnackAndBreakfastRecorded] = useState(v?.snackAndBreakfastRecorded ?? ('Se registra merienda y desayuno diariamente en las planillas oficiales.'));
  const [healthySnackNotes, setHealthySnackNotes] = useState(v?.healthySnackNotes ?? ('Se promueven meriendas saludables basadas en frutas de estación, agua y cereales sin azúcares añadidos.'));
  const [schoolCanteenNotes, setSchoolCanteenNotes] = useState(v?.schoolCanteenNotes ?? (
    school.areaType === 'Rural' 
      ? 'No cuenta con cantina comercial. La totalidad de las ingestas está cubierta por el comedor escolar PAE.' 
      : 'Cantina escolar sujeta al listado de alimentos saludables de la Ley 19.140.'
  ));
  const [homeSnackNotes, setHomeSnackNotes] = useState(v?.homeSnackNotes ?? ('Se recomienda a las familias no enviar refrescos, jugos artificiales ni productos de copetín con sellos de advertencia.'));

  // 15. Menúes Especiales
  const [specialMenusNotes, setSpecialMenusNotes] = useState(v?.specialMenusNotes ?? (
    'Menúes especiales: Se responde adecuadamente a la patología si correspondiere. Se recuerda la necesidad de contar con Certificado médico y Acta correspondiente de la página 14 de la Circular N°6 del 23 de Febrero del 2024.'
  ));

  // 16. Observaciones del personal y acuerdos
  const [staffFeedbackNotes, setStaffFeedbackNotes] = useState(v?.staffFeedbackNotes ?? ('El personal de cocina manifiesta excelente disposición para continuar implementando las pautas y recetarios oficiales.'));
  const [meetingMinutes, setMeetingMinutes] = useState(v?.meetingMinutes ?? ('Se mantuvo intercambio formal con la Maestra Directora y auxiliares. Se transmitieron las orientaciones aprobadas por la Licenciada en Nutrición.'));
  const [suggestions, setSuggestions] = useState(v?.suggestions ?? ('1. Mantener jarras de agua fresca en todas las mesas.\n2. Continuar remitiendo las boletas y planillas mensuales a paetacuarembo@gmail.com.'));
  const [generalObservations, setGeneralObservations] = useState(v?.generalObservations ?? ('Visita altamente satisfactoria. Funcionamiento higiénico-sanitario correcto y cordial.'));

  // Seguimiento automático de problema si aplica
  const issueBorrador = borrador?.newIssues.find((i) => i.id === `${visitId}-obs`);
  const [createAutoIssue, setCreateAutoIssue] = useState(!!issueBorrador);
  const [autoIssueTitle, setAutoIssueTitle] = useState(issueBorrador?.title ?? '');

  if (!isOpen) return null;

  const handleAddUnauthorizedItem = () => {
    if (!newItemName.trim()) return;
    const item: UnauthorizedItem = {
      id: `unauth-${Date.now()}`,
      item: newItemName.trim(),
      category: newItemCategory,
      reason: newItemReason.trim(),
      actionTaken: newItemAction.trim()
    };
    setUnauthorizedList(prev => [...prev, item]);
    setNewItemName('');
  };

  const handleRemoveUnauthorizedItem = (id: string) => {
    setUnauthorizedList(prev => prev.filter(i => i.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const visit: Visit = {
      id: visitId,
      schoolId: school.id,
      visitNumber: nextVisitNumber,
      date,
      time,
      visitors: selectedVisitors,
      inspectorName: inspectorName.trim(),
      inspectorRole,
      nutritionistName: nutritionistName.trim(),
      assignedSchoolInspector: assignedSchoolInspector.trim(),
      attendedBy: attendedBy.trim(),
      
      // Apartado previo
      initialFieldObservations: initialFieldObservations.trim(),

      // Menú y comensales
      menuPlanned: menuPlanned.trim(),
      menuServed: (menuServed.trim() || lunchMenu.trim() || menuPlanned.trim()),
      menuEvaluation,
      dinersActualCount: Number(dinersActualCount) || school.studentDinersCount,
      actualAdultsCount: Number(actualAdultsCount) || school.staffDinersCount,

      // Auxiliares
      staffHygieneNotes: staffHygieneNotes.trim(),

      // Higiene
      facilityHygieneNotes: facilityHygieneNotes.trim(),
      hygieneChecklist: {
        coldChain,
        rawCookedSeparation,
        cleanliness,
        uniformAndCaps,
        potableWaterChlorine,
        wasteDisposal
      },

      // Almacenamiento
      storageNotes: storageNotes.trim(),

      // Servicio
      serviceNotes: serviceNotes.trim(),

      // Equipamiento y Proveedores
      equipmentNotes: equipmentNotes.trim(),
      providersNotes: providersNotes.trim(),

      // Menú del día
      lunchMenu: lunchMenu.trim(),
      breakfastOrSnackMenu: breakfastOrSnackMenu.trim(),

      // Menú de la semana
      weeklyMenuDates: weeklyMenuDates.trim(),
      weeklyMenuMonday: weeklyMenuMonday.trim(),
      weeklyMenuTuesday: weeklyMenuTuesday.trim(),
      weeklyMenuWednesday: weeklyMenuWednesday.trim(),
      weeklyMenuThursday: weeklyMenuThursday.trim(),
      weeklyMenuFriday: weeklyMenuFriday.trim(),

      // Cumplimiento y variabilidad
      recipeCompliance: recipeCompliance.trim(),
      foodVariabilityAndDesserts: foodVariabilityAndDesserts.trim(),
      menuVariabilitySuggestions: menuVariabilitySuggestions.trim(),

      // Registros
      monthlySheetsSentToEmail: monthlySheetsSentToEmail.trim(),
      kitchenLogbooksInOrder: kitchenLogbooksInOrder.trim(),
      recordsNotes: recordsNotes.trim(),
      deliveryNotesChecked,
      deliveryNotesDetails: deliveryNotesDetails.trim(),

      // Alimentos no autorizados
      unauthorizedPurchasesInRecords: unauthorizedPurchasesInRecords.trim(),
      unauthorizedItemsFound: unauthorizedItemsFound && unauthorizedList.length > 0,
      unauthorizedItemsList: unauthorizedItemsFound ? unauthorizedList : [],

      // Meriendas
      snackAndBreakfastRecorded: snackAndBreakfastRecorded.trim(),
      healthySnackNotes: healthySnackNotes.trim(),
      schoolCanteenNotes: schoolCanteenNotes.trim(),
      homeSnackNotes: homeSnackNotes.trim(),

      // Menúes especiales
      specialMenusNotes: specialMenusNotes.trim(),

      // Personal y cierre
      staffFeedbackNotes: staffFeedbackNotes.trim(),
      meetingMinutes: meetingMinutes.trim(),
      suggestions: suggestions.trim(),
      generalObservations: generalObservations.trim(),
      status: 'Realizada'
    };

    // Ids derivados del de la visita: estables entre reintentos.
    const newIssues: SchoolIssue[] = [];

    if (unauthorizedItemsFound && unauthorizedList.length > 0) {
      unauthorizedList.forEach(u => {
        newIssues.push({
          id: `${visitId}-na-${newIssues.length}`,
          schoolId: school.id,
          title: `Alimento no autorizado: ${u.item}`,
          description: `Detectado en Visita #${nextVisitNumber}. Motivo: ${u.reason}. Acción: ${u.actionTaken}`,
          category: 'Alimentos no autorizados',
          severity: 'Crítica',
          reportedDate: date,
          status: 'Pendiente'
        });
      });
    }

    if (createAutoIssue && autoIssueTitle.trim()) {
      newIssues.push({
        id: `${visitId}-obs`,
        schoolId: school.id,
        title: autoIssueTitle.trim(),
        description: `Observación registrada en Visita #${nextVisitNumber}: ${generalObservations}`,
        category: 'Higiene e Inocuidad',
        severity: 'Media',
        reportedDate: date,
        status: 'Pendiente'
      });
    }

    setGuardando(true);
    setErrorGuardado(null);
    const error = await onSaveVisit(visit, newIssues);
    setGuardando(false);
    if (error) {
      setErrorGuardado(error);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-2 rounded-xl backdrop-blur-xs">
              <ClipboardCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/30 text-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-400/30">
                  Visita Oficial N° {nextVisitNumber}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                  school.areaType === 'Rural' ? 'bg-amber-500/20 text-amber-200' : 'bg-blue-500/20 text-blue-200'
                }`}>
                  {tipoDe(school)} {school.areaType}
                </span>
                {school.waterPurchaseAllowance && (
                  <span className="text-[11px] bg-sky-500/30 text-sky-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Droplets className="w-3 h-3" /> Rubro Agua
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold">
                Acta & Devolución de Visita - {nombreInstitucion(school)} ({school.name})
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Offline notice banner if offline */}
        {!isOnline && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 flex items-center justify-between text-xs font-bold shrink-0 border-b border-amber-600 shadow-inner">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-slate-950 shrink-0 animate-pulse" />
              <span>
                Sin conexión: al guardar, la visita queda en este dispositivo como borrador «no enviado». Cuando vuelva la señal, reenviala desde «No enviados».
              </span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-1 overflow-x-auto text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('borrador')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'borrador' 
                ? 'bg-emerald-700 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-300" />
            1. Borrador & Observaciones Previas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'menu' 
                ? 'bg-emerald-700 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Utensils className="w-4 h-4" />
            2. Servicio, Menú & Semana
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('higiene')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'higiene' 
                ? 'bg-emerald-700 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            3. Auxiliares, Higiene & Stock
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('registros')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'registros' 
                ? 'bg-emerald-700 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            4. Registros, Remitos & Circular N°6
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'preview' 
                ? 'bg-slate-800 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Eye className="w-4 h-4 text-amber-400" />
            5. Vista Previa de la Devolución
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-800 text-sm">
          
          {/* TAB 1: BORRADOR Y OBSERVACIONES PREVIAS */}
          {activeTab === 'borrador' && (
            <div className="space-y-5">
              {/* Metadatos oficiales */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha de la Visita</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hora de Inspección</label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* SELECCIÓN DE TÉCNICO / VISITADOR PAE */}
              <TeamVisitorSelector
                selectedMemberIds={selectedVisitors}
                activeUserId={activeUserId}
                label="Técnico(s) / Visitador(es) del PAE Tacuarembó Actuantes"
                onChange={({ selectedMemberIds, inspectorName: insName, inspectorRole: insRole, nutritionistName: nutName }) => {
                  setSelectedVisitors(selectedMemberIds);
                  setInspectorName(insName);
                  setInspectorRole(insRole);
                  setNutritionistName(nutName);
                }}
              />

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Inspector/a Asignado/a</label>
                  <input
                    type="text"
                    value={assignedSchoolInspector}
                    onChange={e => setAssignedSchoolInspector(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">A cargo de (Atendido por)</label>
                  <input
                    type="text"
                    value={attendedBy}
                    onChange={e => setAttendedBy(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* APARTADO PREVIO SOLICITADO */}
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-emerald-800" />
                    <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wide">
                      Apartado de Observaciones y Orientaciones Previas (Campo)
                    </h3>
                  </div>
                  <span className="text-[11px] bg-emerald-200/70 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold">
                    Se integra a la Devolución Oficial
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mb-3">
                  Escriba libremente aquí durante la visita sus apuntes, vivencias, acuerdos iniciales y notas de campo. 
                  Este apartado se sumará automáticamente a las secciones estructuradas de higiene, menú y registros para generar la devolución oficial de la institución.
                </p>

                <textarea
                  rows={5}
                  value={initialFieldObservations}
                  onChange={e => setInitialFieldObservations(e.target.value)}
                  placeholder="Escriba aquí las observaciones preliminares de la visita..."
                  className="w-full p-3 bg-white border border-emerald-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                />

                {/* Accesos rápidos de frases frecuentes */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-emerald-900 font-semibold mr-1">Insertar apunte rápido:</span>
                  <button
                    type="button"
                    onClick={() => setInitialFieldObservations(prev => prev + '\n• Buen clima institucional y excelente articulación con el personal.')}
                    className="text-[11px] bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 px-2 py-1 rounded-md transition"
                  >
                    + Clima y predisposición
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialFieldObservations(prev => prev + '\n• Se constata correcto lavado de manos previo al almuerzo.')}
                    className="text-[11px] bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 px-2 py-1 rounded-md transition"
                  >
                    + Lavado de manos
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialFieldObservations(prev => prev + `\n• ${tipoDe(school)} rural: ${school.waterPurchaseAllowance ? 'cuenta con rubro de compra de agua y bidones disponibles.' : 'agua corriente sin inconvenientes.'}`)}
                    className="text-[11px] bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 px-2 py-1 rounded-md transition"
                  >
                    + Estado del agua
                  </button>
                </div>
              </div>

              {/* Matrícula y Asistencia Real del día */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Matrícula Comensales Registrada:
                  </label>
                  <div className="text-sm font-bold text-slate-800 px-3 py-2 bg-white border border-slate-200 rounded-lg">
                    {school.studentDinersCount} alumnos
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asistencia Real del Día (Niños) *:
                  </label>
                  <input
                    type="number"
                    required
                    value={dinersActualCount}
                    onChange={e => setDinersActualCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Asistencia Real (Adultos / Docentes):
                  </label>
                  <input
                    type="number"
                    value={actualAdultsCount}
                    onChange={e => setActualAdultsCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SERVICIO, MENÚ Y SEMANA */}
          {activeTab === 'menu' && (
            <div className="space-y-5">
              {/* Menú del día de la visita */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-emerald-700" />
                  Menú del Día de la Visita
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Almuerzo del día de la visita *:
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={lunchMenu}
                      onChange={e => setLunchMenu(e.target.value)}
                      placeholder="Preparación principal + acompañamiento + postre..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Desayuno y/o Merienda:
                    </label>
                    <textarea
                      rows={2}
                      value={breakfastOrSnackMenu}
                      onChange={e => setBreakfastOrSnackMenu(e.target.value)}
                      placeholder="Copa de leche, panificados, dulces autorizados..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Evaluación Técnica del Menú:
                    </label>
                    <select
                      value={menuEvaluation}
                      onChange={e => setMenuEvaluation(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    >
                      <option value="Adecuado y Variado">Adecuado y Variado</option>
                      <option value="Aceptable con Ajustes">Aceptable con Ajustes</option>
                      <option value="No cumple gramajes/guías">No cumple gramajes / guías</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Planificación teórica original:
                    </label>
                    <input
                      type="text"
                      value={menuPlanned}
                      onChange={e => setMenuPlanned(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Menú de la semana */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-700" />
                    Menú de la Semana (Desayuno, Almuerzo y/o Merienda)
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Semana del:</span>
                    <input
                      type="text"
                      value={weeklyMenuDates}
                      onChange={e => setWeeklyMenuDates(e.target.value)}
                      placeholder="ej. 15/09 al 19/09"
                      className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold w-36"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5">Lunes:</label>
                    <input
                      type="text"
                      value={weeklyMenuMonday}
                      onChange={e => setWeeklyMenuMonday(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5">Martes:</label>
                    <input
                      type="text"
                      value={weeklyMenuTuesday}
                      onChange={e => setWeeklyMenuTuesday(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5">Miércoles:</label>
                    <input
                      type="text"
                      value={weeklyMenuWednesday}
                      onChange={e => setWeeklyMenuWednesday(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5">Jueves:</label>
                    <input
                      type="text"
                      value={weeklyMenuThursday}
                      onChange={e => setWeeklyMenuThursday(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-0.5">Viernes:</label>
                    <input
                      type="text"
                      value={weeklyMenuFriday}
                      onChange={e => setWeeklyMenuFriday(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Cumplimiento de Recetarios y Variabilidad */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Se cumple con el o los Recetarios y la planificación del menú:
                  </label>
                  <textarea
                    rows={2}
                    value={recipeCompliance}
                    onChange={e => setRecipeCompliance(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Se tiene en cuenta la variabilidad y frecuencias de los diferentes tipos de alimentos (incluyendo frecuencia de postres):
                  </label>
                  <textarea
                    rows={2}
                    value={foodVariabilityAndDesserts}
                    onChange={e => setFoodVariabilityAndDesserts(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sugerencias al respecto:
                  </label>
                  <input
                    type="text"
                    value={menuVariabilitySuggestions}
                    onChange={e => setMenuVariabilitySuggestions(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Servicio y Mesas Completas */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <label className="block font-bold text-slate-800 uppercase tracking-wider">
                  Servicio de Comedor & Mesas Completas:
                </label>
                <p className="text-slate-500">
                  Horarios, orden, conductas, buenos hábitos, temperaturas seguras en los alimentos, docente responsable del comedor, consumo en comedor, control de asistencia.
                  Mesas completas: plato principal, agua, pan, postre, servilletas y cubiertos acordes.
                </p>
                <textarea
                  rows={3}
                  value={serviceNotes}
                  onChange={e => setServiceNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* TAB 3: AUXILIARES, HIGIENE Y STOCK */}
          {activeTab === 'higiene' && (
            <div className="space-y-5">
              {/* Auxiliares */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <label className="block font-bold text-slate-800 uppercase tracking-wider">
                  Auxiliares (DGEIP y/u otra empresa):
                </label>
                <p className="text-slate-500">
                  Uniforme completo reglamentario, uso de alhajas, uñas pintadas, carnés vigentes de salud y manipulación.
                </p>
                <textarea
                  rows={3}
                  value={staffHygieneNotes}
                  onChange={e => setStaffHygieneNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {/* Higiene y Condiciones Edilicias */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                <label className="block font-bold text-slate-800 uppercase tracking-wider">
                  Higiene: Condiciones edilicias del estado de cocina y comedor (en cada una de sus áreas):
                </label>
                <textarea
                  rows={2}
                  value={facilityHygieneNotes}
                  onChange={e => setFacilityHygieneNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Cadena de frío</label>
                    <select
                      value={coldChain}
                      onChange={e => setColdChain(e.target.value as HygieneRating)}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs"
                    >
                      <option value="Bien">Bien</option>
                      <option value="Regular">Regular</option>
                      <option value="Deficiente">Deficiente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Separación crudo/cocido</label>
                    <select
                      value={rawCookedSeparation}
                      onChange={e => setRawCookedSeparation(e.target.value as HygieneRating)}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs"
                    >
                      <option value="Bien">Bien</option>
                      <option value="Regular">Regular</option>
                      <option value="Deficiente">Deficiente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Limpieza general</label>
                    <select
                      value={cleanliness}
                      onChange={e => setCleanliness(e.target.value as HygieneRating)}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs"
                    >
                      <option value="Bien">Bien</option>
                      <option value="Regular">Regular</option>
                      <option value="Deficiente">Deficiente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Uniformes y cofias</label>
                    <select
                      value={uniformAndCaps}
                      onChange={e => setUniformAndCaps(e.target.value as HygieneRating)}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs"
                    >
                      <option value="Bien">Bien</option>
                      <option value="Regular">Regular</option>
                      <option value="Deficiente">Deficiente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Agua potable / Cloro</label>
                    <select
                      value={potableWaterChlorine}
                      onChange={e => setPotableWaterChlorine(e.target.value as HygieneRating)}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs"
                    >
                      <option value="Bien">Bien</option>
                      <option value="Regular">Regular</option>
                      <option value="Deficiente">Deficiente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Disposición de residuos</label>
                    <select
                      value={wasteDisposal}
                      onChange={e => setWasteDisposal(e.target.value as HygieneRating)}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs"
                    >
                      <option value="Bien">Bien</option>
                      <option value="Regular">Regular</option>
                      <option value="Deficiente">Deficiente</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Almacenamiento */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                <label className="block font-bold text-slate-800 uppercase tracking-wider">
                  Almacenamiento (frío y/o seco):
                </label>
                <p className="text-slate-500">
                  Orden, envases, alimentos de compra no autorizada, fechas de vencimiento, rotulación y conservación.
                </p>
                <textarea
                  rows={3}
                  value={storageNotes}
                  onChange={e => setStorageNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {/* Equipamiento, menage y Proveedores */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="block font-bold text-slate-800 uppercase tracking-wider">
                    Equipamiento y Menage:
                  </label>
                  <p className="text-slate-500">Necesidades, solicitudes y/o recibidos.</p>
                  <textarea
                    rows={2}
                    value={equipmentNotes}
                    onChange={e => setEquipmentNotes(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="block font-bold text-slate-800 uppercase tracking-wider">
                    Proveedores:
                  </label>
                  <p className="text-slate-500">Repartidores y abastecimiento local.</p>
                  <textarea
                    rows={2}
                    value={providersNotes}
                    onChange={e => setProvidersNotes(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REGISTROS, REMITOS Y CIRCULAR N°6 */}
          {activeTab === 'registros' && (
            <div className="space-y-5 text-xs">
              {/* Envío a paetacuarembo@gmail.com */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2">
                <label className="block font-bold text-blue-950 uppercase tracking-wider">
                  En cuanto a los Registros y Envío Mensual:
                </label>
                <p className="text-blue-900">
                  Se envía Planilla de Registro Diario de Menú y boletas de manera mensual al correo <strong>paetacuarembo@gmail.com</strong>, como se solicita:
                </p>
                <textarea
                  rows={2}
                  value={monthlySheetsSentToEmail}
                  onChange={e => setMonthlySheetsSentToEmail(e.target.value)}
                  className="w-full p-2 bg-white border border-blue-300 rounded-lg text-xs"
                />
              </div>

              {/* Cuadernos de Registro Art 14 Circular N°6/2024 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <label className="block font-bold text-slate-800 uppercase tracking-wider">
                  Cuadernos de Registro y Remitos en Cocina (Circular N°6 / 2024):
                </label>
                <p className="text-slate-500">
                  En cuanto a cuadernos de registro y de remitos en cocina están presentes, completos, en buen estado y al día. Art. 14- De los Registros, de la Circular N°6 del 23 de Febrero del 2024.
                </p>
                <textarea
                  rows={2}
                  value={kitchenLogbooksInOrder}
                  onChange={e => setKitchenLogbooksInOrder(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <div>
                  <label className="font-semibold text-slate-700 block mt-2 mb-0.5">Se observa en los registros:</label>
                  <input
                    type="text"
                    value={recordsNotes}
                    onChange={e => setRecordsNotes(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Alimentos no autorizados en registros */}
              <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-rose-950 uppercase tracking-wider">
                      Alimentos de Compra No Autorizada en los Registros
                    </label>
                    <p className="text-slate-600">
                      (Ver lista de alimentos de compra no autorizada en pág. 80 del recetario "Los Nuevos Sabores de mi Escuela" y/o en pág. 71 del recetario "Las delicias de mi Escuela")
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-rose-300 text-xs font-bold text-rose-800">
                    <input
                      type="checkbox"
                      checked={unauthorizedItemsFound}
                      onChange={e => setUnauthorizedItemsFound(e.target.checked)}
                      className="rounded text-rose-600 h-4 w-4"
                    />
                    ¿Se detectó infracción?
                  </label>
                </div>

                <textarea
                  rows={2}
                  value={unauthorizedPurchasesInRecords}
                  onChange={e => setUnauthorizedPurchasesInRecords(e.target.value)}
                  className="w-full p-2 bg-white border border-rose-300 rounded-lg text-xs"
                />

                {unauthorizedItemsFound && (
                  <div className="bg-white p-3 rounded-lg border border-rose-300 space-y-2">
                    <h4 className="font-bold text-rose-800 text-xs">Registrar Alimento No Autorizado Detectado:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="Nombre del alimento (ej. Salchichas)"
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        className="px-2 py-1.5 border border-slate-300 rounded text-xs sm:col-span-2"
                      />
                      <select
                        value={newItemCategory}
                        onChange={e => setNewItemCategory(e.target.value as any)}
                        className="px-2 py-1.5 border border-slate-300 rounded text-xs"
                      >
                        <option value="Fiambres/Embutidos">Fiambres / Embutidos</option>
                        <option value="Bebidas Azucaradas">Bebidas Azucaradas</option>
                        <option value="Ultraprocesados/Golosinas">Ultraprocesados</option>
                        <option value="Aderezos no autorizados">Aderezos no autorizados</option>
                        <option value="Otro">Otro</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddUnauthorizedItem}
                        className="px-3 py-1.5 bg-rose-700 text-white rounded text-xs font-bold hover:bg-rose-800"
                      >
                        + Agregar
                      </button>
                    </div>

                    {unauthorizedList.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {unauthorizedList.map(item => (
                          <div key={item.id} className="flex items-center justify-between bg-rose-50 px-3 py-1.5 rounded border border-rose-200">
                            <span><strong>{item.item}</strong> ({item.category})</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveUnauthorizedItem(item.id)}
                              className="text-rose-600 hover:text-rose-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Meriendas y Cantina */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Se registra merienda y/o desayuno:</label>
                  <input
                    type="text"
                    value={snackAndBreakfastRecorded}
                    onChange={e => setSnackAndBreakfastRecorded(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Merienda saludable:</label>
                  <input
                    type="text"
                    value={healthySnackNotes}
                    onChange={e => setHealthySnackNotes(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cantina escolar:</label>
                  <input
                    type="text"
                    value={schoolCanteenNotes}
                    onChange={e => setSchoolCanteenNotes(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Merienda traída desde el hogar:</label>
                  <input
                    type="text"
                    value={homeSnackNotes}
                    onChange={e => setHomeSnackNotes(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Menúes Especiales */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <label className="block font-bold text-slate-800 uppercase tracking-wider">
                  Menúes Especiales (Certificado y Acta Circular N°6/2024):
                </label>
                <p className="text-slate-500">
                  Se responde adecuadamente a la patología. Certificado médico y Acta correspondiente de la página 14 de la Circular N°6 del 23 de Febrero del 2024.
                </p>
                <textarea
                  rows={2}
                  value={specialMenusNotes}
                  onChange={e => setSpecialMenusNotes(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              {/* Observaciones y sugerencias por parte del personal */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <label className="block font-bold text-slate-800 uppercase tracking-wider">
                  Observaciones y/o sugerencias por parte del personal:
                </label>
                <textarea
                  rows={2}
                  value={staffFeedbackNotes}
                  onChange={e => setStaffFeedbackNotes(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              {/* Opción de registrar incidencia de seguimiento */}
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <label className="font-bold text-amber-950 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createAutoIssue}
                      onChange={e => setCreateAutoIssue(e.target.checked)}
                      className="rounded text-amber-600 h-4 w-4"
                    />
                    Registrar Observación Formal en el Historial de Incidencias
                  </label>
                  <p className="text-amber-800 text-[11px]">
                    Si se requiere seguimiento en la próxima visita de las Ecónomas.
                  </p>
                </div>
                {createAutoIssue && (
                  <input
                    type="text"
                    placeholder="Título del asunto a fiscalizar..."
                    value={autoIssueTitle}
                    onChange={e => setAutoIssueTitle(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs w-72"
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 5: VISTA PREVIA EXACTA DE LA DEVOLUCIÓN */}
          {activeTab === 'preview' && (
            <div className="bg-slate-50 border-2 border-slate-300 p-6 rounded-2xl shadow-inner font-serif text-slate-900 space-y-4 max-h-[60vh] overflow-y-auto leading-relaxed text-xs sm:text-sm">
              <div className="text-right text-xs text-slate-700 italic border-b pb-2">
                Tacuarembó, {new Date(date + 'T12:00:00').toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>

              <div className="text-center font-bold text-base sm:text-lg tracking-wide uppercase text-slate-900 pt-2">
                ORIENTACIONES SOBRE VISITAS A ESCUELAS
              </div>

              <div className="space-y-2 border-b pb-3">
                <p>
                  <strong>Fecha del día de la visita:</strong> {date}
                </p>
                <p>
                  En el día de la fecha se realiza la visita a cocina comedor {tipoDe(school) === 'Jardín' ? 'del jardín' : 'de escuela'} <strong>N° {school.number}</strong> a cargo del Maestro/a Director/a <strong>{school.principalName}</strong> por parte de <strong>{inspectorName}</strong>.
                </p>
                <p className="text-slate-700">
                  Se remiten las observaciones realizadas durante la visita a la <strong>{nutritionistName}</strong>, con el propósito de que las mismas sean posteriormente elevadas al inspector/a de zona (<strong>{assignedSchoolInspector}</strong>).
                </p>
                <p className="text-slate-700">
                  Cabe destacar que todas las consideraciones formuladas y las orientaciones transmitidas a Maestro/a Director/a en relación con el menú escolar han sido previamente informadas y cuentan con la aprobación de la Licenciada en Nutrición Departamental.
                </p>
              </div>

              {/* APARTADO PREVIO INTEGRADO */}
              {initialFieldObservations && (
                <div className="bg-emerald-50/80 p-3 rounded-lg border-l-4 border-emerald-600 space-y-1">
                  <div className="font-bold text-emerald-950 uppercase text-[11px]">
                    Observaciones y consideraciones preliminares de campo:
                  </div>
                  <p className="whitespace-pre-line text-emerald-900">{initialFieldObservations}</p>
                </div>
              )}

              <p className="italic font-semibold text-slate-800">
                En dicha instancia se pudieron constatar las siguientes observaciones, orientaciones y/o sugerencias:
              </p>

              <div className="space-y-2.5">
                <p>
                  <strong>Nómina:</strong> {school.areaType} - {school.modality}. {attendedBy}.
                </p>
                <p>
                  <strong>Matrícula:</strong> {school.studentDinersCount} alumnos.
                </p>
                <p>
                  <strong>Asistencia real del día (niños y adultos si corresponde):</strong> {dinersActualCount} niños {actualAdultsCount ? `+ ${actualAdultsCount} adultos` : ''}.
                </p>
                
                {/* Suministro de agua y programa de leche si aplica */}
                <p>
                  <strong>Abastecimiento de Agua:</strong> {school.hasWaterSupply ? 'Conexión corriente por red (OSE).' : `Sin conexión de red OSE. ${school.waterPurchaseAllowance ? 'Recibe Rubro PAE para compra de agua potable.' : ''} ${school.waterNotes || ''}`}
                </p>
                <p>
                  <strong>Programa de Leche:</strong> {school.milkProgramType} {school.milkPowderKg ? `(Recibe ${school.milkPowderKg} kg/mes de leche en polvo)` : ''}.
                </p>

                <p>
                  <strong>Auxiliares:</strong> (DGEIP y/u otra empresa) {staffHygieneNotes}
                </p>
                <p>
                  <strong>Higiene:</strong> {facilityHygieneNotes}
                </p>
                <p>
                  <strong>Almacenamiento (frío y/o seco):</strong> {storageNotes}
                </p>
                <p>
                  <strong>Servicio:</strong> {serviceNotes}
                </p>
                <p>
                  <strong>Con respecto a equipamiento y menage:</strong> {equipmentNotes}
                </p>
                <p>
                  <strong>Proveedores:</strong> {providersNotes}
                </p>
                <p>
                  <strong>Menú del día de la visita del almuerzo:</strong> {lunchMenu}
                </p>
                <p>
                  <strong>Desayuno y/o merienda:</strong> {breakfastOrSnackMenu}
                </p>

                <div className="bg-white p-3 rounded border border-slate-200">
                  <p className="font-bold mb-1">
                    Menú de la semana (desayuno, almuerzo, y/o merienda) {weeklyMenuDates}:
                  </p>
                  <p><strong>Lunes:</strong> {weeklyMenuMonday}</p>
                  <p><strong>Martes:</strong> {weeklyMenuTuesday}</p>
                  <p><strong>Miércoles:</strong> {weeklyMenuWednesday}</p>
                  <p><strong>Jueves:</strong> {weeklyMenuThursday}</p>
                  <p><strong>Viernes:</strong> {weeklyMenuFriday}</p>
                </div>

                <p>
                  <strong>Se cumple con el o los Recetarios y la planificación del menú:</strong> {recipeCompliance}
                </p>
                <p>
                  <strong>Se tiene en cuenta la variabilidad y frecuencias de los diferentes tipos de alimentos:</strong> {foodVariabilityAndDesserts}
                </p>
                <p>
                  <strong>Sugerencias al respecto:</strong> {menuVariabilitySuggestions}
                </p>

                <div className="border-t pt-2 space-y-1.5">
                  <p className="font-bold">En cuanto a los registros:</p>
                  <p>• {monthlySheetsSentToEmail}</p>
                  <p>• {kitchenLogbooksInOrder}</p>
                  <p>• <strong>Se observa en los registros:</strong> {recordsNotes}</p>
                  <p>• <strong>Alimentos de compra No Autorizada en los registros:</strong> {unauthorizedPurchasesInRecords}</p>
                </div>

                <p>
                  <strong>Se registra merienda y/o desayuno:</strong> {snackAndBreakfastRecorded}
                </p>
                <p>
                  <strong>Merienda saludable:</strong> {healthySnackNotes}
                </p>
                <p>
                  <strong>Cantina escolar:</strong> {schoolCanteenNotes}
                </p>
                <p>
                  <strong>Merienda traída desde el hogar:</strong> {homeSnackNotes}
                </p>
                <p>
                  <strong>Menúes especiales:</strong> {specialMenusNotes}
                </p>

                <div className="bg-slate-100 p-2.5 rounded text-slate-700 text-xs font-mono space-y-0.5">
                  <div>Normativa y Recetarios de Referencia:</div>
                  <div>• Circular N°6 del 23 de Febrero del 2024: https://www.dgeip.edu.uy/documentos/normativa/ceip/2024/Circular6_24b.pdf</div>
                  <div>• Recetario "Copa de Leche" (Recetario-COPA DE LECHE - imp.pdf)</div>
                  <div>• Recetario Anual PAE / "Los Nuevos Sabores de mi Escuela" / "Las delicias de mi Escuela"</div>
                </div>

                <p className="italic">
                  Siempre tratar de incluir variedad de alimentos, alternando la presentación a los efectos de evitar la monotonía, tanto en almuerzo como en desayuno o merienda.
                </p>

                <p>
                  <strong>Observaciones y/o sugerencias por parte del personal:</strong> {staffFeedbackNotes}
                </p>
              </div>

              <div className="pt-6 border-t mt-4 text-center space-y-3">
                <p className="italic text-slate-700">
                  Sin más que agregar, quedan a las órdenes ante cualquier duda o consulta.
                </p>
                <p className="font-bold text-slate-900">
                  {inspectorName}
                </p>
                <p className="text-xs text-slate-500">
                  {inspectorRole}
                </p>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 shrink-0">
            <div className="flex items-center gap-2">
              {activeTab !== 'borrador' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'preview') setActiveTab('registros');
                    else if (activeTab === 'registros') setActiveTab('higiene');
                    else if (activeTab === 'higiene') setActiveTab('menu');
                    else if (activeTab === 'menu') setActiveTab('borrador');
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  ← Paso Anterior
                </button>
              )}
              {activeTab !== 'preview' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'borrador') setActiveTab('menu');
                    else if (activeTab === 'menu') setActiveTab('higiene');
                    else if (activeTab === 'higiene') setActiveTab('registros');
                    else if (activeTab === 'registros') setActiveTab('preview');
                  }}
                  className="px-3 py-1.5 text-xs text-emerald-700 font-bold hover:bg-emerald-50 rounded-lg transition"
                >
                  Siguiente Paso →
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {errorGuardado && (
                <span role="alert" className="text-xs font-semibold text-rose-700 max-w-xs">{errorGuardado}</span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className={`px-5 py-2 disabled:opacity-60 text-xs font-bold text-white rounded-lg shadow-sm flex items-center gap-1.5 transition ${
                  isOnline 
                    ? 'bg-emerald-700 hover:bg-emerald-800' 
                    : 'bg-amber-700 hover:bg-amber-800'
                }`}
              >
                {isOnline ? <Save className="w-4 h-4" /> : <CloudUpload className="w-4 h-4" />}
                <span>{guardando ? 'Guardando…' : isOnline ? 'Guardar Visita & Devolución' : 'Guardar como no enviado'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

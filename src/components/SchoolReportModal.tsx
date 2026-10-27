import React, { useState } from 'react';
import { School, StaffMember, Visit, SchoolIssue, formatTeamVisitors } from '../types';
import { nombreInstitucion, tipoDe } from '../services/institucion';
import { useEquipo } from '../services/equipo';
import { getHealthCardStatus } from '../services/storage';
import { 
  Printer, 
  Download, 
  X, 
  Copy, 
  Check, 
  Settings2, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Users, 
  Building2, 
  Utensils, 
  Calendar,
  Sparkles,
  Award,
  Clock,
  BookOpen,
  Droplets,
  Milk,
  MapPin,
  UserCheck
} from 'lucide-react';

interface SchoolReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  staff: StaffMember[];
  visits: Visit[];
  issues: SchoolIssue[];
}

export type ReportType = 'devolucion_oficial' | 'integral' | 'ejecutivo';

export const SchoolReportModal: React.FC<SchoolReportModalProps> = ({
  isOpen,
  onClose,
  school,
  staff,
  visits,
  issues
}) => {
  const [reportType, setReportType] = useState<ReportType>('devolucion_oficial');
  const [selectedVisitId, setSelectedVisitId] = useState<string>(
    visits.length > 0 ? visits[visits.length - 1].id : ''
  );
  
  // Firmantes por defecto: el equipo actual del servidor (editable en el informe).
  const equipo = useEquipo();
  const firmaEquipo = formatTeamVisitors(
    equipo.filter(m => m.role === 'Ecónoma del PAE').map(m => m.id),
    equipo,
  );
  const [inspectorName, setInspectorName] = useState(firmaEquipo.inspectorName);
  const [nutritionistName, setNutritionistName] = useState(firmaEquipo.nutritionistName);
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Toggles for sections in integral report
  const [includeStaff, setIncludeStaff] = useState(true);
  const [includeVisitsHistory, setIncludeVisitsHistory] = useState(true);
  const [includeIssues, setIncludeIssues] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);

  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  if (!isOpen) return null;

  // Filtered issues
  const pendingIssues = issues.filter(i => i.status !== 'Resuelto');
  const resolvedIssues = issues.filter(i => i.status === 'Resuelto');

  // Active visit for official devolution or inspection
  const activeVisit = visits.find(v => v.id === selectedVisitId) || (visits.length > 0 ? visits[visits.length - 1] : null);

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Generate HTML standalone file download
  const handleDownloadHtml = () => {
    const reportElement = document.getElementById('school-printable-report');
    if (!reportElement) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Devolución de Visita - ${nombreInstitucion(school)} ${school.name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
    }
    h1, h2, h3, h4 { color: #0f172a; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
    th { background: #f8fafc; font-weight: 700; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .badge-expired { background: #fee2e2; color: #991b1b; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-ok { background: #dcfce7; color: #166534; }
    .section { border-bottom: 1px solid #e2e8f0; padding: 14px 0; }
    .header-box { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
    .signatures { display: flex; justify-content: space-around; margin-top: 40px; padding-top: 20px; }
    .sig-line { border-top: 1px solid #64748b; width: 220px; text-align: center; padding-top: 6px; font-size: 12px; }
    @media print {
      body { padding: 0; }
      @page { margin: 15mm; size: A4; }
    }
  </style>
</head>
<body>
  ${reportElement.innerHTML}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Devolucion_Escuela_${school.number}_${school.name.replace(/[^a-zA-Z0-9]/g, '_')}_${reportDate}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy text to clipboard
  const handleCopyText = () => {
    let text = '';
    if (reportType === 'devolucion_oficial' && activeVisit) {
      text = `Tacuarembó, ${new Date(activeVisit.date + 'T12:00:00').toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`;
      text += `ORIENTACIONES SOBRE VISITAS A ESCUELAS\n\n`;
      text += `Fecha del día de la visita: ${activeVisit.date}\n`;
      text += `En el día de la fecha se realiza la visita a cocina comedor ${tipoDe(school) === 'Jardín' ? 'del jardín' : 'de escuela'} N° ${school.number} a cargo del Maestro/a Director/a ${school.principalName} por parte de ${activeVisit.inspectorName || inspectorName}.\n\n`;
      text += `Se remiten las observaciones realizadas durante la visita a la ${activeVisit.nutritionistName || nutritionistName}, con el propósito de que las mismas sean posteriormente elevadas al inspector/a de zona (${activeVisit.assignedSchoolInspector || school.assignedInspector || 'Inspector/a de Zona'}).\n`;
      text += `Cabe destacar que todas las consideraciones formuladas y las orientaciones transmitidas a Maestro/a Director/a en relación con el menú escolar han sido previamente informadas y cuentan con la aprobación de la Licenciada en Nutrición Departamental.\n\n`;
      
      if (activeVisit.initialFieldObservations) {
        text += `Observaciones y orientaciones preliminares de campo:\n${activeVisit.initialFieldObservations}\n\n`;
      }

      text += `En dicha instancia se pudieron constatar las siguientes observaciones, orientaciones y/o sugerencias:\n\n`;
      text += `Nómina: ${school.areaType} - ${school.modality}\n`;
      text += `Matrícula: ${school.studentDinersCount}\n`;
      text += `Asistencia real del día: ${activeVisit.dinersActualCount} niños ${activeVisit.actualAdultsCount ? `+ ${activeVisit.actualAdultsCount} adultos` : ''}\n`;
      text += `Auxiliares: ${activeVisit.staffHygieneNotes || 'Uniforme reglamentario y carnés vigentes.'}\n`;
      text += `Higiene: ${activeVisit.facilityHygieneNotes || 'Condiciones higiénico-sanitarias adecuadas.'}\n`;
      text += `Almacenamiento: ${activeVisit.storageNotes || 'Condiciones en frío y seco correctas.'}\n`;
      text += `Servicio: ${activeVisit.serviceNotes || 'Horarios y normas de servicio cumplidas.'}\n`;
      text += `Equipamiento y menage: ${activeVisit.equipmentNotes || 'Equipamiento acorde a la matrícula.'}\n`;
      text += `Proveedores: ${activeVisit.providersNotes || 'Distribución local habitual.'}\n\n`;
      text += `Menú del día de la visita del almuerzo: ${activeVisit.lunchMenu || activeVisit.menuServed}\n`;
      text += `Desayuno y/o merienda: ${activeVisit.breakfastOrSnackMenu || 'Leche con panificados autorizados'}\n\n`;
      text += `Menú de la semana (${activeVisit.weeklyMenuDates || 'Semanal'}):\n`;
      text += `Lunes: ${activeVisit.weeklyMenuMonday || '-'}\n`;
      text += `Martes: ${activeVisit.weeklyMenuTuesday || '-'}\n`;
      text += `Miércoles: ${activeVisit.weeklyMenuWednesday || '-'}\n`;
      text += `Jueves: ${activeVisit.weeklyMenuThursday || '-'}\n`;
      text += `Viernes: ${activeVisit.weeklyMenuFriday || '-'}\n\n`;
      text += `Se cumple con el o los Recetarios: ${activeVisit.recipeCompliance || 'Conforme a normativa'}\n`;
      text += `Variabilidad y postres: ${activeVisit.foodVariabilityAndDesserts || 'Variabilidad adecuada'}\n`;
      text += `Sugerencias al respecto: ${activeVisit.menuVariabilitySuggestions || 'Mantener rotación de hortalizas'}\n\n`;
      text += `En cuanto a los registros:\n`;
      text += `• ${activeVisit.monthlySheetsSentToEmail || 'Planilla y boletas mensuales al correo paetacuarembo@gmail.com'}\n`;
      text += `• ${activeVisit.kitchenLogbooksInOrder || 'Cuadernos Art. 14 Circular N°6/2024 al día'}\n`;
      text += `• Se observa en los registros: ${activeVisit.recordsNotes || 'Sin anomalías'}\n`;
      text += `• Alimentos de compra No Autorizada en registros: ${activeVisit.unauthorizedPurchasesInRecords || 'No se constatan compras no autorizadas'}\n\n`;
      text += `Meriendas y Cantina:\n`;
      text += `• Registro de merienda/desayuno: ${activeVisit.snackAndBreakfastRecorded || 'Al día'}\n`;
      text += `• Merienda saludable: ${activeVisit.healthySnackNotes || 'Promoción de frutas y agua'}\n`;
      text += `• Cantina escolar: ${activeVisit.schoolCanteenNotes || 'Sin cantina o conforme a Ley 19.140'}\n`;
      text += `• Menúes especiales: ${activeVisit.specialMenusNotes || 'Certificado médico y Acta según Circular 6/2024'}\n\n`;
      text += `Observaciones del personal: ${activeVisit.staffFeedbackNotes || 'Conformidad con las orientaciones'}\n\n`;
      text += `Sin más que agregar, quedan a las órdenes ante cualquier duda o consulta.\n`;
      text += `${inspectorName}\n`;
    } else {
      text = `ANEP - DGEIP | INFORME TÉCNICO DE COMEDOR ESCOLAR\nESCUELA N° ${school.number} - ${school.name}\n`;
      text += `Ámbito: ${school.areaType} | Modalidad: ${school.modality} | Tacuarembó\n`;
      text += `Inspector/a: ${school.assignedInspector || '-'}\n`;
      text += `Suministro de Agua: ${school.hasWaterSupply ? 'Con red OSE' : 'Sin red OSE'} | Rubro compra agua: ${school.waterPurchaseAllowance ? 'Sí' : 'No'}\n`;
      text += `Programa de Leche: ${school.milkProgramType} | Leche en polvo: ${school.milkPowderKg} kg/mes\n`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[96vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        
        {/* Top Bar for User Controls (hidden on print) */}
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white rounded-t-2xl print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Devolución Oficial & Legajo Escolar
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-400/30">
                  {nombreInstitucion(school)}
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${
                  school.areaType === 'Rural' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {school.areaType}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Programa de Alimentación Escolar (PAE) • DGEIP Tacuarembó
              </p>
            </div>
          </div>

          {/* Quick Select of Report Mode */}
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setReportType('devolucion_oficial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                reportType === 'devolucion_oficial'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Devolución Oficial (PAE Tacuarembó)
            </button>
            <button
              onClick={() => setReportType('integral')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                reportType === 'integral'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Legajo Integral
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                showConfig ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Personalizar datos de emisor y opciones"
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Ajustes</span>
            </button>

            <button
              onClick={handleCopyText}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Copiar texto formal al portapapeles"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              onClick={handleDownloadHtml}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Descargar documento HTML"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Descargar</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Cerrar vista"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Drawer */}
        {showConfig && (
          <div className="bg-slate-100 border-b border-slate-200 p-4 text-xs space-y-3 print:hidden shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ecónomas Emisoras:</label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={e => setInspectorName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Lic. en Nutrición:</label>
                <input
                  type="text"
                  value={nutritionistName}
                  onChange={e => setNutritionistName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Fecha del Documento:</label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={e => setReportDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {visits.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <label className="font-bold text-slate-700 block mb-1">Seleccionar Visita para la Devolución:</label>
                <select
                  value={selectedVisitId}
                  onChange={e => setSelectedVisitId(e.target.value)}
                  className="w-full max-w-lg p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                >
                  {visits.map(v => (
                    <option key={v.id} value={v.id}>
                      Visita N° {v.visitNumber} ({v.date}) - {v.inspectorName} - Almuerzo: {v.lunchMenu || v.menuServed}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* PRINTABLE CONTAINER */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-50 print:bg-white print:p-0">
          <div 
            id="school-printable-report"
            className="max-w-[850px] mx-auto bg-white p-8 sm:p-12 shadow-sm rounded-xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:max-w-none text-slate-900"
          >
            
            {/* OPCIÓN 1: FORMATO OFICIAL SOLICITADO "ORIENTACIONES SOBRE VISITAS A ESCUELAS" */}
            {reportType === 'devolucion_oficial' ? (
              <div className="font-serif leading-relaxed text-sm space-y-4">
                
                {/* Encabezado con fecha */}
                <div className="text-right text-xs text-slate-700 italic pb-2">
                  Tacuarembó, {activeVisit 
                    ? new Date(activeVisit.date + 'T12:00:00').toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
                    : new Date().toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
                  }
                </div>

                {/* Título Oficial */}
                <div className="text-center font-bold text-lg sm:text-xl tracking-wider uppercase text-slate-950 pt-2 pb-1 border-b-2 border-slate-800">
                  ORIENTACIONES SOBRE VISITAS A ESCUELAS
                </div>

                {/* Apertura institucional */}
                <div className="space-y-2 pt-2 text-justify">
                  <p>
                    <strong>Fecha del día de la visita:</strong> {activeVisit ? activeVisit.date : reportDate}
                  </p>
                  <p>
                    En el día de la fecha se realiza la visita a cocina comedor {tipoDe(school) === 'Jardín' ? 'del jardín' : 'de escuela'} <strong>N° {school.number}</strong> a cargo del Maestro/a Director/a <strong>{school.principalName}</strong> por parte de {activeVisit?.inspectorName || inspectorName}.
                  </p>
                  <p className="text-slate-800">
                    Se remiten las observaciones realizadas durante la visita a la <strong>{activeVisit?.nutritionistName || nutritionistName}</strong>, con el propósito de que las mismas sean posteriormente elevadas al inspector/a de zona (<strong>{activeVisit?.assignedSchoolInspector || school.assignedInspector || 'Inspector/a de Escuela'}</strong>).
                  </p>
                  <p className="text-slate-800">
                    Cabe destacar que todas las consideraciones formuladas y las orientaciones transmitidas a Maestro/a Director/a en relación con el menú escolar han sido previamente informadas y cuentan con la aprobación de la Licenciada en Nutrición Departamental.
                  </p>
                </div>

                {/* APARTADO PREVIO INTEGRADO (solicitado en el prompt) */}
                {activeVisit?.initialFieldObservations && (
                  <div className="bg-emerald-50/70 p-4 rounded-lg border-l-4 border-emerald-700 my-3 print:bg-slate-50 print:border-slate-600">
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-950 block mb-1">
                      Observaciones y Consideraciones Previas de Campo:
                    </span>
                    <p className="whitespace-pre-line text-xs sm:text-sm text-slate-900 leading-normal">
                      {activeVisit.initialFieldObservations}
                    </p>
                  </div>
                )}

                <p className="italic font-bold text-slate-900 pt-1">
                  En dicha instancia se pudieron constatar las siguientes observaciones, orientaciones y/o sugerencias.
                </p>

                {/* Secciones de la Devolución */}
                <div className="space-y-3 pt-1">
                  <p>
                    <strong>Nómina:</strong> {school.areaType} - Modalidad: {school.modality}. Atendido por: {activeVisit?.attendedBy || school.principalName}.
                  </p>
                  <p>
                    <strong>Matrícula:</strong> {school.studentDinersCount} alumnos comensales registrados.
                  </p>
                  <p>
                    <strong>Asistencia real del día (niños y adultos si corresponde):</strong> {activeVisit?.dinersActualCount || school.studentDinersCount} niños {activeVisit?.actualAdultsCount ? `y ${activeVisit.actualAdultsCount} adultos comensales` : ''}.
                  </p>

                  {/* Detalle especial de Agua y Leche para Tacuarembó */}
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1 my-2">
                    <p>
                      <strong>Suministro de Agua Potable:</strong> {school.hasWaterSupply 
                        ? 'Cuenta con conexión regular a red OSE.' 
                        : `No cuenta con suministro de red OSE. ${school.waterPurchaseAllowance ? 'Recibe Rubro oficial de PAE para compra de agua potable (bidones y tanque de cocina).' : ''} ${school.waterNotes || ''}`}
                    </p>
                    <p>
                      <strong>Programa de Leche y Cuota en Polvo:</strong> Pertenece al {school.milkProgramType}. Recibe cuota de <strong>{school.milkPowderKg} kg/mes</strong> de leche en polvo. {school.milkNotes || ''}
                    </p>
                  </div>

                  <p>
                    <strong>Auxiliares:</strong> (DGEIP y/u otra empresa) {activeVisit?.staffHygieneNotes || 'Personal con uniforme completo, cofias cubriendo el cabello, sin alhajas visibles ni uñas pintadas, carnés vigentes.'}
                  </p>

                  <p>
                    <strong>Higiene:</strong> {activeVisit?.facilityHygieneNotes || 'Condiciones edilicias del estado de cocina y comedor en buen estado en cada una de sus áreas.'}
                  </p>

                  <p>
                    <strong>Almacenamiento (frío y/o seco):</strong> {activeVisit?.storageNotes || 'Orden correcto, envases herméticos rotulados, fechas de vencimiento vigentes. Sin alimentos de compra no autorizada.'}
                  </p>

                  <p>
                    <strong>Servicio:</strong> {activeVisit?.serviceNotes || 'Horarios, orden, conductas, buenos hábitos, temperaturas seguras en los alimentos, docente responsable del comedor, se consumen todos los alimentos en el comedor, control en general y de asistencia. Mesas completas: plato principal, agua, pan, postre, servilletas y cubiertos acordes a la preparación.'}
                  </p>

                  <p>
                    <strong>Con respecto a equipamiento y menage (necesidades, solicitudes y/o recibidos):</strong> {activeVisit?.equipmentNotes || (school.areaType === 'Rural' ? 'Equipamiento en buen estado general. Menage suficiente.' : 'Equipamiento completo acorde a la matrícula escolar.')}
                  </p>

                  <p>
                    <strong>Proveedores:</strong> {activeVisit?.providersNotes || 'Proveedores de Tacuarembó abastecen con normalidad en los días estipulados.'}
                  </p>

                  {/* Menús del día */}
                  <div className="border-t border-b border-slate-200 py-2.5 my-2 space-y-1.5">
                    <p>
                      <strong>Menú del día de la visita del almuerzo:</strong> {activeVisit?.lunchMenu || activeVisit?.menuServed || 'Cazuela de legumbres con carne vacuna y verduras + Fruta fresca de estación'}
                    </p>
                    <p>
                      <strong>Desayuno y/o merienda:</strong> {activeVisit?.breakfastOrSnackMenu || 'Leche enriquecida tibia con panificados autorizados'}
                    </p>
                  </div>

                  {/* Menú de la semana */}
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-300 space-y-1 my-3 print:border-slate-500">
                    <p className="font-bold text-slate-950 mb-1">
                      Menú de la semana (desayuno, almuerzo, y/o merienda) {activeVisit?.weeklyMenuDates || 'de la semana'}:
                    </p>
                    <p><strong>Lunes:</strong> {activeVisit?.weeklyMenuMonday || 'Milanesas de carne al horno con puré mixto + Naranja'}</p>
                    <p><strong>Martes:</strong> {activeVisit?.weeklyMenuTuesday || 'Pastel de carne con base de puré y hortalizas + Banana'}</p>
                    <p><strong>Miércoles:</strong> {activeVisit?.weeklyMenuWednesday || 'Cazuela de lentejas con arroz y verduras + Manzana'}</p>
                    <p><strong>Jueves:</strong> {activeVisit?.weeklyMenuThursday || 'Pollo al horno con ensalada mixta + Mandarina'}</p>
                    <p><strong>Viernes:</strong> {activeVisit?.weeklyMenuFriday || 'Torta de verduras y queso con arroz primavera + Ensalada de frutas'}</p>
                  </div>

                  <p>
                    <strong>Se cumple con el o los Recetarios y la planificación del menú:</strong> {activeVisit?.recipeCompliance || 'Se cumple con las pautas de los recetarios oficiales del PAE.'}
                  </p>

                  <p>
                    <strong>Se tiene en cuenta la variabilidad y frecuencias de los diferentes tipos de alimentos (en todos los tiempos de comida brindados), incluyendo la frecuencia de postres:</strong> {activeVisit?.foodVariabilityAndDesserts || 'Se mantiene adecuada frecuencia de verduras, legumbres y frutas como postre principal.'}
                  </p>

                  <p>
                    <strong>Sugerencias al respecto:</strong> {activeVisit?.menuVariabilitySuggestions || 'Siempre tratar de incluir variedad de alimentos, alternando la presentación a los efectos de evitar la monotonía, tanto en almuerzo como en desayuno o merienda.'}
                  </p>

                  {/* Registros oficiales y Circular N°6 */}
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-300 space-y-2 my-3 text-xs sm:text-sm">
                    <p className="font-bold uppercase tracking-wider text-slate-900">En cuanto a los registros:</p>
                    <p>
                      • {activeVisit?.monthlySheetsSentToEmail || 'Se envía Planilla de Registro Diario de Menú y boletas de manera mensual al correo paetacuarembo@gmail.com, como se solicita.'}
                    </p>
                    <p>
                      • {activeVisit?.kitchenLogbooksInOrder || 'En cuanto a cuadernos de registro y de remitos en cocina están presentes, completos, en buen estado y al día. Art. 14- De los Registros, de la Circular N°6 del 23 de Febrero del 2024.'}
                    </p>
                    <p>
                      • <strong>Se observa en los registros:</strong> {activeVisit?.recordsNotes || 'Registros completos y firmados por Dirección y Auxiliares de cocina.'}
                    </p>
                    <p>
                      • <strong>Alimentos de compra No Autorizada en los registros:</strong> {activeVisit?.unauthorizedPurchasesInRecords || 'No se constatan alimentos de compra no autorizada en remitos ni comprobantes.'}
                      <span className="block text-slate-600 text-xs italic mt-0.5">
                        (Ver lista de alimentos de compra no autorizada en pág. 80 del recetario "Los Nuevos Sabores de mi Escuela" y/o en pág. 71 del recetario "Las delicias de mi Escuela").
                      </span>
                    </p>
                  </div>

                  <p>
                    <strong>Se registra merienda y/o desayuno:</strong> {activeVisit?.snackAndBreakfastRecorded || 'Sí, se asienta diariamente en la planilla de comedor escolar.'}
                  </p>
                  <p>
                    <strong>Merienda saludable:</strong> {activeVisit?.healthySnackNotes || 'Se orienta a incorporar frutas de estación y panificados con bajo contenido de azúcares.'}
                  </p>
                  <p>
                    <strong>Cantina escolar:</strong> {activeVisit?.schoolCanteenNotes || (school.areaType === 'Rural' ? 'No cuenta con cantina comercial.' : 'Sujeta a los estándares de la Ley 19.140.')}
                  </p>
                  <p>
                    <strong>Merienda traída desde el hogar:</strong> {activeVisit?.homeSnackNotes || 'Se recomienda a las familias enviar colaciones saludables (agua, frutas, frutos secos).'}
                  </p>

                  <p>
                    <strong>Menúes especiales:</strong> {activeVisit?.specialMenusNotes || 'Se responde adecuadamente a la patología si correspondiere. Se recuerda la necesidad de contar con Certificado médico y Acta correspondiente de la página 14 de la Circular N°6 del 23 de Febrero del 2024.'}
                  </p>

                  {/* Normativa y Recetarios de Referencia */}
                  <div className="bg-slate-100 p-3 rounded text-xs font-mono space-y-1 text-slate-800 my-2">
                    <div><strong>Link Circular N°6 del 23 de Febrero del 2024:</strong></div>
                    <div className="text-emerald-800 underline break-all">https://www.dgeip.edu.uy/documentos/normativa/ceip/2024/Circular6_24b.pdf</div>
                    <div className="pt-1"><strong>Recetarios de referencia institucional:</strong></div>
                    <div>• Recetario "Copa de Leche" (Recetario-COPA DE LECHE - imp.pdf)</div>
                    <div>• Recetario "PAE" (Recetario Anual PAE (1).pdf) / "Los Nuevos Sabores de mi Escuela"</div>
                  </div>

                  <p className="italic text-slate-800">
                    Siempre tratar de incluir variedad de alimentos, alternando la presentación a los efectos de evitar la monotonía, tanto en almuerzo como en desayuno o merienda.
                  </p>

                  <p>
                    <strong>Observaciones y/o sugerencias por parte del personal:</strong> {activeVisit?.staffFeedbackNotes || 'El personal auxiliar manifiesta buena predisposición para el cumplimiento de las orientaciones nutricionales.'}
                  </p>
                </div>

                {/* Cierre Formal */}
                <div className="pt-8 text-center space-y-4 print-avoid-break">
                  <p className="italic text-slate-800">
                    Sin más que agregar, quedan a las órdenes ante cualquier duda o consulta.
                  </p>
                  <div className="pt-6 font-bold text-slate-950 flex flex-col items-center">
                    <div className="w-64 border-t border-slate-700 mb-1"></div>
                    <div>{inspectorName}</div>
                    <div className="text-xs font-normal text-slate-600">Programa de Alimentación Escolar (PAE) • DGEIP Tacuarembó</div>
                  </div>
                </div>

              </div>
            ) : (
              /* OPCIÓN 2: LEGAJO INTEGRAL CON DETALLES DE TACUAREMBÓ */
              <div className="space-y-6 text-xs sm:text-sm">
                
                {/* Membrete Integral */}
                <div className="border-b-2 border-slate-900 pb-4 text-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                    ANEP • DIRECCIÓN GENERAL DE EDUCACIÓN INICIAL Y PRIMARIA (DGEIP)
                  </span>
                  <h1 className="text-lg sm:text-2xl font-black text-slate-900 mt-1 uppercase tracking-tight">
                    Legajo Técnico Institucional • Comedor Escolar N° {school.number}
                  </h1>
                  <p className="text-xs font-bold text-emerald-800 mt-1">
                    {school.name} • Departamento de {school.department || 'Tacuarembó'} ({school.areaType})
                  </p>
                  <div className="text-slate-500 text-xs mt-1">
                    Inspector/a: {school.assignedInspector || 'No asignado'} • Emisión: {reportDate}
                  </div>
                </div>

                {/* Tarjetas resumen */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Ámbito</span>
                    <span className="text-base font-black text-slate-900">{school.areaType}</span>
                    <span className="text-[10px] text-slate-500 block">{school.modality}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Agua Potable</span>
                    <span className="text-xs font-bold text-slate-900">
                      {school.hasWaterSupply ? 'Red OSE' : 'Sin red'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {school.waterPurchaseAllowance ? 'Recibe Rubro Agua' : 'Sin rubro'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Leche en Polvo</span>
                    <span className="text-base font-black text-amber-800">{school.milkPowderKg} kg</span>
                    <span className="text-[10px] text-slate-500 block">{school.milkProgramType}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Comensales</span>
                    <span className="text-base font-black text-slate-900">{school.studentDinersCount}</span>
                    <span className="text-[10px] text-slate-500 block">+{school.staffDinersCount} adultos</span>
                  </div>
                </div>

                {/* 1. Datos Institucionales */}
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    1. Datos Institucionales y Suministros
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <p><strong>Dirección / Localidad:</strong> {school.address} ({school.zone})</p>
                    <p><strong>Teléfono / Contacto:</strong> {school.phone} • {school.email}</p>
                    <p><strong>Maestro/a Director/a:</strong> {school.principalName}</p>
                    <p><strong>Encargada de Cocina:</strong> {school.headCookName}</p>
                    <p><strong>Inspector/a Asignado/a:</strong> {school.assignedInspector}</p>
                    <p><strong>Servicios Brindados:</strong> {[school.mealServices.breakfast && 'Desayuno', school.mealServices.lunch && 'Almuerzo', school.mealServices.snack && 'Merienda'].filter(Boolean).join(' • ')}</p>
                  </div>
                  {school.waterNotes && (
                    <div className="mt-2 p-2 bg-sky-50 rounded text-xs text-sky-900 border border-sky-200">
                      <strong>Detalle de Agua:</strong> {school.waterNotes}
                    </div>
                  )}
                </div>

                {/* 2. Personal de Cocina */}
                {includeStaff && (
                  <div className="border-b border-slate-200 pb-4">
                    <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-700" />
                      2. Nómina de Personal de Cocina ({staff.length})
                    </h3>
                    <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                      <thead>
                        <tr className="bg-slate-100 font-bold">
                          <th className="border border-slate-300 p-1.5">Nombre</th>
                          <th className="border border-slate-300 p-1.5">Cédula</th>
                          <th className="border border-slate-300 p-1.5">Rol</th>
                          <th className="border border-slate-300 p-1.5">Institución / Régimen</th>
                          <th className="border border-slate-300 p-1.5">Carné Salud</th>
                          <th className="border border-slate-300 p-1.5">Aportes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staff.map(s => {
                          const status = getHealthCardStatus(s.healthCardValidUntil);
                          return (
                            <tr key={s.id}>
                              <td className="border border-slate-300 p-1.5 font-bold">{s.fullName}</td>
                              <td className="border border-slate-300 p-1.5">{s.ci}</td>
                              <td className="border border-slate-300 p-1.5">{s.role}</td>
                              <td className="border border-slate-300 p-1.5">{s.institutionType} {s.enterpriseName ? `(${s.enterpriseName})` : ''}</td>
                              <td className={`border border-slate-300 p-1.5 font-semibold ${
                                status === 'expired' ? 'text-rose-700 bg-rose-50' : status === 'warning' ? 'text-amber-700 bg-amber-50' : 'text-emerald-700'
                              }`}>
                                {s.healthCardValidUntil}
                              </td>
                              <td className="border border-slate-300 p-1.5">{s.socialSecurityStatus}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 3. Historial de Visitas */}
                {includeVisitsHistory && (
                  <div className="border-b border-slate-200 pb-4">
                    <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-700" />
                      3. Historial de Visitas de Campo Realizadas ({visits.length})
                    </h3>
                    <div className="space-y-3">
                      {visits.map(v => (
                        <div key={v.id} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
                          <div className="flex items-center justify-between font-bold text-slate-900 border-b pb-1 mb-1.5">
                            <span>Visita N° {v.visitNumber} — Fecha: {v.date} ({v.time} hs)</span>
                            <span className="text-emerald-800">{v.menuEvaluation}</span>
                          </div>
                          <p><strong>Almuerzo:</strong> {v.lunchMenu || v.menuServed}</p>
                          <p><strong>Comensales verificados:</strong> {v.dinersActualCount} niños</p>
                          <p><strong>Orientaciones y sugerencias:</strong> {v.suggestions || v.generalObservations}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Incidencias */}
                {includeIssues && (
                  <div className="border-b border-slate-200 pb-4">
                    <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      4. Seguimiento de Casos e Incidencias ({issues.length})
                    </h3>
                    <div className="space-y-2">
                      {issues.map(iss => (
                        <div key={iss.id} className="p-2 bg-slate-50 rounded border border-slate-200 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-bold">{iss.title}</span> ({iss.category} - {iss.severity})
                            <span className="block text-slate-500">{iss.description}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            iss.status === 'Resuelto' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {iss.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Firmas */}
                {includeSignatures && (
                  <div className="pt-8 flex justify-around text-center text-xs print-avoid-break">
                    <div>
                      <div className="w-48 border-t border-slate-600 mb-1"></div>
                      <p className="font-bold">Equipo PAE</p>
                      <p className="text-slate-500">{inspectorName}</p>
                    </div>
                    <div>
                      <div className="w-48 border-t border-slate-600 mb-1"></div>
                      <p className="font-bold">Lic. en Nutrición</p>
                      <p className="text-slate-500">{nutritionistName}</p>
                    </div>
                    <div>
                      <div className="w-48 border-t border-slate-600 mb-1"></div>
                      <p className="font-bold">Maestro/a Director/a</p>
                      <p className="text-slate-500">{school.principalName}</p>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

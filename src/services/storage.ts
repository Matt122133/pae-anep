// Utilidades del legajo que no dependen de dónde vive el dato: estado de los
// carnés y exportación a CSV/JSON (FR-031).
//
// Hasta 001 este archivo ERA la base de datos (localStorage, semillas y
// migraciones). Desde 001 la fuente de verdad es el servidor y el estado lo
// trae GET /legajo; acá solo quedan las funciones que trabajan sobre ese
// estado en memoria.
import { School, StaffMember, Visit, SchoolIssue, ActivityLog } from '../types';
import { nombreInstitucion } from './institucion';

export interface DatabaseState {
  schools: School[];
  staff: StaffMember[];
  visits: Visit[];
  issues: SchoolIssue[];
  activityLogs: ActivityLog[];
}

export function getHealthCardStatus(dateString: string): 'expired' | 'warning' | 'valid' {
  if (!dateString) return 'expired';
  const target = new Date(dateString);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'warning';
  return 'valid';
}

export function formatHealthCardBadge(dateString: string): { label: string; color: string; status: 'expired' | 'warning' | 'valid' } {
  const status = getHealthCardStatus(dateString);
  if (status === 'expired') {
    return { label: `Vencido (${dateString})`, color: 'bg-rose-100 text-rose-800 border-rose-200', status };
  }
  if (status === 'warning') {
    return { label: `Vence pronto (${dateString})`, color: 'bg-amber-100 text-amber-800 border-amber-200', status };
  }
  return { label: `Vigente (${dateString})`, color: 'bg-emerald-100 text-emerald-800 border-emerald-200', status };
}

// Export to JSON file download
export function downloadJsonBackup(state: DatabaseState): void {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  const date = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute("download", `respaldo_legajos_comedores_${date}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Export CSV
export function downloadSchoolsCsv(schools: School[]): void {
  const headers = [
    'Nro', 
    'Nombre', 
    'Departamento', 
    'Ambito (Rural/Urbana)', 
    'Localidad/Zona', 
    'Inspector/a Asignado/a',
    'Suministro Agua OSE', 
    'Recibe Rubro Agua Potable',
    'Programa Leche', 
    'Leche en Polvo (Kg/mes)',
    'Direccion', 
    'Telefono', 
    'Directora', 
    'Encargada Cocina', 
    'Modalidad', 
    'Comensales Alumnos', 
    'Visitas Realizadas', 
    'Ultima Visita', 
    'Problemas Activos'
  ];
  const rows = schools.map(s => [
    s.number,
    `"${s.name.replace(/"/g, '""')}"`,
    `"${s.department}"`,
    `"${s.areaType}"`,
    `"${s.zone || '-'}"`,
    `"${s.assignedInspector || '-'}"`,
    s.hasWaterSupply ? 'Sí (Red OSE)' : 'No (Sin red)',
    s.waterPurchaseAllowance ? 'Sí (Recibe Rubro Agua)' : 'No',
    `"${s.milkProgramType || '-'}"`,
    s.milkPowderKg || 0,
    `"${s.address}"`,
    `"${s.phone}"`,
    `"${s.principalName}"`,
    `"${s.headCookName}"`,
    `"${s.modality}"`,
    s.studentDinersCount,
    s.totalVisits,
    s.lastVisitDate || 'Sin visita',
    s.activeIssuesCount
  ]);

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `reporte_escuelas_comedores_tacuarembo_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function downloadStaffCsv(staff: StaffMember[], schools: School[]): void {
  const schoolMap = new Map(schools.map(s => [s.id, nombreInstitucion(s)]));
  const headers = ['Escuela', 'Nombre Completo', 'CI / Documento', 'Rol en Cocina', 'Institución / Régimen', 'Empresa Tercerizada', 'Vencimiento Carne Salud', 'Estado Carne', 'Aportes / BPS', 'Telefono'];
  
  const rows = staff.map(st => {
    const status = getHealthCardStatus(st.healthCardValidUntil);
    const statusLabel = status === 'expired' ? 'VENCIDO' : status === 'warning' ? 'POR VENCER' : 'VIGENTE';
    return [
      `"${schoolMap.get(st.schoolId) || 'N/A'}"`,
      `"${st.fullName}"`,
      `"${st.ci}"`,
      `"${st.role}"`,
      `"${st.institutionType}"`,
      `"${st.enterpriseName || '-'}"`,
      `"${st.healthCardValidUntil}"`,
      `"${statusLabel}"`,
      `"${st.socialSecurityStatus}"`,
      `"${st.phone || '-'}"`
    ];
  });

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
  
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", `reporte_auxiliares_cocina_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function downloadActivityLogsCsv(logs: ActivityLog[]): void {
  const headers = [
    'ID',
    'Fecha y Hora (ISO)',
    'Fecha Legible',
    'Hora',
    'N° Institución',
    'Nombre Institución',
    'Usuario ID',
    'Autor / Responsable',
    'Cargo / Rol',
    'Tipo de Acción',
    'Categoría',
    'Etiqueta / Tipo de Evento',
    'Etiquetas Adicionales',
    'Resumen de Modificación',
    'Detalle de Campos Modificados',
    'Observaciones / Justificación'
  ];

  const rows = logs.map(l => {
    const d = new Date(l.timestamp);
    const dateFormatted = isNaN(d.getTime()) ? l.timestamp : d.toLocaleDateString('es-UY');
    const timeFormatted = isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
    const detailsStr = (l.details || []).map(dt => `${dt.fieldLabel}: ${dt.oldValue ?? '(vacío)'} -> ${dt.newValue ?? '(vacío)'}`).join(' | ');
    const tagsStr = (l.tags || []).join(', ');

    return [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${dateFormatted}"`,
      `"${timeFormatted}"`,
      l.schoolNumber ?? '-',
      `"${(l.schoolName || '').replace(/"/g, '""')}"`,
      `"${l.userId}"`,
      `"${(l.userName || '').replace(/"/g, '""')}"`,
      `"${(l.userRole || '').replace(/"/g, '""')}"`,
      `"${l.actionType}"`,
      `"${l.category}"`,
      `"${l.eventTag || ''}"`,
      `"${tagsStr.replace(/"/g, '""')}"`,
      `"${(l.summary || '').replace(/"/g, '""')}"`,
      `"${detailsStr.replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
  
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", `bitacora_actividad_legajos_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

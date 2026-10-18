import { School, StaffMember, Visit, SchoolIssue, ModalityType, ActivityLog, PAE_TEAM_MEMBERS } from '../types';
import { generateInitial140Schools } from '../data/initialData';

const STORAGE_KEYS = {
  SCHOOLS: 'legajo_escolar_schools_v4',
  STAFF: 'legajo_escolar_staff_v4',
  VISITS: 'legajo_escolar_visits_v4',
  ISSUES: 'legajo_escolar_issues_v4',
  LOGS: 'legajo_escolar_logs_v4',
  INITIALIZED: 'legajo_escolar_init_tacuarembo_v4',
  ACTIVE_USER: 'pae_active_user_id_v4'
};

export function getActiveUserId(): string {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_USER) || 'valentina';
}

export function setActiveUserId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, id);
}

export interface DatabaseState {
  schools: School[];
  staff: StaffMember[];
  visits: Visit[];
  issues: SchoolIssue[];
  activityLogs: ActivityLog[];
}

export function generateSeedActivityLogs(schools: School[]): ActivityLog[] {
  const findSchool = (num: number) => schools.find(s => s.number === num) || schools[0];
  
  const sc1 = findSchool(1);
  const sc6 = findSchool(6);
  const sc12 = findSchool(12);
  const sc14 = findSchool(14);
  const sc18 = findSchool(18);
  const sc35 = findSchool(35);
  const sc75 = findSchool(75);

  return [
    {
      id: 'log-seed-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // hace 35 min
      schoolId: sc1.id,
      schoolNumber: sc1.number,
      schoolName: sc1.name,
      userId: 'valentina',
      userName: 'Valentina Suárez',
      userRole: 'Ecónoma del PAE',
      actionType: 'VISIT_LOG',
      category: 'Visitas de Campo',
      eventTag: 'Visita crítica',
      tags: ['Visita crítica', 'Control Bromatológico'],
      summary: `Registro de Visita Técnica N° ${sc1.totalVisits || 1} - Supervisión de Servicio de Almuerzo`,
      details: [
        { field: 'dinersActualCount', fieldLabel: 'Comensales efectivos', oldValue: null, newValue: `${sc1.studentDinersCount} alumnos` },
        { field: 'menuEvaluation', fieldLabel: 'Evaluación del menú', oldValue: null, newValue: 'Adecuado y Variado' },
        { field: 'deliveryNotesChecked', fieldLabel: 'Cotejo de remitos', oldValue: null, newValue: 'Conforme con boletas de proveedores locales' }
      ],
      notes: 'Visita presencial en horario de comedor. Se verificó gramaje y rotación de ensaladas.'
    },
    {
      id: 'log-seed-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // hace 2 horas
      schoolId: sc14.id,
      schoolNumber: sc14.number,
      schoolName: sc14.name,
      userId: 'shaja',
      userName: 'Shaja Rodríguez',
      userRole: 'Ecónoma del PAE',
      actionType: 'UPDATE',
      category: 'Auxiliares y Personal',
      eventTag: 'Cambio de personal',
      tags: ['Cambio de personal'],
      summary: 'Actualización y renovación de Carné de Salud de Auxiliar de Cocina',
      details: [
        { field: 'healthCardValidUntil', fieldLabel: 'Vencimiento Carné de Salud', oldValue: '2026-08-15 (Vencido)', newValue: '2027-08-15 (Vigente)' },
        { field: 'socialSecurityStatus', fieldLabel: 'Aportes BPS', oldValue: 'Pendiente de Regularización', newValue: 'Al día / Registrado' }
      ],
      notes: 'Se adjuntó comprobante expedido por policlínica departamental de Tacuarembó.'
    },
    {
      id: 'log-seed-3',
      timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // hace 4 horas
      schoolId: sc6.id,
      schoolNumber: sc6.number,
      schoolName: sc6.name,
      userId: 'laura',
      userName: 'Lic. Laura Cuadrado',
      userRole: 'Licenciada en Nutrición',
      actionType: 'STATUS_CHANGE',
      category: 'Seguimiento de Casos',
      eventTag: 'Incidencia o Reclamo',
      tags: ['Incidencia o Reclamo'],
      summary: 'Resolución de incidencia: Adecuación de Menú Especial y Texturas',
      details: [
        { field: 'status', fieldLabel: 'Estado del Caso', oldValue: 'En Proceso', newValue: 'Resuelto' },
        { field: 'resolutionNotes', fieldLabel: 'Dictamen Nutricional', oldValue: null, newValue: 'Se coordinó protocolo de preparación de papillas y dietas blandas en Educación Especial.' }
      ],
      notes: 'Supervisión efectuada con la cocinera titular y la maestra directora.'
    },
    {
      id: 'log-seed-4',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // hace 8 horas
      schoolId: sc35.id,
      schoolNumber: sc35.number,
      schoolName: sc35.name,
      userId: 'karina',
      userName: 'Karina Rivero',
      userRole: 'Ecónoma del PAE',
      actionType: 'UPDATE',
      category: 'Agua y Leche',
      eventTag: 'Control Bromatológico',
      tags: ['Control Bromatológico', 'Gestión de Alimentos'],
      summary: 'Ajuste de cuota de Leche en Polvo y verificación de rubro de Agua Potable',
      details: [
        { field: 'milkPowderKg', fieldLabel: 'Cuota Leche en Polvo (Kg/mes)', oldValue: '12 kg', newValue: '20 kg' },
        { field: 'waterPurchaseAllowance', fieldLabel: 'Rubro compra de agua', oldValue: 'No asignado', newValue: 'Aprobado para compra de bidones' }
      ],
      notes: 'Escuela rural con incremento de matrícula en jornada extendida de talleres TPA.'
    },
    {
      id: 'log-seed-5',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), // ayer
      schoolId: sc12.id,
      schoolNumber: sc12.number,
      schoolName: sc12.name,
      userId: 'valentina',
      userName: 'Valentina Suárez',
      userRole: 'Ecónoma del PAE',
      actionType: 'UPDATE',
      category: 'Legajo Institucional',
      eventTag: 'Actualización institucional',
      tags: ['Actualización institucional'],
      summary: 'Actualización de modalidad pedagógica a Escuelas de Educación Artística (EDEA)',
      details: [
        { field: 'modality', fieldLabel: 'Modalidad Escolar', oldValue: 'Común', newValue: 'Escuelas de Educación Artística (EDEA)' },
        { field: 'studentDinersCount', fieldLabel: 'Matrícula Comensales', oldValue: '135', newValue: '150' }
      ],
      notes: 'Actualización oficial conforme a nómina departamental de Educación Artística.'
    },
    {
      id: 'log-seed-6',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), // ayer
      schoolId: sc75.id,
      schoolNumber: sc75.number,
      schoolName: sc75.name,
      userId: 'shaja',
      userName: 'Shaja Rodríguez',
      userRole: 'Ecónoma del PAE',
      actionType: 'ADMIN_NOTE',
      category: 'Nota Administrativa',
      eventTag: 'Acuerdo Administrativo',
      tags: ['Acuerdo Administrativo', 'Gestión de Alimentos'],
      summary: 'Acuerdo con Inspección de Zona Rural sobre horario de recepción de víveres secos',
      details: [],
      notes: 'Coordinado con Insp. Mtro. Wilson Netto: las entregas de camión de víveres se realizarán los martes por la mañana.'
    }
  ];
}

export function initializeDatabase(): DatabaseState {
  const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  
  if (!isInit) {
    const seedData = generateInitial140Schools();
    const seedLogs = generateSeedActivityLogs(seedData.schools);
    const completeSeed: DatabaseState = { ...seedData, activityLogs: seedLogs };
    saveAll(completeSeed);
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    return completeSeed;
  }

  try {
    const rawSchools: School[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHOOLS) || '[]');
    const staff: StaffMember[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF) || '[]');
    const visits: Visit[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.VISITS) || '[]');
    const issues: SchoolIssue[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ISSUES) || '[]');
    const rawLogs: ActivityLog[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');

    // Safe migration for fields in case of previous cache
    const hasEspecial = rawSchools.some(s => s.modality === 'Escuelas de Educación Especial' || (s.modality as string) === 'Especial');
    const hasEdea = rawSchools.some(s => s.modality === 'Escuelas de Educación Artística (EDEA)');
    const hasTpa = rawSchools.some(s => s.modality === 'TPA');

    const schools: School[] = rawSchools.map((s, idx) => {
      let mod = s.modality as ModalityType;
      if ((s.modality as string) === 'Especial' || (s.modality as string) === 'Educación Especial') {
        mod = 'Escuelas de Educación Especial';
      } else if (!hasEspecial && (s.number === 6 || s.number === 24 || s.number === 124)) {
        mod = 'Escuelas de Educación Especial';
      } else if (!hasEdea && (s.number === 12 || s.number === 30)) {
        mod = 'Escuelas de Educación Artística (EDEA)';
      } else if (!hasTpa && (s.number === 18 || s.number === 22 || s.number === 35)) {
        mod = 'TPA';
      }

      const isRural = s.areaType ? s.areaType === 'Rural' : (mod === 'Rural' || s.number % 2 !== 0);
      return {
        ...s,
        modality: mod,
        department: s.department || 'Tacuarembó',
        areaType: s.areaType || (isRural ? 'Rural' : 'Urbana'),
        assignedInspector: s.assignedInspector || (isRural ? 'Insp. Mtro. Wilson Netto (Zona Rural Tacuarembó)' : 'Insp. Mtra. María del Carmen López (Zona Urbana Tacuarembó)'),
        hasWaterSupply: s.hasWaterSupply !== undefined ? s.hasWaterSupply : !isRural,
        waterPurchaseAllowance: s.waterPurchaseAllowance !== undefined ? s.waterPurchaseAllowance : isRural,
        waterNotes: s.waterNotes || (isRural ? 'Escuela rural sin conexión OSE de red. Recibe rubro PAE para compra de agua potable.' : 'Conexión a red OSE regular.'),
        milkProgramType: s.milkProgramType || (idx % 2 === 0 ? 'Programa de Copa de Leche' : 'Programa de Leche Escolar'),
        milkPowderKg: s.milkPowderKg !== undefined ? s.milkPowderKg : (isRural ? 12 : 30),
        milkNotes: s.milkNotes || 'Cuota mensual de leche en polvo distribuida por el PAE.'
      };
    });

    const activityLogs: ActivityLog[] = ((rawLogs && rawLogs.length > 0)
      ? rawLogs
      : generateSeedActivityLogs(schools)).map(l => {
        if (l.eventTag && l.tags && l.tags.length > 0) return l;
        let derivedTag: string = l.eventTag || 'Acuerdo Administrativo';
        if (!l.eventTag) {
          if (l.category === 'Auxiliares y Personal') derivedTag = 'Cambio de personal';
          else if (l.category === 'Legajo Institucional') derivedTag = 'Actualización institucional';
          else if (l.category === 'Visitas de Campo') derivedTag = 'Visita crítica';
          else if (l.category === 'Agua y Leche') derivedTag = 'Control Bromatológico';
          else if (l.category === 'Remitos y Alimentos') derivedTag = 'Gestión de Alimentos';
          else if (l.category === 'Seguimiento de Casos') derivedTag = 'Incidencia o Reclamo';
          else if (l.actionType === 'ADMIN_NOTE') derivedTag = 'Acuerdo Administrativo';
        }
        return {
          ...l,
          eventTag: derivedTag,
          tags: l.tags && l.tags.length > 0 ? l.tags : [derivedTag]
        };
      });

    // Ensure backwards compatibility: if no visit is flagged as offline pending sync,
    // flag rural school 35 and 17 so user can test the pending sync workflow immediately
    let migratedVisits = visits;
    const hasAnyPendingSync = visits.some(v => v.isOfflinePendingSync === true);
    if (!hasAnyPendingSync && visits.length > 0) {
      migratedVisits = visits.map(v => {
        const isTarget = v.schoolId === 'esc-35' || v.schoolId === 'esc-17';
        if (isTarget && v.status === 'Realizada') {
          return {
            ...v,
            isOfflinePendingSync: true,
            offlineSavedAt: '2026-09-24T07:45:00.000Z'
          };
        }
        return v;
      });
      localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(migratedVisits));
    }

    const state: DatabaseState = { schools, staff, visits: migratedVisits, issues, activityLogs };
    // ensure logs are saved if they were migrated
    if (!rawLogs || rawLogs.length === 0) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(activityLogs));
    }
    return state;
  } catch (error) {
    console.error('Error reading localStorage, resetting to initial seed', error);
    const seedData = generateInitial140Schools();
    const seedLogs = generateSeedActivityLogs(seedData.schools);
    const completeSeed: DatabaseState = { ...seedData, activityLogs: seedLogs };
    saveAll(completeSeed);
    return completeSeed;
  }
}

export function getPendingSyncVisits(visits: Visit[]): Visit[] {
  return visits.filter(v => v.isOfflinePendingSync === true);
}

export function saveAll(state: DatabaseState): void {
  localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(state.schools));
  localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(state.staff));
  localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(state.visits));
  localStorage.setItem(STORAGE_KEYS.ISSUES, JSON.stringify(state.issues));
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(state.activityLogs || []));
}

export function resetDatabase(): DatabaseState {
  const seedData = generateInitial140Schools();
  const seedLogs = generateSeedActivityLogs(seedData.schools);
  const completeSeed: DatabaseState = { ...seedData, activityLogs: seedLogs };
  saveAll(completeSeed);
  return completeSeed;
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
  const schoolMap = new Map(schools.map(s => [s.id, `Escuela N° ${s.number}`]));
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
    'N° Escuela',
    'Nombre Escuela',
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

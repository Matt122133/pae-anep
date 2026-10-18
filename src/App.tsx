import React, { useState, useEffect } from 'react';
import { School, StaffMember, Visit, SchoolIssue, ActivityLog, ActivityChangeDetail, PAE_TEAM_MEMBERS } from './types';
import { initializeDatabase, saveAll, DatabaseState, getHealthCardStatus, getActiveUserId, setActiveUserId } from './services/storage';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { SchoolList } from './components/SchoolList';
import { SchoolDetail } from './components/SchoolDetail';
import { NewVisitModal } from './components/NewVisitModal';
import { StaffModal } from './components/StaffModal';
import { IssueModal } from './components/IssueModal';
import { SchoolModal } from './components/SchoolModal';
import { ExportImportModal } from './components/ExportImportModal';
import { SchoolReportModal } from './components/SchoolReportModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SyncModal } from './components/SyncModal';
import { PWAPromptBanner } from './components/PWAPromptBanner';
import { WifiOff, CloudUpload, RefreshCw } from 'lucide-react';

export default function App() {
  const [database, setDatabase] = useState<DatabaseState>(() => initializeDatabase());
  const [currentView, setCurrentView] = useState<'dashboard' | 'schools' | 'school-detail'>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'calendar' | 'bitacora'>('overview');
  const [activeUserId, setActiveUserIdState] = useState<string>(() => getActiveUserId());
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [schoolListInitialFilter, setSchoolListInitialFilter] = useState<string | undefined>(undefined);

  // Modals
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [visitDefaultDate, setVisitDefaultDate] = useState<string | undefined>(undefined);
  const [visitDefaultTime, setVisitDefaultTime] = useState<string | undefined>(undefined);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueToEdit, setIssueToEdit] = useState<SchoolIssue | null>(null);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [schoolToEdit, setSchoolToEdit] = useState<School | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [schoolForReport, setSchoolForReport] = useState<School | null>(null);

  // Connectivity & Offline Simulation
  const [browserOnline, setBrowserOnline] = useState<boolean>(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | undefined>(undefined);

  // Network listeners
  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isOnline = browserOnline && !isSimulatedOffline;

  const handleToggleSimulatedOffline = () => {
    setIsSimulatedOffline(prev => !prev);
  };

  // Pending sync visits (performed offline)
  const pendingSyncVisits = database.visits.filter(v => v.isOfflinePendingSync === true);
  const pendingSyncCount = pendingSyncVisits.length;

  const handleSyncAllPending = () => {
    const count = pendingSyncVisits.length;
    if (count === 0) return;

    const now = new Date().toISOString();
    setDatabase(prev => {
      const updatedVisits = prev.visits.map(v => {
        if (v.isOfflinePendingSync) {
          return {
            ...v,
            isOfflinePendingSync: false,
            syncedAt: now
          };
        }
        return v;
      });

      const user = PAE_TEAM_MEMBERS.find(m => m.id === activeUserId) || PAE_TEAM_MEMBERS[0];
      const syncLog: ActivityLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'SYNC_OFFLINE_DATA',
        category: 'Sincronización Offline',
        eventTag: 'Visita crítica',
        tags: ['Visita crítica', 'Acuerdo Administrativo'],
        summary: `Sincronización exitosa de ${count} visita${count > 1 ? 's' : ''} realizada${count > 1 ? 's' : ''} sin conexión`,
        details: pendingSyncVisits.map(pv => {
          const sc = prev.schools.find(s => s.id === pv.schoolId);
          return {
            field: 'syncVisit',
            fieldLabel: `Escuela N° ${sc?.number || '?'} (${pv.date})`,
            oldValue: 'Captura offline (local)',
            newValue: `Consolidada en servidor central (${now.slice(0, 16)})`
          };
        }),
        notes: `Actas y cotejo de remitos sincronizados correctamente. Copia respaldada enviada a paetacuarembo@gmail.com.`
      };

      return {
        ...prev,
        visits: updatedVisits,
        activityLogs: [syncLog, ...(prev.activityLogs || [])]
      };
    });

    setLastSyncTimestamp(
      new Date().toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }) + ' hs'
    );
  };

  const handleSyncSingleVisit = (visitId: string) => {
    const target = database.visits.find(v => v.id === visitId);
    if (!target) return;

    const targetSchool = database.schools.find(s => s.id === target.schoolId);
    const now = new Date().toISOString();

    setDatabase(prev => {
      const updatedVisits = prev.visits.map(v => {
        if (v.id === visitId) {
          return {
            ...v,
            isOfflinePendingSync: false,
            syncedAt: now
          };
        }
        return v;
      });

      const user = PAE_TEAM_MEMBERS.find(m => m.id === activeUserId) || PAE_TEAM_MEMBERS[0];
      const syncLog: ActivityLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
        schoolId: target.schoolId,
        schoolNumber: targetSchool?.number,
        schoolName: targetSchool?.name,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        actionType: 'SYNC_OFFLINE_DATA',
        category: 'Sincronización Offline',
        eventTag: 'Visita crítica',
        tags: ['Visita crítica'],
        summary: `Sincronización individual de Visita Técnica N° ${target.visitNumber} - Escuela N° ${targetSchool?.number || '?'}`,
        details: [
          { field: 'syncStatus', fieldLabel: 'Estado de sincronización', oldValue: 'Pendiente (Offline)', newValue: 'Sincronizado' },
          { field: 'syncedAt', fieldLabel: 'Marca temporal de sincronización', oldValue: null, newValue: now }
        ],
        notes: 'Visita de campo sincronizada de forma individual con el servidor central PAE.'
      };

      return {
        ...prev,
        visits: updatedVisits,
        activityLogs: [syncLog, ...(prev.activityLogs || [])]
      };
    });

    setLastSyncTimestamp(
      new Date().toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }) + ' hs'
    );
  };

  const handleSetActiveUserId = (id: string) => {
    setActiveUserIdState(id);
    setActiveUserId(id);
  };

  // Helper to generate audit log entry
  const createLog = (
    entry: Omit<ActivityLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>
  ): ActivityLog => {
    const user = PAE_TEAM_MEMBERS.find(m => m.id === activeUserId) || PAE_TEAM_MEMBERS[0];
    
    // Auto-derive eventTag if not specified
    let eventTag = entry.eventTag;
    if (!eventTag) {
      if (entry.category === 'Auxiliares y Personal') {
        eventTag = 'Cambio de personal';
      } else if (entry.category === 'Legajo Institucional') {
        eventTag = 'Actualización institucional';
      } else if (entry.category === 'Visitas de Campo') {
        eventTag = 'Visita crítica';
      } else if (entry.category === 'Agua y Leche') {
        eventTag = 'Control Bromatológico';
      } else if (entry.category === 'Remitos y Alimentos') {
        eventTag = 'Gestión de Alimentos';
      } else if (entry.category === 'Seguimiento de Casos') {
        eventTag = 'Incidencia o Reclamo';
      } else {
        eventTag = 'Acuerdo Administrativo';
      }
    }

    const tags = entry.tags && entry.tags.length > 0 ? entry.tags : (eventTag ? [eventTag] : []);

    return {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      schoolId: entry.schoolId,
      schoolNumber: entry.schoolNumber,
      schoolName: entry.schoolName,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      actionType: entry.actionType,
      category: entry.category,
      eventTag,
      tags,
      summary: entry.summary,
      details: entry.details,
      notes: entry.notes
    };
  };

  const handleAddManualLog = (logData: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    const newLog: ActivityLog = {
      ...logData,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    setDatabase(prev => ({
      ...prev,
      activityLogs: [newLog, ...(prev.activityLogs || [])]
    }));
  };

  // Save to localStorage whenever database state changes
  useEffect(() => {
    saveAll(database);
  }, [database]);

  // Selected school object
  const selectedSchool = database.schools.find(s => s.id === selectedSchoolId) || null;

  // Selected school staff, visits, and issues
  const selectedSchoolStaff = selectedSchoolId 
    ? database.staff.filter(st => st.schoolId === selectedSchoolId)
    : [];

  const selectedSchoolVisits = selectedSchoolId
    ? database.visits.filter(v => v.schoolId === selectedSchoolId)
    : [];

  const selectedSchoolIssues = selectedSchoolId
    ? database.issues.filter(i => i.schoolId === selectedSchoolId)
    : [];

  // Total alert count across system
  const totalAlerts = database.schools.reduce((acc, s) => acc + s.activeIssuesCount, 0) +
    database.staff.filter(s => getHealthCardStatus(s.healthCardValidUntil) === 'expired').length;

  // Handlers
  const handleSelectSchool = (school: School) => {
    setSelectedSchoolId(school.id);
    setCurrentView('school-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToSchools = (filter?: string) => {
    setSchoolListInitialFilter(filter);
    setCurrentView('schools');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Visit Creation Handler
  const handleSaveVisit = (visit: Visit, newIssues: Omit<SchoolIssue, 'id'>[]) => {
    setDatabase(prev => {
      const targetSchool = prev.schools.find(s => s.id === visit.schoolId);
      const updatedVisits = [...prev.visits, visit];
      
      const createdIssues: SchoolIssue[] = newIssues.map((ni, idx) => ({
        ...ni,
        id: `iss-${visit.schoolId}-${Date.now()}-${idx}`,
        visitId: visit.id
      }));

      const updatedIssues = [...prev.issues, ...createdIssues];

      // Update school metrics
      const updatedSchools = prev.schools.map(s => {
        if (s.id === visit.schoolId) {
          const schoolActiveIssues = updatedIssues.filter(
            i => i.schoolId === s.id && i.status !== 'Resuelto'
          ).length;

          return {
            ...s,
            totalVisits: s.totalVisits + 1,
            lastVisitDate: visit.date,
            activeIssuesCount: schoolActiveIssues
          };
        }
        return s;
      });

      // Audit Log
      const isOfflineVisit = visit.isOfflinePendingSync || !isOnline;
      const auditLog = createLog({
        schoolId: visit.schoolId,
        schoolNumber: targetSchool?.number,
        schoolName: targetSchool?.name,
        actionType: 'VISIT_LOG',
        category: 'Visitas de Campo',
        summary: `Registro de Visita Técnica N° ${visit.visitNumber} (${visit.status || 'Realizada'})${isOfflineVisit ? ' [Guardado Offline]' : ''}`,
        details: [
          { field: 'dinersActualCount', fieldLabel: 'Comensales alumnos', oldValue: null, newValue: `${visit.dinersActualCount} asistieron` },
          { field: 'menuServed', fieldLabel: 'Menú servido', oldValue: null, newValue: visit.menuServed },
          { field: 'menuEvaluation', fieldLabel: 'Evaluación del menú', oldValue: null, newValue: visit.menuEvaluation },
          { field: 'syncStatus', fieldLabel: 'Estado de conexión', oldValue: null, newValue: isOfflineVisit ? 'Guardado sin conexión (Pendiente de sincronizar)' : 'En línea / Sincronizado' },
          { field: 'newIssues', fieldLabel: 'Nuevos desvíos observados', oldValue: null, newValue: `${newIssues.length} desvíos registrados` },
          { field: 'coldChain', fieldLabel: 'Cadena de frío', oldValue: null, newValue: visit.hygieneChecklist.coldChain }
        ],
        notes: isOfflineVisit 
          ? `Visita realizada en zona rural sin conectividad. Quedó archivada localmente lista para sincronizar. ${visit.generalObservations || ''}`.trim()
          : (visit.generalObservations || undefined)
      });

      return {
        ...prev,
        visits: updatedVisits,
        issues: updatedIssues,
        schools: updatedSchools,
        activityLogs: [auditLog, ...(prev.activityLogs || [])]
      };
    });
  };

  // Staff Handlers
  const handleSaveStaff = (member: StaffMember) => {
    setDatabase(prev => {
      const targetSchool = prev.schools.find(s => s.id === member.schoolId);
      const existing = prev.staff.find(s => s.id === member.id);
      const updatedStaff = existing
        ? prev.staff.map(s => s.id === member.id ? member : s)
        : [...prev.staff, member];

      const diffs: ActivityChangeDetail[] = [];
      if (existing) {
        if (existing.role !== member.role) diffs.push({ field: 'role', fieldLabel: 'Cargo/Rol', oldValue: existing.role, newValue: member.role });
        if (existing.institutionType !== member.institutionType) diffs.push({ field: 'institutionType', fieldLabel: 'Institución/Régimen', oldValue: existing.institutionType, newValue: member.institutionType });
        if (existing.healthCardValidUntil !== member.healthCardValidUntil) diffs.push({ field: 'healthCardValidUntil', fieldLabel: 'Carné de Salud', oldValue: existing.healthCardValidUntil, newValue: member.healthCardValidUntil });
        if (existing.socialSecurityStatus !== member.socialSecurityStatus) diffs.push({ field: 'socialSecurityStatus', fieldLabel: 'Aportes BPS', oldValue: existing.socialSecurityStatus, newValue: member.socialSecurityStatus });
        if (existing.phone !== member.phone) diffs.push({ field: 'phone', fieldLabel: 'Teléfono', oldValue: existing.phone, newValue: member.phone });
      } else {
        diffs.push(
          { field: 'role', fieldLabel: 'Cargo/Rol', oldValue: null, newValue: member.role },
          { field: 'institutionType', fieldLabel: 'Institución', oldValue: null, newValue: member.institutionType },
          { field: 'healthCardValidUntil', fieldLabel: 'Carné de Salud', oldValue: null, newValue: member.healthCardValidUntil },
          { field: 'socialSecurityStatus', fieldLabel: 'Aportes BPS', oldValue: null, newValue: member.socialSecurityStatus }
        );
      }

      const auditLog = createLog({
        schoolId: member.schoolId,
        schoolNumber: targetSchool?.number,
        schoolName: targetSchool?.name,
        actionType: existing ? 'UPDATE' : 'CREATE',
        category: 'Auxiliares y Personal',
        summary: existing
          ? `Actualización de legajo de auxiliar: ${member.fullName}`
          : `Alta de auxiliar de cocina: ${member.fullName} (${member.role})`,
        details: diffs,
        notes: member.notes || undefined
      });

      return {
        ...prev,
        staff: updatedStaff,
        activityLogs: [auditLog, ...(prev.activityLogs || [])]
      };
    });
  };

  const handleDeleteStaff = (staffId: string) => {
    setDatabase(prev => {
      const member = prev.staff.find(s => s.id === staffId);
      const targetSchool = member ? prev.schools.find(s => s.id === member.schoolId) : undefined;
      
      const auditLog = createLog({
        schoolId: member?.schoolId,
        schoolNumber: targetSchool?.number,
        schoolName: targetSchool?.name,
        actionType: 'DELETE',
        category: 'Auxiliares y Personal',
        summary: `Baja de auxiliar de cocina: ${member?.fullName || staffId}`,
        details: member ? [
          { field: 'fullName', fieldLabel: 'Auxiliar', oldValue: member.fullName, newValue: null },
          { field: 'role', fieldLabel: 'Cargo que desempeñaba', oldValue: member.role, newValue: null },
          { field: 'ci', fieldLabel: 'Cédula / Documento', oldValue: member.ci, newValue: null }
        ] : []
      });

      return {
        ...prev,
        staff: prev.staff.filter(s => s.id !== staffId),
        activityLogs: [auditLog, ...(prev.activityLogs || [])]
      };
    });
  };

  // Issue Handlers
  const handleSaveIssue = (issue: SchoolIssue) => {
    setDatabase(prev => {
      const targetSchool = prev.schools.find(s => s.id === issue.schoolId);
      const existing = prev.issues.find(i => i.id === issue.id);
      const updatedIssues = existing
        ? prev.issues.map(i => i.id === issue.id ? issue : i)
        : [...prev.issues, issue];

      const diffs: ActivityChangeDetail[] = [];
      if (existing) {
        if (existing.status !== issue.status) diffs.push({ field: 'status', fieldLabel: 'Estado', oldValue: existing.status, newValue: issue.status });
        if (existing.severity !== issue.severity) diffs.push({ field: 'severity', fieldLabel: 'Gravedad', oldValue: existing.severity, newValue: issue.severity });
        if (existing.category !== issue.category) diffs.push({ field: 'category', fieldLabel: 'Categoría', oldValue: existing.category, newValue: issue.category });
        if (existing.description !== issue.description) diffs.push({ field: 'description', fieldLabel: 'Descripción', oldValue: existing.description, newValue: issue.description });
      } else {
        diffs.push(
          { field: 'severity', fieldLabel: 'Gravedad', oldValue: null, newValue: issue.severity },
          { field: 'category', fieldLabel: 'Categoría', oldValue: null, newValue: issue.category },
          { field: 'description', fieldLabel: 'Descripción', oldValue: null, newValue: issue.description }
        );
      }

      const auditLog = createLog({
        schoolId: issue.schoolId,
        schoolNumber: targetSchool?.number,
        schoolName: targetSchool?.name,
        actionType: existing ? 'UPDATE' : 'CREATE',
        category: 'Seguimiento de Casos',
        summary: existing
          ? `Modificación de incidencia/caso: "${issue.title}"`
          : `Registro de desvío/incidencia: "${issue.title}" (Gravedad: ${issue.severity})`,
        details: diffs,
        notes: issue.resolutionNotes || undefined
      });

      // Recalculate school active issues count
      const updatedSchools = prev.schools.map(s => {
        if (s.id === issue.schoolId) {
          const count = updatedIssues.filter(i => i.schoolId === s.id && i.status !== 'Resuelto').length;
          return { ...s, activeIssuesCount: count };
        }
        return s;
      });

      return {
        ...prev,
        issues: updatedIssues,
        schools: updatedSchools,
        activityLogs: [auditLog, ...(prev.activityLogs || [])]
      };
    });
  };

  const handleToggleIssueStatus = (issueId: string) => {
    setDatabase(prev => {
      let targetSchoolId = '';
      let targetIssue: SchoolIssue | undefined;
      let nextStatus: SchoolIssue['status'] = 'Resuelto';

      const updatedIssues = prev.issues.map(i => {
        if (i.id === issueId) {
          targetIssue = i;
          targetSchoolId = i.schoolId;
          nextStatus = i.status === 'Resuelto' ? 'Pendiente' : 'Resuelto';
          return {
            ...i,
            status: nextStatus,
            resolvedDate: nextStatus === 'Resuelto' ? new Date().toISOString().slice(0, 10) : undefined
          };
        }
        return i;
      });

      const targetSchool = prev.schools.find(s => s.id === targetSchoolId);
      const auditLog = createLog({
        schoolId: targetSchoolId,
        schoolNumber: targetSchool?.number,
        schoolName: targetSchool?.name,
        actionType: 'STATUS_CHANGE',
        category: 'Seguimiento de Casos',
        summary: nextStatus === 'Resuelto'
          ? `Resolución de caso/observación: "${targetIssue?.title || issueId}"`
          : `Reapertura de caso/observación: "${targetIssue?.title || issueId}"`,
        details: [
          { field: 'status', fieldLabel: 'Estado del Caso', oldValue: targetIssue?.status, newValue: nextStatus }
        ]
      });

      const updatedSchools = prev.schools.map(s => {
        if (s.id === targetSchoolId) {
          const count = updatedIssues.filter(i => i.schoolId === s.id && i.status !== 'Resuelto').length;
          return { ...s, activeIssuesCount: count };
        }
        return s;
      });

      return {
        ...prev,
        issues: updatedIssues,
        schools: updatedSchools,
        activityLogs: [auditLog, ...(prev.activityLogs || [])]
      };
    });
  };

  const handleDeleteIssue = (issueId: string) => {
    setDatabase(prev => {
      const issue = prev.issues.find(i => i.id === issueId);
      const schoolId = issue?.schoolId;
      const targetSchool = prev.schools.find(s => s.id === schoolId);
      const updatedIssues = prev.issues.filter(i => i.id !== issueId);

      const auditLog = createLog({
        schoolId,
        schoolNumber: targetSchool?.number,
        schoolName: targetSchool?.name,
        actionType: 'DELETE',
        category: 'Seguimiento de Casos',
        summary: `Eliminación de caso/desvío: "${issue?.title || issueId}"`,
        details: issue ? [
          { field: 'title', fieldLabel: 'Incidencia eliminada', oldValue: issue.title, newValue: null },
          { field: 'category', fieldLabel: 'Categoría', oldValue: issue.category, newValue: null }
        ] : []
      });

      const updatedSchools = prev.schools.map(s => {
        if (s.id === schoolId) {
          const count = updatedIssues.filter(i => i.schoolId === s.id && i.status !== 'Resuelto').length;
          return { ...s, activeIssuesCount: count };
        }
        return s;
      });

      return {
        ...prev,
        issues: updatedIssues,
        schools: updatedSchools,
        activityLogs: [auditLog, ...(prev.activityLogs || [])]
      };
    });
  };

  // School Handlers
  const handleSaveSchool = (school: School) => {
    setDatabase(prev => {
      const existing = prev.schools.find(s => s.id === school.id);
      const updatedSchools = existing
        ? prev.schools.map(s => s.id === school.id ? school : s)
        : [...prev.schools, school].sort((a, b) => a.number - b.number);

      const diffs: ActivityChangeDetail[] = [];
      let isWaterOrMilk = false;
      if (existing) {
        if (existing.name !== school.name) diffs.push({ field: 'name', fieldLabel: 'Nombre Escuela', oldValue: existing.name, newValue: school.name });
        if (existing.modality !== school.modality) diffs.push({ field: 'modality', fieldLabel: 'Modalidad Pedagógica', oldValue: existing.modality, newValue: school.modality });
        if (existing.studentDinersCount !== school.studentDinersCount) diffs.push({ field: 'studentDinersCount', fieldLabel: 'Matrícula Comensales', oldValue: existing.studentDinersCount, newValue: school.studentDinersCount });
        if (existing.principalName !== school.principalName) diffs.push({ field: 'principalName', fieldLabel: 'Maestra Directora', oldValue: existing.principalName, newValue: school.principalName });
        if (existing.headCookName !== school.headCookName) diffs.push({ field: 'headCookName', fieldLabel: 'Encargada de Cocina', oldValue: existing.headCookName, newValue: school.headCookName });
        if (existing.hasWaterSupply !== school.hasWaterSupply) {
          diffs.push({ field: 'hasWaterSupply', fieldLabel: 'Conexión Red OSE', oldValue: existing.hasWaterSupply ? 'Sí' : 'No', newValue: school.hasWaterSupply ? 'Sí' : 'No' });
          isWaterOrMilk = true;
        }
        if (existing.waterPurchaseAllowance !== school.waterPurchaseAllowance) {
          diffs.push({ field: 'waterPurchaseAllowance', fieldLabel: 'Rubro Compra de Agua Potable', oldValue: existing.waterPurchaseAllowance ? 'Sí' : 'No', newValue: school.waterPurchaseAllowance ? 'Sí' : 'No' });
          isWaterOrMilk = true;
        }
        if (existing.milkPowderKg !== school.milkPowderKg) {
          diffs.push({ field: 'milkPowderKg', fieldLabel: 'Cuota Leche en Polvo', oldValue: `${existing.milkPowderKg} kg`, newValue: `${school.milkPowderKg} kg` });
          isWaterOrMilk = true;
        }
        if (existing.milkProgramType !== school.milkProgramType) {
          diffs.push({ field: 'milkProgramType', fieldLabel: 'Programa de Leche', oldValue: existing.milkProgramType, newValue: school.milkProgramType });
          isWaterOrMilk = true;
        }
        if (existing.assignedInspector !== school.assignedInspector) diffs.push({ field: 'assignedInspector', fieldLabel: 'Inspector Asignado', oldValue: existing.assignedInspector, newValue: school.assignedInspector });
      } else {
        diffs.push(
          { field: 'modality', fieldLabel: 'Modalidad', oldValue: null, newValue: school.modality },
          { field: 'studentDinersCount', fieldLabel: 'Comensales', oldValue: null, newValue: school.studentDinersCount },
          { field: 'areaType', fieldLabel: 'Ámbito', oldValue: null, newValue: school.areaType }
        );
      }

      const auditLog = createLog({
        schoolId: school.id,
        schoolNumber: school.number,
        schoolName: school.name,
        actionType: existing ? 'UPDATE' : 'CREATE',
        category: isWaterOrMilk ? 'Agua y Leche' : 'Legajo Institucional',
        summary: existing
          ? `Actualización de legajo de Escuela N° ${school.number} (${school.name})`
          : `Alta de nueva institución: Escuela N° ${school.number} (${school.name})`,
        details: diffs,
        notes: school.notes || undefined
      });

      return {
        ...prev,
        schools: updatedSchools,
        activityLogs: [auditLog, ...(prev.activityLogs || [])]
      };
    });
  };

  const handleSaveScheduledVisit = (visit: Visit) => {
    setDatabase(prev => {
      const targetSchool = prev.schools.find(s => s.id === visit.schoolId);
      const existing = prev.visits.find(v => v.id === visit.id);
      const updatedVisits = existing
        ? prev.visits.map(v => v.id === visit.id ? visit : v)
        : [...prev.visits, visit];

      const auditLog = createLog({
        schoolId: visit.schoolId,
        schoolNumber: targetSchool?.number,
        schoolName: targetSchool?.name,
        actionType: existing ? 'UPDATE' : 'CREATE',
        category: 'Visitas de Campo',
        summary: existing
          ? `Reprogramación de visita para Escuela N° ${targetSchool?.number} (${visit.date})`
          : `Planificación de visita en itinerario: Escuela N° ${targetSchool?.number} (${visit.date})`,
        details: [
          { field: 'date', fieldLabel: 'Fecha programada', oldValue: existing?.date, newValue: visit.date },
          { field: 'time', fieldLabel: 'Horario', oldValue: existing?.time, newValue: visit.time },
          { field: 'scheduledObjective', fieldLabel: 'Objetivo de visita', oldValue: existing?.scheduledObjective, newValue: visit.scheduledObjective }
        ],
        notes: visit.itineraryNotes || undefined
      });

      return {
        ...prev,
        visits: updatedVisits,
        activityLogs: [auditLog, ...(prev.activityLogs || [])]
      };
    });
  };

  const handleDeleteVisit = (visitId: string) => {
    setDatabase(prev => {
      const visit = prev.visits.find(v => v.id === visitId);
      const targetSchool = visit ? prev.schools.find(s => s.id === visit.schoolId) : undefined;
      
      const auditLog = createLog({
        schoolId: visit?.schoolId,
        schoolNumber: targetSchool?.number,
        schoolName: targetSchool?.name,
        actionType: 'DELETE',
        category: 'Visitas de Campo',
        summary: `Eliminación de visita N° ${visit?.visitNumber || ''} de Escuela N° ${targetSchool?.number}`,
        details: visit ? [
          { field: 'date', fieldLabel: 'Fecha de la visita', oldValue: visit.date, newValue: null },
          { field: 'status', fieldLabel: 'Estado', oldValue: visit.status, newValue: null }
        ] : []
      });

      return {
        ...prev,
        visits: prev.visits.filter(v => v.id !== visitId),
        activityLogs: [auditLog, ...(prev.activityLogs || [])]
      };
    });
  };

  const handleRestoreState = (newState: DatabaseState) => {
    setDatabase(newState);
    saveAll(newState);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* PWA Smart Installation Banner for Android, iOS, Tablets, PC */}
      <PWAPromptBanner />

      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(v) => {
          setCurrentView(v);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateToCalendar={() => {
          setCurrentView('dashboard');
          setDashboardTab('calendar');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateToBitacora={() => {
          setCurrentView('dashboard');
          setDashboardTab('bitacora');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        schools={database.schools}
        onSelectSchool={handleSelectSchool}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenNewSchoolModal={() => {
          setSchoolToEdit(null);
          setIsSchoolModalOpen(true);
        }}
        totalAlerts={totalAlerts}
        activityLogsCount={database.activityLogs?.length || 0}
        activeUserId={activeUserId}
        onSetActiveUserId={handleSetActiveUserId}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onToggleSimulatedOffline={handleToggleSimulatedOffline}
      />

      {/* Top Offline Notification Banner */}
      {!isOnline && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-2 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-sm border-b border-amber-600 sticky top-14 sm:top-16 z-30">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-slate-950 shrink-0 animate-pulse" />
            <span>
              Modo Sin Conexión Activo (Zona Rural / Sin Cobertura): Las visitas e inspecciones se guardan localmente en este dispositivo y quedarán marcadas como 'Pendiente de sincronizar'.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {pendingSyncCount > 0 && (
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className="bg-slate-950 hover:bg-slate-900 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 shadow-2xs"
              >
                <CloudUpload className="w-3.5 h-3.5 text-amber-400" />
                <span>{pendingSyncCount} Pendiente{pendingSyncCount > 1 ? 's' : ''} de Sincronizar</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleSimulatedOffline}
              className="bg-white/30 hover:bg-white/40 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-extrabold transition"
            >
              Reconectar a Internet
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
        {currentView === 'dashboard' && (
          <Dashboard
            schools={database.schools}
            staff={database.staff}
            visits={database.visits}
            issues={database.issues}
            activityLogs={database.activityLogs}
            onAddManualLog={handleAddManualLog}
            onSelectSchool={handleSelectSchool}
            onNavigateToSchools={handleNavigateToSchools}
            onOpenNewSchoolModal={() => {
              setSchoolToEdit(null);
              setIsSchoolModalOpen(true);
            }}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onOpenReport={(school) => setSchoolForReport(school)}
            onOpenNewVisit={(school, defaultDate, defaultTime) => {
              setSelectedSchoolId(school.id);
              setVisitDefaultDate(defaultDate);
              setVisitDefaultTime(defaultTime);
              setIsVisitModalOpen(true);
            }}
            onSaveScheduledVisit={handleSaveScheduledVisit}
            onDeleteVisit={handleDeleteVisit}
            dashboardTab={dashboardTab}
            onTabChange={setDashboardTab}
            activeUserId={activeUserId}
            isOnline={isOnline}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            onToggleSimulatedOffline={handleToggleSimulatedOffline}
            isSimulatedOffline={isSimulatedOffline}
          />
        )}

        {currentView === 'schools' && (
          <SchoolList
            schools={database.schools}
            staff={database.staff}
            issues={database.issues}
            visits={database.visits}
            onSelectSchool={handleSelectSchool}
            onOpenNewSchoolModal={() => {
              setSchoolToEdit(null);
              setIsSchoolModalOpen(true);
            }}
            onOpenReport={setSchoolForReport}
            initialFilter={schoolListInitialFilter}
          />
        )}

        {currentView === 'school-detail' && selectedSchool && (
          <SchoolDetail
            school={selectedSchool}
            staff={selectedSchoolStaff}
            visits={selectedSchoolVisits}
            issues={selectedSchoolIssues}
            activityLogs={database.activityLogs}
            onAddManualLog={handleAddManualLog}
            activeUserId={activeUserId}
            onBack={() => setCurrentView('schools')}
            onEditSchool={(school) => {
              setSchoolToEdit(school);
              setIsSchoolModalOpen(true);
            }}
            onOpenNewVisit={() => setIsVisitModalOpen(true)}
            onOpenAddStaff={() => {
              setStaffToEdit(null);
              setIsStaffModalOpen(true);
            }}
            onEditStaff={(staffMember) => {
              setStaffToEdit(staffMember);
              setIsStaffModalOpen(true);
            }}
            onDeleteStaff={handleDeleteStaff}
            onOpenAddIssue={() => {
              setIssueToEdit(null);
              setIsIssueModalOpen(true);
            }}
            onEditIssue={(issue) => {
              setIssueToEdit(issue);
              setIsIssueModalOpen(true);
            }}
            onDeleteIssue={handleDeleteIssue}
            onToggleIssueStatus={handleToggleIssueStatus}
            isOnline={isOnline}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            onSyncSingleVisit={handleSyncSingleVisit}
          />
        )}
      </main>

      {/* Modals */}
      {isVisitModalOpen && selectedSchool && (
        <NewVisitModal
          isOpen={isVisitModalOpen}
          onClose={() => {
            setIsVisitModalOpen(false);
            setVisitDefaultDate(undefined);
            setVisitDefaultTime(undefined);
          }}
          school={selectedSchool}
          existingVisitsCount={selectedSchoolVisits.length}
          onSaveVisit={handleSaveVisit}
          activeUserId={activeUserId}
          initialDate={visitDefaultDate}
          initialTime={visitDefaultTime}
          isOnline={isOnline}
        />
      )}

      {isStaffModalOpen && selectedSchool && (
        <StaffModal
          isOpen={isStaffModalOpen}
          onClose={() => {
            setIsStaffModalOpen(false);
            setStaffToEdit(null);
          }}
          schoolId={selectedSchool.id}
          staffToEdit={staffToEdit}
          onSave={handleSaveStaff}
        />
      )}

      {isIssueModalOpen && selectedSchool && (
        <IssueModal
          isOpen={isIssueModalOpen}
          onClose={() => {
            setIsIssueModalOpen(false);
            setIssueToEdit(null);
          }}
          schoolId={selectedSchool.id}
          issueToEdit={issueToEdit}
          visitsCount={selectedSchoolVisits.length}
          onSave={handleSaveIssue}
        />
      )}

      {isSchoolModalOpen && (
        <SchoolModal
          isOpen={isSchoolModalOpen}
          onClose={() => {
            setIsSchoolModalOpen(false);
            setSchoolToEdit(null);
          }}
          schoolToEdit={schoolToEdit}
          nextSchoolNumber={database.schools.length + 1}
          onSave={handleSaveSchool}
        />
      )}

      {isExportModalOpen && (
        <ExportImportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          databaseState={database}
          onRestoreState={handleRestoreState}
        />
      )}

      {/* Global School Report Modal triggered from SchoolList */}
      {schoolForReport && (
        <SchoolReportModal
          isOpen={!!schoolForReport}
          onClose={() => setSchoolForReport(null)}
          school={schoolForReport}
          staff={database.staff.filter(st => st.schoolId === schoolForReport.id)}
          visits={database.visits.filter(v => v.schoolId === schoolForReport.id)}
          issues={database.issues.filter(i => i.schoolId === schoolForReport.id)}
        />
      )}

      {/* Sync and Connectivity Center Modal */}
      {isSyncModalOpen && (
        <SyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          isOnline={isOnline}
          onToggleSimulatedOffline={handleToggleSimulatedOffline}
          isSimulatedOffline={isSimulatedOffline}
          pendingVisits={pendingSyncVisits}
          schools={database.schools}
          issues={database.issues}
          onSyncAll={handleSyncAllPending}
          onSyncSingleVisit={handleSyncSingleVisit}
          lastSyncTimestamp={lastSyncTimestamp}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>Legajo Digital de Comedores Escolares</strong> • Red de 140 Escuelas
          </span>
          <span>
            Diseñado para visitas de campo ágiles, sin pérdida de datos en papel.
          </span>
        </div>
      </footer>

      {/* Floating Mobile Bottom Navigation */}
      <MobileBottomNav
        currentView={currentView}
        dashboardTab={dashboardTab}
        onNavigate={(view, tab) => {
          setCurrentView(view);
          if (tab) setDashboardTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenNewSchoolModal={() => {
          setSchoolToEdit(null);
          setIsSchoolModalOpen(true);
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        totalAlerts={totalAlerts}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />
    </div>
  );
}

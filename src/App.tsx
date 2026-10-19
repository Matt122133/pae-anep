import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { School, StaffMember, Visit, SchoolIssue, ActivityLog, CuentaEquipo, equipoDesdeCuentas } from './types';
import { DatabaseState, getHealthCardStatus } from './services/storage';
import { ErrorApi, generaBorrador, nuevoId, pedir } from './services/api';
import { borrarSesion, leerSesion, Sesion } from './services/sesion';
import { Borrador, descartarBorrador, guardarBorrador, listarBorradores, reenviarBorrador } from './services/borradores';
import { EquipoProvider } from './services/equipo';
import { Login } from './components/Login';
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
import { BorradoresModal } from './components/BorradoresModal';
import { PWAPromptBanner } from './components/PWAPromptBanner';
import { Loader2, WifiOff, X } from 'lucide-react';

// Respuesta de GET /legajo: la forma de DatabaseState más las cuentas del
// equipo (contracts/api.md).
type Legajo = DatabaseState & { cuentas: CuentaEquipo[] };

// Operación de escritura contra el servidor. Si no llega, se guarda tal cual
// como borrador "no enviado" (FR-028) y se puede reenviar sin duplicar.
interface Operacion {
  clave: string;
  descripcion: string;
  metodo: 'POST' | 'PUT' | 'DELETE';
  ruta: string;
  cuerpo: unknown;
}

function describirCampos(e: ErrorApi): string {
  const campos = Object.entries(e.campos).map(([c, m]) => `${c}: ${m}`);
  return campos.length ? `Hay datos para corregir — ${campos.join('; ')}` : e.message;
}

export default function App() {
  // --- sesión y datos del servidor
  const [sesion, setSesion] = useState<Sesion | null>(() => leerSesion());
  const [avisoIngreso, setAvisoIngreso] = useState<string | undefined>(undefined);
  const [database, setDatabase] = useState<DatabaseState | null>(null);
  const [cuentas, setCuentas] = useState<CuentaEquipo[]>([]);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [borradores, setBorradores] = useState<Borrador[]>(() => listarBorradores());
  const [aviso, setAviso] = useState<string | null>(null);

  // --- navegación y modales (sin cambios respecto del prototipo)
  const [currentView, setCurrentView] = useState<'dashboard' | 'schools' | 'school-detail'>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'calendar' | 'bitacora'>('overview');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [schoolListInitialFilter, setSchoolListInitialFilter] = useState<string | undefined>(undefined);
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
  const [isBorradoresOpen, setIsBorradoresOpen] = useState(false);

  // Conexión REAL del navegador. El "modo offline simulado" ya no existe (FR-027).
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const equipo = useMemo(() => equipoDesdeCuentas(cuentas), [cuentas]);
  const activeUserId = sesion?.cuenta.id ?? '';

  const avisar = (texto: string) => {
    setAviso(texto);
    window.setTimeout(() => setAviso((a) => (a === texto ? null : a)), 7000);
  };

  // La sesión no sirve más: se vuelve al ingreso. Los borradores NO se tocan:
  // son de este dispositivo y se reenvían después de reingresar.
  const perderSesion = useCallback((motivo: string) => {
    borrarSesion();
    setSesion(null);
    setDatabase(null);
    setAvisoIngreso(motivo);
  }, []);

  const cargarLegajo = useCallback(async () => {
    try {
      // Con inactivos: una escuela o persona dada de baja sigue consultable
      // (FR-015). Los listados las filtran; SchoolList permite verlas.
      const l = await pedir<Legajo>('/legajo?incluir_inactivos=1');
      const { cuentas: cs, ...estado } = l;
      setDatabase(estado);
      setCuentas(cs);
      setErrorCarga(null);
    } catch (e) {
      if (e instanceof ErrorApi && e.tipo === 'sesion') {
        perderSesion('Tu sesión venció. Volvé a ingresar.');
        return;
      }
      setErrorCarga(
        e instanceof ErrorApi && e.tipo === 'red'
          ? 'No hay conexión con el servidor. Para ver el legajo hace falta señal; lo que ya guardaste como "no enviado" sigue a salvo en este dispositivo.'
          : 'El servidor no pudo entregar el legajo. Probá de nuevo en un momento.',
      );
    }
  }, [perderSesion]);

  useEffect(() => {
    if (sesion) cargarLegajo();
  }, [sesion, cargarLegajo]);

  /**
   * Manda una operación. Devuelve null si el servidor la aceptó o si quedó
   * guardada como borrador; si no, el mensaje para mostrar en el formulario
   * (que queda abierto con lo escrito).
   */
  const escribir = async <T,>(
    op: Operacion,
    alConfirmar: (r: T) => void,
    alConflicto?: (actual: any) => void,
  ): Promise<string | null> => {
    try {
      const r = await pedir<T>(op.ruta, { metodo: op.metodo, cuerpo: op.cuerpo });
      alConfirmar(r);
      // La bitácora y los derivados los calcula el servidor: se recarga.
      cargarLegajo();
      return null;
    } catch (e) {
      if (generaBorrador(e)) {
        const err = e as ErrorApi;
        const guardado = guardarBorrador({ ...op, ultimoError: err.message, tipoError: err.tipo });
        setBorradores(listarBorradores());
        if (!guardado) {
          return 'No se pudo enviar y este dispositivo tampoco pudo guardarlo. No cierres el formulario: copiá lo escrito antes de salir.';
        }
        if (err.tipo === 'sesion') {
          perderSesion('Tu sesión venció. Lo que estabas guardando quedó en "No enviados": reenvialo después de ingresar.');
        } else {
          avisar(`No se envió: "${op.descripcion}" quedó guardado en este dispositivo. Reenvialo desde "No enviados".`);
        }
        return null;
      }
      if (e instanceof ErrorApi && e.tipo === 'conflicto') {
        if (e.actual && alConflicto) alConflicto(e.actual);
        cargarLegajo();
        return 'Otra persona guardó cambios en esta ficha mientras la editabas. Ya se cargó su versión; lo que escribiste sigue en el formulario: revisalo y guardá de nuevo para aplicarlo encima.';
      }
      if (e instanceof ErrorApi && e.tipo === 'invalido') return describirCampos(e);
      return 'No se pudo guardar.';
    }
  };

  // Para acciones de un toque (borrar, cambiar estado): el error va como aviso.
  const escribirSinFormulario = async <T,>(op: Operacion, alConfirmar: (r: T) => void) => {
    const error = await escribir(op, alConfirmar);
    if (error) avisar(error);
  };

  const escuelaN = (schoolId: string) => {
    const s = database?.schools.find((x) => x.id === schoolId);
    return s ? `Escuela N° ${s.number}` : 'escuela';
  };

  // --- handlers del legajo (FR-026): todos contra la API

  const reemplazar = <K extends keyof DatabaseState>(clave: K, registro: DatabaseState[K][number] & { id: string }) =>
    setDatabase((prev) => {
      if (!prev) return prev;
      const lista = prev[clave] as Array<{ id: string }>;
      const existe = lista.some((x) => x.id === registro.id);
      return { ...prev, [clave]: existe ? lista.map((x) => (x.id === registro.id ? registro : x)) : [...lista, registro] };
    });

  const quitar = (clave: keyof DatabaseState, id: string) =>
    setDatabase((prev) => (prev ? { ...prev, [clave]: (prev[clave] as Array<{ id: string }>).filter((x) => x.id !== id) } : prev));

  const handleSaveVisit = (visit: Visit, newIssues: SchoolIssue[]) =>
    escribir<{ visit: Visit; newIssues: SchoolIssue[] }>(
      {
        clave: `visita:${visit.id}`,
        descripcion: `Visita a la ${escuelaN(visit.schoolId)} (${visit.date})`,
        metodo: 'POST',
        ruta: '/visitas',
        cuerpo: { visit, newIssues },
      },
      (r) => {
        reemplazar('visits', r.visit);
        r.newIssues.forEach((i) => reemplazar('issues', i));
      },
    );

  const handleSaveScheduledVisit = (visit: Visit) => {
    const existe = database?.visits.some((v) => v.id === visit.id);
    return escribir<Visit | { visit: Visit }>(
      existe
        ? { clave: `visita:${visit.id}`, descripcion: `Visita programada a la ${escuelaN(visit.schoolId)}`, metodo: 'PUT', ruta: `/visitas/${visit.id}`, cuerpo: visit }
        : { clave: `visita:${visit.id}`, descripcion: `Visita programada a la ${escuelaN(visit.schoolId)} (${visit.date})`, metodo: 'POST', ruta: '/visitas', cuerpo: { visit, newIssues: [] } },
      (r) => reemplazar('visits', 'visit' in r ? r.visit : r),
      (actual) => reemplazar('visits', actual),
    );
  };

  const handleDeleteVisit = (visitId: string) => {
    const v = database?.visits.find((x) => x.id === visitId);
    if (!v) return;
    escribirSinFormulario(
      { clave: `visita-borrar:${visitId}`, descripcion: `Borrar visita N° ${v.visitNumber} de la ${escuelaN(v.schoolId)}`, metodo: 'DELETE', ruta: `/visitas/${visitId}`, cuerpo: { version: v.version } },
      () => quitar('visits', visitId),
    );
  };

  const handleSaveStaff = (member: StaffMember) => {
    const existe = database?.staff.some((s) => s.id === member.id);
    return escribir<StaffMember>(
      {
        clave: `personal:${member.id}`,
        descripcion: `${existe ? 'Edición' : 'Alta'} de ${member.fullName} (${escuelaN(member.schoolId)})`,
        metodo: existe ? 'PUT' : 'POST',
        ruta: existe ? `/personal/${member.id}` : '/personal',
        cuerpo: member,
      },
      (r) => reemplazar('staff', r),
      (actual) => {
        reemplazar('staff', actual);
        setStaffToEdit(actual);
      },
    );
  };

  const handleDeleteStaff = (staffId: string) => {
    const s = database?.staff.find((x) => x.id === staffId);
    if (!s) return;
    escribirSinFormulario(
      { clave: `personal-baja:${staffId}`, descripcion: `Baja de ${s.fullName}`, metodo: 'DELETE', ruta: `/personal/${staffId}`, cuerpo: { version: s.version } },
      () => quitar('staff', staffId),
    );
  };

  const handleTrasladarStaff = (staffId: string, schoolId: string) => {
    const s = database?.staff.find((x) => x.id === staffId);
    if (!s) return Promise.resolve('No se encontró la persona.');
    return escribir<StaffMember>(
      {
        clave: `personal-traslado:${staffId}`,
        descripcion: `Traslado de ${s.fullName} a la ${escuelaN(schoolId)}`,
        metodo: 'POST',
        ruta: `/personal/${staffId}/traslado`,
        cuerpo: { schoolId, fecha: new Date().toISOString().slice(0, 10), version: s.version },
      },
      (r) => reemplazar('staff', r),
      (actual) => {
        reemplazar('staff', actual);
        setStaffToEdit(actual);
      },
    );
  };

  const handleSaveIssue = (issue: SchoolIssue) => {
    const existe = database?.issues.some((i) => i.id === issue.id);
    return escribir<SchoolIssue>(
      {
        clave: `incidencia:${issue.id}`,
        descripcion: `${existe ? 'Edición' : 'Alta'} de la incidencia «${issue.title}»`,
        metodo: existe ? 'PUT' : 'POST',
        ruta: existe ? `/incidencias/${issue.id}` : '/incidencias',
        cuerpo: issue,
      },
      (r) => reemplazar('issues', r),
      (actual) => {
        reemplazar('issues', actual);
        setIssueToEdit(actual);
      },
    );
  };

  const handleToggleIssueStatus = (issueId: string) => {
    const i = database?.issues.find((x) => x.id === issueId);
    if (!i) return;
    const status: SchoolIssue['status'] = i.status === 'Resuelto' ? 'Pendiente' : 'Resuelto';
    escribirSinFormulario<SchoolIssue>(
      { clave: `incidencia:${issueId}`, descripcion: `Incidencia «${i.title}» → ${status}`, metodo: 'PUT', ruta: `/incidencias/${issueId}`, cuerpo: { ...i, status } },
      (r) => reemplazar('issues', r),
    );
  };

  const handleDeleteIssue = (issueId: string) => {
    const i = database?.issues.find((x) => x.id === issueId);
    if (!i) return;
    escribirSinFormulario(
      { clave: `incidencia-borrar:${issueId}`, descripcion: `Borrar la incidencia «${i.title}»`, metodo: 'DELETE', ruta: `/incidencias/${issueId}`, cuerpo: { version: i.version } },
      () => quitar('issues', issueId),
    );
  };

  const handleSaveSchool = (school: School) => {
    const existe = database?.schools.some((s) => s.id === school.id);
    return escribir<School>(
      {
        clave: `escuela:${school.id}`,
        descripcion: `${existe ? 'Edición' : 'Alta'} de la Escuela N° ${school.number}`,
        metodo: existe ? 'PUT' : 'POST',
        ruta: existe ? `/escuelas/${school.id}` : '/escuelas',
        cuerpo: school,
      },
      (r) => reemplazar('schools', r),
      (actual) => {
        reemplazar('schools', actual);
        setSchoolToEdit(actual);
      },
    );
  };

  const handleDeleteSchool = (schoolId: string) => {
    const s = database?.schools.find((x) => x.id === schoolId);
    if (!s) return;
    escribirSinFormulario(
      { clave: `escuela-baja:${schoolId}`, descripcion: `Baja de la Escuela N° ${s.number}`, metodo: 'DELETE', ruta: `/escuelas/${schoolId}`, cuerpo: { version: s.version } },
      () => {
        quitar('schools', schoolId);
        setCurrentView('schools');
      },
    );
  };

  const handleAddManualLog = (logData: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    // Autor, fecha y hora los pone el servidor desde la sesión (FR-017).
    const id = nuevoId();
    escribirSinFormulario(
      {
        clave: `nota:${id}`,
        descripcion: `Nota: ${logData.summary}`,
        metodo: 'POST',
        ruta: '/bitacora/notas',
        cuerpo: { id, schoolId: logData.schoolId, summary: logData.summary, notes: logData.notes, tags: logData.tags },
      },
      () => undefined,
    );
  };

  // --- borradores (FR-028)

  const reenviar = async (b: Borrador): Promise<string | null> => {
    const r = await reenviarBorrador(b);
    setBorradores(listarBorradores());
    if (r.ok) {
      cargarLegajo();
      return null;
    }
    if (r.error.tipo === 'sesion') perderSesion('Tu sesión venció. Volvé a ingresar para reenviar.');
    return r.error.message;
  };

  // Un conflicto se resuelve aplicando lo escrito sobre la versión vigente:
  // es una decisión explícita de la usuaria, no un "gana el último" silencioso.
  const aplicarSobreActual = async (b: Borrador): Promise<string | null> => {
    const r = await reenviarBorrador(b);
    if (!r.ok && r.error.tipo === 'conflicto' && b.metodo === 'PUT') {
      const version = (r.error.actual as { version?: number } | undefined)?.version;
      if (version !== undefined) {
        const nuevo = { ...b, cuerpo: { ...(b.cuerpo as object), version } };
        guardarBorrador(nuevo);
        return reenviar(nuevo);
      }
    }
    setBorradores(listarBorradores());
    if (r.ok) cargarLegajo();
    return r.ok ? null : r.error.message;
  };

  const descartar = (b: Borrador) => {
    descartarBorrador(b.clave);
    setBorradores(listarBorradores());
  };

  const cerrarSesion = async () => {
    if (borradores.length > 0 &&
      !confirm(`Tenés ${borradores.length} guardado(s) sin enviar. Quedan en este dispositivo y los podés reenviar al volver a ingresar. ¿Cerrar sesión igual?`)) {
      return;
    }
    try {
      await pedir('/auth/salir', { metodo: 'POST' });
    } catch {
      // Sin señal no se revoca en el servidor; igual se borra de este dispositivo.
    }
    borrarSesion();
    setSesion(null);
    setDatabase(null);
    setAvisoIngreso(undefined);
  };

  // --- pantallas previas al legajo

  if (!sesion) {
    return (
      <Login
        aviso={avisoIngreso}
        onIngreso={(s) => {
          setAvisoIngreso(undefined);
          setSesion(s);
        }}
      />
    );
  }

  if (!database) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
        <div className="max-w-sm text-center space-y-4">
          {errorCarga ? (
            <>
              <WifiOff className="w-10 h-10 mx-auto text-amber-400" />
              <p className="text-sm">{errorCarga}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button onClick={cargarLegajo} className="px-4 py-2 bg-emerald-600 rounded-xl text-sm font-bold">Reintentar</button>
                {borradores.length > 0 && (
                  <button onClick={() => setIsBorradoresOpen(true)} className="px-4 py-2 bg-amber-600 rounded-xl text-sm font-bold">
                    {borradores.length} no enviado{borradores.length > 1 ? 's' : ''}
                  </button>
                )}
                <button onClick={cerrarSesion} className="px-4 py-2 bg-slate-700 rounded-xl text-sm font-bold">Cerrar sesión</button>
              </div>
            </>
          ) : (
            <>
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-400" />
              <p className="text-sm text-slate-300">Cargando el legajo…</p>
            </>
          )}
        </div>
        {isBorradoresOpen && (
          <BorradoresModal
            borradores={borradores}
            isOnline={isOnline}
            onClose={() => setIsBorradoresOpen(false)}
            onReenviar={reenviar}
            onAplicarSobreActual={aplicarSobreActual}
            onDescartar={descartar}
          />
        )}
      </div>
    );
  }

  // --- legajo

  const escuelasActivas = database.schools.filter((s) => s.active !== false);
  const personalActivo = database.staff.filter((s) => s.active !== false);
  const selectedSchool = database.schools.find((s) => s.id === selectedSchoolId) || null;
  const selectedSchoolStaff = selectedSchoolId ? personalActivo.filter((st) => st.schoolId === selectedSchoolId) : [];
  const selectedSchoolVisits = selectedSchoolId ? database.visits.filter((v) => v.schoolId === selectedSchoolId) : [];
  const selectedSchoolIssues = selectedSchoolId ? database.issues.filter((i) => i.schoolId === selectedSchoolId) : [];

  const totalAlerts =
    escuelasActivas.reduce((acc, s) => acc + s.activeIssuesCount, 0) +
    personalActivo.filter((s) => getHealthCardStatus(s.healthCardValidUntil) === 'expired').length;

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

  return (
    <EquipoProvider equipo={equipo}>
      <div className="min-h-screen bg-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
        <PWAPromptBanner />

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
          schools={escuelasActivas}
          onSelectSchool={handleSelectSchool}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenNewSchoolModal={() => {
            setSchoolToEdit(null);
            setIsSchoolModalOpen(true);
          }}
          totalAlerts={totalAlerts}
          activityLogsCount={database.activityLogs?.length || 0}
          activeUserId={activeUserId}
          nombreSesion={sesion.cuenta.nombre}
          onCerrarSesion={cerrarSesion}
          isOnline={isOnline}
          borradoresCount={borradores.length}
          onOpenBorradores={() => setIsBorradoresOpen(true)}
        />

        {aviso && (
          <div role="status" className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 sticky top-14 sm:top-16 z-30">
            <span>{aviso}</span>
            <button onClick={() => setAviso(null)} aria-label="Cerrar aviso"><X className="w-4 h-4" /></button>
          </div>
        )}

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
          {currentView === 'dashboard' && (
            <Dashboard
              schools={escuelasActivas}
              staff={personalActivo}
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
            />
          )}

          {currentView === 'schools' && (
            <SchoolList
              schools={database.schools}
              staff={personalActivo}
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
            />
          )}
        </main>

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
            schools={escuelasActivas}
            onTrasladar={handleTrasladarStaff}
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
            nextSchoolNumber={Math.max(0, ...database.schools.map((s) => s.number)) + 1}
            onSave={handleSaveSchool}
            onDarDeBaja={handleDeleteSchool}
          />
        )}

        {isExportModalOpen && (
          <ExportImportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} databaseState={database} />
        )}

        {schoolForReport && (
          <SchoolReportModal
            isOpen={!!schoolForReport}
            onClose={() => setSchoolForReport(null)}
            school={schoolForReport}
            staff={personalActivo.filter((st) => st.schoolId === schoolForReport.id)}
            visits={database.visits.filter((v) => v.schoolId === schoolForReport.id)}
            issues={database.issues.filter((i) => i.schoolId === schoolForReport.id)}
          />
        )}

        {isBorradoresOpen && (
          <BorradoresModal
            borradores={borradores}
            isOnline={isOnline}
            onClose={() => setIsBorradoresOpen(false)}
            onReenviar={reenviar}
            onAplicarSobreActual={aplicarSobreActual}
            onDescartar={descartar}
          />
        )}

        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-12 print:hidden">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              <strong>Legajo Digital de Comedores Escolares</strong> • PAE Tacuarembó
            </span>
            <span>Legajo compartido del equipo técnico.</span>
          </div>
        </footer>

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
          borradoresCount={borradores.length}
          onOpenBorradores={() => setIsBorradoresOpen(true)}
        />
      </div>
    </EquipoProvider>
  );
}

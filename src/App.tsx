import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { School, StaffMember, Visit, SchoolIssue, ActivityLog, CuentaEquipo, equipoDesdeCuentas } from './types';
import { DatabaseState, getHealthCardStatus } from './services/storage';
import { aLa, deLa, nombreInstitucion } from './services/institucion';
import { describirCampos, ErrorApi, generaBorrador, nuevoId, pedir } from './services/api';
import { borrarSesion, leerSesion, Sesion } from './services/sesion';
import { Borrador, buscarBorrador, descartarBorrador, guardarBorrador, listarBorradores, reenviarBorrador } from './services/borradores';
import { fechaCorta } from './services/fechas';
import { borrarCopia, guardarCopia, leerCopia } from './services/copiaLegajo';
import { enviarCola, ESPERA_MINIMA_MS, pendientesDe, siguienteEspera } from './services/envio';
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
import { ScheduleVisitModal } from './components/ScheduleVisitModal';
import type { AvisoBorradorProps } from './components/AvisoBorrador';
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

export default function App() {
  // --- sesión y datos del servidor
  const [sesion, setSesion] = useState<Sesion | null>(() => leerSesion());
  const [avisoIngreso, setAvisoIngreso] = useState<string | undefined>(undefined);
  const [database, setDatabase] = useState<DatabaseState | null>(null);
  const [cuentas, setCuentas] = useState<CuentaEquipo[]>([]);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [borradores, setBorradores] = useState<Borrador[]>(() => listarBorradores(undefined, leerSesion()?.cuenta.id));
  const [aviso, setAviso] = useState<string | null>(null);

  // --- sin conexión (006): copia del legajo en el dispositivo y envío automático
  /** Con valor, la pantalla muestra la copia del dispositivo, recibida en esa fecha. */
  const [copiaDel, setCopiaDel] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const recibidoRef = useRef<string | null>(null);
  const hayDatosRef = useRef(false);
  const avisoCopiaRef = useRef(false);
  const enviandoRef = useRef(false);
  const esperaRef = useRef(ESPERA_MINIMA_MS);

  const refrescarBorradores = () => setBorradores(listarBorradores(undefined, leerSesion()?.cuenta.id));

  // Borrador abierto en un formulario (R7): guardar lo reemplaza sin preguntar.
  const [abiertoDesde, setAbiertoDesde] = useState<string | null>(null);
  const [visitaBorrador, setVisitaBorrador] = useState<{ visit: Visit; newIssues: SchoolIssue[] } | null>(null);
  const [programadaBorrador, setProgramadaBorrador] = useState<Visit | null>(null);

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
  // La copia del legajo tampoco: es de esta cuenta y sirve al reingresar.
  const perderSesion = useCallback((motivo: string) => {
    borrarSesion();
    setSesion(null);
    setDatabase(null);
    hayDatosRef.current = false;
    setCopiaDel(null);
    setAvisoIngreso(motivo);
  }, []);

  const aplicarLegajo = (l: Legajo) => {
    const { cuentas: cs, ...estado } = l;
    setDatabase(estado);
    setCuentas(cs);
    hayDatosRef.current = true;
  };

  const cargarLegajo = useCallback(async () => {
    const cuentaId = leerSesion()?.cuenta.id;
    try {
      // Con inactivos: una escuela o persona dada de baja sigue consultable
      // (FR-015). Los listados las filtran; SchoolList permite verlas.
      const l = await pedir<Legajo>('/legajo?incluir_inactivos=1');
      aplicarLegajo(l);
      setErrorCarga(null);
      setCopiaDel(null);
      const recibidoEn = new Date().toISOString();
      recibidoRef.current = recibidoEn;
      if (cuentaId && !(await guardarCopia({ cuentaId, recibidoEn, legajo: l })) && !avisoCopiaRef.current) {
        avisoCopiaRef.current = true;
        avisar('Este dispositivo no puede guardar el legajo para usarlo sin señal.');
      }
    } catch (e) {
      if (e instanceof ErrorApi && e.tipo === 'sesion') {
        perderSesion('Tu sesión venció. Volvé a ingresar.');
        return;
      }
      // Sin servidor: lo que ya está en pantalla es la última versión recibida.
      if (hayDatosRef.current) {
        setCopiaDel(recibidoRef.current ?? new Date().toISOString());
        return;
      }
      const copia = cuentaId ? await leerCopia<Legajo>(cuentaId) : null;
      if (copia) {
        aplicarLegajo(copia.legajo);
        recibidoRef.current = copia.recibidoEn;
        setCopiaDel(copia.recibidoEn);
        setErrorCarga(null);
        return;
      }
      setErrorCarga(
        e instanceof ErrorApi && e.tipo === 'red'
          ? 'No hay conexión con el servidor. Para usar la app sin señal hace falta abrirla una vez con conexión; lo que ya guardaste como "no enviado" sigue a salvo en este dispositivo.'
          : 'El servidor no pudo entregar el legajo. Probá de nuevo en un momento.',
      );
    }
  }, [perderSesion]);

  // Al abrir con sesión: primero la copia del dispositivo (si es de esta
  // cuenta), después el servidor. Una copia de otra cuenta se borra (FR-005).
  useEffect(() => {
    if (!sesion) return;
    let vigente = true;
    (async () => {
      const copia = await leerCopia<Legajo>(sesion.cuenta.id);
      if (!vigente) return;
      if (copia && !hayDatosRef.current) {
        aplicarLegajo(copia.legajo);
        recibidoRef.current = copia.recibidoEn;
      } else if (!copia) {
        await borrarCopia();
      }
      cargarLegajo();
    })();
    return () => {
      vigente = false;
    };
  }, [sesion, cargarLegajo]);

  useEffect(() => {
    if (!sesion) return;
    window.addEventListener('online', cargarLegajo);
    return () => window.removeEventListener('online', cargarLegajo);
  }, [sesion, cargarLegajo]);

  // Envío automático de los no enviados (FR-008): al abrir, al volver la red y
  // con espera creciente mientras queden pendientes. Sin pedir confirmación;
  // al terminar se avisa qué llegó (FR-020).
  const enviarPendientes = useCallback(async () => {
    const cuentaId = leerSesion()?.cuenta.id;
    if (!cuentaId || enviandoRef.current) return;
    if (pendientesDe(cuentaId, listarBorradores(undefined, cuentaId)).length === 0) return;
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const r = await enviarCola(cuentaId);
      esperaRef.current = siguienteEspera(esperaRef.current, r);
      refrescarBorradores();
      const revisar = r.rechazados > 0 ? `${r.rechazados} necesita${r.rechazados > 1 ? 'n' : ''} revisión en "No enviados"` : '';
      if (r.enviados > 0) {
        cargarLegajo();
        avisar(`Se envi${r.enviados > 1 ? 'aron' : 'ó'} ${r.enviados} guardado${r.enviados > 1 ? 's' : ''}${revisar ? `; ${revisar}` : ''}.`);
      } else if (revisar) {
        avisar(`${revisar[0].toUpperCase()}${revisar.slice(1)}.`);
      }
      if (r.frenadoPor === 'sesion') {
        perderSesion('Tu sesión venció. Lo que no se envió sigue guardado y se envía solo después de ingresar.');
      }
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }, [cargarLegajo, perderSesion]);

  useEffect(() => {
    if (!sesion) return;
    enviarPendientes();
    window.addEventListener('online', enviarPendientes);
    return () => window.removeEventListener('online', enviarPendientes);
  }, [sesion, enviarPendientes]);

  // Cada cambio en la lista (o el fin de un envío) reprograma el próximo intento.
  useEffect(() => {
    if (!sesion || enviando) return;
    if (pendientesDe(sesion.cuenta.id, borradores).length === 0) {
      esperaRef.current = ESPERA_MINIMA_MS;
      return;
    }
    const t = window.setTimeout(enviarPendientes, esperaRef.current);
    return () => window.clearTimeout(t);
  }, [sesion, borradores, enviando, enviarPendientes]);

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
    // Un borrador de esta ficha nunca se reemplaza en silencio (FR-021): si el
    // formulario no se abrió desde él, se pide confirmar.
    const previo = buscarBorrador(op.clave);
    if (previo && previo.cuentaId === leerSesion()?.cuenta.id && abiertoDesde !== op.clave &&
      !confirm(`Ya hay cambios sin enviar en esta ficha (guardados el ${fechaCorta(previo.actualizadoEn ?? previo.creadoEn)}). ¿Reemplazarlos por estos?`)) {
      return 'No se guardó: los cambios anteriores siguen en "No enviados". Podés abrirlos desde el aviso de arriba.';
    }
    try {
      const r = await pedir<T>(op.ruta, { metodo: op.metodo, cuerpo: op.cuerpo });
      alConfirmar(r);
      // Lo que se guardó reemplaza al borrador de la misma ficha, si había.
      if (previo) {
        descartarBorrador(op.clave);
        refrescarBorradores();
      }
      // La bitácora y los derivados los calcula el servidor: se recarga.
      cargarLegajo();
      return null;
    } catch (e) {
      if (generaBorrador(e)) {
        const err = e as ErrorApi;
        const guardado = guardarBorrador({ ...op, ultimoError: err.message, tipoError: err.tipo, cuentaId: leerSesion()?.cuenta.id });
        refrescarBorradores();
        if (!guardado) {
          return 'No se pudo enviar y este dispositivo tampoco pudo guardarlo. No cierres el formulario: copiá lo escrito antes de salir.';
        }
        if (err.tipo === 'sesion') {
          perderSesion('Tu sesión venció. Lo que estabas guardando quedó en "No enviados": reenvialo después de ingresar.');
        } else {
          avisar(`No se envió: "${op.descripcion}" quedó guardado en este dispositivo y se envía solo cuando vuelva la conexión.`);
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
    return s ? nombreInstitucion(s) : 'institución';
  };
  const aLaN = (schoolId: string) => {
    const s = database?.schools.find((x) => x.id === schoolId);
    return s ? aLa(s) : 'a la institución';
  };
  const deLaN = (schoolId: string) => {
    const s = database?.schools.find((x) => x.id === schoolId);
    return s ? deLa(s) : 'de la institución';
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
        descripcion: `Visita ${aLaN(visit.schoolId)} (${visit.date})`,
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
        ? { clave: `visita:${visit.id}`, descripcion: `Visita programada ${aLaN(visit.schoolId)}`, metodo: 'PUT', ruta: `/visitas/${visit.id}`, cuerpo: visit }
        : { clave: `visita:${visit.id}`, descripcion: `Visita programada ${aLaN(visit.schoolId)} (${visit.date})`, metodo: 'POST', ruta: '/visitas', cuerpo: { visit, newIssues: [] } },
      (r) => reemplazar('visits', 'visit' in r ? r.visit : r),
      (actual) => reemplazar('visits', actual),
    );
  };

  const handleDeleteVisit = (visitId: string) => {
    const v = database?.visits.find((x) => x.id === visitId);
    if (!v) return;
    escribirSinFormulario(
      { clave: `visita-borrar:${visitId}`, descripcion: `Borrar visita N° ${v.visitNumber} ${deLaN(v.schoolId)}`, metodo: 'DELETE', ruta: `/visitas/${visitId}`, cuerpo: { version: v.version } },
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
        descripcion: `Traslado de ${s.fullName} ${aLaN(schoolId)}`,
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
    const anterior = database?.schools.find((s) => s.id === school.id);
    const existe = !!anterior;
    return escribir<School>(
      {
        clave: `escuela:${school.id}`,
        descripcion: `${existe ? 'Edición' : 'Alta'} ${deLa({ number: school.number, schoolType: school.schoolType ?? anterior?.schoolType })}`,
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
      { clave: `escuela-baja:${schoolId}`, descripcion: `Baja ${deLa(s)}`, metodo: 'DELETE', ruta: `/escuelas/${schoolId}`, cuerpo: { version: s.version } },
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
    refrescarBorradores();
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
    refrescarBorradores();
    if (r.ok) cargarLegajo();
    return r.ok ? null : r.error.message;
  };

  const descartar = (b: Borrador) => {
    descartarBorrador(b.clave);
    refrescarBorradores();
  };

  // Abre un "no enviado" en su formulario, precargado con lo escrito (R7).
  // Guardar reemplaza el mismo borrador: misma clave, mismo lugar en la cola.
  const editarBorrador = (b: Borrador) => {
    const cuerpo = b.cuerpo as Record<string, any>;
    const schoolId: string | undefined = cuerpo.schoolId ?? cuerpo.visit?.schoolId;
    if (!b.clave.startsWith('escuela:') && !database?.schools.some((s) => s.id === schoolId)) {
      avisar('La escuela de este borrador todavía no está en el legajo: primero tiene que llegar su alta.');
      return;
    }
    setIsBorradoresOpen(false);
    setAbiertoDesde(b.clave);
    if (schoolId) setSelectedSchoolId(schoolId);
    if (b.clave.startsWith('visita:')) {
      const visita: Visit = b.metodo === 'PUT' ? (cuerpo as Visit) : cuerpo.visit;
      if (b.metodo === 'POST' && visita.status === 'Realizada') {
        setVisitaBorrador({ visit: visita, newIssues: cuerpo.newIssues ?? [] });
        setIsVisitModalOpen(true);
      } else {
        setProgramadaBorrador(visita);
      }
    } else if (b.clave.startsWith('personal:')) {
      setStaffToEdit(cuerpo as StaffMember);
      setIsStaffModalOpen(true);
    } else if (b.clave.startsWith('incidencia:')) {
      setIssueToEdit(cuerpo as SchoolIssue);
      setIsIssueModalOpen(true);
    } else if (b.clave.startsWith('escuela:')) {
      setSchoolToEdit(cuerpo as School);
      setIsSchoolModalOpen(true);
    }
  };

  const guardarNota = (b: Borrador, summary: string, notes: string) => {
    guardarBorrador({ ...b, descripcion: `Nota: ${summary}`, cuerpo: { ...(b.cuerpo as object), summary, notes } });
    refrescarBorradores();
    enviarPendientes();
  };

  /** Aviso para una ficha abierta desde el legajo que tiene un "no enviado" (FR-021). */
  const avisoDe = (clave: string | null): AvisoBorradorProps | undefined => {
    if (!clave || clave === abiertoDesde) return undefined;
    const b = borradores.find((x) => x.clave === clave && x.cuentaId === activeUserId);
    return b ? { guardadoEn: b.actualizadoEn ?? b.creadoEn, onAbrir: () => editarBorrador(b) } : undefined;
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
    // El legajo no queda en el dispositivo al salir (FR-006); los no enviados sí.
    await borrarCopia();
    borrarSesion();
    setSesion(null);
    setDatabase(null);
    hayDatosRef.current = false;
    recibidoRef.current = null;
    setCopiaDel(null);
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
                    No enviados ({borradores.filter((b) => b.cuentaId === sesion.cuenta.id).length})
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
            cuentaId={sesion.cuenta.id}
            isOnline={isOnline}
            onClose={() => setIsBorradoresOpen(false)}
            onReenviar={reenviar}
            onAplicarSobreActual={aplicarSobreActual}
            onDescartar={descartar}
            onEditar={() => alert('Para editarlo en su formulario hace falta tener el legajo cargado. Lo escrito sigue a salvo acá.')}
            onGuardarNota={guardarNota}
          />
        )}
      </div>
    );
  }

  // --- legajo

  // Los no enviados de otra cuenta no cuentan ni se envían (FR-014).
  const misBorradores = borradores.filter((b) => b.cuentaId === activeUserId);
  const rechazados = misBorradores.filter((b) => b.estado === 'rechazado').length;
  const deOtraCuenta = borradores.length - misBorradores.length;

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
          borradoresCount={misBorradores.length}
          onOpenBorradores={() => setIsBorradoresOpen(true)}
          copiaDel={copiaDel}
          enviando={enviando}
          rechazados={rechazados}
          deOtraCuenta={deOtraCuenta}
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
              setVisitaBorrador(null);
              setAbiertoDesde(null);
            }}
            school={selectedSchool}
            existingVisitsCount={selectedSchoolVisits.length}
            onSaveVisit={handleSaveVisit}
            activeUserId={activeUserId}
            initialDate={visitDefaultDate}
            initialTime={visitDefaultTime}
            isOnline={isOnline}
            borrador={visitaBorrador ?? undefined}
          />
        )}

        {/* Una visita programada que no se envió, abierta desde "No enviados" (R7). */}
        {programadaBorrador && (
          <ScheduleVisitModal
            isOpen
            onClose={() => {
              setProgramadaBorrador(null);
              setAbiertoDesde(null);
            }}
            schools={escuelasActivas}
            onSaveScheduledVisit={handleSaveScheduledVisit}
            visitToEdit={programadaBorrador}
            activeUserId={activeUserId}
          />
        )}

        {/* key: abrir el borrador desde el aviso vuelve a montar el formulario con lo escrito. */}
        {isStaffModalOpen && selectedSchool && (
          <StaffModal
            key={abiertoDesde ?? 'legajo'}
            isOpen={isStaffModalOpen}
            onClose={() => {
              setIsStaffModalOpen(false);
              setStaffToEdit(null);
              setAbiertoDesde(null);
            }}
            schoolId={selectedSchool.id}
            staffToEdit={staffToEdit}
            onSave={handleSaveStaff}
            schools={escuelasActivas}
            onTrasladar={handleTrasladarStaff}
            avisoBorrador={avisoDe(staffToEdit && `personal:${staffToEdit.id}`)}
          />
        )}

        {isIssueModalOpen && selectedSchool && (
          <IssueModal
            key={abiertoDesde ?? 'legajo'}
            isOpen={isIssueModalOpen}
            onClose={() => {
              setIsIssueModalOpen(false);
              setIssueToEdit(null);
              setAbiertoDesde(null);
            }}
            schoolId={selectedSchool.id}
            issueToEdit={issueToEdit}
            visitsCount={selectedSchoolVisits.length}
            onSave={handleSaveIssue}
            avisoBorrador={avisoDe(issueToEdit && `incidencia:${issueToEdit.id}`)}
          />
        )}

        {isSchoolModalOpen && (
          <SchoolModal
            key={abiertoDesde ?? 'legajo'}
            isOpen={isSchoolModalOpen}
            onClose={() => {
              setIsSchoolModalOpen(false);
              setSchoolToEdit(null);
              setAbiertoDesde(null);
            }}
            schoolToEdit={schoolToEdit}
            nextSchoolNumber={Math.max(0, ...database.schools.map((s) => s.number)) + 1}
            onSave={handleSaveSchool}
            onDarDeBaja={handleDeleteSchool}
            avisoBorrador={avisoDe(schoolToEdit && `escuela:${schoolToEdit.id}`)}
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
            cuentaId={activeUserId}
            isOnline={isOnline}
            onClose={() => setIsBorradoresOpen(false)}
            onReenviar={reenviar}
            onAplicarSobreActual={aplicarSobreActual}
            onDescartar={descartar}
            onEditar={editarBorrador}
            onGuardarNota={guardarNota}
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
          borradoresCount={misBorradores.length}
          onOpenBorradores={() => setIsBorradoresOpen(true)}
          copiaDel={copiaDel}
          enviando={enviando}
          rechazados={rechazados}
          deOtraCuenta={deOtraCuenta}
        />
      </div>
    </EquipoProvider>
  );
}

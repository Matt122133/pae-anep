import { nuevoId } from '../services/api';
import { PresenciaAviso } from './PresenciaAviso';
import React, { useState, useEffect } from 'react';
import { School, ModalityType, SchoolAreaType, MilkProgramType, SchoolType } from '../types';
import { conArticulo, nombreInstitucion } from '../services/institucion';
import { X, Building2, Save, Droplets, Milk, UserCheck, MapPin, Truck, Plus } from 'lucide-react';
import { agregarProveedor, quitarProveedor, LARGO_MAXIMO_PROVEEDOR } from '../services/proveedores';
import { AvisoBorrador, AvisoBorradorProps } from './AvisoBorrador';

interface SchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Devuelve null si se guardó (o quedó como borrador), o el error a mostrar. */
  onSave: (school: School) => Promise<string | null>;
  schoolToEdit?: School | null;
  /** Hay un "no enviado" de esta ficha (006, FR-021). */
  avisoBorrador?: AvisoBorradorProps;
  nextSchoolNumber: number;
  /** Baja lógica: la escuela deja de listarse pero su historia queda (FR-015). */
  onDarDeBaja?: (schoolId: string) => void;
}

// Sugerencias de zona de inspección. Sin nombres de personas: el repo es
// público; el nombre de cada inspector/a se carga en la escuela.
const tacuaremboInspectors = [
  'Inspección Zona Urbana Tacuarembó',
  'Inspección Zona Paso de los Toros',
  'Inspección Zona Rural Este (Caraguatá / Ansina)',
  'Inspección Zona Rural Centro y Sur',
  'Inspección Zona Rural Oeste y Tambores'
];

export const SchoolModal: React.FC<SchoolModalProps> = ({
  isOpen,
  onClose,
  onSave,
  schoolToEdit,
  avisoBorrador,
  nextSchoolNumber,
  onDarDeBaja
}) => {
  // Id estable por formulario: reintentar el guardado no duplica (FR-029).
  const [idNuevo] = React.useState(() => nuevoId());
  const [guardando, setGuardando] = React.useState(false);
  const [errorGuardado, setErrorGuardado] = React.useState<string | null>(null);
  const [number, setNumber] = useState(nextSchoolNumber);
  const [schoolType, setSchoolType] = useState<SchoolType>('Escuela');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Tacuarembó');
  const [areaType, setAreaType] = useState<SchoolAreaType>('Rural');
  const [zone, setZone] = useState('');
  const [assignedInspector, setAssignedInspector] = useState(tacuaremboInspectors[0]);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [headCookName, setHeadCookName] = useState('');
  const [modality, setModality] = useState<ModalityType>('Rural');
  const [studentDinersCount, setStudentDinersCount] = useState(25);
  const [staffDinersCount, setStaffDinersCount] = useState(3);
  const [breakfast, setBreakfast] = useState(true);
  const [lunch, setLunch] = useState(true);
  const [snack, setSnack] = useState(true);

  // Agua y Rubro
  const [hasWaterSupply, setHasWaterSupply] = useState(false);
  const [waterPurchaseAllowance, setWaterPurchaseAllowance] = useState(true);
  const [waterNotes, setWaterNotes] = useState('Recibe rubro de PAE/DGEIP para compra de agua potable (bidones de 20L).');

  // Leche y Copa de Leche
  const [milkProgramType, setMilkProgramType] = useState<MilkProgramType>('Programa de Copa de Leche');
  const [milkPowderKg, setMilkPowderKg] = useState<number>(15);
  const [milkNotes, setMilkNotes] = useState('Cuota mensual asignada para desayunos y meriendas.');

  const [notes, setNotes] = useState('');

  // Proveedores (009): texto libre, sin catálogo
  const [providers, setProviders] = useState<string[]>([]);
  const [nuevoProveedor, setNuevoProveedor] = useState('');

  useEffect(() => {
    if (schoolToEdit) {
      setNumber(schoolToEdit.number);
      setSchoolType(schoolToEdit.schoolType ?? 'Escuela');
      setName(schoolToEdit.name);
      setDepartment(schoolToEdit.department || 'Tacuarembó');
      setAreaType(schoolToEdit.areaType || (schoolToEdit.modality === 'Rural' ? 'Rural' : 'Urbana'));
      setZone(schoolToEdit.zone || '');
      setAssignedInspector(schoolToEdit.assignedInspector || tacuaremboInspectors[0]);
      setAddress(schoolToEdit.address);
      setPhone(schoolToEdit.phone);
      setEmail(schoolToEdit.email);
      setPrincipalName(schoolToEdit.principalName);
      setHeadCookName(schoolToEdit.headCookName);
      setModality(schoolToEdit.modality);
      setStudentDinersCount(schoolToEdit.studentDinersCount);
      setStaffDinersCount(schoolToEdit.staffDinersCount);
      setBreakfast(schoolToEdit.mealServices.breakfast);
      setLunch(schoolToEdit.mealServices.lunch);
      setSnack(schoolToEdit.mealServices.snack);

      setHasWaterSupply(schoolToEdit.hasWaterSupply !== undefined ? schoolToEdit.hasWaterSupply : true);
      setWaterPurchaseAllowance(schoolToEdit.waterPurchaseAllowance !== undefined ? schoolToEdit.waterPurchaseAllowance : false);
      setWaterNotes(schoolToEdit.waterNotes || '');

      setMilkProgramType(schoolToEdit.milkProgramType || 'Programa de Copa de Leche');
      setMilkPowderKg(schoolToEdit.milkPowderKg !== undefined ? schoolToEdit.milkPowderKg : 15);
      setMilkNotes(schoolToEdit.milkNotes || '');

      setNotes(schoolToEdit.notes || '');
      setProviders(schoolToEdit.providers ?? []);
      setNuevoProveedor('');
    } else {
      setNumber(nextSchoolNumber);
      setSchoolType('Escuela');
      setName(`N° ${nextSchoolNumber} "Escuela"`);
      setDepartment('Tacuarembó');
      setAreaType('Rural');
      setZone('Tacuarembó Rural');
      setAssignedInspector(tacuaremboInspectors[2]);
      setAddress('Ruta Nacional km ...');
      setPhone('');
      setEmail(`escuela${nextSchoolNumber}@dgeip.edu.uy`);
      setPrincipalName('');
      setHeadCookName('');
      setModality('Rural');
      setStudentDinersCount(20);
      setStaffDinersCount(3);
      setBreakfast(true);
      setLunch(true);
      setSnack(true);
      setHasWaterSupply(false);
      setWaterPurchaseAllowance(true);
      setWaterNotes('Escuela rural sin conexión de red OSE. Recibe rubro PAE para compra de bidones de agua potable.');
      setMilkProgramType('Programa de Copa de Leche');
      setMilkPowderKg(15);
      setMilkNotes('Cuota mensual de leche en polvo asignada.');
      setNotes('');
      setProviders([]);
      setNuevoProveedor('');
    }
  // Se reinicia al abrir OTRA ficha (cambia el id), no cuando llega una versión
  // nueva de la misma: ante un conflicto (409) la app carga la versión vigente y
  // lo que la usuaria escribió tiene que quedar en el formulario (FR-014).
  }, [schoolToEdit?.id, nextSchoolNumber, isOpen]);

  if (!isOpen) return null;

  // Lo que quedó escrito sin tocar "Agregar" también se guarda. Si la ficha vino
  // sin el campo (copia anterior a 009) y la lista quedó vacía, no se manda:
  // el servidor conserva lo que tenga (research R2).
  const proveedoresAGuardar = (): Pick<School, 'providers'> => {
    const lista = agregarProveedor(providers, nuevoProveedor);
    if (schoolToEdit && schoolToEdit.providers === undefined && lista.length === 0) return {};
    return { providers: lista };
  };

  const agregar = () => {
    setProviders(agregarProveedor(providers, nuevoProveedor));
    setNuevoProveedor('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const school: School = {
      id: schoolToEdit ? schoolToEdit.id : idNuevo,
      version: schoolToEdit?.version,
      number: Number(number),
      name: name.trim() || nombreInstitucion({ number: Number(number), schoolType }),
      department,
      areaType,
      zone: zone.trim() || (areaType === 'Rural' ? 'Zona Rural' : 'Zona Urbana'),
      assignedInspector: assignedInspector.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      principalName: principalName.trim() || 'No asignada',
      headCookName: headCookName.trim() || 'No asignada',
      modality,
      studentDinersCount: Number(studentDinersCount) || 0,
      staffDinersCount: Number(staffDinersCount) || 0,
      mealServices: {
        breakfast,
        lunch,
        snack
      },
      hasWaterSupply,
      waterPurchaseAllowance,
      waterNotes: waterNotes.trim(),
      milkProgramType,
      milkPowderKg: Number(milkPowderKg) || 0,
      milkNotes: milkNotes.trim(),
      notes: notes.trim(),
      ...proveedoresAGuardar(),
      // Una ficha sin el campo (copia anterior a 010) en la que no se tocó el
      // tipo no lo manda: el servidor conserva el guardado.
      ...(schoolToEdit && schoolToEdit.schoolType === undefined && schoolType === 'Escuela' ? {} : { schoolType }),
      lastVisitDate: schoolToEdit?.lastVisitDate,
      totalVisits: schoolToEdit?.totalVisits || 0,
      activeIssuesCount: schoolToEdit?.activeIssuesCount || 0
    };

    setGuardando(true);
    setErrorGuardado(null);
    const error = await onSave(school);
    setGuardando(false);
    if (error) {
      setErrorGuardado(error);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-emerald-300" />
            <div>
              <h2 className="text-base font-bold">
                {schoolToEdit ? `Ficha Institucional - ${nombreInstitucion(schoolToEdit)}` : 'Registrar Nueva Institución en Tacuarembó'}
              </h2>
              <p className="text-xs text-emerald-200">Programa de Alimentación Escolar (PAE - DGEIP Tacuarembó)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-800 text-sm">
          {avisoBorrador && <AvisoBorrador {...avisoBorrador} />}
          {schoolToEdit && <PresenciaAviso tipo="escuela" id={schoolToEdit.id} />}
          {/* Tipo de institución (010) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Tipo de institución</span>
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-300 shadow-xs">
              {(['Escuela', 'Jardín'] as SchoolType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    // El nombre provisorio del alta acompaña al tipo mientras no se escribió otro.
                    if (!schoolToEdit && name === `N° ${number} "${schoolType}"`) setName(`N° ${number} "${t}"`);
                    setSchoolType(t);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    schoolType === t ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Clasificación Principal Tacuarembó: Rural o Urbana */}
          <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Clasificación Departamental (Tacuarembó)
                </span>
                <p className="text-xs text-slate-600">En Tacuarembó las instituciones se dividen directamente en Rurales o Urbanas.</p>
              </div>
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-emerald-300 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAreaType('Rural');
                    if (modality === 'Común' || modality === 'Tiempo Completo') setModality('Rural');
                    if (!schoolToEdit) {
                      setHasWaterSupply(false);
                      setWaterPurchaseAllowance(true);
                    }
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    areaType === 'Rural'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {schoolType} Rural
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAreaType('Urbana');
                    if (modality === 'Rural') setModality('Común');
                    if (!schoolToEdit) {
                      setHasWaterSupply(true);
                      setWaterPurchaseAllowance(false);
                    }
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    areaType === 'Urbana'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {schoolType} Urbana
                </button>
              </div>
            </div>
          </div>

          {/* Datos básicos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Número *</label>
              <input
                type="number"
                required
                value={number}
                onChange={e => setNumber(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Oficial / Denominación *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. N° 33 'José Gervasio Artigas' - Curtina"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Inspector/a asignado/a y Modalidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                Inspector/a Asignado/a *
              </label>
              <input
                type="text"
                list="inspectors-list"
                required
                value={assignedInspector}
                onChange={e => setAssignedInspector(e.target.value)}
                placeholder="Nombre del inspector/a o zona"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <datalist id="inspectors-list">
                {tacuaremboInspectors.map((ins, idx) => (
                  <option key={idx} value={ins} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Modalidad Pedagógica</label>
              <select
                value={modality}
                onChange={e => setModality(e.target.value as ModalityType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Rural">Rural</option>
                <option value="Tiempo Completo">Tiempo Completo</option>
                <option value="Tiempo Extendido">Tiempo Extendido</option>
                <option value="Escuelas de Educación Especial">Escuelas de Educación Especial</option>
                <option value="Escuelas de Educación Artística (EDEA)">Escuelas de Educación Artística (EDEA)</option>
                <option value="TPA">TPA</option>
                <option value="Aprender">Aprender</option>
                <option value="Común">Común</option>
                <option value="Práctica">Práctica</option>
              </select>
            </div>
          </div>

          {/* Ubicación y Contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Localidad / Paraje / Parada</label>
              <input
                type="text"
                value={zone}
                onChange={e => setZone(e.target.value)}
                placeholder="Ej. Caraguatá, Curtina, Ansina..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección / Camino / Ruta</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Ruta 26 km 350 / Calle y número"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Maestro/a Director/a</label>
              <input
                type="text"
                value={principalName}
                onChange={e => setPrincipalName(e.target.value)}
                placeholder="Nombre del Maestro/a Director/a"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Encargada de Cocina / Cocinera</label>
              <input
                type="text"
                value={headCookName}
                onChange={e => setHeadCookName(e.target.value)}
                placeholder="Nombre de la Cocinera titular"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* SECCIÓN ESPECÍFICA: SUMINISTRO DE AGUA Y RUBRO DE AGUA */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-sky-700" />
              <h3 className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                Suministro de Agua y Rubro para Compra de Agua Potable
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg border border-sky-200 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasWaterSupply}
                    onChange={e => {
                      setHasWaterSupply(e.target.checked);
                      if (e.target.checked) setWaterPurchaseAllowance(false);
                    }}
                    className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                  />
                  Cuenta con suministro de agua de red (OSE)
                </label>
                <p className="text-[11px] text-slate-500 pl-6">
                  Marcar si la institución cuenta con agua potable corriente de red.
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-sky-200 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waterPurchaseAllowance}
                    onChange={e => {
                      setWaterPurchaseAllowance(e.target.checked);
                      if (e.target.checked) setHasWaterSupply(false);
                    }}
                    className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  Recibe Rubro para Compra de Agua Potable
                </label>
                <p className="text-[11px] text-amber-700 pl-6">
                  {areaType === 'Rural' 
                    ? 'Clave para instituciones rurales de Tacuarembó sin OSE que compran bidones de agua.' 
                    : 'Instituciones autorizadas para compra de agua.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-sky-900 mb-1">
                Detalle del Abastecimiento y Compra de Agua:
              </label>
              <input
                type="text"
                value={waterNotes}
                onChange={e => setWaterNotes(e.target.value)}
                placeholder="Ej. Recibe rubro mensual para bidones de 20L y recarga de tanque..."
                className="w-full px-3 py-1.5 bg-white border border-sky-200 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          {/* SECCIÓN ESPECÍFICA: LECHE EN POLVO Y PROGRAMA DE LECHE */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Milk className="w-5 h-5 text-amber-700" />
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Programa de Leche Escolar / Copa de Leche y Leche en Polvo
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Programa al que pertenece:
                </label>
                <select
                  value={milkProgramType}
                  onChange={e => setMilkProgramType(e.target.value as MilkProgramType)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="Programa de Copa de Leche">Programa de Copa de Leche</option>
                  <option value="Programa de Leche Escolar">Programa de Leche Escolar</option>
                  <option value="Ambos">Ambos (Leche Escolar + Copa de Leche)</option>
                  <option value="Comedor Tradicional">Comedor Tradicional</option>
                  <option value="Ninguno / Comedor Tradicional">Ninguno / Sin programa de leche</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cantidad de Leche en Polvo que Recibe (Kg / mes):
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={milkPowderKg}
                  onChange={e => setMilkPowderKg(Number(e.target.value))}
                  placeholder="Ej. 15 kg"
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                Observaciones del Programa de Leche / Frecuencia de Distribución:
              </label>
              <input
                type="text"
                value={milkNotes}
                onChange={e => setMilkNotes(e.target.value)}
                placeholder="Ej. Cuota mensual provista por depósito PAE para preparación diaria..."
                className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Comensales y Servicios */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 mb-2">Comensales y Servicios de Alimentación</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Alumnos Comensales (Matrícula)</label>
                <input
                  type="number"
                  value={studentDinersCount}
                  onChange={e => setStudentDinersCount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Docentes / Auxiliares (Adultos)</label>
                <input
                  type="number"
                  value={staffDinersCount}
                  onChange={e => setStaffDinersCount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-sm font-semibold"
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-4">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={breakfast}
                    onChange={e => setBreakfast(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  Desayuno
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lunch}
                    onChange={e => setLunch(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  Almuerzo
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={snack}
                    onChange={e => setSnack(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  Merienda
                </label>
              </div>
            </div>
          </div>

          {/* Proveedores */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              Proveedores
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={nuevoProveedor}
                maxLength={LARGO_MAXIMO_PROVEEDOR}
                onChange={e => setNuevoProveedor(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    agregar();
                  }
                }}
                placeholder="Nombre del proveedor"
                className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-sm"
              />
              <button
                type="button"
                onClick={agregar}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar
              </button>
            </div>
            {providers.length > 0 && (
              <ul className="mt-2 space-y-1">
                {providers.map((p, i) => (
                  <li key={p} className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded px-2.5 py-1 text-sm">
                    <span className="break-words min-w-0">{p}</span>
                    <button
                      type="button"
                      onClick={() => setProviders(quitarProveedor(providers, i))}
                      title={`Quitar ${p}`}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notas y Referencias del Legajo Escolar
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Detalles sobre equipamiento, remodelaciones o particularidades del servicio..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 shrink-0">
            {schoolToEdit && onDarDeBaja && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Dar de baja ${conArticulo(schoolToEdit)}? Deja de aparecer en los listados, pero sus visitas, incidencias y bitácora se conservan y se puede reactivar.`)) {
                    onDarDeBaja(schoolToEdit.id);
                    onClose();
                  }
                }}
                className="mr-auto px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-lg"
              >
                Dar de baja
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            {errorGuardado && <span role="alert" className="text-xs font-semibold text-rose-700 max-w-xs">{errorGuardado}</span>}
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
            >
              <Save className="w-4 h-4" />
              Guardar Ficha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

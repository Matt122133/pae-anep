import { nuevoId } from '../services/api';
import { PresenciaAviso } from './PresenciaAviso';
import React, { useState, useEffect } from 'react';
import { School, StaffMember, InstitutionContractType, StaffRole, SocialSecurityStatus } from '../types';
import { X, UserCheck, ShieldAlert, AlertCircle } from 'lucide-react';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Devuelve null si se guardó (o quedó como borrador), o el error a mostrar. */
  onSave: (staff: StaffMember) => Promise<string | null>;
  /** Escuelas activas, para el traslado. */
  schools?: School[];
  /** Traslado a otra escuela conservando el historial (FR-033). */
  onTrasladar?: (staffId: string, schoolId: string) => Promise<string | null>;
  schoolId: string;
  staffToEdit?: StaffMember | null;
}

export const StaffModal: React.FC<StaffModalProps> = ({
  isOpen,
  onClose,
  onSave,
  schoolId,
  staffToEdit,
  schools = [],
  onTrasladar
}) => {
  const [destino, setDestino] = React.useState('');
  const destinos = schools.filter(s => s.active !== false && s.id !== schoolId);
  const trasladar = async () => {
    if (!staffToEdit || !onTrasladar || !destino) return;
    const escuela = destinos.find(s => s.id === destino);
    if (!confirm(`¿Trasladar a ${staffToEdit.fullName} a la Escuela N° ${escuela?.number}? Su historial se conserva en las dos escuelas.`)) return;
    setGuardando(true);
    setErrorGuardado(null);
    const error = await onTrasladar(staffToEdit.id, destino);
    setGuardando(false);
    if (error) {
      setErrorGuardado(error);
      return;
    }
    onClose();
  };
  // Id estable por formulario: reintentar el guardado no duplica (FR-029).
  const [idNuevo] = React.useState(() => nuevoId());
  const [guardando, setGuardando] = React.useState(false);
  const [errorGuardado, setErrorGuardado] = React.useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [ci, setCi] = useState('');
  const [role, setRole] = useState<StaffRole>('Auxiliar de Cocina');
  const [institutionType, setInstitutionType] = useState<InstitutionContractType>('DGEIP');
  const [enterpriseName, setEnterpriseName] = useState('');
  const [healthCardValidUntil, setHealthCardValidUntil] = useState('');
  const [foodHandlerCardValidUntil, setFoodHandlerCardValidUntil] = useState('');
  const [socialSecurityStatus, setSocialSecurityStatus] = useState<SocialSecurityStatus>('Al día / Registrado');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (staffToEdit) {
      setFullName(staffToEdit.fullName);
      setCi(staffToEdit.ci);
      setRole(staffToEdit.role);
      setInstitutionType(staffToEdit.institutionType);
      setEnterpriseName(staffToEdit.enterpriseName || '');
      setHealthCardValidUntil(staffToEdit.healthCardValidUntil);
      setFoodHandlerCardValidUntil(staffToEdit.foodHandlerCardValidUntil || '');
      setSocialSecurityStatus(staffToEdit.socialSecurityStatus);
      setPhone(staffToEdit.phone || '');
      setNotes(staffToEdit.notes || '');
    } else {
      setFullName('');
      setCi('');
      setRole('Auxiliar de Cocina');
      setInstitutionType('DGEIP');
      setEnterpriseName('');
      // Default health card 6 months ahead
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 6);
      setHealthCardValidUntil(nextDate.toISOString().slice(0, 10));
      const nextFoodDate = new Date();
      nextFoodDate.setFullYear(nextFoodDate.getFullYear() + 2);
      setFoodHandlerCardValidUntil(nextFoodDate.toISOString().slice(0, 10));
      setSocialSecurityStatus('Al día / Registrado');
      setPhone('');
      setNotes('');
    }
  }, [staffToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !ci.trim()) {
      alert('Por favor complete el nombre y documento del auxiliar.');
      return;
    }

    const member: StaffMember = {
      id: staffToEdit ? staffToEdit.id : idNuevo,
      version: staffToEdit?.version,
      schoolId,
      fullName: fullName.trim(),
      ci: ci.trim(),
      role,
      institutionType,
      enterpriseName: institutionType === 'Empresa Tercerizada' || institutionType === 'Otra Empresa' ? enterpriseName.trim() : undefined,
      healthCardValidUntil,
      foodHandlerCardValidUntil,
      socialSecurityStatus,
      phone: phone.trim(),
      notes: notes.trim(),
      active: true
    };

    setGuardando(true);
    setErrorGuardado(null);
    const error = await onSave(member);
    setGuardando(false);
    if (error) {
      setErrorGuardado(error);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-200" />
            <div>
              <h2 className="text-lg font-bold">
                {staffToEdit ? 'Editar Datos de Auxiliar' : 'Registrar Nueva Auxiliar / Ayudante'}
              </h2>
              <p className="text-xs text-emerald-100">
                Información de personal de cocina, régimen contractual y documentación vigente
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-emerald-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {staffToEdit && <PresenciaAviso tipo="personal" id={staffToEdit.id} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ej. María Elena Pérez"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cédula de Identidad / Doc *
              </label>
              <input
                type="text"
                required
                value={ci}
                onChange={e => setCi(e.target.value)}
                placeholder="Ej. 4.321.890-5"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rol en la Cocina
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as StaffRole)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
              >
                <option value="Cocinera Titular">Cocinera Titular</option>
                <option value="Auxiliar de Cocina">Auxiliar de Cocina</option>
                <option value="Ayudante de Cocina">Ayudante de Cocina</option>
                <option value="Encargada de Comedor">Encargada de Comedor</option>
              </select>
            </div>
          </div>

          {/* Institution / Contractor type */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              Institución de Pertenencia / Régimen Contractual
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Tipo de Pertenencia
                </label>
                <select
                  value={institutionType}
                  onChange={e => setInstitutionType(e.target.value as InstitutionContractType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="DGEIP">DGEIP (Presupuestada / Contrato Primaria)</option>
                  <option value="Empresa Tercerizada">Empresa Tercerizada (Licitación)</option>
                  <option value="Comisión Fomento">Comisión Fomento Escolar</option>
                  <option value="Aportes Patronales">Aportes Patronales / BPS</option>
                  <option value="Otra Empresa">Otra Empresa / Vínculo</option>
                </select>
              </div>

              {(institutionType === 'Empresa Tercerizada' || institutionType === 'Otra Empresa') && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Nombre de la Empresa Tercerizada *
                  </label>
                  <input
                    type="text"
                    required
                    value={enterpriseName}
                    onChange={e => setEnterpriseName(e.target.value)}
                    placeholder="Ej. Sodexo, Limpex, Grupo Transamerican"
                    className="w-full px-3 py-2 border border-emerald-400 bg-emerald-50/50 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Situación de Aportes
                </label>
                <select
                  value={socialSecurityStatus}
                  onChange={e => setSocialSecurityStatus(e.target.value as SocialSecurityStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Al día / Registrado">Al día / Registrado</option>
                  <option value="Pendiente de Regularización">Pendiente de Regularización</option>
                  <option value="En trámite">En trámite</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Ej. 099 123 456"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Documentation and dates */}
          <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3">
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Documentación Sanitaria Obligatoria
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-amber-950 mb-1">
                  Vencimiento Carné de Salud *
                </label>
                <input
                  type="date"
                  required
                  value={healthCardValidUntil}
                  onChange={e => setHealthCardValidUntil(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 bg-white rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-amber-950 mb-1">
                  Carné Manipulación Alimentos
                </label>
                <input
                  type="date"
                  value={foodHandlerCardValidUntil}
                  onChange={e => setFoodHandlerCardValidUntil(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 bg-white rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observaciones o Referencias Particulares
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Detalles sobre turno, tareas específicas asignadas o capacitaciones realizadas..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {staffToEdit && onTrasladar && destinos.length > 0 && (
            <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
              <span className="text-xs font-bold text-slate-700 block">Trasladar a otra escuela</span>
              <div className="flex gap-2">
                <select
                  value={destino}
                  onChange={e => setDestino(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">Elegí la escuela…</option>
                  {destinos.map(s => (
                    <option key={s.id} value={s.id}>N° {s.number} - {s.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!destino || guardando}
                  onClick={trasladar}
                  className="px-3 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50 rounded-lg"
                >
                  Trasladar
                </button>
              </div>
              <p className="text-[11px] text-slate-500">Es la misma persona: no se crea otra ni se borra su historia.</p>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            {errorGuardado && <span role="alert" className="text-xs font-semibold text-rose-700 max-w-xs">{errorGuardado}</span>}
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              {staffToEdit ? 'Guardar Cambios' : 'Registrar Auxiliar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import { nuevoId } from '../services/api';
import { PresenciaAviso } from './PresenciaAviso';
import React, { useState, useEffect } from 'react';
import { SchoolIssue, IssueCategory, IssueSeverity, IssueStatus } from '../types';
import { X, AlertCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { AvisoBorrador, AvisoBorradorProps } from './AvisoBorrador';

interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Devuelve null si se guardó (o quedó como borrador), o el error a mostrar. */
  onSave: (issue: SchoolIssue) => Promise<string | null>;
  schoolId: string;
  issueToEdit?: SchoolIssue | null;
  /** Hay un "no enviado" de esta ficha (006, FR-021). */
  avisoBorrador?: AvisoBorradorProps;
  visitsCount?: number;
}

export const IssueModal: React.FC<IssueModalProps> = ({
  isOpen,
  onClose,
  onSave,
  schoolId,
  issueToEdit,
  avisoBorrador,
  visitsCount = 1
}) => {
  // Id estable por formulario: reintentar el guardado no duplica (FR-029).
  const [idNuevo] = React.useState(() => nuevoId());
  const [guardando, setGuardando] = React.useState(false);
  const [errorGuardado, setErrorGuardado] = React.useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>('Higiene e Inocuidad');
  const [severity, setSeverity] = useState<IssueSeverity>('Media');
  const [status, setStatus] = useState<IssueStatus>('Pendiente');
  const [reportedDate, setReportedDate] = useState(new Date().toISOString().slice(0, 10));
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvedDate, setResolvedDate] = useState('');

  useEffect(() => {
    if (issueToEdit) {
      setTitle(issueToEdit.title);
      setDescription(issueToEdit.description);
      setCategory(issueToEdit.category);
      setSeverity(issueToEdit.severity);
      setStatus(issueToEdit.status);
      setReportedDate(issueToEdit.reportedDate);
      setResolutionNotes(issueToEdit.resolutionNotes || '');
      setResolvedDate(issueToEdit.resolvedDate || '');
    } else {
      setTitle('');
      setDescription('');
      setCategory('Higiene e Inocuidad');
      setSeverity('Media');
      setStatus('Pendiente');
      setReportedDate(new Date().toISOString().slice(0, 10));
      setResolutionNotes('');
      setResolvedDate('');
    }
  // Se reinicia al abrir OTRA ficha (cambia el id), no cuando llega una versión
  // nueva de la misma: ante un conflicto (409) la app carga la versión vigente y
  // lo que la usuaria escribió tiene que quedar en el formulario (FR-014).
  }, [issueToEdit?.id, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const issue: SchoolIssue = {
      id: issueToEdit ? issueToEdit.id : idNuevo,
      version: issueToEdit?.version,
      schoolId,
      visitId: issueToEdit?.visitId,
      title: title.trim(),
      description: description.trim(),
      category,
      severity,
      reportedDate,
      status,
      resolvedDate: status === 'Resuelto' ? (resolvedDate || new Date().toISOString().slice(0, 10)) : undefined,
      resolutionNotes: resolutionNotes.trim() || undefined,
      resolvedInVisitNumber: status === 'Resuelto' ? (issueToEdit?.resolvedInVisitNumber || visitsCount) : undefined
    };

    setGuardando(true);
    setErrorGuardado(null);
    const error = await onSave(issue);
    setGuardando(false);
    if (error) {
      setErrorGuardado(error);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold">
                {issueToEdit ? 'Editar Caso / Observación' : 'Registrar Caso para Seguimiento'}
              </h2>
              <p className="text-xs text-slate-300">
                Monitoreo de resolución de observaciones y sugerencias de la cocina
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {avisoBorrador && <AvisoBorrador {...avisoBorrador} />}
          {issueToEdit && <PresenciaAviso tipo="incidencia" id={issueToEdit.id} />}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Título del Caso / Observación *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej. Reparar burlete de heladera de carnes"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as IssueCategory)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Higiene e Inocuidad">Higiene e Inocuidad</option>
                <option value="Alimentos no autorizados">Alimentos no autorizados</option>
                <option value="Documentación de Auxiliares">Documentación de Auxiliares</option>
                <option value="Equipamiento/Infraestructura">Equipamiento/Infraestructura</option>
                <option value="Menú/Gramajes">Menú / Gramajes</option>
                <option value="Gestión de Remitos">Gestión de Remitos</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Severidad</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as IssueSeverity)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Leve">Leve (Recomendación)</option>
                <option value="Media">Media (Atención a corto plazo)</option>
                <option value="Crítica">Crítica (Riesgo bromatológico / Urgente)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción de lo Observado
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalles específicos para el equipo de visita..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Status selector with visual buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Estado de Resolución del Problema
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('Pendiente')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                  status === 'Pendiente'
                    ? 'bg-rose-50 border-rose-400 text-rose-800 ring-2 ring-rose-400'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Pendiente
              </button>

              <button
                type="button"
                onClick={() => setStatus('En Proceso')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                  status === 'En Proceso'
                    ? 'bg-amber-50 border-amber-400 text-amber-800 ring-2 ring-amber-400'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                En Proceso
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatus('Resuelto');
                  if (!resolvedDate) setResolvedDate(new Date().toISOString().slice(0, 10));
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                  status === 'Resuelto'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-400'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Resuelto
              </button>
            </div>
          </div>

          {status === 'Resuelto' && (
            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-emerald-900">Fecha en que se constató resuelto</label>
                <input
                  type="date"
                  value={resolvedDate}
                  onChange={e => setResolvedDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-emerald-300 rounded text-xs"
                />
              </div>
              <textarea
                rows={2}
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                placeholder="Explicación de cómo se resolvió (Ej. En visita posterior se comprobó arreglo y temperatura correcta a 3°C)..."
                className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
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
              className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm"
            >
              Guardar Caso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

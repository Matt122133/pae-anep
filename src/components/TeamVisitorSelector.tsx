import React, { useState, useEffect } from 'react';
import { formatTeamVisitors } from '../types';
import { useEquipo } from '../services/equipo';
import { Users, UserCheck, Sparkles, Edit3 } from 'lucide-react';

interface TeamVisitorSelectorProps {
  selectedMemberIds: string[];
  onChange: (data: {
    selectedMemberIds: string[];
    inspectorName: string;
    inspectorRole: string;
    nutritionistName: string;
  }) => void;
  activeUserId?: string;
  label?: string;
  allowManualOverride?: boolean;
}

export const TeamVisitorSelector: React.FC<TeamVisitorSelectorProps> = ({
  selectedMemberIds,
  onChange,
  activeUserId = '',
  label = 'Técnico(s) / Visitador(es) del PAE Tacuarembó',
  allowManualOverride = true
}) => {
  const equipo = useEquipo();
  const [selectedIds, setSelectedIds] = useState<string[]>(
    selectedMemberIds && selectedMemberIds.length > 0 ? selectedMemberIds : [activeUserId]
  );
  const [manualInspectorName, setManualInspectorName] = useState<string>('');
  const [isManualMode, setIsManualMode] = useState(false);

  // Sync if external selectedMemberIds changes
  useEffect(() => {
    if (selectedMemberIds && selectedMemberIds.length > 0) {
      setSelectedIds(selectedMemberIds);
    }
  }, [selectedMemberIds]);

  const handleToggleMember = (id: string) => {
    let newSelected: string[];
    if (selectedIds.includes(id)) {
      // Don't allow deselecting everything
      if (selectedIds.length === 1) return;
      newSelected = selectedIds.filter(m => m !== id);
    } else {
      newSelected = [...selectedIds, id];
    }
    setSelectedIds(newSelected);

    const formatted = formatTeamVisitors(newSelected, equipo);
    onChange({
      selectedMemberIds: newSelected,
      inspectorName: isManualMode && manualInspectorName ? manualInspectorName : formatted.inspectorName,
      inspectorRole: formatted.inspectorRole,
      nutritionistName: formatted.nutritionistName
    });
  };

  const handleApplyPreset = (preset: 'solo' | 'dupla' | 'equipo' | 'nutricion') => {
    // Los atajos se arman con el equipo que devuelve el servidor, no con ids
    // escritos en el código.
    const otraEconoma = equipo.find(m => m.id !== activeUserId && m.role === 'Ecónoma del PAE');
    const nutri = equipo.find(m => m.role === 'Licenciada en Nutrición');
    let newSelected: string[];
    if (preset === 'solo') {
      newSelected = [activeUserId];
    } else if (preset === 'dupla') {
      newSelected = otraEconoma ? [activeUserId, otraEconoma.id] : [activeUserId];
    } else if (preset === 'nutricion') {
      newSelected = !nutri || nutri.id === activeUserId ? [activeUserId] : [activeUserId, nutri.id];
    } else {
      newSelected = equipo.map(m => m.id);
    }
    newSelected = newSelected.filter(Boolean);

    setSelectedIds(newSelected);
    const formatted = formatTeamVisitors(newSelected, equipo);
    onChange({
      selectedMemberIds: newSelected,
      inspectorName: formatted.inspectorName,
      inspectorRole: formatted.inspectorRole,
      nutritionistName: formatted.nutritionistName
    });
  };

  const formattedPreview = formatTeamVisitors(selectedIds, equipo);

  const handleManualNameChange = (val: string) => {
    setManualInspectorName(val);
    onChange({
      selectedMemberIds: selectedIds,
      inspectorName: val,
      inspectorRole: formattedPreview.inspectorRole,
      nutritionistName: formattedPreview.nutritionistName
    });
  };

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
      {/* Title & Presets bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div>
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-700" />
            {label}
          </label>
          <p className="text-[11px] text-slate-500">
            Selecciona quién realiza la visita (individual, dupla, trío o equipo completo).
          </p>
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => handleApplyPreset('solo')}
            className={`px-2 py-1 text-[11px] rounded-lg font-bold transition ${
              selectedIds.length === 1 && selectedIds[0] === activeUserId
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Solo yo
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('dupla')}
            className={`px-2 py-1 text-[11px] rounded-lg font-bold transition ${
              selectedIds.length === 2 && !selectedIds.some(id => equipo.find(m => m.id === id)?.role === 'Licenciada en Nutrición')
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Dupla Ecónomas
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('nutricion')}
            className={`px-2 py-1 text-[11px] rounded-lg font-bold transition ${
              selectedIds.some(id => equipo.find(m => m.id === id)?.role === 'Licenciada en Nutrición') && selectedIds.length <= 2
                ? 'bg-indigo-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Con Nutricionista
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset('equipo')}
            className={`px-2 py-1 text-[11px] rounded-lg font-bold transition flex items-center gap-0.5 ${
              equipo.length > 0 && selectedIds.length === equipo.length
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Todo el equipo ({equipo.length})
          </button>
        </div>
      </div>

      {/* 4 Member Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {equipo.map(member => {
          const isSelected = selectedIds.includes(member.id);
          const isCurrentActive = member.id === activeUserId;

          return (
            <div
              key={member.id}
              onClick={() => handleToggleMember(member.id)}
              className={`p-2.5 rounded-xl border-2 cursor-pointer transition flex items-center justify-between gap-2 select-none ${
                isSelected
                  ? 'bg-emerald-50/70 border-emerald-600 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${member.avatarColor}`}>
                  {member.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-xs text-slate-900 truncate">
                      {member.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span className="font-medium truncate">{member.role}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                {isCurrentActive && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 border border-emerald-300">
                    Tú
                  </span>
                )}
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                  isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-400 bg-white'
                }`}>
                  {isSelected && <UserCheck className="w-3 h-3" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Formatted Preview Output */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-start sm:items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 shrink-0">
            En Devolución Oficial:
          </span>
          {!isManualMode ? (
            <span className="font-bold text-slate-900">
              {formattedPreview.inspectorName}
            </span>
          ) : (
            <input
              type="text"
              value={manualInspectorName || formattedPreview.inspectorName}
              onChange={e => handleManualNameChange(e.target.value)}
              placeholder="Texto institucional personalizado..."
              className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-900 w-full sm:w-80 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          )}
        </div>

        {allowManualOverride && (
          <button
            type="button"
            onClick={() => {
              if (!isManualMode && !manualInspectorName) {
                setManualInspectorName(formattedPreview.inspectorName);
              }
              setIsManualMode(!isManualMode);
            }}
            className="text-[11px] font-semibold text-slate-500 hover:text-emerald-700 flex items-center gap-1 shrink-0 self-end sm:self-auto"
          >
            <Edit3 className="w-3 h-3" />
            {isManualMode ? 'Usar texto automático' : 'Editar texto'}
          </button>
        )}
      </div>
    </div>
  );
};

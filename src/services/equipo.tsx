// El equipo técnico (cuentas activas del servidor) disponible para cualquier
// componente. Reemplaza a la lista fija PAE_TEAM_MEMBERS (FR-016): quién
// integra el equipo lo decide el servidor, no el código.
import React, { createContext, useContext } from 'react';
import type { PaeTeamMember } from '../types';

const EquipoContext = createContext<PaeTeamMember[]>([]);

export function EquipoProvider({ equipo, children }: { equipo: PaeTeamMember[]; children: React.ReactNode }) {
  return <EquipoContext.Provider value={equipo}>{children}</EquipoContext.Provider>;
}

export function useEquipo(): PaeTeamMember[] {
  return useContext(EquipoContext);
}

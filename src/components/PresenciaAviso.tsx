import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { pedir } from '../services/api';

type TipoFicha = 'escuela' | 'personal' | 'visita' | 'incidencia';

/**
 * Aviso de cortesía "X está editando esta ficha" (FR-034). Late cada 20 s
 * mientras la ficha está abierta y avisa al cerrarla. No bloquea nada: el
 * control real contra pisar cambios es la versión (FR-014). Sin conexión
 * simplemente no muestra nada.
 */
export function PresenciaAviso({ tipo, id }: { tipo: TipoFicha; id?: string }) {
  const [otros, setOtros] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    let vivo = true;
    const ruta = `/presencia/${tipo}/${encodeURIComponent(id)}`;
    const latir = async () => {
      try {
        const r = await pedir<{ otros: { nombre: string }[] }>(ruta, { metodo: 'PUT' });
        if (vivo) setOtros(r.otros.map((o) => o.nombre));
      } catch {
        if (vivo) setOtros([]);
      }
    };
    latir();
    const t = setInterval(latir, 20_000);
    return () => {
      vivo = false;
      clearInterval(t);
      pedir(ruta, { metodo: 'DELETE' }).catch(() => undefined);
    };
  }, [tipo, id]);

  if (otros.length === 0) return null;
  const quien = otros.join(' y ');
  return (
    <div role="status" className="mx-4 mt-3 text-xs bg-sky-50 border border-sky-200 text-sky-900 rounded-lg px-3 py-2 flex items-center gap-2">
      <Users className="w-4 h-4 shrink-0" />
      <span>
        <strong>{quien}</strong> {otros.length > 1 ? 'están' : 'está'} editando esta ficha. Si guardan antes que vos, te vamos a avisar para que no se pise nada.
      </span>
    </div>
  );
}

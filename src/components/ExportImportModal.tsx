import React, { useRef, useState } from 'react';
import { DatabaseState, downloadJsonBackup, downloadSchoolsCsv, downloadStaffCsv, downloadActivityLogsCsv, resetDatabase } from '../services/storage';
import { X, Download, Upload, RefreshCw, FileSpreadsheet, ShieldCheck, AlertTriangle, History } from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  databaseState: DatabaseState;
  onRestoreState: (newState: DatabaseState) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  databaseState,
  onRestoreState
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportBackup = () => {
    downloadJsonBackup(databaseState);
  };

  const handleExportSchoolsCsv = () => {
    downloadSchoolsCsv(databaseState.schools);
  };

  const handleExportStaffCsv = () => {
    downloadStaffCsv(databaseState.staff, databaseState.schools);
  };

  const handleExportBitacoraCsv = () => {
    downloadActivityLogsCsv(databaseState.activityLogs || []);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.schools || !Array.isArray(parsed.schools)) {
          throw new Error('El archivo no contiene el formato válido de respaldo de legajos.');
        }
        onRestoreState(parsed);
        setImportStatus(`¡Respaldo restaurado con éxito! Se cargaron ${parsed.schools.length} escuelas y ${parsed.staff?.length || 0} auxiliares.`);
      } catch (err: any) {
        setImportStatus(`Error al importar: ${err.message || 'Archivo inválido'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('¿Está seguro de reiniciar los datos a la configuración inicial de 140 escuelas?')) {
      const initial = resetDatabase();
      onRestoreState(initial);
      setImportStatus('La base de datos fue reiniciada a los valores predeterminados (140 escuelas).');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold">Respaldo, Seguridad y Exportación</h2>
              <p className="text-xs text-slate-400">Protección de datos de campo y reportes en Excel</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status banner */}
          {importStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
              {importStatus}
            </div>
          )}

          {/* Backup section */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              Copia de Seguridad Completa (Offline)
            </h3>
            <p className="text-xs text-slate-600">
              Descarga todos los legajos, visitas, auxiliares, bitácora y observaciones en un único archivo seguro para guardar en la computadora o compartir con supervisión.
            </p>
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar Respaldo Total (.JSON)
            </button>
          </div>

          {/* Excel / CSV section */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              Exportación de Reportes a Planilla (Excel / Calc)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleExportSchoolsCsv}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition border border-slate-300 flex flex-col items-center gap-1 text-center"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>140 Escuelas (.CSV)</span>
              </button>
              <button
                type="button"
                onClick={handleExportStaffCsv}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition border border-slate-300 flex flex-col items-center gap-1 text-center"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                <span>Auxiliares (.CSV)</span>
              </button>
              <button
                type="button"
                onClick={handleExportBitacoraCsv}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition border border-slate-300 flex flex-col items-center gap-1 text-center"
              >
                <History className="w-4 h-4 text-purple-600" />
                <span>Bitácora (.CSV)</span>
              </button>
            </div>
          </div>

          {/* Restore Backup */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              Restaurar Respaldo
            </h3>
            <p className="text-xs text-slate-600">
              Carga un archivo de respaldo previo para sincronizar datos tomados en otra computadora o celular.
            </p>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              Seleccionar Archivo de Respaldo (.JSON)
            </button>
          </div>

          {/* Factory Reset */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restablecer datos de fábrica (140 escuelas)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { DatabaseState, downloadJsonBackup, downloadSchoolsCsv, downloadStaffCsv, downloadActivityLogsCsv } from '../services/storage';
import { X, Download, Upload, FileSpreadsheet, ShieldCheck, AlertTriangle, History } from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  databaseState: DatabaseState;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  databaseState
}) => {

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

          {/* Carga masiva: solo por el servidor (FR-032) */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              Cargar datos
            </h3>
            <p className="text-xs text-slate-600">
              El legajo vive en el servidor y lo comparte todo el equipo. La carga masiva de datos (por ejemplo desde planillas) la hace la administradora con el comando de importación del servidor; desde la app no se reemplaza el legajo.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-end">
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

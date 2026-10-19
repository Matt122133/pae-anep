import React, { useState } from 'react';
import { School } from '../types';
import { useEquipo } from '../services/equipo';
import { 
  UtensilsCrossed, 
  Building2, 
  LayoutDashboard, 
  Search, 
  FileSpreadsheet, 
  ShieldAlert, 
  Plus, 
  X, 
  Menu,
  Calendar,
  ChevronRight,
  UserCheck,
  ChevronDown,
  Sparkles,
  History,
  Wifi,
  WifiOff,
  CloudUpload,
  RefreshCw,
  Download,
  Smartphone,
  LogOut
} from 'lucide-react';

interface NavbarProps {
  currentView: 'dashboard' | 'schools' | 'school-detail';
  onNavigate: (view: 'dashboard' | 'schools') => void;
  onNavigateToCalendar?: () => void;
  onNavigateToBitacora?: () => void;
  schools: School[];
  onSelectSchool: (school: School) => void;
  onOpenExportModal: () => void;
  onOpenNewSchoolModal: () => void;
  totalAlerts: number;
  activityLogsCount?: number;
  activeUserId?: string;
  /** Nombre de la cuenta con sesión (el selector de usuaria ya no existe, FR-025). */
  nombreSesion?: string;
  onCerrarSesion?: () => void;
  isOnline?: boolean;
  /** Borradores "no enviados" guardados en este dispositivo (FR-028). */
  borradoresCount?: number;
  onOpenBorradores?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onNavigateToCalendar,
  onNavigateToBitacora,
  schools,
  onSelectSchool,
  onOpenExportModal,
  onOpenNewSchoolModal,
  totalAlerts,
  activityLogsCount = 0,
  activeUserId = '',
  nombreSesion = '',
  onCerrarSesion,
  isOnline = true,
  borradoresCount = 0,
  onOpenBorradores
}) => {
  const equipo = useEquipo();
  const [quickSearch, setQuickSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileSearchInput, setShowMobileSearchInput] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const activeUser = equipo.find(m => m.id === activeUserId) || {
    id: activeUserId, name: nombreSesion || 'Sesión', role: '', shortName: nombreSesion || 'Sesión',
    avatarColor: 'bg-emerald-600 text-white',
  };
  const iniciales = (nombre: string) => nombre.split(' ').map(n => n[0]).slice(0, 2).join('');

  const searchResults = quickSearch.trim()
    ? schools.filter(s => 
        s.number.toString().includes(quickSearch.trim()) ||
        s.name.toLowerCase().includes(quickSearch.toLowerCase()) ||
        s.address.toLowerCase().includes(quickSearch.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleSelectFromSearch = (school: School) => {
    onSelectSchool(school);
    setQuickSearch('');
    setIsSearchOpen(false);
    setShowMobileSearchInput(false);
  };

  const cerrarSesion = () => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    onCerrarSesion?.();
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          
          {/* Logo and App Title */}
          <div 
            onClick={() => {
              onNavigate('dashboard');
              setShowMobileSearchInput(false);
            }}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-900/30 group-hover:scale-105 transition shrink-0">
              <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-white group-hover:text-emerald-400 transition truncate">
                  Legajo Escolar
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider bg-emerald-500/30 text-emerald-300 px-1 py-0.2 rounded">
                  PAE
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 leading-none hidden sm:block truncate">
                Tacuarembó • Cocinas & Visitas
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                currentView === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Panel General
            </button>

            <button
              onClick={() => onNavigate('schools')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                currentView === 'schools' || currentView === 'school-detail'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              {schools.length} Escuelas
            </button>

            {onNavigateToCalendar && (
              <button
                onClick={onNavigateToCalendar}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-sky-400" />
                Calendario
              </button>
            )}

            {onNavigateToBitacora && (
              <button
                onClick={onNavigateToBitacora}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-2"
              >
                <History className="w-4 h-4 text-emerald-400" />
                <span>Bitácora</span>
                {activityLogsCount > 0 && (
                  <span className="text-[10px] bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded-full font-bold">
                    {activityLogsCount}
                  </span>
                )}
              </button>
            )}
          </nav>

          {/* Quick Search Jump to School (Desktop) */}
          <div className="relative flex-1 max-w-xs hidden lg:block">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quickSearch}
                onChange={e => {
                  setQuickSearch(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Buscar N° (ej: 14) o nombre..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {quickSearch && (
                <button
                  onClick={() => {
                    setQuickSearch('');
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick search popup results */}
            {isSearchOpen && quickSearch.trim() && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 text-xs">
                {searchResults.length > 0 ? (
                  <div className="divide-y divide-slate-700/60 max-h-60 overflow-y-auto">
                    {searchResults.map(s => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectFromSearch(s)}
                        className="p-2.5 hover:bg-slate-700/80 cursor-pointer transition flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-white">Escuela N° {s.number}</span>
                          <span className="text-slate-400 block text-[11px] truncate">{s.name}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                          {s.totalVisits} visitas
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-slate-400 text-center">
                    No se encontró escuela con "{quickSearch}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setShowMobileSearchInput(!showMobileSearchInput)}
              className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Buscar escuela"
              aria-label="Buscar escuela"
            >
              <Search className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Borradores "no enviados": cuentan lo que el servidor NO confirmó (FR-028) */}
            {borradoresCount > 0 && onOpenBorradores && (
              <button
                type="button"
                onClick={onOpenBorradores}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-400/50 rounded-xl text-xs font-bold transition"
                title={`${borradoresCount} guardado(s) que no llegaron al servidor. Tocá para reenviar.`}
              >
                <CloudUpload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 shrink-0" />
                <span className="font-extrabold text-[11px] sm:text-xs text-amber-100">{borradoresCount}</span>
                <span className="hidden sm:inline text-[11px] text-amber-200 font-semibold">no enviado{borradoresCount > 1 ? 's' : ''}</span>
              </button>
            )}

            {/* Estado real de la conexión del navegador */}
            {!isOnline && (
              <span
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold border bg-amber-950/60 text-amber-200 border-amber-500/60 shrink-0"
                title="Sin conexión. Lo que guardes queda como borrador no enviado."
              >
                <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] text-amber-300 font-black">Sin conexión</span>
              </span>
            )}

            {totalAlerts > 0 && (
              <button
                onClick={() => onNavigate('schools')}
                className="flex items-center gap-1 px-2 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold hover:bg-rose-500/30 transition"
                title={`${totalAlerts} alertas activas`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[11px] sm:text-xs">{totalAlerts}</span>
                <span className="hidden sm:inline text-xs">alertas</span>
              </button>
            )}

            <button
              onClick={onOpenExportModal}
              className="hidden sm:flex p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition items-center gap-1 border border-slate-700"
              title="Respaldo y Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Respaldo / Excel</span>
            </button>

            {/* Cuenta con sesión */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition"
                title="Sesión iniciada"
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${activeUser.avatarColor}`}>
                  {iniciales(activeUser.name)}
                </div>
                <span className="hidden xl:inline truncate max-w-[130px]">{activeUser.name}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden z-50 text-xs py-1.5">
                  <div className="px-3 py-2 border-b border-slate-700/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sesión iniciada</span>
                    <span className="font-bold block text-slate-100">{activeUser.name}</span>
                    {activeUser.role && <span className="text-[10px] text-slate-400 block">{activeUser.role}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={cerrarSesion}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 text-rose-300 hover:bg-slate-700/70 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-bold">Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onOpenNewSchoolModal}
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Escuela</span>
              <span className="sm:hidden text-xs">Escuela</span>
            </button>

            {/* Mobile burger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              aria-label="Menú principal"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Expandable Search Bar */}
        {showMobileSearchInput && (
          <div className="lg:hidden pb-3 pt-1 border-t border-slate-800/80 relative">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={quickSearch}
                onChange={e => setQuickSearch(e.target.value)}
                placeholder="Buscar por N° (ej: 42), nombre..."
                className="w-full pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {quickSearch && (
                <button
                  onClick={() => setQuickSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {quickSearch.trim() && (
              <div className="mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-xs max-h-52 overflow-y-auto divide-y divide-slate-700/60">
                {searchResults.length > 0 ? (
                  searchResults.map(s => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectFromSearch(s)}
                      className="p-3 hover:bg-slate-700/80 cursor-pointer transition flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-white text-sm">Escuela N° {s.number}</span>
                        <span className="text-slate-300 block text-xs truncate">{s.name} ({s.zone})</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-slate-400 text-center">
                    No se encontró escuela con "{quickSearch}"
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-800 space-y-1 animate-in fade-in">
            <button
              onClick={() => {
                onNavigate('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
                currentView === 'dashboard' ? 'bg-emerald-600/30 text-emerald-300' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span>Panel General</span>
            </button>

            <button
              onClick={() => {
                onNavigate('schools');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition ${
                currentView === 'schools' ? 'bg-emerald-600/30 text-emerald-300' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Directorio de {schools.length} Escuelas</span>
            </button>

            {onNavigateToCalendar && (
              <button
                onClick={() => {
                  onNavigateToCalendar();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-slate-300 hover:bg-slate-800 transition"
              >
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>Calendario de Visitas</span>
              </button>
            )}

            {onNavigateToBitacora && (
              <button
                onClick={() => {
                  onNavigateToBitacora();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-slate-300 hover:bg-slate-800 transition"
              >
                <History className="w-4 h-4 text-emerald-400" />
                <span>Bitácora de Actividad</span>
                {activityLogsCount > 0 && (
                  <span className="text-[10px] bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded-full font-bold ml-auto">
                    {activityLogsCount}
                  </span>
                )}
              </button>
            )}

            {onOpenBorradores && (
              <button
                onClick={() => {
                  onOpenBorradores();
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                  borradoresCount > 0
                    ? 'bg-amber-950/40 text-amber-300 border border-amber-500/40'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isOnline ? <CloudUpload className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
                  <span>No enviados</span>
                </div>
                {borradoresCount > 0 && (
                  <span className="text-[10px] bg-amber-500 text-slate-900 px-1.5 py-0.2 rounded-full font-black">{borradoresCount}</span>
                )}
              </button>
            )}

            <button
              onClick={() => {
                onOpenExportModal();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-slate-300 hover:bg-slate-800 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Descargar Respaldo / Excel</span>
            </button>

            <button
              onClick={() => {
                onOpenNewSchoolModal();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-emerald-400 hover:bg-slate-800 transition"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>+ Registrar Nueva Escuela</span>
            </button>

            {/* Cuenta con sesión (móvil) */}
            <div className="pt-2 border-t border-slate-800 mt-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-2 mb-1.5">Sesión iniciada</span>
              <div className="px-2.5 py-2 flex items-center gap-2 text-xs text-slate-200">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${activeUser.avatarColor}`}>
                  {iniciales(activeUser.name)}
                </div>
                <span className="font-bold">{activeUser.name}</span>
              </div>
              <button
                type="button"
                onClick={cerrarSesion}
                className="w-full text-left px-2.5 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-300 hover:bg-slate-800 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </header>
  );
};

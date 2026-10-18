import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Apple, 
  Share2, 
  PlusSquare, 
  CheckCircle2, 
  X, 
  WifiOff, 
  Zap, 
  ShieldCheck, 
  ExternalLink,
  Laptop
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isTablet, isDesktop, install, platformName } = usePWAInstall();
  
  // Default to detected device tab
  const getInitialTab = (): 'android' | 'ios' | 'pc' | 'tablet' => {
    if (isIOS) return 'ios';
    if (isAndroid && !isTablet) return 'android';
    if (isTablet) return 'tablet';
    return 'pc';
  };

  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'pc' | 'tablet'>(getInitialTab());
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    setIsInstalling(true);
    const success = await install();
    setIsInstalling(false);
    if (success) {
      setInstalledSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with App Branding */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 sm:p-6 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 sm:gap-4 pr-10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-1 flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0 border border-white/20 overflow-hidden">
              <img 
                src="/icon.svg" 
                alt="Legajo PAE" 
                className="w-full h-full object-contain drop-shadow"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider mb-1 border border-emerald-500/30">
                <Smartphone className="w-3 h-3" />
                <span>Aplicación Multiplataforma (PWA)</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
                Instalar Legajo Escolar PAE
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Disponible para Android, iPhone, iPad, Tablets y PC / Mac
              </p>
            </div>
          </div>

          {/* Quick status bar */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Dispositivo detectado: <strong className="text-white">{platformName}</strong>
            </span>
            {isInstalled ? (
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Instalada
              </span>
            ) : (
              <span className="text-slate-400">Lista para instalar</span>
            )}
          </div>
        </div>

        {/* Device Switcher Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 sm:px-6 pt-2 gap-1 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-2 py-2.5 px-3.5 rounded-t-xl text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'android'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Android (Teléfono)</span>
            {isAndroid && !isTablet && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex items-center gap-2 py-2.5 px-3.5 rounded-t-xl text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'ios'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Apple className="w-4 h-4 text-slate-800" />
            <span>iPhone / iPad (iOS)</span>
            {isIOS && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tablet')}
            className={`flex items-center gap-2 py-2.5 px-3.5 rounded-t-xl text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'tablet'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Tablet className="w-4 h-4 text-teal-600" />
            <span>Tablets</span>
            {isTablet && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pc')}
            className={`flex items-center gap-2 py-2.5 px-3.5 rounded-t-xl text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'pc'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Monitor className="w-4 h-4 text-blue-600" />
            <span>PC / Notebook</span>
            {isDesktop && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Direct 1-Click Install Button when browser supports it */}
          {isInstallable && !isInstalled && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold text-sm">
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Instalación Automática con 1 Clic</span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1">
                    Tu navegador permite instalar la aplicación directamente en la pantalla de inicio o escritorio sin descargas de tiendas externas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  disabled={isInstalling}
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstalling ? 'Instalando...' : 'Instalar en este Dispositivo'}</span>
                </button>
              </div>
            </div>
          )}

          {installedSuccess && (
            <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-900 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-extrabold text-sm">¡Aplicación instalada con éxito!</h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Ya puedes abrir Legajo Escolar PAE desde tu pantalla de inicio o menú de aplicaciones.
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: Android Instructions */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Cómo instalar en Teléfonos Android (Samsung, Xiaomi, Motorola, etc.)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm mb-2.5">
                    1
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">Abre en Chrome</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Abre el enlace de la aplicación en el navegador Google Chrome.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm mb-2.5">
                    2
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">Toca el Menú (⋮)</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Toca los 3 puntos verticales en la esquina superior derecha del navegador.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm mb-2.5">
                    3
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">"Instalar aplicación"</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla principal"</strong>.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Ventaja en terreno:</strong> La aplicación funcionará sin conexión a internet en escuelas rurales alejadas. Al volver a la ciudad, sincronizarás tus visitas con 1 toque.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: iOS Instructions */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
                <Apple className="w-4 h-4 text-slate-800" />
                <span>Cómo instalar en iPhone o iPad (iOS / iPadOS)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm mb-2.5">
                    1
                  </div>
                  <div className="p-2 bg-slate-200 rounded-xl mb-1 text-slate-800">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">Botón Compartir</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    En <strong>Safari</strong>, toca el ícono de <strong>Compartir</strong> (rectángulo con flecha hacia arriba) en la barra inferior.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm mb-2.5">
                    2
                  </div>
                  <div className="p-2 bg-slate-200 rounded-xl mb-1 text-slate-800">
                    <PlusSquare className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">Agregar a inicio</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Desliza hacia abajo y pulsa en <strong>"Agregar a pantalla de inicio"</strong>.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm mb-2.5">
                    3
                  </div>
                  <div className="p-2 bg-slate-200 rounded-xl mb-1 text-slate-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">Toca "Agregar"</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Confirma arriba a la derecha. La app se abrirá en pantalla completa como una app nativa de iOS.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                <span className="font-bold text-base leading-none">⚠️</span>
                <span>
                  <strong>Nota para usuarios de Apple:</strong> En iOS es necesario usar el navegador <strong>Safari</strong> para realizar la instalación inicial a la pantalla de inicio.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: Tablets */}
          {activeTab === 'tablet' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
                <Tablet className="w-4 h-4 text-teal-600" />
                <span>Uso e Instalación en Tablets (iPad, Galaxy Tab, Lenovo, Plan Ceibal)</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                  <Tablet className="w-4 h-4 text-teal-600" />
                  <span>Experiencia optimizada para tablets y laptops de campo</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  La interfaz de Legajo Escolar PAE se adapta dinámicamente a pantallas táctiles de 8" a 13":
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div className="flex items-start gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Modo Horizontal/Vertical:</strong> Diseñado para sostener con una mano mientras se inspecciona la cocina.</span>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Teclado táctil adaptado:</strong> Formularios ágiles con números grandes para conteo de comensales y remitos.</span>
                  </div>
                </div>
                <div className="pt-2 text-xs text-slate-500">
                  Para instalar en tablet Android: usa el menú de Chrome (⋮) &gt; "Instalar app". En iPad: usa Safari &gt; Compartir &gt; "Agregar a pantalla de inicio".
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PC / Notebook */}
          {activeTab === 'pc' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
                <Laptop className="w-4 h-4 text-blue-600" />
                <span>Cómo instalar en PC o Notebook (Windows, macOS o Linux)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col">
                  <div className="flex items-center gap-2 mb-2 font-bold text-xs text-slate-900">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs">A</span>
                    <span>Ícono en la barra de direcciones</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    En <strong>Google Chrome</strong> o <strong>Microsoft Edge</strong>, mira el extremo derecho de la barra de direcciones donde escribes la URL:
                  </p>
                  <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center gap-2 text-xs font-bold text-slate-800">
                    <Monitor className="w-4 h-4 text-blue-600" />
                    <span>Haz clic en "Instalar Legajo PAE" (ícono ⨁ o pantalla)</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col">
                  <div className="flex items-center gap-2 mb-2 font-bold text-xs text-slate-900">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs">B</span>
                    <span>Menú de herramientas</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Haz clic en el menú (⋮) de Chrome o Edge &gt; <strong>"Guardar y compartir"</strong> o <strong>"Instalar Legajo Escolar"</strong>.
                  </p>
                  <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-center gap-2 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Crea ventana propia independiente del navegador</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* App Key Capabilities Grid */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              Beneficios de tener la App instalada:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">100% Offline</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Funciona en escuelas rurales sin señal móvil ni Wi-Fi.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">Carga Instantánea</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Apertura en &lt; 1 seg directa desde el ícono de la pantalla.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">Datos Seguros</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Auditoría completa de visitas, auxiliares y remitos.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            PAE Tacuarembó • Versión PWA Móvil y Escritorio
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

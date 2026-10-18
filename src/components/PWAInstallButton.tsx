import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'navbar' | 'compact' | 'mobile-nav' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '', 
  variant = 'navbar' 
}) => {
  const { isInstallable, isInstalled, install, platformName } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setModalOpen(true);
      }
    } else {
      setModalOpen(true);
    }
  };

  // If already installed and running standalone
  if (isInstalled && variant !== 'navbar') {
    return null;
  }

  if (isInstalled && variant === 'navbar') {
    return (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition cursor-pointer ${className}`}
          title="App instalada en tu dispositivo"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden xl:inline">App Instalada</span>
          <span className="xl:hidden">PWA</span>
        </button>
        <PWAInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`p-2 rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-sm cursor-pointer flex items-center justify-center ${className}`}
          title={`Instalar en ${platformName}`}
          aria-label="Instalar app"
        >
          <Download className="w-4 h-4" />
        </button>
        <PWAInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  if (variant === 'mobile-nav') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-emerald-400 hover:text-emerald-300 transition ${className}`}
        >
          <div className="relative">
            <Smartphone className="w-5 h-5 animate-bounce" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
          </div>
          <span className="text-[10px] mt-1 leading-none font-bold">Instalar</span>
        </button>
        <PWAInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  // Default: navbar style
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-sm shadow-emerald-900/30 transition cursor-pointer active:scale-95 animate-pulse hover:animate-none ${className}`}
        title={`Instalar Legajo PAE en ${platformName} (Android, iOS, PC, Tablet)`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">App</span>
      </button>
      <PWAInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

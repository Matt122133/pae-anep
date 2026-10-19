import React, { useState } from 'react';
import { LogIn, Loader2, ShieldCheck } from 'lucide-react';
import { ErrorApi, pedir } from '../services/api';
import { guardarSesion, Sesion } from '../services/sesion';

interface LoginProps {
  onIngreso: (s: Sesion) => void;
  /** Aviso a mostrar al llegar (p. ej. "tu sesión venció"). */
  aviso?: string;
}

// Pantalla de ingreso (FR-025). Mobile-first: se usa de pie, en el celular.
// Un único mensaje de error para usuario o contraseña incorrectos: el servidor
// no distingue (FR-005) y la pantalla tampoco.
export function Login({ onIngreso, aviso }: LoginProps) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingresar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !contrasena) {
      setError('Completá usuario y contraseña.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const s = await pedir<Sesion>('/auth/ingresar', {
        metodo: 'POST',
        cuerpo: { usuario: usuario.trim(), contrasena },
        token: null,
      });
      guardarSesion(s);
      onIngreso(s);
    } catch (err) {
      if (err instanceof ErrorApi && err.estado === 401) {
        setError('Usuario o contraseña incorrectos.');
      } else if (err instanceof ErrorApi && err.tipo === 'red') {
        setError('No hay conexión con el servidor. Para ingresar hace falta señal.');
      } else {
        setError('No se pudo ingresar. Probá de nuevo en un momento.');
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form
        onSubmit={ingresar}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-5"
        noValidate
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 leading-tight">Legajo PAE</h1>
            <p className="text-xs text-slate-500">Equipo técnico · PAE Tacuarembó</p>
          </div>
        </div>

        {aviso && (
          <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">{aviso}</p>
        )}

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Usuario</span>
          <input
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl py-3 text-base transition"
        >
          {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>

        <p className="text-xs text-slate-500 text-center">
          ¿Olvidaste la contraseña? Pedile a la administradora que la resetee.
        </p>
      </form>
    </div>
  );
}

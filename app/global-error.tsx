'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="text-center space-y-4 max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
          <h2 className="text-2xl font-bold text-rose-400">Error Global de Aplicación</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Ha ocurrido un inconveniente temporal en el servidor de la aplicación.
          </p>
          {error.digest && (
            <p className="text-xs text-slate-400">
              Código de referencia: <span className="font-mono">{error.digest}</span>
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Reintentar Carga
          </button>
        </div>
      </body>
    </html>
  );
}

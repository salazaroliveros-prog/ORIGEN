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
      <body className="flex min-h-screen items-center justify-center bg-slate-950 p-4 font-sans text-slate-100">
        <div className="max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
          <h2 className="text-2xl font-bold text-rose-400">Error Global de Aplicación</h2>
          <p className="text-xs leading-relaxed text-slate-400">
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
            className="cursor-pointer rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
          >
            Reintentar Carga
          </button>
        </div>
      </body>
    </html>
  );
}

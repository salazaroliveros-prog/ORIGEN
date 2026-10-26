'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App runtime error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 text-slate-100">
      <div className="max-w-md space-y-4 rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center shadow-xl">
        <h2 className="text-2xl font-bold text-rose-400">Error en la Aplicación</h2>
        <p className="text-sm text-slate-300">
          Ocurrió un problema inesperado al procesar la vista.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400">
            Código de referencia: <span className="font-mono">{error.digest}</span>
          </p>
        )}
        <button
          type="button"
          onClick={() => reset()}
          className="cursor-pointer rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-600"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

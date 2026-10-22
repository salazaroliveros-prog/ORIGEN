'use client';

import React from 'react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-100 p-4">
        <div className="text-center space-y-4 max-w-md bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-2xl font-bold text-rose-400">Error Crítico</h2>
          <p className="text-sm text-slate-300">
            Error al inicializar la estructura raíz del sistema.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition cursor-pointer"
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}

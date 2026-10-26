import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 text-slate-100">
      <div className="max-w-md space-y-4 rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center shadow-xl">
        <h2 className="text-4xl font-extrabold text-amber-400">404</h2>
        <h3 className="text-xl font-bold text-white">Página No Encontrada</h3>
        <p className="text-sm text-slate-300">
          La ruta solicitada no existe o no está disponible en ConstructERP Guatemala.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            Regresar al Tablero de Control
          </Link>
        </div>
      </div>
    </div>
  );
}

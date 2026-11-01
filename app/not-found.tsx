import React from 'react';
import Link from 'next/link';
import { ErrorState } from '@/components/ui/ErrorState';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
      <ErrorState
        title="404 · Página no encontrada"
        description="La ruta solicitada no existe o no está disponible en ConstructERP Guatemala."
        actions={
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/40 hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          >
            Regresar al tablero
          </Link>
        }
      />
    </div>
  );
}

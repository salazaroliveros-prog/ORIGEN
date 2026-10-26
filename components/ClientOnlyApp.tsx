'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const MainApp = dynamic(() => import('./MainApp'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
        <p className="text-sm font-medium">Cargando ConstructERP Guatemala...</p>
      </div>
    </div>
  ),
});

export function ClientOnlyApp() {
  return <MainApp />;
}

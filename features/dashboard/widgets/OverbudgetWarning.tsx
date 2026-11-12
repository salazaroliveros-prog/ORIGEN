'use client';

import React, { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { DashboardTotals } from '../types';

interface OverbudgetWarningProps {
  totals: DashboardTotals;
}

const OverbudgetWarningComponent = memo(function OverbudgetWarningComponent({ totals }: OverbudgetWarningProps) {
  if (totals.overbudgetCount === 0) return null;

  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-rose-800 bg-rose-950/60 p-4 text-rose-200 shadow-lg md:flex-row md:items-center" role="alert">
      <div className="flex items-center gap-3">
        <span className="shrink-0 rounded-xl border border-rose-700 bg-rose-900/80 p-2 text-rose-300" aria-hidden="true">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
            Atención Contable: {totals.overbudgetCount} proyecto(s) han excedido su límite financiero
          </h4>
          <p className="mt-0.5 text-xs text-rose-300">
            Proyectos afectados:{' '}
            <strong>
              {totals.overbudgetProjects.map((p) => `${p.name} (${p.code || p.id})`).join(', ')}
            </strong>
          </p>
        </div>
      </div>
      <span className="shrink-0 rounded-xl border border-rose-700 bg-rose-900 px-3 py-1 font-mono text-xs font-bold text-rose-100">
        Revisar APU y Solicitudes
      </span>
    </div>
  );
});

export const OverbudgetWarning = memo(OverbudgetWarningComponent);
OverbudgetWarning.displayName = 'OverbudgetWarning';
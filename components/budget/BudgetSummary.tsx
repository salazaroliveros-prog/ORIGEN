'use client';

import React from 'react';
import { APUItem } from '@/lib/types';
import { calculateBudgetSummary } from '@/lib/utils/calculations';
import { useMemo } from 'react';

interface BudgetSummaryProps {
  apuItems: APUItem[];
  totalSpent: number;
  onViewDetails?: () => void;
}

/**
 * Budget Summary Component (Refactored Sub-Component)
 * Shows budget overview, utilization, and variance
 *
 * Part of the refactored BudgetAndAPU component
 * This is extracted to keep components <500 LOC
 */
export const BudgetSummary = React.memo<BudgetSummaryProps>(
  ({ apuItems, totalSpent, onViewDetails }) => {
    const budgetSummary = useMemo(
      () => calculateBudgetSummary(apuItems, totalSpent),
      [apuItems, totalSpent]
    );

    const isOverBudget = budgetSummary.variance > 0;
    const utilizationPercent = Math.round(budgetSummary.utilization);

    return (
      <div className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Resumen de Presupuesto</h3>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              isOverBudget ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}
          >
            {isOverBudget ? 'Sobregasto' : 'Dentro de presupuesto'}
          </span>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Budget Total */}
          <div className="rounded-lg bg-slate-800/50 p-4">
            <p className="text-xs text-slate-400">Presupuesto Total</p>
            <p className="mt-2 text-xl font-bold text-white">
              Q{budgetSummary.budgetTotal.toLocaleString('es-GT', { maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Spent */}
          <div className="rounded-lg bg-slate-800/50 p-4">
            <p className="text-xs text-slate-400">Gastado</p>
            <p className="mt-2 text-xl font-bold text-white">
              Q{budgetSummary.spentTotal.toLocaleString('es-GT', { maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Remaining */}
          <div className="rounded-lg bg-slate-800/50 p-4">
            <p className="text-xs text-slate-400">Disponible</p>
            <p
              className={`mt-2 text-xl font-bold ${
                budgetSummary.remaining >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              Q{budgetSummary.remaining.toLocaleString('es-GT', { maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Utilization */}
          <div className="rounded-lg bg-slate-800/50 p-4">
            <p className="text-xs text-slate-400">Utilización</p>
            <p className="mt-2 text-xl font-bold text-white">{utilizationPercent}%</p>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Progreso de gasto</span>
            <span className="font-semibold text-white">{utilizationPercent}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-opacity transition-transform ${
                isOverBudget ? 'bg-red-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
              role="progressbar"
              aria-valuenow={utilizationPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Variance */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs text-amber-200">
            {isOverBudget
              ? `Sobregasto: Q${Math.abs(budgetSummary.variance).toLocaleString('es-GT', {
                  maximumFractionDigits: 2,
                })}`
              : `Bajo presupuesto: Q${budgetSummary.remaining.toLocaleString('es-GT', {
                  maximumFractionDigits: 2,
                })}`}
          </p>
        </div>

        {/* Action Button */}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="w-full rounded-lg bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-300 transition-colors hover:bg-sky-500/30"
          >
            Ver detalles completos
          </button>
        )}
      </div>
    );
  }
);

BudgetSummary.displayName = 'BudgetSummary';

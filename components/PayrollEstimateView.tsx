'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Printer, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { formatGTQ } from '@/lib/data';
import {
  calculateEstimateRow,
  sumEstimateTotals,
  summarizeAttendanceForPeriod,
  type PayrollEstimateRates,
} from '@/lib/domain/payrollEstimate';
import { toast } from 'react-hot-toast';
import type { AttendanceRecord, CompanySettings, Employee } from '@/lib/types';

interface PayrollEstimateViewProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  company: CompanySettings;
  onSaveRates?: (settings: Partial<CompanySettings>) => Promise<boolean>;
}

const DEFAULT_RATES: PayrollEstimateRates = {
  employeeDeductionPercent: 4.83,
  employerCostPercent: 12.67,
  incentiveBonusGTQ: 250,
};

/** Mezcla los parámetros guardados con los valores por defecto (datos legacy/parciales). */
function resolveRates(stored?: Partial<PayrollEstimateRates>): PayrollEstimateRates {
  return {
    employeeDeductionPercent:
      stored?.employeeDeductionPercent ?? DEFAULT_RATES.employeeDeductionPercent,
    employerCostPercent: stored?.employerCostPercent ?? DEFAULT_RATES.employerCostPercent,
    incentiveBonusGTQ: stored?.incentiveBonusGTQ ?? DEFAULT_RATES.incentiveBonusGTQ,
  };
}

function csvValue(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function PayrollEstimateView({
  employees,
  attendance,
  company,
  onSaveRates,
}: PayrollEstimateViewProps) {
  const [period, setPeriod] = useState(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' }).slice(0, 7)
  );
  const [daysOverride, setDaysOverride] = useState<Record<string, number>>({});
  const [rates, setRates] = useState<PayrollEstimateRates>(() =>
    resolveRates(company.payrollEstimateRates)
  );
  const [isSavingRates, setIsSavingRates] = useState(false);

  useEffect(() => {
    setRates(resolveRates(company.payrollEstimateRates));
  }, [company.payrollEstimateRates]);

  // Los ajustes manuales de días son de un período concreto: al cambiarlo se
  // descartan para no arrastrar una planilla inflada del mes anterior.
  useEffect(() => {
    setDaysOverride({});
  }, [period]);

  const attendanceSummary = useMemo(
    () => summarizeAttendanceForPeriod(attendance, period),
    [attendance, period]
  );

  const estimates = useMemo(
    () =>
      employees.map((employee) => {
        const summary = attendanceSummary.get(employee.id);
        const days = daysOverride[employee.id] ?? summary?.days ?? 0;
        // Las horas extra se registran en asistencia y deben pagarse; antes se
        // ignoraban y la planilla salía subestimada.
        const overtimeHours = summary?.overtimeHours ?? 0;
        const row = calculateEstimateRow({ employee, days, overtimeHours, rates });
        return { employee, ...row };
      }),
    [employees, daysOverride, attendanceSummary, rates]
  );

  const totals = useMemo(() => sumEstimateTotals(estimates), [estimates]);

  const handleSaveRates = async () => {
    if (
      !Number.isFinite(rates.employeeDeductionPercent) ||
      !Number.isFinite(rates.employerCostPercent) ||
      !Number.isFinite(rates.incentiveBonusGTQ) ||
      rates.employeeDeductionPercent < 0 ||
      rates.employeeDeductionPercent > 100 ||
      rates.employerCostPercent < 0 ||
      rates.employerCostPercent > 100 ||
      rates.incentiveBonusGTQ < 0 ||
      rates.incentiveBonusGTQ > 1_000_000_000
    ) {
      toast.error('Revisa los parámetros: deben ser valores válidos y no negativos.');
      return;
    }
    if (!onSaveRates) return;
    setIsSavingRates(true);
    try {
      const saved = await onSaveRates({ payrollEstimateRates: rates });
      if (!saved) throw new Error('No fue posible guardar los parámetros.');
      toast.success('Parámetros de estimación guardados.');
    } catch (error) {
      console.error('No se pudieron guardar los parámetros de planilla:', error);
      toast.error(
        error instanceof Error ? error.message : 'No se pudieron guardar los parámetros.'
      );
    } finally {
      setIsSavingRates(false);
    }
  };

  const exportCsv = () => {
    const headers = [
      'Colaborador',
      'Puesto',
      'Días estimados',
      'Horas extra',
      'Salario ordinario estimado',
      'Pago de horas extra',
      'Base IGSS',
      'Bono estimado',
      'Deducción de referencia',
      'Líquido estimado',
      'Costo patronal estimado',
      'Costo total estimado',
    ];
    const rows = estimates.map((row) =>
      [
        csvValue(row.employee.name),
        csvValue(row.employee.role),
        row.days,
        row.overtimeHours,
        row.ordinaryPay.toFixed(2),
        row.overtimeAmount.toFixed(2),
        row.igssBase.toFixed(2),
        row.incentive.toFixed(2),
        row.employeeDeduction.toFixed(2),
        row.netEstimate.toFixed(2),
        row.employerCost.toFixed(2),
        row.totalEmployerEstimate.toFixed(2),
      ].join(',')
    );
    const blob = new Blob(['\uFEFF', [headers.join(','), ...rows].join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estimacion-planilla-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full space-y-5">
      <PageHeader
        title="Estimación de planilla"
        subtitle="Proyección informativa basada en el personal y la asistencia registrados"
        logoUrl={company.logoUrl}
        companyName={company.companyName}
      />

      <div
        role="alert"
        className="flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100"
      >
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          <strong>Estimación no oficial.</strong> No sustituye una planilla revisada por contador o
          asesor laboral, no valida cumplimiento legal y no presenta declaraciones. Verifica tasas,
          bases y reglas vigentes antes de usar los montos.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-semibold text-slate-300">
          Período
          <input
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs font-semibold text-slate-300">
          Deducción referencial (%)
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={rates.employeeDeductionPercent}
            onChange={(event) =>
              setRates((old) => ({ ...old, employeeDeductionPercent: Number(event.target.value) }))
            }
            disabled={!onSaveRates}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-60"
          />
        </label>
        <label className="text-xs font-semibold text-slate-300">
          Costo patronal referencial (%)
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={rates.employerCostPercent}
            onChange={(event) =>
              setRates((old) => ({ ...old, employerCostPercent: Number(event.target.value) }))
            }
            disabled={!onSaveRates}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-60"
          />
        </label>
        <label className="text-xs font-semibold text-slate-300">
          Bono estimado (Q/mes)
          <input
            type="number"
            min="0"
            step="0.01"
            value={rates.incentiveBonusGTQ}
            onChange={(event) =>
              setRates((old) => ({ ...old, incentiveBonusGTQ: Number(event.target.value) }))
            }
            disabled={!onSaveRates}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-60"
          />
        </label>
        <div className="flex items-end gap-2">
          {onSaveRates && (
            <button
              type="button"
              onClick={() => void handleSaveRates()}
              disabled={isSavingRates}
              className="min-h-10 flex-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {isSavingRates ? 'Guardando…' : 'Guardar parámetros'}
            </button>
          )}
          <button
            type="button"
            onClick={exportCsv}
            className="min-h-10 rounded-xl border border-slate-600 px-3 text-white"
            aria-label="Exportar estimación a CSV"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-10 rounded-xl border border-slate-600 px-3 text-white"
            aria-label="Imprimir estimación"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary label="Líquido estimado" value={totals.net} />
        <Summary label="Horas extra" value={totals.overtime} />
        <Summary label="Costo patronal estimado" value={totals.employerCost} />
        <Summary label="Costo total estimado" value={totals.total} />
      </div>

      {employees.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
          No hay empleados registrados para calcular la estimación. Agrega el personal desde el
          módulo de Personal.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                {[
                  'Colaborador',
                  'Días del período',
                  'Horas extra',
                  'Salario base estimado',
                  'Pago horas extra',
                  'Bono estimado',
                  'Base IGSS',
                  'Deducción ref.',
                  'Líquido estimado',
                  'Costo empresa estimado',
                ].map((title) => (
                  <th key={title} className="p-3">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {estimates.map((row) => (
                <tr key={row.employee.id}>
                  <td className="p-3">
                    <strong>{row.employee.name}</strong>
                    <span className="block text-slate-400">{row.employee.role}</span>
                    {row.employee.overriddenIgssLaboral !== undefined && (
                      <span className="mt-1 inline-block rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                        IGSS manual
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <input
                      aria-label={`Días estimados de ${row.employee.name}`}
                      type="number"
                      min="0"
                      max="31"
                      value={row.days}
                      onChange={(event) =>
                        setDaysOverride((old) => ({
                          ...old,
                          [row.employee.id]: Math.max(0, Math.min(31, Number(event.target.value))),
                        }))
                      }
                      className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                    />
                    {attendanceSummary.has(row.employee.id) && (
                      <span className="ml-2 text-[10px] text-slate-500">asistencia</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="font-mono">{row.overtimeHours}h</span>
                    {row.overtimeHours === 0 && (
                      <span className="block text-[10px] text-slate-500">sin registro</span>
                    )}
                  </td>
                  <td className="p-3">{formatGTQ(row.ordinaryPay)}</td>
                  <td className="p-3">{formatGTQ(row.overtimeAmount)}</td>
                  <td className="p-3">{formatGTQ(row.incentive)}</td>
                  <td className="p-3 text-slate-400">{formatGTQ(row.igssBase)}</td>
                  <td className="p-3">{formatGTQ(row.employeeDeduction)}</td>
                  <td className="p-3 font-bold text-emerald-300">{formatGTQ(row.netEstimate)}</td>
                  <td className="p-3">{formatGTQ(row.totalEmployerEstimate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <p className="text-[11px] font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-xl font-black text-emerald-300">{formatGTQ(value)}</p>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Printer, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { formatGTQ } from '@/lib/data';
import { toast } from 'react-hot-toast';
import type { AttendanceRecord, CompanySettings, Employee } from '@/lib/types';

interface PayrollEstimateViewProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  company: CompanySettings;
  onSaveRates?: (settings: Partial<CompanySettings>) => Promise<boolean>;
}

const DEFAULT_RATES = {
  employeeDeductionPercent: 4.83,
  employerCostPercent: 12.67,
  incentiveBonusGTQ: 250,
};

function csvValue(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function PayrollEstimateView({
  employees,
  attendance,
  company,
  onSaveRates,
}: PayrollEstimateViewProps) {
  const [period, setPeriod] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' }).slice(0, 7));
  const [daysOverride, setDaysOverride] = useState<Record<string, number>>({});
  const [rates, setRates] = useState({ ...DEFAULT_RATES, ...company.payrollEstimateRates });
  const [isSavingRates, setIsSavingRates] = useState(false);

  useEffect(() => {
    if (company.payrollEstimateRates) setRates(company.payrollEstimateRates);
  }, [company.payrollEstimateRates]);

  const attendanceDays = useMemo(() => {
    const datesByEmployee = new Map<string, Set<string>>();
    for (const record of attendance) {
      if (record.date.startsWith(`${period}-`) && record.status === 'Presente') {
        const dates = datesByEmployee.get(record.employeeId) ?? new Set<string>();
        dates.add(record.date);
        datesByEmployee.set(record.employeeId, dates);
      }
    }
    return new Map([...datesByEmployee].map(([employeeId, dates]) => [employeeId, dates.size]));
  }, [attendance, period]);

  const estimates = useMemo(() => employees.map((employee) => {
    const days = daysOverride[employee.id] ?? attendanceDays.get(employee.id) ?? 0;
    const ordinaryPay = employee.dailyRateGTQ * days;
    const incentive = (rates.incentiveBonusGTQ * Math.min(days, 30)) / 30;
    const employeeDeduction = employee.igssAffiliated
      ? ordinaryPay * rates.employeeDeductionPercent / 100
      : 0;
    const employerCost = employee.igssAffiliated
      ? ordinaryPay * rates.employerCostPercent / 100
      : 0;
    return {
      employee,
      days,
      ordinaryPay,
      incentive,
      employeeDeduction,
      netEstimate: ordinaryPay + incentive - employeeDeduction,
      employerCost,
      totalEmployerEstimate: ordinaryPay + incentive + employerCost,
    };
  }), [employees, daysOverride, attendanceDays, rates]);

  const totals = estimates.reduce((sum, row) => ({
    ordinaryPay: sum.ordinaryPay + row.ordinaryPay,
    incentive: sum.incentive + row.incentive,
    deductions: sum.deductions + row.employeeDeduction,
    net: sum.net + row.netEstimate,
    employerCost: sum.employerCost + row.employerCost,
    total: sum.total + row.totalEmployerEstimate,
  }), { ordinaryPay: 0, incentive: 0, deductions: 0, net: 0, employerCost: 0, total: 0 });

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
      toast.error(error instanceof Error ? error.message : 'No se pudieron guardar los parámetros.');
    } finally {
      setIsSavingRates(false);
    }
  };

  const exportCsv = () => {
    const headers = ['Colaborador', 'Puesto', 'Días estimados', 'Salario ordinario estimado', 'Bono configurable estimado', 'Deducción de referencia', 'Líquido estimado', 'Costo patronal estimado', 'Costo total estimado'];
    const rows = estimates.map((row) => [
      csvValue(row.employee.name),
      csvValue(row.employee.role),
      row.days,
      row.ordinaryPay.toFixed(2),
      row.incentive.toFixed(2),
      row.employeeDeduction.toFixed(2),
      row.netEstimate.toFixed(2),
      row.employerCost.toFixed(2),
      row.totalEmployerEstimate.toFixed(2),
    ].join(','));
    const blob = new Blob(['\uFEFF', [headers.join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
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

      <div role="alert" className="flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          <strong>Estimación no oficial.</strong> No sustituye una planilla revisada por contador o asesor laboral,
          no valida cumplimiento legal y no presenta declaraciones. Verifica tasas, bases y reglas vigentes antes de usar los montos.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-semibold text-slate-300">
          Período
          <input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
        </label>
        <label className="text-xs font-semibold text-slate-300">
          Deducción referencial (%)
          <input type="number" min="0" max="100" step="0.01" value={rates.employeeDeductionPercent} onChange={(event) => setRates((old) => ({ ...old, employeeDeductionPercent: Number(event.target.value) }))} disabled={!onSaveRates} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-60" />
        </label>
        <label className="text-xs font-semibold text-slate-300">
          Costo patronal referencial (%)
          <input type="number" min="0" max="100" step="0.01" value={rates.employerCostPercent} onChange={(event) => setRates((old) => ({ ...old, employerCostPercent: Number(event.target.value) }))} disabled={!onSaveRates} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-60" />
        </label>
        <label className="text-xs font-semibold text-slate-300">
          Bono estimado (Q/mes)
          <input type="number" min="0" step="0.01" value={rates.incentiveBonusGTQ} onChange={(event) => setRates((old) => ({ ...old, incentiveBonusGTQ: Number(event.target.value) }))} disabled={!onSaveRates} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-60" />
        </label>
        <div className="flex items-end gap-2">
          {onSaveRates && <button type="button" onClick={() => void handleSaveRates()} disabled={isSavingRates} className="min-h-10 flex-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
            {isSavingRates ? 'Guardando...' : 'Guardar parámetros'}
          </button>}
          <button type="button" onClick={exportCsv} className="min-h-10 rounded-xl border border-slate-600 px-3 text-white" aria-label="Exportar estimación a CSV"><Download className="h-4 w-4" /></button>
          <button type="button" onClick={() => window.print()} className="min-h-10 rounded-xl border border-slate-600 px-3 text-white" aria-label="Imprimir estimación"><Printer className="h-4 w-4" /></button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Summary label="Líquido estimado" value={totals.net} />
        <Summary label="Costo patronal estimado" value={totals.employerCost} />
        <Summary label="Costo total estimado" value={totals.total} />
      </div>

      {employees.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
          No hay empleados registrados para calcular la estimación. Agrega el personal desde el módulo de Personal.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-slate-950 text-slate-400">
              <tr>{['Colaborador', 'Días del período', 'Salario base estimado', 'Bono estimado', 'Deducción ref.', 'Líquido estimado', 'Costo empresa estimado'].map((title) => <th key={title} className="p-3">{title}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {estimates.map((row) => (
                <tr key={row.employee.id}>
                  <td className="p-3"><strong>{row.employee.name}</strong><span className="block text-slate-400">{row.employee.role}</span></td>
                  <td className="p-3">
                    <input aria-label={`Días estimados de ${row.employee.name}`} type="number" min="0" max="31" value={row.days} onChange={(event) => setDaysOverride((old) => ({ ...old, [row.employee.id]: Math.max(0, Math.min(31, Number(event.target.value))) }))} className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white" />
                    {attendanceDays.has(row.employee.id) && <span className="ml-2 text-[10px] text-slate-500">asistencia</span>}
                  </td>
                  <td className="p-3">{formatGTQ(row.ordinaryPay)}</td>
                  <td className="p-3">{formatGTQ(row.incentive)}</td>
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

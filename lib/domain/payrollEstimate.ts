/**
 * Estimación de planilla por período.
 *
 * Reglas de negocio extraídas de `PayrollEstimateView` para poder probarlas sin
 * UI. La estimación es informativa, pero debe partir de los datos reales de la
 * obra:
 * - Días y horas extra salen de la asistencia del período (no de valores fijos).
 * - La base del IGSS incluye horas extra (salario extraordinario devengado).
 * - El bono incentivo usa el valor pactado del colaborador
 *   (`customBonoIncentivo`) y cae al parámetro de empresa si no existe.
 * - La cuota IGSS manual del colaborador (`overriddenIgssLaboral`) se respeta.
 */

import type { AttendanceRecord, Employee } from '@/lib/types';

export interface PayrollEstimateRates {
  /** Deducción laboral referencial (%) sobre la base afecta al IGSS. */
  employeeDeductionPercent: number;
  /** Costo patronal referencial (%) sobre la base afecta al IGSS. */
  employerCostPercent: number;
  /** Bono incentivo mensual de empresa (GTQ). */
  incentiveBonusGTQ: number;
}

export interface AttendanceSummary {
  /** Días únicos marcados como "Presente" en el período. */
  days: number;
  /** Horas extra acumuladas en los días presentes del período. */
  overtimeHours: number;
}

export interface PayrollEstimateRow {
  employeeId: string;
  days: number;
  overtimeHours: number;
  /** Salario ordinario por días asistidos. */
  ordinaryPay: number;
  /** Horas extra al 1.5x de la hora ordinaria. */
  overtimeAmount: number;
  /** Base afecta al IGSS: salario ordinario + horas extra. */
  igssBase: number;
  incentive: number;
  employeeDeduction: number;
  netEstimate: number;
  employerCost: number;
  totalEmployerEstimate: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Jornada diurna ordinaria de referencia (8 horas). */
export const ORDINARY_HOURS_PER_DAY = 8;
export const OVERTIME_FACTOR = 1.5;

/**
 * Agrupa la asistencia de un período (`YYYY-MM`).
 * Solo "Presente" devenga salario; ausencias, permisos e incapacidades no
 * suman días en esta estimación (la incapacidad la cubre el IGSS).
 */
export function summarizeAttendanceForPeriod(
  attendance: AttendanceRecord[],
  period: string
): Map<string, AttendanceSummary> {
  const byEmployee = new Map<string, { dates: Set<string>; overtimeHours: number }>();

  for (const record of attendance) {
    if (!record.date.startsWith(`${period}-`)) continue;
    if (record.status !== 'Presente') continue;

    const current = byEmployee.get(record.employeeId) ?? {
      dates: new Set<string>(),
      overtimeHours: 0,
    };
    current.dates.add(record.date);
    current.overtimeHours += Number.isFinite(record.overtimeHours)
      ? (record.overtimeHours ?? 0)
      : 0;
    byEmployee.set(record.employeeId, current);
  }

  return new Map(
    [...byEmployee].map(([employeeId, value]) => [
      employeeId,
      { days: value.dates.size, overtimeHours: round2(value.overtimeHours) },
    ])
  );
}

export interface CalculateEstimateRowParams {
  employee: Pick<
    Employee,
    'id' | 'dailyRateGTQ' | 'igssAffiliated' | 'customBonoIncentivo' | 'overriddenIgssLaboral'
  >;
  days: number;
  overtimeHours: number;
  rates: PayrollEstimateRates;
}

/**
 * Calcula una fila de estimación. No lanza: los valores fuera de rango se
 * normalizan (días 0..31, horas extra >= 0) para que un dato sucio no produzca
 * montos negativos en pantalla.
 */
export function calculateEstimateRow({
  employee,
  days,
  overtimeHours,
  rates,
}: CalculateEstimateRowParams): PayrollEstimateRow {
  const safeDays = Number.isFinite(days) ? Math.min(31, Math.max(0, days)) : 0;
  const safeOvertime = Number.isFinite(overtimeHours) ? Math.max(0, overtimeHours) : 0;
  const dailyRate = Number.isFinite(employee.dailyRateGTQ) ? Math.max(0, employee.dailyRateGTQ) : 0;

  const ordinaryPay = round2(dailyRate * safeDays);

  // Hora ordinaria = salario diario / 8; la extra se paga al 1.5x.
  const hourlyRate = dailyRate / ORDINARY_HOURS_PER_DAY;
  const overtimeAmount = round2(hourlyRate * OVERTIME_FACTOR * safeOvertime);

  const igssBase = round2(ordinaryPay + overtimeAmount);

  // Bono incentivo: valor pactado del colaborador o parámetro de empresa,
  // prorrateado por los días del período (tope 30 días).
  const monthlyBonus =
    employee.customBonoIncentivo !== undefined && Number.isFinite(employee.customBonoIncentivo)
      ? Math.max(0, employee.customBonoIncentivo)
      : Math.max(0, rates.incentiveBonusGTQ);
  const incentive = round2((monthlyBonus * Math.min(safeDays, 30)) / 30);

  const affiliated = Boolean(employee.igssAffiliated);
  const statutoryDeduction = affiliated
    ? round2((igssBase * Math.max(0, rates.employeeDeductionPercent)) / 100)
    : 0;

  // Cuota IGSS manual: es un monto absoluto del período y nunca puede exceder
  // la base afecta (evita líquidos negativos).
  const manualDeduction =
    affiliated &&
    employee.overriddenIgssLaboral !== undefined &&
    Number.isFinite(employee.overriddenIgssLaboral)
      ? Math.min(Math.max(0, employee.overriddenIgssLaboral), igssBase)
      : null;

  const employeeDeduction = manualDeduction ?? statutoryDeduction;
  const employerCost = affiliated
    ? round2((igssBase * Math.max(0, rates.employerCostPercent)) / 100)
    : 0;

  return {
    employeeId: employee.id,
    days: safeDays,
    overtimeHours: safeOvertime,
    ordinaryPay,
    overtimeAmount,
    igssBase,
    incentive,
    employeeDeduction,
    netEstimate: round2(ordinaryPay + overtimeAmount + incentive - employeeDeduction),
    employerCost,
    totalEmployerEstimate: round2(ordinaryPay + overtimeAmount + incentive + employerCost),
  };
}

export interface PayrollEstimateTotals {
  ordinaryPay: number;
  overtime: number;
  incentive: number;
  deductions: number;
  net: number;
  employerCost: number;
  total: number;
}

export function sumEstimateTotals(rows: PayrollEstimateRow[]): PayrollEstimateTotals {
  return rows.reduce<PayrollEstimateTotals>(
    (totals, row) => ({
      ordinaryPay: round2(totals.ordinaryPay + row.ordinaryPay),
      overtime: round2(totals.overtime + row.overtimeAmount),
      incentive: round2(totals.incentive + row.incentive),
      deductions: round2(totals.deductions + row.employeeDeduction),
      net: round2(totals.net + row.netEstimate),
      employerCost: round2(totals.employerCost + row.employerCost),
      total: round2(totals.total + row.totalEmployerEstimate),
    }),
    {
      ordinaryPay: 0,
      overtime: 0,
      incentive: 0,
      deductions: 0,
      net: 0,
      employerCost: 0,
      total: 0,
    }
  );
}

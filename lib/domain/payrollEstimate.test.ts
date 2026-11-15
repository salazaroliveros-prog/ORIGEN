import { describe, expect, it } from 'vitest';
import {
  calculateEstimateRow,
  sumEstimateTotals,
  summarizeAttendanceForPeriod,
  type PayrollEstimateRates,
} from './payrollEstimate';
import type { AttendanceRecord, Employee } from '@/lib/types';

const RATES: PayrollEstimateRates = {
  employeeDeductionPercent: 4.83,
  employerCostPercent: 12.67,
  incentiveBonusGTQ: 250,
};

const employee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'emp-1',
  name: 'Juan Pérez',
  role: 'Albañil',
  dailyRateGTQ: 200,
  igssAffiliated: true,
  phone: '5555-0000',
  ...overrides,
});

const attendance = (overrides: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  id: 'att-1',
  projectId: 'proj-1',
  date: '2026-10-01',
  employeeId: 'emp-1',
  employeeName: 'Juan Pérez',
  status: 'Presente',
  overtimeHours: 0,
  ...overrides,
});

describe('summarizeAttendanceForPeriod', () => {
  it('counts unique present days and overtime for the selected month only', () => {
    const summary = summarizeAttendanceForPeriod(
      [
        attendance({ id: 'a1', date: '2026-10-01' }),
        attendance({ id: 'a2', date: '2026-10-01' }), // duplicado mismo día
        attendance({ id: 'a3', date: '2026-10-02', overtimeHours: 3 }),
        attendance({ id: 'a4', date: '2026-11-02' }), // otro período
      ],
      '2026-10'
    );

    expect(summary.get('emp-1')).toEqual({ days: 2, overtimeHours: 3 });
  });

  it('ignores absences, permits and IGSS incapacity', () => {
    const summary = summarizeAttendanceForPeriod(
      [
        attendance({ id: 'a1', date: '2026-10-01' }),
        attendance({ id: 'a2', date: '2026-10-02', status: 'Ausente' }),
        attendance({ id: 'a3', date: '2026-10-03', status: 'Permiso' }),
        attendance({ id: 'a4', date: '2026-10-04', status: 'Incapacidad IGSS' }),
      ],
      '2026-10'
    );

    expect(summary.get('emp-1')).toEqual({ days: 1, overtimeHours: 0 });
  });

  it('sums overtime only from present days', () => {
    const summary = summarizeAttendanceForPeriod(
      [
        attendance({ id: 'a1', date: '2026-10-01', overtimeHours: 2 }),
        attendance({ id: 'a2', date: '2026-10-02', overtimeHours: 4 }),
        attendance({ id: 'a3', date: '2026-10-03', status: 'Ausente', overtimeHours: 8 }),
      ],
      '2026-10'
    );

    expect(summary.get('emp-1')).toEqual({ days: 2, overtimeHours: 6 });
  });
});

describe('calculateEstimateRow', () => {
  it('pays overtime at 1.5x and includes it in the IGSS base', () => {
    const row = calculateEstimateRow({
      employee: employee(),
      days: 26,
      overtimeHours: 10,
      rates: RATES,
    });

    expect(row.ordinaryPay).toBe(5200);
    expect(row.overtimeAmount).toBe(375);
    expect(row.igssBase).toBe(5575);
    expect(row.employeeDeduction).toBe(269.27);
    expect(row.employerCost).toBe(706.35);
    expect(row.netEstimate).toBe(5522.4);
    expect(row.totalEmployerEstimate).toBe(6498.02);
  });

  it('prorates the company incentive bonus by worked days', () => {
    const row = calculateEstimateRow({
      employee: employee(),
      days: 15,
      overtimeHours: 0,
      rates: RATES,
    });

    expect(row.incentive).toBe(125);
  });

  it('uses the employee custom bonus instead of the company default', () => {
    const row = calculateEstimateRow({
      employee: employee({ customBonoIncentivo: 500 }),
      days: 30,
      overtimeHours: 0,
      rates: RATES,
    });

    expect(row.incentive).toBe(500);
  });

  it('respects a manual IGSS quota but never exceeds the IGSS base', () => {
    const withQuota = calculateEstimateRow({
      employee: employee({ overriddenIgssLaboral: 150 }),
      days: 30,
      overtimeHours: 0,
      rates: RATES,
    });
    expect(withQuota.employeeDeduction).toBe(150);

    const cappedQuota = calculateEstimateRow({
      employee: employee({ overriddenIgssLaboral: 999_999 }),
      days: 10,
      overtimeHours: 0,
      rates: RATES,
    });
    expect(cappedQuota.employeeDeduction).toBe(cappedQuota.igssBase);
  });

  it('charges no deductions or employer cost when the employee is not affiliated', () => {
    const row = calculateEstimateRow({
      employee: employee({ igssAffiliated: false }),
      days: 30,
      overtimeHours: 8,
      rates: RATES,
    });

    expect(row.employeeDeduction).toBe(0);
    expect(row.employerCost).toBe(0);
    expect(row.igssBase).toBe(6000 + 300); // 30 días + 8 h extra
  });

  it('normalizes dirty values instead of producing negative amounts', () => {
    const row = calculateEstimateRow({
      employee: employee({ dailyRateGTQ: -50 }),
      days: 99,
      overtimeHours: -8,
      rates: { employeeDeductionPercent: -5, employerCostPercent: -1, incentiveBonusGTQ: -250 },
    });

    expect(row.ordinaryPay).toBe(0);
    expect(row.overtimeAmount).toBe(0);
    expect(row.incentive).toBe(0);
    expect(row.employeeDeduction).toBe(0);
    expect(row.netEstimate).toBe(0);
  });
});

describe('sumEstimateTotals', () => {
  it('adds every column including overtime', () => {
    const rows = [
      calculateEstimateRow({ employee: employee(), days: 30, overtimeHours: 8, rates: RATES }),
      calculateEstimateRow({
        employee: employee({ id: 'emp-2', dailyRateGTQ: 100 }),
        days: 15,
        overtimeHours: 0,
        rates: RATES,
      }),
    ];

    const totals = sumEstimateTotals(rows);

    expect(totals).toEqual({
      ordinaryPay: 6000 + 1500,
      overtime: 300,
      incentive: 250 + 125,
      deductions: rows[0].employeeDeduction + rows[1].employeeDeduction,
      net: rows[0].netEstimate + rows[1].netEstimate,
      employerCost: rows[0].employerCost + rows[1].employerCost,
      total: rows[0].totalEmployerEstimate + rows[1].totalEmployerEstimate,
    });
  });
});

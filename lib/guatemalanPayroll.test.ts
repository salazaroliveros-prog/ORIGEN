import { describe, expect, it } from 'vitest';
import {
  STATUTORY_RATES,
  calculateEmployeePayroll,
  calculateBono14,
  calculateAguinaldo,
  calculateLaborSettlement,
} from './guatemalanPayroll';

const BASE_EMP = {
  id: 'emp-001',
  name: 'Juan Pérez',
  role: 'Albañil',
  dailyRateGTQ: 200,
  igssAffiliated: true,
  phone: '+502 5555-0000',
  hireDate: '2024-01-02',
};

describe('STATUTORY_RATES', () => {
  it('IGSS laboral is 4.83%', () => {
    expect(STATUTORY_RATES.IGSS_LABORAL).toBeCloseTo(0.0483, 4);
  });
  it('IGSS patronal is 10.67%', () => {
    expect(STATUTORY_RATES.IGSS_PATRONAL).toBeCloseTo(0.1067, 4);
  });
  it('total patronal = IGSS + IRTRA + INTECAP = 12.67%', () => {
    const total = STATUTORY_RATES.IGSS_PATRONAL + STATUTORY_RATES.IRTRA + STATUTORY_RATES.INTECAP;
    expect(Math.abs(total - STATUTORY_RATES.IGSS_PATRONAL_TOTAL)).toBeLessThan(0.0001);
  });
  it('bono incentivo mensual is Q250', () => {
    expect(STATUTORY_RATES.BONO_INCENTIVO_MENSUAL).toBe(250);
  });
  it('quincenal bono is half monthly', () => {
    expect(STATUTORY_RATES.BONO_INCENTIVO_QUINCENAL).toBe(
      STATUTORY_RATES.BONO_INCENTIVO_MENSUAL / 2
    );
  });
});

describe('calculateEmployeePayroll — mensual', () => {
  it('gross salary = dailyRate × 30', () => {
    const r = calculateEmployeePayroll({ ...BASE_EMP, daysWorked: 30 });
    expect(r.baseSalary).toBeCloseTo(200 * 30, 2);
  });

  it('IGSS affiliated deducts 4.83%', () => {
    const r = calculateEmployeePayroll({ ...BASE_EMP, daysWorked: 30 });
    expect(r.igssLaboral).toBeGreaterThan(0);
    expect(r.igssLaboral).toBeCloseTo(r.salarioAfectoIGSS * STATUTORY_RATES.IGSS_LABORAL, 1);
  });

  it('unaffiliated employee has zero IGSS deduction', () => {
    const r = calculateEmployeePayroll({ ...BASE_EMP, igssAffiliated: false, daysWorked: 30 });
    expect(r.igssLaboral).toBe(0);
  });

  it('bono incentivo Q250 added for mensual', () => {
    const r = calculateEmployeePayroll({ ...BASE_EMP, daysWorked: 30 });
    expect(r.bonoIncentivo).toBe(250);
  });

  it('salary liquido = devengado - deducciones', () => {
    const r = calculateEmployeePayroll({ ...BASE_EMP, daysWorked: 30 });
    expect(r.salarioLiquido).toBeCloseTo(r.totalDevengado - r.totalDeducciones, 1);
  });

  it('overtime at 1.5x hourly', () => {
    const r = calculateEmployeePayroll({ ...BASE_EMP, daysWorked: 30, overtimeHours: 8 });
    const hourly = Math.round((200 / 8) * 100) / 100;
    expect(r.overtimeAmount).toBeCloseTo(hourly * 1.5 * 8, 1);
  });

  it('provisions sum to totalProvisionesPrestaciones', () => {
    const r = calculateEmployeePayroll({ ...BASE_EMP, daysWorked: 30 });
    const sum =
      r.provisionBono14 + r.provisionAguinaldo + r.provisionVacaciones + r.provisionIndemnizacion;
    expect(Math.abs(sum - r.totalProvisionesPrestaciones)).toBeLessThan(0.02);
  });

  it('costoTotalPatrono > salarioLiquido', () => {
    const r = calculateEmployeePayroll({ ...BASE_EMP, daysWorked: 30 });
    expect(r.costoTotalPatrono).toBeGreaterThan(r.salarioLiquido);
  });
});

describe('calculateEmployeePayroll — quincenal', () => {
  it('base salary for 15 days', () => {
    const r = calculateEmployeePayroll({ ...BASE_EMP, frequency: 'quincenal', daysWorked: 15 });
    expect(r.baseSalary).toBeCloseTo(200 * 15, 2);
  });

  it('bono incentivo Q125 for quincenal', () => {
    const r = calculateEmployeePayroll({ ...BASE_EMP, frequency: 'quincenal', daysWorked: 15 });
    expect(r.bonoIncentivo).toBe(125);
  });
});

describe('calculateBono14', () => {
  it('returns positive amount for full-year employee', () => {
    const r = calculateBono14(BASE_EMP, 2026);
    expect(r.amountToPayGTQ).toBeGreaterThan(0);
    expect(r.benefitType).toBe('bono_14');
    expect(r.isExemptIGSS).toBe(true);
  });

  it('mid-year hire gets less than full-year', () => {
    const full = calculateBono14({ ...BASE_EMP, hireDate: '2025-07-01' }, 2026);
    const half = calculateBono14({ ...BASE_EMP, hireDate: '2026-01-01' }, 2026);
    expect(half.amountToPayGTQ).toBeLessThanOrEqual(full.amountToPayGTQ);
  });
});

describe('calculateAguinaldo', () => {
  it('returns positive amount', () => {
    const r = calculateAguinaldo(BASE_EMP, 2026);
    expect(r.amountToPayGTQ).toBeGreaterThan(0);
    expect(r.benefitType).toBe('aguinaldo');
    expect(r.isExemptIGSS).toBe(true);
  });

  it('partial year gets less than full year', () => {
    const full = calculateAguinaldo({ ...BASE_EMP, hireDate: '2026-01-01' }, 2026);
    const partial = calculateAguinaldo({ ...BASE_EMP, hireDate: '2026-09-01' }, 2026);
    expect(partial.amountToPayGTQ).toBeLessThanOrEqual(full.amountToPayGTQ);
  });
});

describe('calculateLaborSettlement', () => {
  it('produces a settlement with positive total for multi-year employee', () => {
    const r = calculateLaborSettlement({ ...BASE_EMP }, '2026-01-01');
    expect(r).toBeDefined();
    const numericVals = Object.values(r).filter((v) => typeof v === 'number');
    expect(numericVals.some((v) => (v as number) > 0)).toBe(true);
  });

  it('does not throw for same-day hire and termination', () => {
    expect(() =>
      calculateLaborSettlement({ ...BASE_EMP, hireDate: '2026-01-01' }, '2026-01-01')
    ).not.toThrow();
  });
});

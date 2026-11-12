import { describe, it, expect } from 'vitest';
import type { Machinery } from '@/lib/types';
import {
  buildMachineryUseRecord,
  calculateMachineryHoursWorked,
  calculateMachineryOperationCost,
} from './machinery';

const machinery: Machinery = {
  id: 'mach-1',
  name: 'Excavadora CAT 320',
  model: 'CAT 320',
  plateOrCode: 'EQ-01',
  hourlyRateGTQ: 300,
  currentHorometer: 120,
  status: 'Disponible',
};

describe('calculateMachineryHoursWorked', () => {
  it('calculates positive delta', () => {
    expect(calculateMachineryHoursWorked(120, 125.5)).toBe(5.5);
  });

  it('rejects non-increasing horometer', () => {
    expect(() => calculateMachineryHoursWorked(120, 120)).toThrow(/mayor al actual/);
    expect(() => calculateMachineryHoursWorked(120, 119)).toThrow(/mayor al actual/);
  });
});

describe('calculateMachineryOperationCost', () => {
  it('rounds to cents', () => {
    expect(calculateMachineryOperationCost(1.335, 100)).toBe(133.5);
    expect(calculateMachineryOperationCost(2, 300)).toBe(600);
  });
});

describe('buildMachineryUseRecord', () => {
  it('builds consistent log, expense and machinery update', () => {
    const result = buildMachineryUseRecord(
      {
        machineryId: 'mach-1',
        projectId: 'proj-1',
        date: '2026-11-12',
        nextHorometer: 125,
        operatorName: ' Juan Pérez ',
        fuelGallons: 12,
      },
      machinery,
      'log-1'
    );

    expect(result.log).toMatchObject({
      id: 'log-1',
      machineryId: 'mach-1',
      machineryName: 'Excavadora CAT 320',
      projectId: 'proj-1',
      date: '2026-11-12',
      hoursWorked: 5,
      operatorName: 'Juan Pérez',
      fuelGallons: 12,
      costGTQ: 1500,
      expenseId: 'machine-log-1',
    });
    expect(result.expense).toMatchObject({
      id: 'machine-log-1',
      projectId: 'proj-1',
      date: '2026-11-12',
      category: 'Maquinaria y Combustible',
      amount: 1500,
      currency: 'GTQ',
      paymentMethod: 'Pendiente',
      approvalStatus: 'Pendiente',
      machineryLogId: 'log-1',
    });
    expect(result.expense.description).toContain('5 horas');
    expect(result.nextHorometer).toBe(125);
    expect(result.machineryUpdate).toEqual({
      currentHorometer: 125,
      currentProjectId: 'proj-1',
      status: 'En Obra',
    });
  });

  it('rejects invalid horometer progression', () => {
    expect(() =>
      buildMachineryUseRecord(
        {
          machineryId: 'mach-1',
          projectId: 'proj-1',
          date: '2026-11-12',
          nextHorometer: 120,
          operatorName: 'Op',
          fuelGallons: 0,
        },
        machinery,
        'log-2'
      )
    ).toThrow(/mayor al actual/);
  });
});

import { describe, it, expect } from 'vitest';
import type { Machinery, MachineryLog } from '@/lib/types';
import {
  buildMachineryRecord,
  buildMachineryUseRecord,
  calculateMachineryHoursWorked,
  calculateMachineryOperationCost,
  canDeleteMachinery,
  evaluateMachineryMaintenance,
  MACHINERY_MAINTENANCE_INTERVAL_HOURS,
  resolveMachineryUse,
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
    expect(result.expense.nitSupplier).toBe('');
    expect(result.expense.facturaNumber).toBe('');
    expect(result.nextHorometer).toBe(125);
    expect(result.machineryUpdate).toEqual({
      currentHorometer: 125,
      currentProjectId: 'proj-1',
      status: 'En Obra',
    });
  });

  it('does not invent a supplier invoice number for an internal cost', () => {
    const result = buildMachineryUseRecord(
      {
        machineryId: 'mach-1',
        projectId: 'proj-1',
        date: '2026-11-12',
        nextHorometer: 124,
        operatorName: 'Juan Pérez',
        fuelGallons: 0,
      },
      machinery,
      'log-3'
    );

    expect(result.expense).toMatchObject({ nitSupplier: '', facturaNumber: '' });
    expect(result.expense.facturaNumber).not.toContain('log-3');
    // El vínculo con el horómetro es lo que permite auditar el costo.
    expect(result.expense.machineryLogId).toBe('log-3');
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

describe('buildMachineryRecord', () => {
  const draft: Machinery = {
    id: 'mach-9',
    name: 'Mezcladora',
    model: '2025',
    plateOrCode: 'EQ-09',
    hourlyRateGTQ: 150,
    currentHorometer: 0,
    status: 'Disponible',
  };

  it('adds the company and author that the form cannot know', () => {
    const record = buildMachineryRecord(draft, 'company-1', 'user-1');

    expect(record).toMatchObject({
      id: 'mach-9',
      companyId: 'company-1',
      createdBy: 'user-1',
      name: 'Mezcladora',
    });
  });

  it('keeps the original author on update', () => {
    const record = buildMachineryRecord({ ...draft, createdBy: 'original' }, 'company-1', 'user-2');

    expect(record.createdBy).toBe('original');
  });

  it('refuses to build a record without company or user', () => {
    expect(() => buildMachineryRecord(draft, '', 'user-1')).toThrow(/empresa/);
    expect(() => buildMachineryRecord(draft, 'company-1', '')).toThrow(/usuario/);
  });
});

describe('resolveMachineryUse', () => {
  const submitted: MachineryLog = {
    id: 'log-9',
    machineryId: 'mach-1',
    machineryName: 'Excavadora CAT 320',
    projectId: 'proj-1',
    date: '2026-11-12',
    hoursWorked: 4,
    operatorName: 'Juan Pérez',
    fuelGallons: 10,
    // El navegador puede enviar un costo viejo o manipulado.
    costGTQ: 1,
  };

  it('advances the horometer by the submitted hours', () => {
    const result = resolveMachineryUse(submitted, machinery);

    expect(result.nextHorometer).toBe(124);
    expect(result.machineryUpdate.currentHorometer).toBe(124);
  });

  it('recalculates hours and cost from the equipment rate, never from the client', () => {
    const result = resolveMachineryUse(submitted, machinery);

    expect(result.log.hoursWorked).toBe(4);
    expect(result.log.costGTQ).toBe(1200);
    expect(result.expense.amount).toBe(1200);
  });

  it('rejects hours that do not advance the horometer', () => {
    expect(() => resolveMachineryUse({ ...submitted, hoursWorked: 0 }, machinery)).toThrow(
      /mayor al actual/
    );
  });
});

describe('canDeleteMachinery', () => {
  it('blocks deleting equipment with usage logs', () => {
    expect(canDeleteMachinery('mach-1', [{ machineryId: 'mach-1' }])).toBe(false);
  });

  it('allows deleting equipment without history', () => {
    expect(canDeleteMachinery('mach-1', [{ machineryId: 'mach-2' }])).toBe(true);
    expect(canDeleteMachinery('mach-1', [])).toBe(true);
  });
});

describe('evaluateMachineryMaintenance', () => {
  it('uses the absolute horometer so a used machine is not reported as OK', () => {
    // El bug original: se sumaban solo las bitácoras desde el alta, así que un
    // equipo registrado con 8,000 h nunca alertaba.
    const status = evaluateMachineryMaintenance({ currentHorometer: 8000 });

    expect(status.urgency).toBe('critical');
    expect(status.hoursSinceService).toBe(8000);
    expect(status.hoursUntilService).toBe(0);
  });

  it('warns near the service interval', () => {
    const status = evaluateMachineryMaintenance({ currentHorometer: 210 });

    expect(status.urgency).toBe('warning');
    expect(status.hoursUntilService).toBe(40);
  });

  it('reports OK for a machine with little accumulated use', () => {
    const status = evaluateMachineryMaintenance({ currentHorometer: 50 });

    expect(status.urgency).toBe('ok');
    expect(status.hoursUntilService).toBe(MACHINERY_MAINTENANCE_INTERVAL_HOURS - 50);
  });

  it('measures from the last service when it is recorded', () => {
    expect(
      evaluateMachineryMaintenance({ currentHorometer: 8000, lastServiceHorometer: 7950 }).urgency
    ).toBe('ok');

    expect(
      evaluateMachineryMaintenance({ currentHorometer: 8000, lastServiceHorometer: 7700 }).urgency
    ).toBe('critical');
  });

  it('flags invalid or impossible hour meter readings instead of clearing alerts', () => {
    expect(evaluateMachineryMaintenance({ currentHorometer: Number.NaN }).urgency).toBe('invalid');
    expect(evaluateMachineryMaintenance({ currentHorometer: -1 }).urgency).toBe('invalid');
    expect(
      evaluateMachineryMaintenance({
        currentHorometer: 100,
        lastServiceHorometer: Number.NaN,
      }).urgency
    ).toBe('invalid');
    expect(
      evaluateMachineryMaintenance({
        currentHorometer: 100,
        lastServiceHorometer: -1,
      }).urgency
    ).toBe('invalid');
    expect(
      evaluateMachineryMaintenance({
        currentHorometer: 100,
        lastServiceHorometer: 150,
      }).urgency
    ).toBe('invalid');
  });
});

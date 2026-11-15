import { describe, it, expect } from 'vitest';
import { detectApuOverrun, sumApuSpent, toGTQAmount } from './expenseBudget';
import type { APUItem, ExpenseRecord } from '@/lib/types';

const apu = (overrides: Partial<APUItem> = {}): APUItem => ({
  id: 'apu-1',
  projectId: 'proj-1',
  code: '01.01',
  description: 'Excavación',
  unit: 'm³',
  quantity: 10,
  materialUnitCostGTQ: 50,
  laborUnitCostGTQ: 50,
  equipmentUnitCostGTQ: 0,
  totalUnitCostGTQ: 100,
  totalPriceGTQ: 1000,
  ...overrides,
});

const expense = (overrides: Partial<ExpenseRecord> = {}): ExpenseRecord => ({
  id: 'exp-1',
  projectId: 'proj-1',
  date: '2026-01-05',
  category: 'Materiales (Cementos, Hierro)',
  description: 'Compra',
  supplier: 'Proveedor',
  nitSupplier: 'CF',
  facturaNumber: '1',
  amount: 100,
  currency: 'GTQ',
  paymentMethod: 'Efectivo',
  ...overrides,
});

describe('sumApuSpent', () => {
  it('sums only expenses of the same project and APU', () => {
    const expenses = [
      expense({ id: 'e1', amount: 100, assignedApuId: 'apu-1' }),
      expense({ id: 'e2', amount: 250, assignedApuId: 'apu-1' }),
      expense({ id: 'e3', projectId: 'proj-2', amount: 900, assignedApuId: 'apu-1' }),
      expense({ id: 'e4', assignedApuId: 'apu-2', amount: 500 }),
      expense({ id: 'e5', amount: 75, assignedApuId: 'apu-1' }),
    ];

    expect(sumApuSpent({ expenses, projectId: 'proj-1', apuId: 'apu-1' })).toBe(425);
    expect(sumApuSpent({ expenses, projectId: 'proj-1', apuId: 'apu-2' })).toBe(500);
    expect(sumApuSpent({ expenses, projectId: 'proj-2', apuId: 'apu-1' })).toBe(900);
  });

  it('excludes rejected expenses and the expense being edited', () => {
    const expenses = [
      expense({ id: 'e1', amount: 400, assignedApuId: 'apu-1' }),
      expense({ id: 'e2', amount: 300, assignedApuId: 'apu-1', approvalStatus: 'Rechazado' }),
      expense({ id: 'e3', amount: 200, assignedApuId: 'apu-1' }),
    ];

    expect(sumApuSpent({ expenses, projectId: 'proj-1', apuId: 'apu-1' })).toBe(600);
    expect(
      sumApuSpent({ expenses, projectId: 'proj-1', apuId: 'apu-1', excludeExpenseId: 'e1' })
    ).toBe(200);
  });
});

describe('detectApuOverrun', () => {
  it('returns null when the expense fits in the APU budget', () => {
    const result = detectApuOverrun({
      apuItems: [apu()],
      expenses: [expense({ amount: 500, assignedApuId: 'apu-1' })],
      projectId: 'proj-1',
      apuId: 'apu-1',
      additionalAmount: 500,
    });

    expect(result).toBeNull();
  });

  it('reports the exact overrun amount', () => {
    const result = detectApuOverrun({
      apuItems: [apu()],
      expenses: [expense({ amount: 900, assignedApuId: 'apu-1' })],
      projectId: 'proj-1',
      apuId: 'apu-1',
      additionalAmount: 350,
    });

    expect(result).toMatchObject({
      isOver: true,
      currentSpent: 900,
      projectedTotal: 1250,
      budgetTotal: 1000,
      diff: 250,
      apuCode: '01.01',
    });
  });

  it('ignores APU items from other projects and general expenses', () => {
    expect(
      detectApuOverrun({
        apuItems: [apu({ projectId: 'proj-2' })],
        expenses: [],
        projectId: 'proj-1',
        apuId: 'apu-1',
        additionalAmount: 5000,
      })
    ).toBeNull();

    expect(
      detectApuOverrun({
        apuItems: [apu()],
        expenses: [],
        projectId: 'proj-1',
        apuId: null,
        additionalAmount: 5000,
      })
    ).toBeNull();
  });

  it('does not count the expense being edited against itself', () => {
    const result = detectApuOverrun({
      apuItems: [apu()],
      expenses: [expense({ id: 'e1', amount: 1000, assignedApuId: 'apu-1' })],
      projectId: 'proj-1',
      apuId: 'apu-1',
      additionalAmount: 1000,
      excludeExpenseId: 'e1',
    });

    expect(result).toBeNull();
  });
});

describe('toGTQAmount', () => {
  it('returns GTQ amounts unchanged', () => {
    expect(toGTQAmount(1500.456, 'GTQ', 7.8)).toBe(1500.46);
  });

  it('converts USD using the configured exchange rate', () => {
    expect(toGTQAmount(100, 'USD', 7.85)).toBe(785);
  });

  it('rejects invalid amounts and missing exchange rate', () => {
    expect(() => toGTQAmount(0, 'GTQ', 7.85)).toThrow('mayor a cero');
    expect(() => toGTQAmount(100, 'USD', 0)).toThrow('tipo de cambio');
  });
});

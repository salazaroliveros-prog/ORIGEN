import { describe, it, expect } from 'vitest';
import { aggregatePortfolio } from './portfolio';
import type { APUItem, ExpenseRecord, Project, QuoteRecord } from '../types';

const project = (overrides: Partial<Project>): Project => ({
  id: 'proj-1',
  code: 'P-1',
  name: 'Proyecto Uno',
  client: 'Cliente',
  location: 'Guatemala',
  municipality: 'Guatemala',
  department: 'Guatemala',
  budgetTotal: 100000,
  spentTotal: 0,
  progressPercent: 0,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'En Ejecución',
  lat: 14.6,
  lng: -90.5,
  ...overrides,
});

const apu = (overrides: Partial<APUItem>): APUItem => ({
  id: 'apu-1',
  projectId: 'proj-1',
  code: '03.01',
  description: 'Partida',
  unit: 'm²',
  quantity: 1,
  materialUnitCostGTQ: 10,
  laborUnitCostGTQ: 10,
  equipmentUnitCostGTQ: 10,
  totalUnitCostGTQ: 30,
  totalPriceGTQ: 30,
  ...overrides,
});

const expense = (overrides: Partial<ExpenseRecord>): ExpenseRecord => ({
  id: 'exp-1',
  projectId: 'proj-1',
  date: '2026-01-15',
  category: 'Materiales (Cementos, Hierro)',
  description: 'Compra',
  supplier: 'Proveedor',
  nitSupplier: 'CF',
  facturaNumber: '1',
  amount: 1000,
  currency: 'GTQ',
  paymentMethod: 'Efectivo',
  ...overrides,
});

const quote = (overrides: Partial<QuoteRecord>): QuoteRecord => ({
  id: 'q-1',
  projectId: 'proj-1',
  clientName: 'Cliente',
  clientNit: 'CF',
  date: '2026-01-10',
  validUntil: '2026-02-10',
  items: [],
  totalGTQ: 5000,
  status: 'Enviada',
  ...overrides,
});

describe('aggregatePortfolio', () => {
  it('aggregates granular project figures', () => {
    const result = aggregatePortfolio(
      [project({})],
      [expense({ amount: 4000 }), expense({ id: 'exp-2', amount: 1000 })],
      [apu({ totalPriceGTQ: 60000 })],
      [
        quote({ totalGTQ: 5000, status: 'Enviada' }),
        quote({ id: 'q-2', totalGTQ: 8000, status: 'Aceptada' }),
      ],
      '2026-06-01'
    );

    expect(result.projectCount).toBe(1);
    expect(result.budgetTotalGTQ).toBe(100000);
    expect(result.apuTotalGTQ).toBe(60000);
    expect(result.spentTotalGTQ).toBe(5000);
    expect(result.remainingBudgetGTQ).toBe(95000);
    expect(result.budgetUsagePercent).toBe(5);
    expect(result.apuCoveragePercent).toBe(60);
    expect(result.quotePipelineGTQ).toBe(13000);
    expect(result.acceptedQuotesGTQ).toBe(8000);
    expect(result.quoteCount).toBe(2);
    expect(result.projects[0].alerts).toContain('Avance por debajo del cronograma esperado');
    expect(result.projects[0].alerts).not.toContain('Proyecto sin partidas APU registradas');
  });

  it('excludes rejected quotes from the pipeline', () => {
    const result = aggregatePortfolio(
      [project({})],
      [],
      [],
      [quote({ totalGTQ: 5000, status: 'Rechazada' })],
      '2026-06-01'
    );
    expect(result.quotePipelineGTQ).toBe(0);
    expect(result.acceptedQuotesGTQ).toBe(0);
    expect(result.quoteCount).toBe(1);
  });

  it('flags over-budget projects and portfolio alerts', () => {
    const result = aggregatePortfolio(
      [project({ budgetTotal: 1000 })],
      [expense({ amount: 1500 })],
      [apu({ totalPriceGTQ: 3000 })],
      [],
      '2026-06-01'
    );

    expect(result.projects[0].budgetUsagePercent).toBe(150);
    expect(result.projects[0].alerts.some((alert) => alert.includes('supera el presupuesto'))).toBe(
      true
    );
    expect(
      result.projects[0].alerts.some((alert) => alert.includes('superior al presupuesto'))
    ).toBe(true);
    expect(result.alerts.length).toBeGreaterThan(0);
  });

  it('flags projects without APU items', () => {
    const result = aggregatePortfolio([project({})], [], [], [], '2026-06-01');
    expect(result.projects[0].alerts).toContain('Proyecto sin partidas APU registradas');
    expect(result.alerts.some((alert) => alert.includes('sin presupuesto APU'))).toBe(true);
  });

  it('groups totals by department', () => {
    const result = aggregatePortfolio(
      [
        project({ id: 'p1', code: 'P-1', department: 'Guatemala', budgetTotal: 1000 }),
        project({ id: 'p2', code: 'P-2', department: 'Quetzaltenango', budgetTotal: 500 }),
        project({ id: 'p3', code: 'P-3', department: 'Guatemala', budgetTotal: 250 }),
      ],
      [],
      [],
      [],
      '2026-06-01'
    );

    expect(result.byDepartment).toHaveLength(2);
    expect(result.byDepartment[0].department).toBe('Guatemala');
    expect(result.byDepartment[0].projectCount).toBe(2);
    expect(result.byDepartment[0].budgetTotalGTQ).toBe(1250);
  });

  it('computes budget-weighted overall progress', () => {
    const result = aggregatePortfolio(
      [
        project({ id: 'p1', code: 'P-1', budgetTotal: 1000, progressPercent: 100 }),
        project({ id: 'p2', code: 'P-2', budgetTotal: 3000, progressPercent: 0 }),
      ],
      [],
      [],
      [],
      '2026-06-01'
    );
    expect(result.weightedProgressPercent).toBe(25);
  });

  it('marks archived projects as inactive without alerts', () => {
    const result = aggregatePortfolio(
      [project({ status: 'Archivado', budgetTotal: 0 })],
      [],
      [],
      [],
      '2026-06-01'
    );
    expect(result.activeProjectCount).toBe(0);
    expect(result.archivedProjectCount).toBe(1);
    expect(result.projects[0].alerts).toHaveLength(0);
  });
});

describe('portfolio edge cases', () => {
  it('ignores records without a project id', () => {
    const result = aggregatePortfolio(
      [project({})],
      [expense({ projectId: '' }), expense({ id: 'e-2', amount: 500 })],
      [apu({ projectId: undefined }), apu({ id: 'apu-2', totalPriceGTQ: 700 })],
      [quote({ projectId: '' })],
      '2026-02-01'
    );
    expect(result.spentTotalGTQ).toBe(500);
    expect(result.apuTotalGTQ).toBe(700);
    expect(result.quoteCount).toBe(0);
  });

  it('labels projects without department', () => {
    const result = aggregatePortfolio(
      [project({ department: '' })],
      [],
      [apu({ totalPriceGTQ: 1000 })],
      [],
      '2026-02-01'
    );
    expect(result.projects[0].department).toBe('Sin departamento');
  });

  it('warns when budget usage reaches 80 percent', () => {
    const result = aggregatePortfolio(
      [project({ budgetTotal: 10000 })],
      [expense({ amount: 8500 })],
      [apu({ totalPriceGTQ: 9000 })],
      [],
      '2026-01-15'
    );
    expect(result.projects[0].alerts).toContain('Consumo de presupuesto mayor al 80%');
    expect(result.budgetUsagePercent).toBe(85);
  });

  it('warns about schedule delays at project and portfolio level', () => {
    const result = aggregatePortfolio(
      [project({ startDate: '2026-01-01', endDate: '2026-01-31' })],
      [],
      [apu({ totalPriceGTQ: 1000 })],
      [],
      '2026-03-01'
    );
    expect(result.projects[0].timelineStatus).toBe('atrasado');
    expect(result.projects[0].alerts.some((alert) => alert.includes('Cronograma con'))).toBe(true);
    expect(result.alerts.some((alert) => alert.includes('atraso en cronograma'))).toBe(true);
  });

  it('falls back to an unweighted average when there is no budget', () => {
    const result = aggregatePortfolio(
      [
        project({ id: 'p1', code: 'P-1', budgetTotal: 0, progressPercent: 20 }),
        project({ id: 'p2', code: 'P-2', budgetTotal: 0, progressPercent: 40 }),
      ],
      [],
      [],
      [],
      '2026-01-15'
    );
    expect(result.weightedProgressPercent).toBe(30);
  });

  it('names over-budget projects by name when the code is empty', () => {
    const result = aggregatePortfolio(
      [project({ code: '', name: 'Obra sin código', budgetTotal: 1000 })],
      [expense({ amount: 3000 })],
      [apu({ totalPriceGTQ: 1000 })],
      [],
      '2026-01-15'
    );
    expect(result.alerts.some((alert) => alert.includes('Obra sin código'))).toBe(true);
  });
});

describe('aggregation branch coverage', () => {
  it('returns zeroed totals for an empty portfolio', () => {
    const result = aggregatePortfolio([], [], [], [], '2026-02-01');
    expect(result.projectCount).toBe(0);
    expect(result.weightedProgressPercent).toBe(0);
    expect(result.alerts).toEqual([]);
  });

  it('pushes multiple APU items for the same project', () => {
    const result = aggregatePortfolio(
      [project({})],
      [],
      [apu({ id: 'apu-a', totalPriceGTQ: 300 }), apu({ id: 'apu-b', totalPriceGTQ: 200 })],
      [],
      '2026-02-01'
    );
    expect(result.apuTotalGTQ).toBe(500);
    expect(result.projects[0].apuTotalGTQ).toBe(500);
  });

  it('sums zero-valued records without breaking', () => {
    const result = aggregatePortfolio(
      [project({ budgetTotal: 1000 })],
      [expense({ amount: 0 })],
      [apu({ totalPriceGTQ: 0 })],
      [quote({ totalGTQ: 0 })],
      '2026-02-01'
    );
    expect(result.spentTotalGTQ).toBe(0);
    expect(result.apuTotalGTQ).toBe(0);
    expect(result.quotePipelineGTQ).toBe(0);
    expect(result.projects[0].quoteCount).toBe(1);
  });
});

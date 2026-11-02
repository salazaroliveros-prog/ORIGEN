import { describe, it, expect } from 'vitest';
import {
  calculateBudgetCoverage,
  calculateConstructionCosts,
  calculateItemCosts,
  calculateLaborRequirements,
  calculateMaterialRequirements,
} from './budgetAnalysis';
import type { APUItem } from '../types';

const baseItem: APUItem = {
  id: 'apu-1',
  code: '03.01',
  description: 'Muro de block 14x19x39',
  unit: 'm²',
  quantity: 10,
  materialUnitCostGTQ: 100,
  laborUnitCostGTQ: 50,
  equipmentUnitCostGTQ: 20,
  totalUnitCostGTQ: 170,
  totalPriceGTQ: 2000,
  department: 'Guatemala',
};

const itemWithBreakdown: APUItem = {
  ...baseItem,
  id: 'apu-2',
  code: '03.02',
  description: 'Losa de concreto',
  quantity: 5,
  materialUnitCostGTQ: 999,
  laborUnitCostGTQ: 999,
  equipmentUnitCostGTQ: 999,
  totalPriceGTQ: 3000,
  breakdown: {
    materials: [
      { name: 'Cemento', quantity: 20, unit: 'saco', unitPriceGTQ: 90, subtotalGTQ: 1800 },
      { name: 'Arena', quantity: 3, unit: 'm³', unitPriceGTQ: 100, subtotalGTQ: 300 },
    ],
    labor: [
      { role: 'Albañil', yieldHours: 16, unitPriceGTQ: 25, subtotalGTQ: 400 },
      { role: 'Ayudante', yieldHours: 16, unitPriceGTQ: 15, subtotalGTQ: 240 },
    ],
    equipment: [{ name: 'Revolvedora', subtotalGTQ: 120 }],
  },
};

describe('calculateItemCosts', () => {
  it('uses unit cost times quantity when no breakdown exists', () => {
    const costs = calculateItemCosts(baseItem);
    expect(costs.materialCost).toBe(1000);
    expect(costs.laborCost).toBe(500);
    expect(costs.equipmentCost).toBe(200);
    expect(costs.directCost).toBe(1700);
  });

  it('prefers the explicit breakdown when present', () => {
    const costs = calculateItemCosts(itemWithBreakdown);
    expect(costs.materialCost).toBe(2100);
    expect(costs.laborCost).toBe(640);
    expect(costs.equipmentCost).toBe(120);
    expect(costs.directCost).toBe(2860);
  });

  it('ignores non-finite values', () => {
    const costs = calculateItemCosts({
      ...baseItem,
      quantity: Number.NaN as unknown as number,
      materialUnitCostGTQ: Number.POSITIVE_INFINITY as unknown as number,
    });
    expect(costs.directCost).toBe(0);
  });
});

describe('calculateConstructionCosts', () => {
  it('aggregates totals and margin', () => {
    const result = calculateConstructionCosts([baseItem, itemWithBreakdown]);
    expect(result.materialCost).toBe(3100);
    expect(result.laborCost).toBe(1140);
    expect(result.equipmentCost).toBe(320);
    expect(result.directCost).toBe(4560);
    expect(result.saleTotal).toBe(5000);
    expect(result.marginGTQ).toBe(440);
    expect(result.marginPercent).toBe(8.8);
    expect(result.itemCount).toBe(2);
  });

  it('returns zeros for an empty budget', () => {
    const result = calculateConstructionCosts([]);
    expect(result.directCost).toBe(0);
    expect(result.marginPercent).toBe(0);
    expect(result.itemCount).toBe(0);
  });
});

describe('calculateMaterialRequirements', () => {
  it('aggregates breakdown materials by name and unit', () => {
    const result = calculateMaterialRequirements([itemWithBreakdown]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ name: 'Cemento', unit: 'saco', quantity: 20 });
    expect(result[1]).toMatchObject({ name: 'Arena', unit: 'm³', quantity: 3 });
  });

  it('falls back to unit cost for items without breakdown', () => {
    const result = calculateMaterialRequirements([baseItem]);
    expect(result).toHaveLength(1);
    expect(result[0].subtotalGTQ).toBe(1000);
    expect(result[0].quantity).toBe(10);
    expect(result[0].unitPriceGTQ).toBe(100);
  });

  it('merges duplicate materials across items', () => {
    const duplicate: APUItem = {
      ...itemWithBreakdown,
      id: 'apu-3',
      breakdown: {
        materials: [
          { name: 'Cemento', quantity: 5, unit: 'saco', unitPriceGTQ: 90, subtotalGTQ: 450 },
        ],
      },
    };
    const result = calculateMaterialRequirements([itemWithBreakdown, duplicate]);
    const cement = result.find((material) => material.name === 'Cemento');
    expect(cement?.quantity).toBe(25);
    expect(cement?.subtotalGTQ).toBe(2250);
  });
});

describe('calculateLaborRequirements', () => {
  it('aggregates labor by role with hours and crew days', () => {
    const result = calculateLaborRequirements([itemWithBreakdown]);
    expect(result.requirements).toHaveLength(2);
    expect(result.totalCostGTQ).toBe(640);
    expect(result.totalHours).toBe(32);
    expect(result.crewDays).toBe(4);
  });

  it('derives cost without hours when no breakdown is available', () => {
    const result = calculateLaborRequirements([baseItem]);
    expect(result.totalCostGTQ).toBe(500);
    expect(result.totalHours).toBe(0);
    expect(result.crewDays).toBe(0);
    expect(result.requirements[0].role).toBe('Mano de obra general');
  });
});

describe('calculateBudgetCoverage', () => {
  it('detects an under-budget project', () => {
    const coverage = calculateBudgetCoverage({ budgetTotal: 10000, spentTotal: 3000 }, [baseItem]);
    expect(coverage.apuTotalGTQ).toBe(2000);
    expect(coverage.varianceGTQ).toBe(8000);
    expect(coverage.budgetUsagePercent).toBe(30);
    expect(coverage.status).toBe('bajo-presupuesto');
  });

  it('detects an over-budget project', () => {
    const coverage = calculateBudgetCoverage({ budgetTotal: 1000, spentTotal: 0 }, [baseItem]);
    expect(coverage.status).toBe('sobre-presupuesto');
    expect(coverage.variancePercent).toBe(-100);
  });

  it('flags a tight budget at 95% coverage or more', () => {
    const coverage = calculateBudgetCoverage({ budgetTotal: 2000, spentTotal: 0 }, [baseItem]);
    expect(coverage.apuCoveragePercent).toBe(100);
    expect(coverage.status).toBe('ajustado');
  });

  it('reports no budget when project has neither budget nor APU', () => {
    const coverage = calculateBudgetCoverage({ budgetTotal: 0, spentTotal: 0 }, []);
    expect(coverage.status).toBe('sin-presupuesto');
  });
});

describe('material and labor edge cases', () => {
  it('labels unnamed breakdown materials and derives unit price', () => {
    const item: APUItem = {
      ...baseItem,
      id: 'apu-unnamed',
      breakdown: {
        materials: [{ name: '', unit: '', quantity: 2, unitPriceGTQ: 0, subtotalGTQ: 100 }],
      },
    };
    const result = calculateMaterialRequirements([item]);
    expect(result[0]).toMatchObject({
      name: 'Material sin nombre',
      unit: 'm²',
      unitPriceGTQ: 50,
      subtotalGTQ: 100,
    });
  });

  it('skips items without material cost', () => {
    expect(calculateMaterialRequirements([{ ...baseItem, materialUnitCostGTQ: 0 }])).toHaveLength(
      0
    );
  });

  it('merges fallback materials that share description and unit', () => {
    const second: APUItem = { ...baseItem, id: 'apu-copy' };
    const result = calculateMaterialRequirements([baseItem, second]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(20);
    expect(result[0].subtotalGTQ).toBe(2000);
  });

  it('labels unnamed labor roles and derives hourly price', () => {
    const item: APUItem = {
      ...baseItem,
      id: 'apu-labor-unnamed',
      breakdown: {
        labor: [{ role: '', yieldHours: 5, unitPriceGTQ: 0, subtotalGTQ: 250 }],
      },
    };
    const result = calculateLaborRequirements([item]);
    expect(result.requirements[0]).toMatchObject({
      role: 'Mano de obra general',
      estimatedHours: 5,
      unitPriceGTQ: 50,
    });
  });

  it('skips items without labor cost', () => {
    expect(
      calculateLaborRequirements([{ ...baseItem, laborUnitCostGTQ: 0 }]).requirements
    ).toHaveLength(0);
  });

  it('merges fallback labor with the same generic role', () => {
    const second: APUItem = { ...baseItem, id: 'apu-copy' };
    const result = calculateLaborRequirements([baseItem, second]);
    expect(result.requirements).toHaveLength(1);
    expect(result.requirements[0].subtotalGTQ).toBe(1000);
  });

  it('treats a zero-hour shift as eight hours', () => {
    const item: APUItem = {
      ...baseItem,
      breakdown: {
        labor: [{ role: 'Albañil', yieldHours: 16, unitPriceGTQ: 25, subtotalGTQ: 400 }],
      },
    };
    expect(calculateLaborRequirements([item], 0).crewDays).toBe(2);
  });

  it('flags APU spend when the project has no planned budget', () => {
    const coverage = calculateBudgetCoverage({ budgetTotal: 0, spentTotal: 0 }, [baseItem]);
    expect(coverage.plannedBudgetGTQ).toBe(0);
    expect(coverage.status).toBe('sobre-presupuesto');
  });
});

describe('deep fallback branches', () => {
  it('defaults material unit to unidad when both units are empty', () => {
    const item: APUItem = {
      ...baseItem,
      id: 'apu-empty-unit',
      unit: '',
      breakdown: {
        materials: [{ name: 'Clavos', unit: '', quantity: 3, unitPriceGTQ: 2, subtotalGTQ: 6 }],
      },
    };
    expect(calculateMaterialRequirements([item])[0].unit).toBe('unidad');
  });

  it('keeps zero-priced materials without dividing by zero', () => {
    const item: APUItem = {
      ...baseItem,
      id: 'apu-zero-price',
      breakdown: {
        materials: [{ name: 'Muestra', unit: 'und', quantity: 0, unitPriceGTQ: 0, subtotalGTQ: 0 }],
      },
    };
    expect(calculateMaterialRequirements([item])[0].unitPriceGTQ).toBe(0);
  });

  it('falls back to the APU code when the description is empty', () => {
    const item: APUItem = {
      ...baseItem,
      id: 'apu-no-desc',
      code: '09.09',
      description: '',
      unit: '',
      materialUnitCostGTQ: 10,
      quantity: 2,
    };
    const result = calculateMaterialRequirements([item]);
    expect(result[0].name).toBe('Materiales 09.09');
    expect(result[0].unit).toBe('unidad');
  });

  it('keeps zero-hour labor without dividing by zero', () => {
    const item: APUItem = {
      ...baseItem,
      id: 'apu-zero-hours',
      breakdown: {
        labor: [{ role: 'Ayudante', yieldHours: 0, unitPriceGTQ: 0, subtotalGTQ: 0 }],
      },
    };
    expect(calculateLaborRequirements([item]).requirements[0].unitPriceGTQ).toBe(0);
  });

  it('aggregates repeated breakdown labor roles', () => {
    const repeated: APUItem = {
      ...itemWithBreakdown,
      id: 'apu-2b',
      breakdown: {
        labor: [{ role: 'Albañil', yieldHours: 8, unitPriceGTQ: 25, subtotalGTQ: 200 }],
      },
    };
    const result = calculateLaborRequirements([itemWithBreakdown, repeated]);
    const albanil = result.requirements.find((requirement) => requirement.role === 'Albañil');
    expect(albanil?.estimatedHours).toBe(24);
    expect(albanil?.subtotalGTQ).toBe(600);
  });
});

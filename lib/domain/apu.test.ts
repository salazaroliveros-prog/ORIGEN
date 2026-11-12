import { describe, expect, it } from 'vitest';
import { assertAPUTotalsConsistent, normalizeAPUItem } from './apu';

const base = {
  id: 'apu-1',
  projectId: 'p-1',
  companyId: 'c-1',
  createdBy: 'u-1',
  code: '03.01',
  description: 'Muro',
  unit: 'm2',
  quantity: 10,
  materialUnitCostGTQ: 100,
  laborUnitCostGTQ: 50,
  equipmentUnitCostGTQ: 20,
  totalUnitCostGTQ: 170,
  totalPriceGTQ: 1700,
};

describe('APU invariants', () => {
  it('accepts consistent totals', () => {
    expect(() => assertAPUTotalsConsistent(base)).not.toThrow();
  });

  it('rejects inconsistent totals', () => {
    expect(() => assertAPUTotalsConsistent({ ...base, totalUnitCostGTQ: 171 })).toThrow(
      /total unit cost inconsistente/
    );
    expect(() => assertAPUTotalsConsistent({ ...base, totalPriceGTQ: 1690 })).toThrow(
      /total price inconsistente/
    );
  });

  it('normalizes and computes totals from unit components', () => {
    const normalized = normalizeAPUItem({
      ...base,
      totalUnitCostGTQ: 0,
      totalPriceGTQ: 0,
    });
    expect(normalized.totalUnitCostGTQ).toBe(170);
    expect(normalized.totalPriceGTQ).toBe(1700);
  });
});

import { describe, expect, it } from 'vitest';
import {
  GUATEMALA_DEPARTMENTS_INDEX,
  GUATEMALA_BASE_MARKET_CATALOGUE,
  calculateRegionalPrice,
  adjustApuDirectCostsForDepartment,
} from './guatemalaMarketData';

describe('GUATEMALA_DEPARTMENTS_INDEX', () => {
  it('covers at least 22 departments', () => {
    expect(Object.keys(GUATEMALA_DEPARTMENTS_INDEX).length).toBeGreaterThanOrEqual(22);
  });

  it('Guatemala (base) has all factors at 1.0', () => {
    const g = GUATEMALA_DEPARTMENTS_INDEX['Guatemala'];
    expect(g.freightFactor).toBe(1.0);
    expect(g.laborFactor).toBe(1.0);
    expect(g.overallFactor).toBe(1.0);
  });

  it('remote departments have higher freight than Guatemala', () => {
    const peten = GUATEMALA_DEPARTMENTS_INDEX['Petén'];
    const guate = GUATEMALA_DEPARTMENTS_INDEX['Guatemala'];
    expect(peten.freightFactor).toBeGreaterThan(guate.freightFactor);
  });

  it('all departments have freight 1.0–2.0 and labor 0.8–1.5', () => {
    for (const [name, d] of Object.entries(GUATEMALA_DEPARTMENTS_INDEX)) {
      expect(d.freightFactor).toBeGreaterThanOrEqual(1.0);
      expect(d.freightFactor).toBeLessThanOrEqual(2.0);
      expect(d.laborFactor).toBeGreaterThanOrEqual(0.8);
      expect(d.laborFactor).toBeLessThanOrEqual(1.5);
    }
  });

  it('each entry has required fields', () => {
    for (const [name, d] of Object.entries(GUATEMALA_DEPARTMENTS_INDEX)) {
      expect(d.code).toBeTruthy();
      expect(d.name).toBeTruthy();
      expect(d.region).toBeTruthy();
    }
  });
});

describe('GUATEMALA_BASE_MARKET_CATALOGUE', () => {
  it('has more than 10 items with positive prices', () => {
    expect(GUATEMALA_BASE_MARKET_CATALOGUE.length).toBeGreaterThan(10);
    for (const item of GUATEMALA_BASE_MARKET_CATALOGUE) {
      expect(item.basePriceGTQ).toBeGreaterThan(0);
    }
  });

  it('has unique IDs', () => {
    const ids = GUATEMALA_BASE_MARKET_CATALOGUE.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cement UGC costs ~Q89.50 in Guatemala', () => {
    const cem = GUATEMALA_BASE_MARKET_CATALOGUE.find((i) => i.id === 'mat-cem-ugc');
    expect(cem).toBeDefined();
    expect(cem!.basePriceGTQ).toBeCloseTo(89.5, 1);
  });
});

describe('calculateRegionalPrice', () => {
  it('returns base price unchanged for Guatemala', () => {
    const r = calculateRegionalPrice(1000, 'Guatemala', 'Cementos & Aglomerantes');
    expect(r.adjustedPrice).toBeCloseTo(1000, 2);
    expect(r.diffPercent).toBeCloseTo(0, 1);
  });

  it('increases cement price for Petén vs Guatemala', () => {
    const g = calculateRegionalPrice(1000, 'Guatemala', 'Cementos & Aglomerantes');
    const p = calculateRegionalPrice(1000, 'Petén', 'Cementos & Aglomerantes');
    expect(p.adjustedPrice).toBeGreaterThan(g.adjustedPrice);
    expect(p.diffPercent).toBeGreaterThan(0);
  });

  it('uses labor factor for Mano de Obra category', () => {
    const dept = GUATEMALA_DEPARTMENTS_INDEX['Quetzaltenango'];
    const r = calculateRegionalPrice(1000, 'Quetzaltenango', 'Mano de Obra (Jornal)');
    expect(r.factorUsed).toBeCloseTo(dept.laborFactor, 4);
  });

  it('falls back to Guatemala factors for unknown department', () => {
    const r = calculateRegionalPrice(500, 'UnknownDept', 'Cementos & Aglomerantes');
    expect(r.adjustedPrice).toBeCloseTo(500, 0);
  });

  it('returns 0 for 0 base price', () => {
    expect(calculateRegionalPrice(0, 'Petén', 'Cementos & Aglomerantes').adjustedPrice).toBe(0);
  });
});

describe('adjustApuDirectCostsForDepartment', () => {
  it('returns same costs for Guatemala', () => {
    const r = adjustApuDirectCostsForDepartment(500, 300, 200, 'Guatemala');
    expect(r.materialUnitCostGTQ).toBeCloseTo(500, 2);
    expect(r.laborUnitCostGTQ).toBeCloseTo(300, 2);
    expect(r.factorDiffPercent).toBe(0);
  });

  it('total == mat + lab + eq', () => {
    const r = adjustApuDirectCostsForDepartment(500, 300, 200, 'Alta Verapaz');
    const sum = r.materialUnitCostGTQ + r.laborUnitCostGTQ + r.equipmentUnitCostGTQ;
    expect(Math.abs(sum - r.totalUnitCostGTQ)).toBeLessThan(0.02);
  });

  it('Petén costs more than Guatemala', () => {
    const g = adjustApuDirectCostsForDepartment(500, 300, 200, 'Guatemala');
    const p = adjustApuDirectCostsForDepartment(500, 300, 200, 'Petén');
    expect(p.totalUnitCostGTQ).toBeGreaterThan(g.totalUnitCostGTQ);
    expect(p.factorDiffPercent).toBeGreaterThan(0);
  });

  it('handles zero inputs without throwing', () => {
    expect(() => adjustApuDirectCostsForDepartment(0, 0, 0, 'Quetzaltenango')).not.toThrow();
    const r = adjustApuDirectCostsForDepartment(0, 0, 0, 'Quetzaltenango');
    expect(r.totalUnitCostGTQ).toBe(0);
  });
});

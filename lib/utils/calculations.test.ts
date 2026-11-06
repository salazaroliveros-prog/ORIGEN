/**
 * Comprehensive test suite for calculation utilities
 * Tests all business logic: APU, Budget, Payroll, Currency, etc.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateTotalUnitCost,
  calculateLineTotal,
  validateAPUItem,
  calculateBudgetSummary,
  convertUSDtoGTQ,
  convertGTQtoUSD,
  calculateQuoteTotals,
  calculatePayroll,
  calculateBono14,
  calculateAguinaldo,
  calculateAttendanceRate,
  projectCashFlow,
  isValidAttendanceDate,
  isInRange,
  PAYROLL_RATES,
} from './calculations';
import type { APUItem, Employee } from '../types';

// ============================================================================
// APU & BUDGET CALCULATIONS TESTS
// ============================================================================

describe('APU & Budget Calculations', () => {
  describe('calculateTotalUnitCost', () => {
    it('should sum material, labor, and equipment costs correctly', () => {
      const result = calculateTotalUnitCost(100, 50, 30);
      expect(result).toBe(180);
    });

    it('should handle decimal values with precision', () => {
      const result = calculateTotalUnitCost(100.5, 50.25, 30.75);
      expect(result).toBe(181.5);
    });

    it('should handle zero values', () => {
      const result = calculateTotalUnitCost(0, 0, 0);
      expect(result).toBe(0);
    });

    it('should throw error for negative costs', () => {
      expect(() => calculateTotalUnitCost(-100, 50, 30)).toThrow('negative');
      expect(() => calculateTotalUnitCost(100, -50, 30)).toThrow('negative');
      expect(() => calculateTotalUnitCost(100, 50, -30)).toThrow('negative');
    });

    it('should throw error for non-finite values', () => {
      expect(() => calculateTotalUnitCost(NaN, 50, 30)).toThrow('finite');
      expect(() => calculateTotalUnitCost(100, Infinity, 30)).toThrow('finite');
    });
  });

  describe('calculateLineTotal', () => {
    it('should calculate line total from unit cost and quantity', () => {
      const result = calculateLineTotal(180, 10);
      expect(result).toBe(1800);
    });

    it('should handle fractional quantities', () => {
      const result = calculateLineTotal(100, 2.5);
      expect(result).toBe(250);
    });

    it('should handle zero quantity', () => {
      expect(() => calculateLineTotal(100, 0)).toThrow('positive');
    });

    it('should throw error for negative unit cost', () => {
      expect(() => calculateLineTotal(-100, 10)).toThrow('negative');
    });

    it('should throw error for negative or zero quantity', () => {
      expect(() => calculateLineTotal(100, -5)).toThrow('positive');
      expect(() => calculateLineTotal(100, 0)).toThrow('positive');
    });
  });

  describe('validateAPUItem', () => {
    const validItem: Partial<APUItem> = {
      code: 'CONC-001',
      description: 'Concrete Foundation',
      unit: 'm³',
      quantity: 10,
      materialUnitCostGTQ: 500,
      laborUnitCostGTQ: 300,
      equipmentUnitCostGTQ: 100,
    };

    it('should validate and normalize valid APU item', () => {
      const result = validateAPUItem(validItem);
      expect(result.totalUnitCostGTQ).toBe(900);
      expect(result.totalPriceGTQ).toBe(9000);
    });

    it('should throw error for invalid code', () => {
      expect(() => validateAPUItem({ ...validItem, code: '' })).toThrow('validation failed');
      expect(() => validateAPUItem({ ...validItem, code: null as unknown as string })).toThrow(
        'validation failed'
      );
    });

    it('should throw error for invalid quantity', () => {
      expect(() => validateAPUItem({ ...validItem, quantity: -5 })).toThrow('validation failed');
      expect(() => validateAPUItem({ ...validItem, quantity: 0 })).toThrow('validation failed');
    });

    it('should throw error for negative costs', () => {
      expect(() => validateAPUItem({ ...validItem, materialUnitCostGTQ: -100 })).toThrow(
        'validation failed'
      );
    });
  });

  describe('calculateBudgetSummary', () => {
    const mockItems: APUItem[] = [
      {
        id: '1',
        code: 'CONC-001',
        description: 'Concrete',
        unit: 'm³',
        quantity: 10,
        materialUnitCostGTQ: 500,
        laborUnitCostGTQ: 300,
        equipmentUnitCostGTQ: 100,
        totalUnitCostGTQ: 900,
        totalPriceGTQ: 9000,
      },
      {
        id: '2',
        code: 'STEEL-001',
        description: 'Steel Rebar',
        unit: 'ton',
        quantity: 5,
        materialUnitCostGTQ: 5000,
        laborUnitCostGTQ: 500,
        equipmentUnitCostGTQ: 200,
        totalUnitCostGTQ: 5700,
        totalPriceGTQ: 28500,
      },
    ];

    it('should calculate budget summary correctly', () => {
      const result = calculateBudgetSummary(mockItems, 15000);
      expect(result.budgetTotal).toBe(37500);
      expect(result.spentTotal).toBe(15000);
      expect(result.remaining).toBe(22500);
      expect(result.utilization).toBe(40); // 15000 / 37500 = 40%
      expect(result.variance).toBe(-22500); // Under budget
    });

    it('should handle empty items array', () => {
      const result = calculateBudgetSummary([], 1000);
      expect(result.budgetTotal).toBe(0);
      expect(result.utilization).toBe(0);
    });

    it('should handle over-budget scenario', () => {
      const result = calculateBudgetSummary(mockItems, 50000);
      expect(result.variance).toBe(12500); // Over budget
      expect(result.utilization).toBe(100); // Capped at 100%
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculateBudgetSummary(null as any, 1000)).toThrow('must be an array');
      expect(() => calculateBudgetSummary(mockItems, -100)).toThrow('non-negative');
    });
  });
});

// ============================================================================
// CURRENCY CONVERSION TESTS
// ============================================================================

describe('Currency Conversion', () => {
  describe('convertUSDtoGTQ', () => {
    it('should convert USD to GTQ using exchange rate', () => {
      const result = convertUSDtoGTQ(100, 7.85);
      expect(result).toBe(785);
    });

    it('should handle fractional amounts with rounding', () => {
      // 100.5 * 7.85 = 788.925, rounded to 2 decimals = 788.93
      const result = convertUSDtoGTQ(100.5, 7.85);
      expect(result).toBeCloseTo(788.93, 2);
    });

    it('should handle zero amount', () => {
      const result = convertUSDtoGTQ(0, 7.85);
      expect(result).toBe(0);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => convertUSDtoGTQ(-100, 7.85)).toThrow('non-negative');
      expect(() => convertUSDtoGTQ(100, -7.85)).toThrow('positive');
      expect(() => convertUSDtoGTQ(100, 0)).toThrow('positive');
    });
  });

  describe('convertGTQtoUSD', () => {
    it('should convert GTQ to USD using exchange rate', () => {
      const result = convertGTQtoUSD(785, 7.85);
      expect(result).toBe(100);
    });

    it('should handle fractional amounts with rounding', () => {
      // 788.93 / 7.85 = 100.498..., rounded to 2 decimals = 100.5
      const result = convertGTQtoUSD(788.93, 7.85);
      expect(result).toBeCloseTo(100.5, 1);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => convertGTQtoUSD(-100, 7.85)).toThrow('non-negative');
      expect(() => convertGTQtoUSD(100, 0)).toThrow('positive');
    });
  });
});

// ============================================================================
// QUOTATION CALCULATIONS TESTS
// ============================================================================

describe('Quotation Calculations', () => {
  describe('calculateQuoteTotals', () => {
    const mockItems = [
      { qty: 10, unitPriceGTQ: 100 },
      { qty: 5, unitPriceGTQ: 200 },
    ];

    it('should calculate quote totals correctly', () => {
      const result = calculateQuoteTotals(mockItems, 0, 12);
      expect(result.subtotal).toBe(2000); // 10*100 + 5*200
      expect(result.discount).toBe(0);
      expect(result.taxable).toBe(2000);
      expect(result.tax).toBe(240); // 2000 * 12%
      expect(result.total).toBe(2240);
    });

    it('should apply discount correctly', () => {
      const result = calculateQuoteTotals(mockItems, 10, 12);
      expect(result.subtotal).toBe(2000);
      expect(result.discount).toBe(200); // 2000 * 10%
      expect(result.taxable).toBe(1800);
      expect(result.tax).toBe(216); // 1800 * 12%
      expect(result.total).toBe(2016);
    });

    it('should apply variable tax rates', () => {
      const result = calculateQuoteTotals(mockItems, 0, 18);
      expect(result.tax).toBe(360); // 2000 * 18%
      expect(result.total).toBe(2360);
    });

    it('should handle empty items', () => {
      const result = calculateQuoteTotals([], 0, 12);
      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should throw error for invalid discount', () => {
      expect(() => calculateQuoteTotals(mockItems, -10, 12)).toThrow('between 0-100');
      expect(() => calculateQuoteTotals(mockItems, 150, 12)).toThrow('between 0-100');
    });
  });
});

// ============================================================================
// PAYROLL CALCULATIONS TESTS
// ============================================================================

describe('Payroll Calculations (Guatemala)', () => {
  const mockEmployee: Employee = {
    id: '1',
    name: 'Juan Pérez',
    role: 'Albañil',
    dailyRateGTQ: 250,
    igssAffiliated: true,
    phone: '5555-1234',
    dpi: '1234567890',
  };

  describe('calculatePayroll', () => {
    it('should calculate monthly payroll correctly', () => {
      const result = calculatePayroll(mockEmployee, 20);
      expect(result.grossSalary).toBe(5000); // 250 * 20
      expect(result.igssEmployeeDeduction).toBe(241.5); // 5000 * 4.83%
      expect(result.igssEmployerCost).toBe(633.5); // 5000 * 12.67%
      expect(result.netPay).toBeGreaterThan(0);
    });

    it('should calculate full month payroll', () => {
      const result = calculatePayroll(mockEmployee, 30);
      expect(result.grossSalary).toBe(7500); // 250 * 30
    });

    it('should calculate partial week payroll', () => {
      const result = calculatePayroll(mockEmployee, 5);
      expect(result.grossSalary).toBe(1250); // 250 * 5
    });

    it('should apply custom deductions', () => {
      const result1 = calculatePayroll(mockEmployee, 20, 0);
      const result2 = calculatePayroll(mockEmployee, 20, 100);
      expect(result2.netPay).toBe(result1.netPay - 100);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculatePayroll(mockEmployee, -5)).toThrow('between 0-31');
      expect(() => calculatePayroll(mockEmployee, 35)).toThrow('between 0-31');
      expect(() => calculatePayroll({ ...mockEmployee, dailyRateGTQ: -100 }, 20)).toThrow(
        'positive'
      );
    });

    it('should validate IGSS rates', () => {
      const result = calculatePayroll(mockEmployee, 20);
      const igssPercent = (result.igssEmployeeDeduction / result.grossSalary) * 100;
      expect(igssPercent).toBeCloseTo(PAYROLL_RATES.IGSS_EMPLOYEE_PERCENT, 1);
    });
  });

  describe('calculateBono14', () => {
    it('should calculate Bono 14 correctly', () => {
      const result = calculateBono14(250, 365); // Full year
      expect(result).toBeCloseTo((250 * 365) / 12, 0);
    });

    it('should handle partial year', () => {
      const result = calculateBono14(250, 180); // Half year
      expect(result).toBeCloseTo((250 * 180) / 12, 0);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculateBono14(-250, 365)).toThrow('positive');
      expect(() => calculateBono14(250, -100)).toThrow('between 0-365');
      expect(() => calculateBono14(250, 400)).toThrow('between 0-365');
    });
  });

  describe('calculateAguinaldo', () => {
    it('should calculate Aguinaldo correctly', () => {
      const result = calculateAguinaldo(250, 365);
      expect(result).toBeCloseTo((250 * 365) / 12, 0);
    });

    it('should equal Bono 14 calculation', () => {
      const bono14 = calculateBono14(250, 365);
      const aguinaldo = calculateAguinaldo(250, 365);
      expect(aguinaldo).toBe(bono14);
    });
  });

  describe('calculateAttendanceRate', () => {
    it('should calculate attendance rate correctly', () => {
      const result = calculateAttendanceRate(20, 22);
      expect(result).toBeCloseTo(90.91, 1); // 20/22 * 100
    });

    it('should handle perfect attendance', () => {
      const result = calculateAttendanceRate(22, 22);
      expect(result).toBe(100);
    });

    it('should handle zero attendance', () => {
      const result = calculateAttendanceRate(0, 22);
      expect(result).toBe(0);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculateAttendanceRate(-5, 22)).toThrow('non-negative');
      expect(() => calculateAttendanceRate(25, 0)).toThrow('positive');
    });
  });
});

// ============================================================================
// CASH FLOW PROJECTION TESTS
// ============================================================================

describe('Cash Flow Projections', () => {
  describe('projectCashFlow', () => {
    it('should project final cash flow correctly', () => {
      const result = projectCashFlow(100000, 25000, 90, 30);
      expect(result.burnRate).toBe(833.33); // 25000 / 30
      expect(result.projectedFinal).toBeGreaterThan(25000);
      expect(result.projectedFinal).toBeLessThan(100000);
    });

    it('should calculate burn rate', () => {
      const result = projectCashFlow(100000, 20000, 100, 20);
      expect(result.burnRate).toBe(1000); // 20000 / 20
    });

    it('should identify under-budget scenario', () => {
      const result = projectCashFlow(100000, 10000, 100, 50);
      expect(result.variance).toBeLessThan(0); // Under budget
    });

    it('should identify over-budget scenario', () => {
      const result = projectCashFlow(100000, 50000, 100, 25);
      expect(result.variance).toBeGreaterThan(0); // Over budget
    });

    it('should throw error for invalid elapsed days', () => {
      expect(() => projectCashFlow(100000, 10000, 100, 0)).toThrow('between 1');
      expect(() => projectCashFlow(100000, 10000, 100, 150)).toThrow('between 1');
    });
  });
});

// ============================================================================
// VALIDATION HELPER TESTS
// ============================================================================

describe('Validation Helpers', () => {
  describe('isValidAttendanceDate', () => {
    it('should accept today date', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isValidAttendanceDate(today)).toBe(true);
    });

    it('should accept past dates', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      expect(isValidAttendanceDate(yesterday)).toBe(true);
    });

    it('should reject future dates', () => {
      const tomorrowLocal = new Date();
      tomorrowLocal.setDate(tomorrowLocal.getDate() + 1);
      const tomorrow = `${tomorrowLocal.getFullYear()}-${String(tomorrowLocal.getMonth() + 1).padStart(2, '0')}-${String(tomorrowLocal.getDate()).padStart(2, '0')}`;
      expect(isValidAttendanceDate(tomorrow)).toBe(false);
    });

    it('should reject invalid dates', () => {
      expect(isValidAttendanceDate('invalid-date')).toBe(false);
      expect(isValidAttendanceDate('')).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('should validate values in range', () => {
      expect(isInRange(50, 0, 100)).toBe(true);
      expect(isInRange(0, 0, 100)).toBe(true);
      expect(isInRange(100, 0, 100)).toBe(true);
    });

    it('should reject values outside range', () => {
      expect(isInRange(-1, 0, 100)).toBe(false);
      expect(isInRange(101, 0, 100)).toBe(false);
    });

    it('should reject non-finite values', () => {
      expect(isInRange(NaN, 0, 100)).toBe(false);
      expect(isInRange(Infinity, 0, 100)).toBe(false);
    });
  });
});

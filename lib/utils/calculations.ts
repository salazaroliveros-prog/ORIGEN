/**
 * Calculation utilities for APU, Budget, and Payroll
 * Centralized business logic with comprehensive validation
 */

import { APUItem, QuoteRecord, AttendanceRecord, Employee } from '@/lib/types';

// ============================================================================
// APU & BUDGET CALCULATIONS
// ============================================================================

/**
 * Calculates total unit cost from individual components
 * @param material Material cost per unit (GTQ)
 * @param labor Labor cost per unit (GTQ)
 * @param equipment Equipment cost per unit (GTQ)
 * @returns Total unit cost (GTQ)
 */
export function calculateTotalUnitCost(material: number, labor: number, equipment: number): number {
  if (!Number.isFinite(material) || !Number.isFinite(labor) || !Number.isFinite(equipment)) {
    throw new Error('All unit costs must be finite numbers');
  }
  if (material < 0 || labor < 0 || equipment < 0) {
    throw new Error('Unit costs cannot be negative');
  }
  return Math.round((material + labor + equipment) * 100) / 100;
}

/**
 * Calculates line total from unit cost and quantity
 * @param unitCost Total unit cost (GTQ)
 * @param quantity Quantity of work units
 * @returns Line total price (GTQ)
 */
export function calculateLineTotal(unitCost: number, quantity: number): number {
  if (!Number.isFinite(unitCost) || !Number.isFinite(quantity)) {
    throw new Error('Unit cost and quantity must be finite numbers');
  }
  if (unitCost < 0) throw new Error('Unit cost cannot be negative');
  if (quantity <= 0) throw new Error('Quantity must be positive');

  return Math.round(unitCost * quantity * 100) / 100;
}

/**
 * Validates and normalizes APU item data
 * @param item APU item to validate
 * @returns Validated and normalized item
 */
export function validateAPUItem(item: Partial<APUItem>): APUItem {
  const errors: string[] = [];

  if (!item.code || typeof item.code !== 'string' || item.code.length > 64) {
    errors.push('Code must be a string ≤ 64 characters');
  }
  if (!item.description || typeof item.description !== 'string' || item.description.length > 500) {
    errors.push('Description must be a string ≤ 500 characters');
  }
  if (!item.unit || typeof item.unit !== 'string' || item.unit.length > 32) {
    errors.push('Unit must be a string ≤ 32 characters');
  }
  if (!Number.isFinite(item.quantity) || item.quantity! <= 0) {
    errors.push('Quantity must be a positive number');
  }
  if (!Number.isFinite(item.materialUnitCostGTQ) || item.materialUnitCostGTQ! < 0) {
    errors.push('Material unit cost must be a non-negative number');
  }
  if (!Number.isFinite(item.laborUnitCostGTQ) || item.laborUnitCostGTQ! < 0) {
    errors.push('Labor unit cost must be a non-negative number');
  }
  if (!Number.isFinite(item.equipmentUnitCostGTQ) || item.equipmentUnitCostGTQ! < 0) {
    errors.push('Equipment unit cost must be a non-negative number');
  }

  if (errors.length > 0) {
    throw new Error(`APU validation failed: ${errors.join('; ')}`);
  }

  const totalUnitCost = calculateTotalUnitCost(
    item.materialUnitCostGTQ!,
    item.laborUnitCostGTQ!,
    item.equipmentUnitCostGTQ!
  );
  const totalPrice = calculateLineTotal(totalUnitCost, item.quantity!);

  return {
    ...(item as APUItem),
    totalUnitCostGTQ: totalUnitCost,
    totalPriceGTQ: totalPrice,
  };
}

/**
 * Calcula el resumen del presupuesto comparando gasto real ejecutado contra
 * el total de partidas APU.
 *
 * Dimensión medida: gasto real ejecutado (expenses) vs presupuesto APU planificado.
 *
 * @param apuItems Partidas APU que constituyen el presupuesto de referencia.
 * @param totalSpent Monto total gastado ejecutado (suma de ExpenseRecord.amount).
 * @returns Objeto con:
 *   - budgetTotal: Suma de totalPriceGTQ de todas las partidas APU (presupuesto APU).
 *   - spentTotal: Monto total gastado ejecutado.
 *   - remaining: budgetTotal - spentTotal (positivo = saldo a favor).
 *   - utilization: Porcentaje de presupuesto APU consumido (0-100%).
 *   - variance: spentTotal - budgetTotal.
 *     POSITIVO = sobre gasto respecto al presupuesto APU.
 *     NEGATIVO = bajo presupuesto (quedan fondos del APU sin ejecutar).
 *
 * @see {@link calculateBudgetCoverage} en lib/domain/budgetAnalysis.ts mide una
 * dimensión distinta: presupuesto planificado del proyecto (project.budgetTotal)
 * vs total de partidas APU. No confundir ambos campos `variance`.
 */
export interface BudgetSummary {
  budgetTotal: number;
  spentTotal: number;
  remaining: number;
  /** Porcentaje de presupuesto APU consumido (0-100). */
  utilization: number;
  /** spentTotal - budgetAPU (positivo = sobre presupuesto vs APU). */
  variance: number;
}

export function calculateBudgetSummary(
  apuItems: APUItem[],
  totalSpent: number
): BudgetSummary {
  if (!Array.isArray(apuItems)) throw new Error('APU items must be an array');
  if (!Number.isFinite(totalSpent) || totalSpent < 0) {
    throw new Error('Total spent must be a non-negative number');
  }

  const budgetTotal = apuItems.reduce((sum, item) => sum + (item.totalPriceGTQ || 0), 0);
  const remaining = budgetTotal - totalSpent;
  const utilization = budgetTotal > 0 ? Math.round((totalSpent / budgetTotal) * 10000) / 100 : 0;
  const variance = totalSpent - budgetTotal;

  return {
    budgetTotal: Math.round(budgetTotal * 100) / 100,
    spentTotal: Math.round(totalSpent * 100) / 100,
    remaining: Math.round(remaining * 100) / 100,
    utilization: Math.min(utilization, 100), // Cap at 100%
    variance: Math.round(variance * 100) / 100,
  };
}

// ============================================================================
// CURRENCY CONVERSION
// ============================================================================

/**
 * Converts USD to GTQ using exchange rate
 * @param amountUSD Amount in USD
 * @param exchangeRate GTQ per USD (e.g., 7.85)
 * @returns Amount in GTQ
 */
export function convertUSDtoGTQ(amountUSD: number, exchangeRate: number): number {
  if (!Number.isFinite(amountUSD) || amountUSD < 0) {
    throw new Error('Amount in USD must be a non-negative number');
  }
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error('Exchange rate must be a positive number');
  }
  return Math.round(amountUSD * exchangeRate * 100) / 100;
}

/**
 * Converts GTQ to USD using exchange rate
 */
export function convertGTQtoUSD(amountGTQ: number, exchangeRate: number): number {
  if (!Number.isFinite(amountGTQ) || amountGTQ < 0) {
    throw new Error('Amount in GTQ must be a non-negative number');
  }
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error('Exchange rate must be a positive number');
  }
  return Math.round((amountGTQ / exchangeRate) * 100) / 100;
}

// ============================================================================
// QUOTATION CALCULATIONS
// ============================================================================

/**
 * Calculates quotation totals with tax and discount
 */
export function calculateQuoteTotals(
  items: Array<{ qty: number; unitPriceGTQ: number }>,
  discountPercent: number = 0,
  taxPercent: number = 12
): {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
} {
  if (!Array.isArray(items)) throw new Error('Items must be an array');
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    throw new Error('Discount percent must be between 0-100');
  }
  if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
    throw new Error('Tax percent must be between 0-100');
  }

  const subtotal = items.reduce((sum, item) => {
    if (!Number.isFinite(item.qty) || item.qty < 0) throw new Error('Invalid quantity');
    if (!Number.isFinite(item.unitPriceGTQ) || item.unitPriceGTQ < 0) {
      throw new Error('Invalid unit price');
    }
    return sum + item.qty * item.unitPriceGTQ;
  }, 0);

  const discount = Math.round(((subtotal * discountPercent) / 100) * 100) / 100;
  const taxable = subtotal - discount;
  const tax = Math.round(((taxable * taxPercent) / 100) * 100) / 100;
  const total = taxable + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    taxable: Math.round(taxable * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// ============================================================================
// PAYROLL CALCULATIONS (GUATEMALA - IGSS COMPLIANT)
// ============================================================================

/**
 * Guatemalan payroll rates (configurable but using standard legal rates)
 */
export const PAYROLL_RATES = {
  IGSS_EMPLOYEE_PERCENT: 4.83, // Employee IGSS deduction (Acuerdo 1118 IGSS)
  IGSS_EMPLOYER_PERCENT: 12.67, // Employer IGSS contribution (10.67% IGSS + 1% IRTRA + 1% INTECAP)
  IRTRA_PERCENT: 1.0, // IRTRA (Decreto 1528) — 1% sobre salario afecto
  INTECAP_PERCENT: 1.0, // INTECAP — 1% sobre salario afecto
  BONO_14_MONTHS: 1 / 12, // Bono 14 = 1 month per 12 worked (Decreto 42-92)
  AGUINALDO_MONTHS: 1 / 12, // Aguinaldo = 1 month per 12 worked (Decreto 76-78)
};

/**
 * Calculates employee payroll for a given period
 * @param employee Employee record with daily rate
 * @param daysWorked Days worked in period
 * @param customDeductions Optional custom deductions (GTQ)
 * @returns Payroll breakdown
 */
export function calculatePayroll(
  employee: Employee,
  daysWorked: number,
  customDeductions: number = 0
): {
  grossSalary: number;
  igssEmployeeDeduction: number;
  igssEmployerCost: number;
  taxableIncome: number;
  incomeTax: number;
  irtraDeduction: number;
  intecapDeduction: number;
  customDeductions: number;
  netPay: number;
  employerTotalCost: number;
} {
  if (!Number.isFinite(employee.dailyRateGTQ) || employee.dailyRateGTQ <= 0) {
    throw new Error('Daily rate must be a positive number');
  }
  if (!Number.isFinite(daysWorked) || daysWorked < 0 || daysWorked > 31) {
    throw new Error('Days worked must be between 0-31');
  }
  if (!Number.isFinite(customDeductions) || customDeductions < 0) {
    throw new Error('Custom deductions must be non-negative');
  }

  const grossSalary = Math.round(employee.dailyRateGTQ * daysWorked * 100) / 100;
  const igssEmployeeDeduction =
    Math.round(((grossSalary * PAYROLL_RATES.IGSS_EMPLOYEE_PERCENT) / 100) * 100) / 100;
  const igssEmployerCost =
    Math.round(((grossSalary * PAYROLL_RATES.IGSS_EMPLOYER_PERCENT) / 100) * 100) / 100;
  const irtraDeduction =
    Math.round(((grossSalary * PAYROLL_RATES.IRTRA_PERCENT) / 100) * 100) / 100;
  const intecapDeduction =
    Math.round(((grossSalary * PAYROLL_RATES.INTECAP_PERCENT) / 100) * 100) / 100;

  const taxableIncome = grossSalary - igssEmployeeDeduction - irtraDeduction - intecapDeduction;
  const incomeTax = calculateGuatemalanIncomeTax(taxableIncome);

  const netPay = taxableIncome - incomeTax - customDeductions;
  const employerTotalCost = grossSalary + igssEmployerCost;

  return {
    grossSalary,
    igssEmployeeDeduction,
    igssEmployerCost,
    taxableIncome,
    incomeTax,
    irtraDeduction,
    intecapDeduction,
    customDeductions,
    netPay: Math.max(netPay, 0), // Ensure non-negative
    employerTotalCost,
  };
}

/**
 * Calculates Guatemalan income tax using 2024 progressive rates
 * Progressive tax brackets (rates vary by income level)
 */
function calculateGuatemalanIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;

  // 2024 Guatemalan income tax brackets (ISR)
  const brackets = [
    { min: 0, max: 88_895.24, rate: 0.05, fixed: 0 },
    { min: 88_895.24, max: 188_823.77, rate: 0.1, fixed: 4_444.76 },
    { min: 188_823.77, max: Infinity, rate: 0.2, fixed: 14_994.78 },
  ];

  for (const bracket of brackets) {
    if (taxableIncome >= bracket.min && taxableIncome <= bracket.max) {
      return Math.round(((taxableIncome - bracket.min) * bracket.rate + bracket.fixed) * 100) / 100;
    }
  }

  return 0;
}

/**
 * Calculates Bono 14 (Christmas bonus) accrual
 * @param dailyRate Daily rate in GTQ
 * @param daysWorked Days worked in year (max 365)
 * @returns Bono 14 amount (1/12 of annual)
 */
export function calculateBono14(dailyRate: number, daysWorked: number = 365): number {
  if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
    throw new Error('Daily rate must be positive');
  }
  if (!Number.isFinite(daysWorked) || daysWorked < 0 || daysWorked > 365) {
    throw new Error('Days worked must be between 0-365');
  }

  const annualSalary = dailyRate * daysWorked;
  return Math.round(annualSalary * PAYROLL_RATES.BONO_14_MONTHS * 100) / 100;
}

/**
 * Calculates Aguinaldo (year-end bonus)
 * @param dailyRate Daily rate in GTQ
 * @param daysWorked Days worked in year (max 365)
 * @returns Aguinaldo amount (1/12 of annual, like Bono 14)
 */
export function calculateAguinaldo(dailyRate: number, daysWorked: number = 365): number {
  if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
    throw new Error('Daily rate must be positive');
  }
  if (!Number.isFinite(daysWorked) || daysWorked < 0 || daysWorked > 365) {
    throw new Error('Days worked must be between 0-365');
  }

  const annualSalary = dailyRate * daysWorked;
  return Math.round(annualSalary * PAYROLL_RATES.AGUINALDO_MONTHS * 100) / 100;
}

/**
 * Calculates attendance rate percentage
 * @param daysPresent Days marked as present/worked
 * @param totalWorkDays Total work days in period
 * @returns Attendance rate (0-100%)
 */
export function calculateAttendanceRate(daysPresent: number, totalWorkDays: number): number {
  if (!Number.isFinite(daysPresent) || daysPresent < 0) {
    throw new Error('Days present must be non-negative');
  }
  if (!Number.isFinite(totalWorkDays) || totalWorkDays <= 0) {
    throw new Error('Total work days must be positive');
  }

  return Math.round((daysPresent / totalWorkDays) * 10000) / 100; // 2 decimal places
}

// ============================================================================
// CASH FLOW & BUDGET PROJECTIONS
// ============================================================================

/**
 * Projects cash flow based on historical spending rate
 */
export function projectCashFlow(
  budgetTotal: number,
  spent: number,
  totalDays: number,
  elapsedDays: number
): {
  projectedFinal: number;
  variance: number;
  burnRate: number; // GTQ per day
} {
  if (elapsedDays <= 0 || elapsedDays > totalDays) {
    throw new Error('Elapsed days must be between 1 and total days');
  }

  const burnRate = Math.round((spent / elapsedDays) * 100) / 100;
  const remainingDays = totalDays - elapsedDays;
  const projectedAdditional = burnRate * remainingDays;
  const projectedFinal = Math.round((spent + projectedAdditional) * 100) / 100;
  const variance = Math.round((projectedFinal - budgetTotal) * 100) / 100;

  return {
    projectedFinal,
    variance, // negative = under budget, positive = over budget
    burnRate,
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates attendance record date is not in future
 */
export function isValidAttendanceDate(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();

  if (isNaN(date.getTime())) return false;

  // Compare dates at day precision using UTC to avoid timezone offset issues
  const dateUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  return dateUtc <= todayUtc;
}

/**
 * Validates numeric range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

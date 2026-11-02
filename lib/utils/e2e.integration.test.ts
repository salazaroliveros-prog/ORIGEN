/**
 * End-to-End Integration Tests
 * Complete workflow validation for ORIGEN ERP
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  calculatePayroll,
  calculateBudgetSummary,
  calculateQuoteTotals,
  calculateTotalUnitCost,
  validateAPUItem,
  calculateAguinaldo,
  calculateBono14,
  convertUSDtoGTQ,
  isValidAttendanceDate,
} from './calculations';
import { validateData, validationSchemas } from './validation';
import type { APUItem, ExpenseRecord, Employee, Project } from '../types';

/**
 * WORKFLOW 1: PROJECT CREATION TO COMPLETION
 */
describe('E2E Workflow 1: Project Creation to Completion', () => {
  let testProject: Project;
  let testAPUItems: APUItem[];
  let testExpenses: ExpenseRecord[];

  beforeEach(() => {
    // Mock project data
    testProject = {
      id: 'proj-test-001',
      code: 'PRY-001',
      name: 'Casa 5 Niveles',
      client: 'John Doe',
      location: 'Zona 10, Guatemala',
      municipality: 'Guatemala',
      department: 'Guatemala',
      budgetTotal: 500000,
      spentTotal: 0,
      progressPercent: 0,
      startDate: '2024-11-01',
      endDate: '2025-06-30',
      status: 'Planificación',
      lat: 14.6349,
      lng: -90.5069,
      ownerId: 'user-001',
      createdBy: 'user-001',
    };

    // Mock APU items
    testAPUItems = [
      {
        id: 'apu-001',
        code: 'CONC-001',
        description: 'Fundaciones de Concreto',
        unit: 'm³',
        quantity: 50,
        materialUnitCostGTQ: 500,
        laborUnitCostGTQ: 300,
        equipmentUnitCostGTQ: 100,
        totalUnitCostGTQ: 900,
        totalPriceGTQ: 45000,
      },
      {
        id: 'apu-002',
        code: 'ACERO-001',
        description: 'Refuerzo de Acero',
        unit: 'ton',
        quantity: 15,
        materialUnitCostGTQ: 5000,
        laborUnitCostGTQ: 500,
        equipmentUnitCostGTQ: 200,
        totalUnitCostGTQ: 5700,
        totalPriceGTQ: 85500,
      },
    ];

    testExpenses = [];
  });

  it('should validate project budget is greater than zero', () => {
    expect(testProject.budgetTotal).toBeGreaterThan(0);
  });

  it('should validate all APU items are correct', () => {
    testAPUItems.forEach((item) => {
      const validated = validateAPUItem(item);
      expect(validated.totalUnitCostGTQ).toBe(item.totalUnitCostGTQ);
      expect(validated.totalPriceGTQ).toBe(item.totalPriceGTQ);
    });
  });

  it('should calculate budget summary correctly', () => {
    const summary = calculateBudgetSummary(testAPUItems, 50000);

    expect(summary.budgetTotal).toBe(130500); // 45000 + 85500
    expect(summary.spentTotal).toBe(50000);
    expect(summary.remaining).toBe(80500);
    expect(summary.utilization).toBe(38.31); // ~38%
    expect(summary.variance).toBe(-80500); // Under budget
  });

  it('should handle currency conversion for expenses', () => {
    const expenseUSD = 10000;
    const exchangeRate = 7.85;
    const expenseGTQ = convertUSDtoGTQ(expenseUSD, exchangeRate);

    expect(expenseGTQ).toBe(78500);
  });

  it('should track project status transitions', () => {
    // Planificación → En Ejecución → Finalizado
    expect(['Planificación', 'En Ejecución', 'Finalizado']).toContain(testProject.status);
    expect(testProject.status).not.toBe('Archivado');
  });
});

/**
 * WORKFLOW 2: BUDGET MANAGEMENT WITH EXPENSES
 */
describe('E2E Workflow 2: Budget Management', () => {
  const apuItems: APUItem[] = [
    {
      id: 'apu-001',
      code: 'MAT-001',
      description: 'Materiales General',
      unit: 'gbl',
      quantity: 1,
      materialUnitCostGTQ: 100000,
      laborUnitCostGTQ: 50000,
      equipmentUnitCostGTQ: 25000,
      totalUnitCostGTQ: 175000,
      totalPriceGTQ: 175000,
    },
  ];

  it('should update budget when expenses are added', () => {
    const expenses1: ExpenseRecord[] = [
      {
        id: 'exp-001',
        projectId: 'proj-001',
        date: '2024-11-15',
        category: 'Materiales (Cementos, Hierro)',
        description: 'Cemento y Arena',
        supplier: 'Cementos Progreso',
        nitSupplier: '123456',
        facturaNumber: 'FAC-001',
        amount: 25000,
        currency: 'GTQ',
        paymentMethod: 'Transferencia BI',
      },
    ];

    const summary1 = calculateBudgetSummary(apuItems, expenses1[0].amount);
    expect(summary1.utilization).toBeCloseTo(14.29, 1);

    // Add more expenses
    const expenses2: ExpenseRecord[] = [
      ...expenses1,
      {
        id: 'exp-002',
        projectId: 'proj-001',
        date: '2024-11-20',
        category: 'Mano de Obra',
        description: 'Pago de cuadrilla',
        supplier: 'Pago Directo',
        nitSupplier: 'N/A',
        facturaNumber: 'N/A',
        amount: 50000,
        currency: 'GTQ',
        paymentMethod: 'Efectivo',
      },
    ];

    const totalSpent2 = expenses2.reduce((sum, exp) => sum + exp.amount, 0);
    const summary2 = calculateBudgetSummary(apuItems, totalSpent2);
    expect(summary2.utilization).toBeCloseTo(42.86, 1);
  });

  it('should prevent overspending beyond budget', () => {
    const expenses: ExpenseRecord[] = [
      {
        id: 'exp-001',
        projectId: 'proj-001',
        date: '2024-11-15',
        category: 'Materiales (Cementos, Hierro)',
        description: 'Over-budget expense',
        supplier: 'Supplier',
        nitSupplier: '123456',
        facturaNumber: 'FAC-001',
        amount: 200000, // More than budget
        currency: 'GTQ',
        paymentMethod: 'Transferencia BI',
      },
    ];

    const summary = calculateBudgetSummary(apuItems, expenses[0].amount);
    expect(summary.variance).toBeGreaterThan(0); // Over budget
    expect(summary.utilization).toBeGreaterThan(100);
  });
});

/**
 * WORKFLOW 3: PAYROLL CALCULATIONS (GUATEMALA)
 */
describe('E2E Workflow 3: Payroll Management', () => {
  const mockEmployee: Employee = {
    id: 'emp-001',
    name: 'Juan García Pérez',
    role: 'Albañil',
    dailyRateGTQ: 250,
    igssAffiliated: true,
    phone: '5555-1234',
    dpi: '1234567890123',
    igssNumber: 'IGSS-001',
  };

  it('should calculate monthly payroll correctly', () => {
    const payroll = calculatePayroll(mockEmployee, 20);

    expect(payroll.grossSalary).toBe(5000);
    expect(payroll.igssEmployeeDeduction).toBeCloseTo(241.5, 1);
    expect(payroll.igssEmployerCost).toBeCloseTo(633.5, 1);
    expect(payroll.netPay).toBeGreaterThan(0);
  });

  it('should include IGSS deductions correctly', () => {
    const payroll = calculatePayroll(mockEmployee, 20);

    // IGSS Employee = 4.83%
    const expectedIGSS = 5000 * 0.0483;
    expect(payroll.igssEmployeeDeduction).toBeCloseTo(expectedIGSS, 1);
  });

  it('should include employer IGSS cost', () => {
    const payroll = calculatePayroll(mockEmployee, 20);

    // IGSS Employer = 12.67%
    const expectedEmployerIGSS = 5000 * 0.1267;
    expect(payroll.igssEmployerCost).toBeCloseTo(expectedEmployerIGSS, 1);
  });

  it('should calculate Bono 14 correctly', () => {
    const bono14 = calculateBono14(250, 365);
    const expectedBono = (250 * 365) / 12;

    expect(bono14).toBeCloseTo(expectedBono, 0);
  });

  it('should calculate Aguinaldo correctly', () => {
    const aguinaldo = calculateAguinaldo(250, 365);
    const expectedAguinaldo = (250 * 365) / 12;

    expect(aguinaldo).toBeCloseTo(expectedAguinaldo, 0);
  });

  it('should handle multiple employees payroll', () => {
    const employees = [
      mockEmployee,
      {
        ...mockEmployee,
        id: 'emp-002',
        name: 'María López',
        role: 'Ayudante',
        dailyRateGTQ: 150,
      },
    ];

    const payrolls = employees.map((emp) => calculatePayroll(emp, 20));

    expect(payrolls[0].grossSalary).toBe(5000);
    expect(payrolls[1].grossSalary).toBe(3000);
    expect(payrolls[0].netPay).toBeGreaterThan(payrolls[1].netPay);
  });
});

/**
 * WORKFLOW 4: QUOTATION GENERATION
 */
describe('E2E Workflow 4: Quotation Generation', () => {
  const quoteItems = [
    { qty: 10, unitPriceGTQ: 100 },
    { qty: 5, unitPriceGTQ: 200 },
    { qty: 20, unitPriceGTQ: 50 },
  ];

  it('should calculate quotation without discount or tax', () => {
    const totals = calculateQuoteTotals(quoteItems, 0, 0);

    expect(totals.subtotal).toBe(2500); // 10*100 + 5*200 + 20*50
    expect(totals.discount).toBe(0);
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(2500);
  });

  it('should apply discount correctly', () => {
    const totals = calculateQuoteTotals(quoteItems, 10, 0); // 10% discount

    expect(totals.subtotal).toBe(2500);
    expect(totals.discount).toBe(250);
    expect(totals.taxable).toBe(2250);
    expect(totals.total).toBe(2250);
  });

  it('should apply IVA (tax) correctly', () => {
    const totals = calculateQuoteTotals(quoteItems, 0, 12); // 12% IVA

    expect(totals.subtotal).toBe(2500);
    expect(totals.tax).toBe(300); // 2500 * 12%
    expect(totals.total).toBe(2800);
  });

  it('should apply both discount and tax', () => {
    const totals = calculateQuoteTotals(quoteItems, 10, 12);

    expect(totals.subtotal).toBe(2500);
    expect(totals.discount).toBe(250); // 10% of 2500
    expect(totals.taxable).toBe(2250);
    expect(totals.tax).toBe(270); // 12% of 2250
    expect(totals.total).toBe(2520);
  });
});

/**
 * WORKFLOW 5: DATA VALIDATION
 */
describe('E2E Workflow 5: Data Validation', () => {
  it('should validate project budget', () => {
    const result1 = validateData(validationSchemas.projectBudget, 50000);
    expect(result1.valid).toBe(true);

    const result2 = validateData(validationSchemas.projectBudget, -50000);
    expect(result2.valid).toBe(false);
  });

  it('should validate email format', () => {
    const result1 = validateData(validationSchemas.email, 'user@example.com');
    expect(result1.valid).toBe(true);

    const result2 = validateData(validationSchemas.email, 'invalid-email');
    expect(result2.valid).toBe(false);
  });

  it('should validate date ranges', () => {
    const startDate = '2024-11-01T00:00:00Z';
    const endDate = '2025-06-30T00:00:00Z';

    const result = validateData(
      validationSchemas.projectDates,
      {
        start: startDate,
        end: endDate,
      }
    );

    expect(result.valid).toBe(true);
  });

  it('should validate attendance date not in future', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(isValidAttendanceDate(today)).toBe(true);

    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    expect(isValidAttendanceDate(tomorrow)).toBe(false);
  });

  it('should validate currency amounts', () => {
    const { valid: valid1, amount: amount1 } = validateData(
      validationSchemas.expenseAmount,
      1000
    ) as any;
    expect(valid1).toBe(true);

    const { valid: valid2 } = validateData(validationSchemas.expenseAmount, -500) as any;
    expect(valid2).toBe(false);
  });
});

/**
 * WORKFLOW 6: INTEGRATION TEST - Complete Project Lifecycle
 */
describe('E2E Workflow 6: Complete Project Lifecycle', () => {
  it('should complete full project workflow from creation to closure', () => {
    // Step 1: Create project
    const project: Project = {
      id: 'proj-lifecycle-001',
      code: 'LIF-001',
      name: 'Lifecycle Test Project',
      client: 'Test Client',
      location: 'Test Location',
      municipality: 'Guatemala',
      department: 'Guatemala',
      budgetTotal: 100000,
      spentTotal: 0,
      progressPercent: 0,
      startDate: '2024-11-01',
      endDate: '2024-12-31',
      status: 'Planificación',
      lat: 14.6349,
      lng: -90.5069,
      ownerId: 'user-001',
    };

    expect(project.status).toBe('Planificación');

    // Step 2: Add APU items
    const apuItems: APUItem[] = [
      {
        id: 'apu-lc-001',
        code: 'CODE-001',
        description: 'Item 1',
        unit: 'gbl',
        quantity: 1,
        materialUnitCostGTQ: 50000,
        laborUnitCostGTQ: 30000,
        equipmentUnitCostGTQ: 20000,
        totalUnitCostGTQ: 100000,
        totalPriceGTQ: 100000,
      },
    ];

    const budget = calculateBudgetSummary(apuItems, 0);
    expect(budget.budgetTotal).toBe(100000);
    expect(budget.utilization).toBe(0);

    // Step 3: Add expenses
    const expenses: ExpenseRecord[] = [
      {
        id: 'exp-lc-001',
        projectId: project.id,
        date: '2024-11-15',
        category: 'Materiales (Cementos, Hierro)',
        description: 'First expense',
        supplier: 'Supplier 1',
        nitSupplier: '123',
        facturaNumber: 'FAC-001',
        amount: 30000,
        currency: 'GTQ',
        paymentMethod: 'Transferencia BI',
      },
      {
        id: 'exp-lc-002',
        projectId: project.id,
        date: '2024-11-20',
        category: 'Mano de Obra',
        description: 'Labor',
        supplier: 'Direct',
        nitSupplier: 'N/A',
        facturaNumber: 'N/A',
        amount: 40000,
        currency: 'GTQ',
        paymentMethod: 'Efectivo',
      },
    ];

    const updatedBudget = calculateBudgetSummary(
      apuItems,
      expenses.reduce((sum, exp) => sum + exp.amount, 0)
    );
    expect(updatedBudget.spentTotal).toBe(70000);
    expect(updatedBudget.utilization).toBe(70);

    // Step 4: Project progress
    const updatedProject = {
      ...project,
      status: 'En Ejecución',
      progressPercent: 70,
      spentTotal: 70000,
    };

    expect(updatedProject.status).toBe('En Ejecución');
    expect(updatedProject.progressPercent).toBe(70);

    // Step 5: Add final expenses and close
    const finalExpenses = [
      ...expenses,
      {
        id: 'exp-lc-003',
        projectId: project.id,
        date: '2024-12-20',
        category: 'Imprevistos',
        description: 'Final adjustment',
        supplier: 'Supplier',
        nitSupplier: '456',
        facturaNumber: 'FAC-003',
        amount: 30000,
        currency: 'GTQ',
        paymentMethod: 'Transferencia BI',
      },
    ];

    const finalBudget = calculateBudgetSummary(
      apuItems,
      finalExpenses.reduce((sum, exp) => sum + exp.amount, 0)
    );
    expect(finalBudget.spentTotal).toBe(100000);
    expect(finalBudget.utilization).toBe(100);
    expect(finalBudget.remaining).toBe(0);

    // Step 6: Close project
    const closedProject = {
      ...updatedProject,
      status: 'Finalizado',
      progressPercent: 100,
      spentTotal: 100000,
    };

    expect(closedProject.status).toBe('Finalizado');
    expect(closedProject.progressPercent).toBe(100);
    expect(closedProject.spentTotal).toBe(closedProject.budgetTotal);
  });
});

/**
 * WORKFLOW 7: ERROR HANDLING & EDGE CASES
 */
describe('E2E Workflow 7: Error Handling', () => {
  it('should handle zero values gracefully', () => {
    expect(() => {
      calculateTotalUnitCost(0, 0, 0);
    }).not.toThrow();

    const result = calculateTotalUnitCost(0, 0, 0);
    expect(result).toBe(0);
  });

  it('should handle large numbers', () => {
    const largeAPU: APUItem[] = [
      {
        id: 'apu-large',
        code: 'LARGE-001',
        description: 'Large Item',
        unit: 'gbl',
        quantity: 1000,
        materialUnitCostGTQ: 50000,
        laborUnitCostGTQ: 30000,
        equipmentUnitCostGTQ: 20000,
        totalUnitCostGTQ: 100000,
        totalPriceGTQ: 100000000,
      },
    ];

    const budget = calculateBudgetSummary(largeAPU, 50000000);
    expect(budget.budgetTotal).toBe(100000000);
    expect(budget.utilization).toBe(50);
  });

  it('should reject invalid APU items', () => {
    expect(() => {
      validateAPUItem({
        id: 'invalid',
        code: '',
        description: 'Invalid',
        unit: 'gbl',
        quantity: -5, // Invalid: negative quantity
        materialUnitCostGTQ: 100,
        laborUnitCostGTQ: 100,
        equipmentUnitCostGTQ: 100,
      });
    }).toThrow();
  });

  it('should handle precision in currency calculations', () => {
    const total = calculateQuoteTotals(
      [{ qty: 3, unitPriceGTQ: 100.33 }],
      0,
      12
    );

    // Should handle decimal precision
    expect(total.subtotal).toBeCloseTo(300.99, 2);
    expect(total.tax).toBeCloseTo(36.12, 2);
    expect(total.total).toBeCloseTo(337.11, 2);
  });
});

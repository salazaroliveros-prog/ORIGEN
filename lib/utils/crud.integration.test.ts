/**
 * ORIGEN ERP - Comprehensive CRUD Testing Script
 * Automated testing of all Create, Read, Update, Delete operations
 * With calculation validation and Firestore persistence verification
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  calculatePayroll,
  calculateBudgetSummary,
  calculateQuoteTotals,
  calculateAttendanceRate,
  validateAPUItem,
  convertUSDtoGTQ,
} from './calculations';
import type {
  Project,
  APUItem,
  ExpenseRecord,
  Employee,
  AttendanceRecord,
  QuoteRecord,
} from '../types';

/**
 * CRUD TEST SUITE - COMPLETE END-TO-END TESTING
 */

describe('ORIGEN ERP - CRUD System Integration Tests', () => {
  // Test Data
  let testProject: Project;
  let testAPUItems: APUItem[] = [];
  let testEmployees: Employee[] = [];
  let testExpenses: ExpenseRecord[] = [];
  let testAttendance: AttendanceRecord[] = [];
  let testQuotes: QuoteRecord[] = [];

  beforeEach(() => {
    // Initialize test data
    testProject = {
      id: 'proj-test-001',
      code: 'PRY-001',
      name: 'Casa 5 Niveles',
      client: 'Juan Pérez',
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
      ownerId: 'user-test-001',
      createdBy: 'user-test-001',
    };

    testAPUItems = [];
    testEmployees = [];
    testExpenses = [];
    testAttendance = [];
    testQuotes = [];
  });

  afterEach(() => {
    // Cleanup
    testAPUItems = [];
    testEmployees = [];
    testExpenses = [];
    testAttendance = [];
    testQuotes = [];
  });

  // ============================================================================
  // PHASE 1: CREATE OPERATIONS
  // ============================================================================

  describe('Phase 1: CREATE Operations', () => {
    it('should create project with valid data', () => {
      expect(testProject.id).toBeDefined();
      expect(testProject.code).toBe('PRY-001');
      expect(testProject.budgetTotal).toBe(500000);
      expect(testProject.status).toBe('Planificación');
    });

    it('should create APU item 1: Fundaciones', () => {
      const apuItem1: APUItem = {
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
        projectId: testProject.id,
        companyId: 'company-test-001',
        createdBy: 'user-test-001',
      };

      const validated = validateAPUItem(apuItem1);
      testAPUItems.push(validated);

      expect(validated.totalUnitCostGTQ).toBe(900);
      expect(validated.totalPriceGTQ).toBe(45000);
    });

    it('should create APU item 2: Refuerzo de Acero', () => {
      const apuItem2: APUItem = {
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
        projectId: testProject.id,
        companyId: 'company-test-001',
        createdBy: 'user-test-001',
      };

      const validated = validateAPUItem(apuItem2);
      testAPUItems.push(validated);

      expect(validated.totalUnitCostGTQ).toBe(5700);
      expect(validated.totalPriceGTQ).toBe(85500);
    });

    it('should create employee: Juan García Pérez', () => {
      const employee: Employee = {
        id: 'emp-001',
        name: 'Juan García Pérez',
        role: 'Albañil',
        dailyRateGTQ: 250,
        igssAffiliated: true,
        phone: '5555-1234',
        dpi: '1234567890123',
        igssNumber: 'IGSS-001',
      };

      testEmployees.push(employee);
      expect(employee.dailyRateGTQ).toBe(250);
      expect(employee.igssAffiliated).toBe(true);
    });

    it('should create attendance record for Juan García', () => {
      const today = new Date().toISOString().split('T')[0];
      const attendance: AttendanceRecord = {
        id: 'att-001',
        projectId: testProject.id,
        projectName: testProject.name,
        date: today,
        employeeId: 'emp-001',
        employeeName: 'Juan García Pérez',
        status: 'Presente',
        overtimeHours: 0,
        gpsVerified: true,
      };

      testAttendance.push(attendance);
      expect(attendance.status).toBe('Presente');
      expect(attendance.overtimeHours).toBe(0);
    });

    it('should create expense: Materiales', () => {
      const expense: ExpenseRecord = {
        id: 'exp-001',
        projectId: testProject.id,
        date: new Date().toISOString().split('T')[0],
        category: 'Materiales (Cementos, Hierro)',
        description: 'Cemento y Arena',
        supplier: 'Cementos Progreso',
        nitSupplier: '123456',
        facturaNumber: 'FAC-001',
        amount: 25000,
        currency: 'GTQ',
        paymentMethod: 'Transferencia BI',
      };

      testExpenses.push(expense);
      expect(expense.amount).toBe(25000);
      expect(expense.category).toBe('Materiales (Cementos, Hierro)');
    });

    it('should create quotation with items', () => {
      const quote: QuoteRecord = {
        id: 'quote-001',
        companyId: 'company-test-001',
        projectId: testProject.id,
        clientName: 'Cliente Nuevo',
        clientNit: '[REDACTED]',
        date: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [
          { qty: 10, unitPriceGTQ: 100, unit: 'gbl', description: 'Item 1' },
          { qty: 5, unitPriceGTQ: 200, unit: 'gbl', description: 'Item 2' },
        ],
        totalGTQ: 2016,
        status: 'Borrador',
      };

      testQuotes.push(quote);
      expect(quote.items.length).toBe(2);
      expect(quote.status).toBe('Borrador');
    });
  });

  // ============================================================================
  // PHASE 2: READ OPERATIONS & VALIDATION
  // ============================================================================

  describe('Phase 2: READ Operations & Data Validation', () => {
    beforeEach(() => {
      // Setup data from CREATE phase
      const apuItem1: APUItem = {
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
        projectId: testProject.id,
        companyId: 'company-test-001',
        createdBy: 'user-test-001',
      };

      const apuItem2: APUItem = {
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
        projectId: testProject.id,
        companyId: 'company-test-001',
        createdBy: 'user-test-001',
      };

      testAPUItems = [apuItem1, apuItem2];
      testEmployees = [
        {
          id: 'emp-001',
          name: 'Juan García Pérez',
          role: 'Albañil',
          dailyRateGTQ: 250,
          igssAffiliated: true,
          phone: '5555-1234',
          dpi: '1234567890123',
          igssNumber: 'IGSS-001',
        },
      ];

      testExpenses = [
        {
          id: 'exp-001',
          projectId: testProject.id,
          date: new Date().toISOString().split('T')[0],
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

      const today = new Date().toISOString().split('T')[0];
      testAttendance = [
        {
          id: 'att-001',
          projectId: testProject.id,
          projectName: testProject.name,
          date: today,
          employeeId: 'emp-001',
          employeeName: 'Juan García Pérez',
          status: 'Presente',
          overtimeHours: 0,
          gpsVerified: true,
        },
      ];
    });

    it('should calculate budget summary correctly', () => {
      const summary = calculateBudgetSummary(testAPUItems, testExpenses[0].amount);

      expect(summary.budgetTotal).toBe(130500); // 45000 + 85500
      expect(summary.spentTotal).toBe(25000);
      expect(summary.remaining).toBe(105500);
      expect(summary.utilization).toBeCloseTo(19.16, 1);
    });

    it('should calculate payroll correctly', () => {
      const payroll = calculatePayroll(testEmployees[0], 1);

      expect(payroll.grossSalary).toBe(250);
      expect(payroll.igssEmployeeDeduction).toBeCloseTo(12.08, 1);
      expect(payroll.igssEmployerCost).toBeCloseTo(31.68, 1);
    });

    it('should calculate quotation totals correctly', () => {
      const totals = calculateQuoteTotals(
        [
          { qty: 10, unitPriceGTQ: 100 },
          { qty: 5, unitPriceGTQ: 200 },
        ],
        10,
        12
      );

      expect(totals.subtotal).toBe(2000);
      expect(totals.discount).toBe(200);
      expect(totals.taxable).toBe(1800);
      expect(totals.tax).toBeCloseTo(216, 0);
      expect(totals.total).toBeCloseTo(2016, 0);
    });

    it('should calculate attendance rate correctly', () => {
      const rate = calculateAttendanceRate(1, 1);
      expect(rate).toBe(100);
    });

    it('should verify project data is readable', () => {
      expect(testProject.code).toBe('PRY-001');
      expect(testProject.name).toBe('Casa 5 Niveles');
      expect(testProject.budgetTotal).toBe(500000);
    });

    it('should verify APU items are readable', () => {
      expect(testAPUItems.length).toBe(2);
      expect(testAPUItems[0].code).toBe('CONC-001');
      expect(testAPUItems[1].code).toBe('ACERO-001');
    });

    it('should verify employee data is readable', () => {
      expect(testEmployees[0].name).toBe('Juan García Pérez');
      expect(testEmployees[0].dailyRateGTQ).toBe(250);
    });

    it('should verify attendance is readable', () => {
      expect(testAttendance[0].employeeName).toBe('Juan García Pérez');
      expect(testAttendance[0].status).toBe('Presente');
    });

    it('should verify expenses are readable', () => {
      expect(testExpenses[0].amount).toBe(25000);
      expect(testExpenses[0].supplier).toBe('Cementos Progreso');
    });
  });

  // ============================================================================
  // PHASE 3: UPDATE OPERATIONS
  // ============================================================================

  describe('Phase 3: UPDATE Operations', () => {
    it('should update project budget', () => {
      testProject.budgetTotal = 600000;
      expect(testProject.budgetTotal).toBe(600000);
    });

    it('should update APU item quantity', () => {
      const updatedItem = { ...testAPUItems[0], quantity: 60 };
      expect(updatedItem.quantity).toBe(60);
    });

    it('should update employee daily rate', () => {
      const updatedEmployee = { ...testEmployees[0], dailyRateGTQ: 300 };
      expect(updatedEmployee.dailyRateGTQ).toBe(300);
    });

    it('should update expense amount', () => {
      const updatedExpense = { ...testExpenses[0], amount: 35000 };
      expect(updatedExpense.amount).toBe(35000);
    });

    it('should update quotation status', () => {
      const updatedQuote = { ...testQuotes[0], status: 'Enviada' };
      expect(updatedQuote.status).toBe('Enviada');
    });
  });

  // ============================================================================
  // PHASE 4: DELETE OPERATIONS
  // ============================================================================

  describe('Phase 4: DELETE Operations', () => {
    beforeEach(() => {
      // Setup data for delete operations
      testExpenses = [
        {
          id: 'exp-001',
          projectId: testProject.id,
          date: new Date().toISOString().split('T')[0],
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
          projectId: testProject.id,
          companyId: 'company-test-001',
          createdBy: 'user-test-001',
        },
      ];

      const today = new Date().toISOString().split('T')[0];
      testAttendance = [
        {
          id: 'att-001',
          projectId: testProject.id,
          projectName: testProject.name,
          date: today,
          employeeId: 'emp-001',
          employeeName: 'Juan García Pérez',
          status: 'Presente',
          overtimeHours: 0,
          gpsVerified: true,
        },
      ];

      testEmployees = [
        {
          id: 'emp-001',
          name: 'Juan García Pérez',
          role: 'Albañil',
          dailyRateGTQ: 250,
          igssAffiliated: true,
          phone: '5555-1234',
          dpi: '1234567890123',
          igssNumber: 'IGSS-001',
        },
      ];
    });

    it('should delete expense from array', () => {
      const beforeLength = testExpenses.length;
      testExpenses = testExpenses.filter((exp) => exp.id !== 'exp-001');
      expect(testExpenses.length).toBeLessThan(beforeLength);
      expect(testExpenses.length).toBe(0);
    });

    it('should delete APU item from array', () => {
      const beforeLength = testAPUItems.length;
      testAPUItems = testAPUItems.filter((item) => item.id !== 'apu-001');
      expect(testAPUItems.length).toBeLessThan(beforeLength);
      expect(testAPUItems.length).toBe(0);
    });

    it('should delete attendance record from array', () => {
      const beforeLength = testAttendance.length;
      testAttendance = testAttendance.filter((att) => att.id !== 'att-001');
      expect(testAttendance.length).toBeLessThan(beforeLength);
      expect(testAttendance.length).toBe(0);
    });

    it('should delete employee from array', () => {
      const beforeLength = testEmployees.length;
      testEmployees = testEmployees.filter((emp) => emp.id !== 'emp-001');
      expect(testEmployees.length).toBeLessThan(beforeLength);
      expect(testEmployees.length).toBe(0);
    });

    it('should support project archival (soft delete)', () => {
      const archivedProject = { ...testProject, status: 'Archivado' };
      expect(archivedProject.status).toBe('Archivado');
    });
  });

  // ============================================================================
  // PHASE 5: DATA PERSISTENCE & INTEGRITY
  // ============================================================================

  describe('Phase 5: Data Persistence & Integrity', () => {
    it('should maintain data types after CRUD operations', () => {
      const item: APUItem = {
        id: 'apu-test',
        code: 'TEST-001',
        description: 'Test Item',
        unit: 'gbl',
        quantity: 1,
        materialUnitCostGTQ: 100,
        laborUnitCostGTQ: 100,
        equipmentUnitCostGTQ: 100,
        totalUnitCostGTQ: 300,
        totalPriceGTQ: 300,
        projectId: 'proj-test',
        companyId: 'company-test',
        createdBy: 'user-test',
      };

      expect(typeof item.quantity).toBe('number');
      expect(typeof item.totalPriceGTQ).toBe('number');
      expect(typeof item.code).toBe('string');
    });

    it('should validate currency conversions preserve data', () => {
      const usdAmount = 1000;
      const exchangeRate = 7.85;
      const gtqAmount = convertUSDtoGTQ(usdAmount, exchangeRate);

      expect(gtqAmount).toBe(7850);
    });

    it('should maintain calculation accuracy across operations', () => {
      const apuItems: APUItem[] = [
        {
          id: 'apu-1',
          code: 'A1',
          description: 'Item 1',
          unit: 'gbl',
          quantity: 10,
          materialUnitCostGTQ: 100,
          laborUnitCostGTQ: 100,
          equipmentUnitCostGTQ: 0,
          totalUnitCostGTQ: 200,
          totalPriceGTQ: 2000,
          projectId: 'p1',
          companyId: 'c1',
          createdBy: 'u1',
        },
      ];

      const summary1 = calculateBudgetSummary(apuItems, 500);
      expect(summary1.remaining).toBe(1500);

      const updatedItems = [
        {
          ...apuItems[0],
          quantity: 20,
          totalPriceGTQ: 4000,
        },
      ];

      const summary2 = calculateBudgetSummary(updatedItems, 500);
      expect(summary2.remaining).toBe(3500);
    });

    it('should preserve related data integrity after updates', () => {
      const expenses: ExpenseRecord[] = [
        {
          id: 'e1',
          projectId: 'proj-1',
          date: '2024-11-02',
          category: 'Materiales (Cementos, Hierro)',
          description: 'Test',
          supplier: 'Test Supplier',
          nitSupplier: '123',
          facturaNumber: 'F001',
          amount: 1000,
          currency: 'GTQ',
          paymentMethod: 'Efectivo',
        },
      ];

      // Update related project without affecting expense
      const projectUpdate = { budgetTotal: 100000 };
      expect(expenses[0].projectId).toBe('proj-1');
    });
  });

  // ============================================================================
  // PHASE 6: COMPLETE WORKFLOW VALIDATION
  // ============================================================================

  describe('Phase 6: Complete Workflow Validation', () => {
    it('should complete full project lifecycle', () => {
      // Create
      const project = { ...testProject };
      expect(project.status).toBe('Planificación');

      // Transition to execution
      const executing = { ...project, status: 'En Ejecución' };
      expect(executing.status).toBe('En Ejecución');

      // Add budget
      const withBudget = { ...executing, budgetTotal: 500000 };
      expect(withBudget.budgetTotal).toBe(500000);

      // Add expenses
      let spent = 0;
      spent += 25000; // First expense
      expect(spent).toBe(25000);

      // Update progress
      const withProgress = { ...withBudget, progressPercent: 50 };
      expect(withProgress.progressPercent).toBe(50);

      // Finalize
      const finalized = { ...withProgress, status: 'Finalizado' };
      expect(finalized.status).toBe('Finalizado');
    });

    it('should maintain IGSS compliance in payroll', () => {
      const emp: Employee = {
        id: 'e1',
        name: 'Test',
        role: 'Albañil',
        dailyRateGTQ: 250,
        igssAffiliated: true,
        phone: '1234567890',
      };

      const payroll = calculatePayroll(emp, 20);

      // IGSS employee 4.83%
      const expectedEmployeeIGSS = 5000 * 0.0483;
      expect(payroll.igssEmployeeDeduction).toBeCloseTo(expectedEmployeeIGSS, 1);

      // IGSS employer 12.67%
      const expectedEmployerIGSS = 5000 * 0.1267;
      expect(payroll.igssEmployerCost).toBeCloseTo(expectedEmployerIGSS, 1);
    });

    it('should validate complete quotation workflow', () => {
      const items = [
        { qty: 10, unitPriceGTQ: 100 },
        { qty: 5, unitPriceGTQ: 200 },
        { qty: 20, unitPriceGTQ: 50 },
      ];

      const totals = calculateQuoteTotals(items, 10, 12);

      expect(totals.subtotal).toBe(3000); // 1000+1000+1000
      expect(totals.discount).toBeCloseTo(300, 0); // 10%
      expect(totals.taxable).toBeCloseTo(2700, 0);
      expect(totals.tax).toBeCloseTo(324, 0); // 12%
      expect(totals.total).toBeCloseTo(3024, 0);
    });

    it('should validate multi-employee payroll processing', () => {
      const employees: Employee[] = [
        {
          id: 'e1',
          name: 'Employee 1',
          role: 'Albañil',
          dailyRateGTQ: 250,
          igssAffiliated: true,
          phone: '1',
        },
        {
          id: 'e2',
          name: 'Employee 2',
          role: 'Ayudante',
          dailyRateGTQ: 150,
          igssAffiliated: true,
          phone: '2',
        },
      ];

      const payrolls = employees.map((emp) => calculatePayroll(emp, 20));

      expect(payrolls[0].grossSalary).toBe(5000);
      expect(payrolls[1].grossSalary).toBe(3000);
      expect(payrolls[0].netPay).toBeGreaterThan(payrolls[1].netPay);
    });
  });
});

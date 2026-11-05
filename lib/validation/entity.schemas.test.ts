import { describe, expect, it } from 'vitest';
import {
  validateAttendanceRecord,
  validateEmployee,
  validateExpenseRecord,
  validateMachinery,
  validateQuoteRecord,
} from './entity.schemas';

describe('entity schemas use the persisted ERP record contracts', () => {
  it('accepts employee records created by the personnel form', () => {
    expect(
      validateEmployee({
        id: 'employee-e2e',
        name: 'Empleado de prueba',
        role: 'Albañil',
        dailyRateGTQ: 250,
        igssAffiliated: true,
        phone: '+502 5555-1234',
      }).success
    ).toBe(true);
  });

  it('accepts attendance records created by the GPS check-in form', () => {
    expect(
      validateAttendanceRecord({
        id: 'attendance-e2e',
        projectId: 'project-e2e',
        companyId: 'company-e2e',
        date: '2026-10-26',
        employeeId: 'employee-e2e',
        employeeName: 'Empleado de prueba',
        status: 'Presente',
        overtimeHours: 0,
        authorId: 'user-e2e',
      }).success
    ).toBe(true);
  });

  it('accepts expense records created by the invoice form', () => {
    expect(
      validateExpenseRecord({
        id: 'expense-e2e',
        projectId: 'project-e2e',
        companyId: 'company-e2e',
        authorId: 'user-e2e',
        date: '2026-10-26',
        category: 'Materiales (Cementos, Hierro)',
        description: 'Materiales para prueba',
        supplier: 'Proveedor de prueba',
        nitSupplier: 'CF',
        facturaNumber: 'E2E-001',
        amount: 125,
        currency: 'GTQ',
        paymentMethod: 'Transferencia BI',
        approvalStatus: 'Pendiente',
      }).success
    ).toBe(true);
  });

  it('accepts expense records without optional SAT supplier fields', () => {
    expect(
      validateExpenseRecord({
        id: 'expense-sin-factura',
        projectId: 'project-e2e',
        companyId: 'company-e2e',
        authorId: 'user-e2e',
        date: '2026-10-26',
        category: 'Imprevistos',
        description: 'Compra sin factura formal',
        supplier: '',
        nitSupplier: '',
        facturaNumber: '',
        amount: 80,
        currency: 'GTQ',
        paymentMethod: 'Efectivo',
      }).success
    ).toBe(true);
  });

  it('rejects expense records with an invalid amount', () => {
    expect(
      validateExpenseRecord({
        id: 'expense-invalido',
        projectId: 'project-e2e',
        companyId: 'company-e2e',
        authorId: 'user-e2e',
        date: '2026-10-26',
        category: 'Imprevistos',
        description: 'Monto en cero',
        supplier: '',
        nitSupplier: '',
        facturaNumber: '',
        amount: 0,
        currency: 'GTQ',
        paymentMethod: 'Efectivo',
      }).success
    ).toBe(false);
  });

  it('accepts quote records created by the quote form', () => {
    expect(
      validateQuoteRecord({
        id: 'quote-e2e',
        companyId: 'company-e2e',
        projectId: 'project-e2e',
        clientName: 'Cliente de prueba',
        clientNit: 'CF',
        date: '2026-10-26',
        validUntil: '2026-11-25',
        items: [{ description: 'Trabajo de prueba', qty: 1, unit: 'Global', unitPriceGTQ: 100 }],
        totalGTQ: 112,
        status: 'Borrador',
        createdBy: 'user-e2e',
      }).success
    ).toBe(true);
  });

  it('accepts machinery records created by the equipment form', () => {
    expect(
      validateMachinery({
        id: 'machinery-e2e',
        companyId: 'company-e2e',
        createdBy: 'user-e2e',
        name: 'Excavadora de prueba',
        model: '2025',
        plateOrCode: 'EQ-E2E',
        hourlyRateGTQ: 300,
        currentHorometer: 0,
        status: 'Disponible',
      }).success
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Base valid objects reused across negative tests
// ---------------------------------------------------------------------------
const baseExpense = {
  id: 'expense-neg',
  projectId: 'project-neg',
  companyId: 'company-neg',
  authorId: 'user-neg',
  date: '2026-10-26',
  category: 'Imprevistos',
  description: 'Gasto de prueba',
  supplier: '',
  nitSupplier: '',
  facturaNumber: '',
  amount: 100,
  currency: 'GTQ' as const,
  paymentMethod: 'Efectivo' as const,
};

const baseAttendance = {
  id: 'attendance-neg',
  projectId: 'project-neg',
  companyId: 'company-neg',
  date: '2026-10-26',
  employeeId: 'employee-neg',
  employeeName: 'Empleado Negativo',
  status: 'Presente' as const,
  overtimeHours: 0,
  authorId: 'user-neg',
};

const baseEmployee = {
  id: 'employee-neg',
  name: 'Empleado Negativo',
  role: 'Albañil' as const,
  dailyRateGTQ: 200,
  igssAffiliated: false,
  phone: '+502 5555-9999',
};

const baseMachinery = {
  id: 'machinery-neg',
  companyId: 'company-neg',
  createdBy: 'user-neg',
  name: 'Maquinaria Negativa',
  model: '2024',
  plateOrCode: 'NEG-01',
  hourlyRateGTQ: 200,
  currentHorometer: 0,
  status: 'Disponible' as const,
};

const baseQuote = {
  id: 'quote-neg',
  companyId: 'company-neg',
  projectId: 'project-neg',
  clientName: 'Cliente Negativo',
  clientNit: 'CF',
  date: '2026-10-26',
  validUntil: '2026-11-26',
  items: [{ description: 'Item válido', qty: 1, unit: 'Global', unitPriceGTQ: 100 }],
  totalGTQ: 100,
  status: 'Borrador' as const,
  createdBy: 'user-neg',
};

describe('rejects invalid entity data', () => {
  // Expense negative cases
  it('rejects expense with negative amount (-50)', () => {
    expect(validateExpenseRecord({ ...baseExpense, amount: -50 }).success).toBe(false);
  });

  it('rejects expense with empty description', () => {
    expect(validateExpenseRecord({ ...baseExpense, description: '' }).success).toBe(false);
  });

  it('rejects expense with unsupported currency (EUR)', () => {
    expect(validateExpenseRecord({ ...baseExpense, currency: 'EUR' }).success).toBe(false);
  });

  it('rejects expense with unsupported paymentMethod (Bitcoin)', () => {
    expect(validateExpenseRecord({ ...baseExpense, paymentMethod: 'Bitcoin' }).success).toBe(false);
  });

  // Attendance negative cases
  it('rejects attendance with overtimeHours = 13 (exceeds max 12)', () => {
    expect(validateAttendanceRecord({ ...baseAttendance, overtimeHours: 13 }).success).toBe(false);
  });

  it('rejects attendance with invalid status (Tardanza)', () => {
    expect(validateAttendanceRecord({ ...baseAttendance, status: 'Tardanza' }).success).toBe(false);
  });

  // Employee negative cases
  // Schema uses .min(0) so 0 is valid; negative values are rejected
  it('rejects employee with negative dailyRateGTQ (-1)', () => {
    expect(validateEmployee({ ...baseEmployee, dailyRateGTQ: -1 }).success).toBe(false);
  });

  it('rejects employee with empty name (fails min-3 constraint)', () => {
    expect(validateEmployee({ ...baseEmployee, name: '' }).success).toBe(false);
  });

  // Machinery negative cases
  it('rejects machinery with empty name (fails min-3 constraint)', () => {
    expect(validateMachinery({ ...baseMachinery, name: '' }).success).toBe(false);
  });

  it('rejects machinery with negative hourlyRateGTQ (-100)', () => {
    expect(validateMachinery({ ...baseMachinery, hourlyRateGTQ: -100 }).success).toBe(false);
  });

  // Quote negative case
  // Schema has no min(1) on items array, so an empty array passes; instead
  // verify that an item with qty = 0 (not .positive()) is rejected.
  it('rejects quote item with qty = 0 (not positive)', () => {
    expect(
      validateQuoteRecord({
        ...baseQuote,
        items: [{ description: 'Item inválido', qty: 0, unit: 'Global', unitPriceGTQ: 100 }],
      }).success
    ).toBe(false);
  });
});

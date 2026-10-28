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
        date: '2026-10-26',
        employeeId: 'employee-e2e',
        employeeName: 'Empleado de prueba',
        status: 'Presente',
        overtimeHours: 0,
      }).success
    ).toBe(true);
  });

  it('accepts expense records created by the invoice form', () => {
    expect(
      validateExpenseRecord({
        id: 'expense-e2e',
        projectId: 'project-e2e',
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

  it('accepts quote records created by the quote form', () => {
    expect(
      validateQuoteRecord({
        id: 'quote-e2e',
        projectId: 'project-e2e',
        clientName: 'Cliente de prueba',
        clientNit: 'CF',
        date: '2026-10-26',
        validUntil: '2026-11-25',
        items: [{ description: 'Trabajo de prueba', qty: 1, unit: 'Global', unitPriceGTQ: 100 }],
        totalGTQ: 112,
        status: 'Borrador',
      }).success
    ).toBe(true);
  });

  it('accepts machinery records created by the equipment form', () => {
    expect(
      validateMachinery({
        id: 'machinery-e2e',
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

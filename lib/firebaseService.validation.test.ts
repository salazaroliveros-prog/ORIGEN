/**
 * Tests for the augment-before-validate pattern used in all Firestore save functions.
 * Pure unit tests — no Firebase connection needed.
 */

import { describe, expect, it } from 'vitest';
import {
  validateExpenseRecord,
  validateAttendanceRecord,
  validateEmployee,
  validateAPUItem,
  validateQuoteRecord,
  validateMachinery,
} from './validation/entity.schemas';
import { validateProjectForm } from './validation/project.schema';

const COMPANY = 'company-test-001';
const USER = 'user-test-001';
const PROJECT = 'project-test-001';
const TODAY = '2026-11-03';

// ── Expense ──────────────────────────────────────────────────────────────────

const baseExpense = {
  id: 'exp-aug-001',
  projectId: PROJECT,
  date: TODAY,
  category: 'Materiales (Cementos, Hierro)',
  description: 'Cemento',
  supplier: 'Cementos Progreso',
  nitSupplier: 'CF',
  facturaNumber: 'FAC-001',
  amount: 1500,
  currency: 'GTQ',
  paymentMethod: 'Efectivo',
};

describe('augment-before-validate: expense', () => {
  it('passes after augmenting with companyId + authorId', () => {
    expect(
      validateExpenseRecord({ ...baseExpense, companyId: COMPANY, authorId: USER }).success
    ).toBe(true);
  });
  it('fails without companyId', () => {
    const r = validateExpenseRecord({ ...baseExpense, authorId: USER });
    expect(r.success).toBe(false);
  });
  it('fails without authorId', () => {
    const r = validateExpenseRecord({ ...baseExpense, companyId: COMPANY });
    expect(r.success).toBe(false);
  });
  it('augment preserves existing authorId (update scenario)', () => {
    const aug = { ...baseExpense, companyId: COMPANY, authorId: 'original-author' };
    const r = validateExpenseRecord(aug);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.authorId).toBe('original-author');
  });
  it('rejects negative amount', () => {
    expect(
      validateExpenseRecord({ ...baseExpense, companyId: COMPANY, authorId: USER, amount: -1 })
        .success
    ).toBe(false);
  });
  it('rejects invalid date', () => {
    expect(
      validateExpenseRecord({ ...baseExpense, companyId: COMPANY, authorId: USER, date: 'bad' })
        .success
    ).toBe(false);
  });
  it('rejects invalid currency', () => {
    expect(
      validateExpenseRecord({
        ...baseExpense,
        companyId: COMPANY,
        authorId: USER,
        currency: 'EUR' as any,
      }).success
    ).toBe(false);
  });
  it('rejects invalid paymentMethod', () => {
    expect(
      validateExpenseRecord({
        ...baseExpense,
        companyId: COMPANY,
        authorId: USER,
        paymentMethod: 'Bitcoin' as any,
      }).success
    ).toBe(false);
  });
});

// ── Attendance ────────────────────────────────────────────────────────────────

const baseAtt = {
  id: 'att-001',
  projectId: PROJECT,
  employeeId: 'emp-1',
  employeeName: 'Juan',
  date: TODAY,
  status: 'Presente',
  overtimeHours: 0,
};

describe('augment-before-validate: attendance', () => {
  it('passes after augment', () => {
    expect(
      validateAttendanceRecord({ ...baseAtt, companyId: COMPANY, authorId: USER }).success
    ).toBe(true);
  });
  it('fails without authorId', () => {
    expect(validateAttendanceRecord({ ...baseAtt, companyId: COMPANY }).success).toBe(false);
  });
  it('rejects overtime > 12', () => {
    expect(
      validateAttendanceRecord({
        ...baseAtt,
        companyId: COMPANY,
        authorId: USER,
        overtimeHours: 13,
      }).success
    ).toBe(false);
  });
  it('rejects invalid status', () => {
    expect(
      validateAttendanceRecord({
        ...baseAtt,
        companyId: COMPANY,
        authorId: USER,
        status: 'Vacaciones' as any,
      }).success
    ).toBe(false);
  });
});

// ── Employee ──────────────────────────────────────────────────────────────────

const baseEmp = {
  id: 'emp-001',
  name: 'María González',
  role: 'Albañil',
  dailyRateGTQ: 175,
  igssAffiliated: true,
  phone: '+502 5555-0000',
};

describe('augment-before-validate: employee', () => {
  it('passes (employee schema does not require companyId at Zod level)', () => {
    expect(validateEmployee(baseEmp).success).toBe(true);
  });
  it('rejects name shorter than 3 chars', () => {
    expect(validateEmployee({ ...baseEmp, name: 'AB' }).success).toBe(false);
  });
  it('rejects invalid role', () => {
    expect(validateEmployee({ ...baseEmp, role: 'CEO' as any }).success).toBe(false);
  });
  it('rejects negative daily rate', () => {
    expect(validateEmployee({ ...baseEmp, dailyRateGTQ: -50 }).success).toBe(false);
  });
});

// ── APU Item ──────────────────────────────────────────────────────────────────

const baseAPU = {
  id: 'apu-001',
  code: '03.01',
  description: 'Concreto ciclópeo',
  unit: 'm3',
  quantity: 5,
  materialUnitCostGTQ: 400,
  laborUnitCostGTQ: 150,
  equipmentUnitCostGTQ: 50,
  totalUnitCostGTQ: 600,
  totalPriceGTQ: 3000,
};

describe('augment-before-validate: APU item', () => {
  it('passes after augment', () => {
    expect(
      validateAPUItem({ ...baseAPU, companyId: COMPANY, projectId: PROJECT, createdBy: USER })
        .success
    ).toBe(true);
  });
  it('fails without companyId', () => {
    expect(validateAPUItem({ ...baseAPU, projectId: PROJECT, createdBy: USER }).success).toBe(
      false
    );
  });
  it('fails without createdBy', () => {
    expect(validateAPUItem({ ...baseAPU, companyId: COMPANY, projectId: PROJECT }).success).toBe(
      false
    );
  });
  it('rejects zero quantity', () => {
    expect(
      validateAPUItem({
        ...baseAPU,
        companyId: COMPANY,
        projectId: PROJECT,
        createdBy: USER,
        quantity: 0,
      }).success
    ).toBe(false);
  });
});

// ── Quote ─────────────────────────────────────────────────────────────────────

const baseQuote = {
  id: 'quote-001',
  projectId: PROJECT,
  clientName: 'Cliente Test',
  clientNit: 'CF',
  date: TODAY,
  validUntil: '2026-12-31',
  items: [{ description: 'Trabajo', qty: 1, unit: 'Global', unitPriceGTQ: 5000 }],
  totalGTQ: 5600,
  status: 'Borrador',
};

describe('augment-before-validate: quote', () => {
  it('passes after augment', () => {
    expect(validateQuoteRecord({ ...baseQuote, companyId: COMPANY, createdBy: USER }).success).toBe(
      true
    );
  });
  it('fails without createdBy', () => {
    expect(validateQuoteRecord({ ...baseQuote, companyId: COMPANY }).success).toBe(false);
  });
  it('rejects client name < 3 chars', () => {
    expect(
      validateQuoteRecord({ ...baseQuote, companyId: COMPANY, createdBy: USER, clientName: 'AB' })
        .success
    ).toBe(false);
  });
  it('rejects invalid status', () => {
    expect(
      validateQuoteRecord({
        ...baseQuote,
        companyId: COMPANY,
        createdBy: USER,
        status: 'Firmada' as any,
      }).success
    ).toBe(false);
  });
});

// ── Machinery ─────────────────────────────────────────────────────────────────

const baseMach = {
  id: 'mach-001',
  name: 'Mezcladora',
  model: '2025',
  plateOrCode: 'EQ-01',
  hourlyRateGTQ: 150,
  currentHorometer: 0,
  status: 'Disponible',
};

describe('augment-before-validate: machinery', () => {
  it('passes after augment', () => {
    expect(validateMachinery({ ...baseMach, companyId: COMPANY, createdBy: USER }).success).toBe(
      true
    );
  });
  it('fails without companyId', () => {
    expect(validateMachinery({ ...baseMach, createdBy: USER }).success).toBe(false);
  });
  it('rejects invalid status', () => {
    expect(
      validateMachinery({
        ...baseMach,
        companyId: COMPANY,
        createdBy: USER,
        status: 'Reparación' as any,
      }).success
    ).toBe(false);
  });
  it('rejects negative horometer', () => {
    expect(
      validateMachinery({ ...baseMach, companyId: COMPANY, createdBy: USER, currentHorometer: -1 })
        .success
    ).toBe(false);
  });
});

// ── Project ───────────────────────────────────────────────────────────────────

const validProject = {
  code: 'TEST-01',
  name: 'Proyecto test',
  client: 'Cliente',
  location: 'Zona 5, Guatemala',
  municipality: 'Guatemala',
  department: 'Guatemala',
  budgetTotal: 100000,
  spentTotal: 0,
  progressPercent: 0,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'Planificación',
  lat: 14.6133,
  lng: -90.4875,
};

describe('validateProjectForm integration', () => {
  it('accepts a complete valid project', () => {
    expect(validateProjectForm(validProject).success).toBe(true);
  });
  it('rejects end date before start date', () => {
    expect(
      validateProjectForm({ ...validProject, startDate: '2026-12-31', endDate: '2026-01-01' })
        .success
    ).toBe(false);
  });
  it('rejects negative budget', () => {
    expect(validateProjectForm({ ...validProject, budgetTotal: -1 }).success).toBe(false);
  });
  it('rejects code with lowercase', () => {
    expect(validateProjectForm({ ...validProject, code: 'test-01' }).success).toBe(false);
  });
  it('returns multiple errors for multi-field invalid input', () => {
    const r = validateProjectForm({ ...validProject, code: 'x', name: 'AB', budgetTotal: -1 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.length).toBeGreaterThan(1);
  });
});

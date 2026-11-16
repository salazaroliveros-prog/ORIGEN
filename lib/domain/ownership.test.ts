import { describe, expect, it } from 'vitest';
import type { APUItem, AttendanceRecord, Employee, FieldVisit } from '@/lib/types';
import { validateAPUItem, validateAttendanceRecord } from '@/lib/validation/entity.schemas';
import {
  buildAPUItemRecords,
  buildAttendanceRecord,
  buildEmployeeRecord,
  mergeAttendanceUpdate,
  mergeFieldVisitUpdate,
} from './ownership';

const COMPANY_ID = 'company-1';
const USER_ID = 'user-1';
const PROJECT_ID = 'proj-1';

const draftAPUItem: APUItem = {
  id: 'apu-1',
  code: 'APU-001',
  description: 'Concreto reforzado de prueba',
  unit: 'm3',
  quantity: 2,
  materialUnitCostGTQ: 200,
  laborUnitCostGTQ: 100,
  equipmentUnitCostGTQ: 50,
  totalUnitCostGTQ: 350,
  totalPriceGTQ: 700,
};

const draftAttendance: AttendanceRecord = {
  id: 'att-1',
  projectId: PROJECT_ID,
  date: '2026-06-15',
  employeeId: 'emp-1',
  employeeName: 'Albañil de prueba',
  status: 'Presente',
  overtimeHours: 0,
};

const draftEmployee: Employee = {
  id: 'emp-1',
  name: 'Empleado de prueba',
  role: 'Albañil',
  dailyRateGTQ: 250,
  igssAffiliated: true,
  phone: '5555-1234',
};

describe('buildAPUItemRecords', () => {
  it('agrega companyId, projectId y createdBy antes de validar', () => {
    const [record] = buildAPUItemRecords([draftAPUItem], PROJECT_ID, COMPANY_ID, USER_ID);

    expect(record.companyId).toBe(COMPANY_ID);
    expect(record.projectId).toBe(PROJECT_ID);
    expect(record.createdBy).toBe(USER_ID);
    expect(record.updatedBy).toBe(USER_ID);
  });

  it('produce un registro que supera la validación de Zod', () => {
    // El borrador del formulario (sin contexto de propiedad) NO valida:
    // `APUItemSchema` exige `companyId`, `projectId` y `createdBy`.
    expect(validateAPUItem(draftAPUItem).success).toBe(false);

    const [record] = buildAPUItemRecords([draftAPUItem], PROJECT_ID, COMPANY_ID, USER_ID);
    expect(validateAPUItem(record).success).toBe(true);
  });

  it('respeta el createdBy que ya trae el registro', () => {
    const [record] = buildAPUItemRecords(
      [{ ...draftAPUItem, createdBy: 'otro-autor' }],
      PROJECT_ID,
      COMPANY_ID,
      USER_ID
    );

    expect(record.createdBy).toBe('otro-autor');
  });

  it('normaliza los totales de la partida', () => {
    const [record] = buildAPUItemRecords(
      [{ ...draftAPUItem, totalUnitCostGTQ: 0, totalPriceGTQ: 0 }],
      PROJECT_ID,
      COMPANY_ID,
      USER_ID
    );

    expect(record.totalUnitCostGTQ).toBe(350);
    expect(record.totalPriceGTQ).toBe(700);
  });
});

describe('buildAttendanceRecord', () => {
  it('agrega companyId y authorId antes de validar', () => {
    const record = buildAttendanceRecord(draftAttendance, COMPANY_ID, USER_ID);

    expect(record.companyId).toBe(COMPANY_ID);
    expect(record.authorId).toBe(USER_ID);
  });

  it('produce un registro que supera la validación de Zod', () => {
    // El borrador del formulario (sin contexto de propiedad) NO valida:
    // `AttendanceRecordSchema` exige `companyId` y `authorId`.
    expect(validateAttendanceRecord(draftAttendance).success).toBe(false);

    const record = buildAttendanceRecord(draftAttendance, COMPANY_ID, USER_ID);
    expect(validateAttendanceRecord(record).success).toBe(true);
  });

  it('no pierde los datos del formulario', () => {
    const record = buildAttendanceRecord(
      { ...draftAttendance, gpsCoords: { lat: 14.6, lng: -90.4 } },
      COMPANY_ID,
      USER_ID
    );

    expect(record.employeeName).toBe('Albañil de prueba');
    expect(record.gpsCoords).toEqual({ lat: 14.6, lng: -90.4 });
  });
});

describe('buildEmployeeRecord', () => {
  it('agrega companyId, ownerId y createdBy', () => {
    const record = buildEmployeeRecord(draftEmployee, COMPANY_ID, USER_ID);

    expect(record.companyId).toBe(COMPANY_ID);
    expect(record.ownerId).toBe(COMPANY_ID);
    expect(record.createdBy).toBe(USER_ID);
  });

  it('ownerId coincide con companyId (requisito de firestore.rules)', () => {
    const record = buildEmployeeRecord(draftEmployee, COMPANY_ID, USER_ID);

    expect(record.ownerId).toBe(record.companyId);
  });

  it('no pierde los datos del formulario', () => {
    const record = buildEmployeeRecord(draftEmployee, COMPANY_ID, USER_ID);

    expect(record.name).toBe('Empleado de prueba');
    expect(record.dailyRateGTQ).toBe(250);
  });
});

const existingFieldVisit: FieldVisit = {
  id: 'visit-1',
  companyId: COMPANY_ID,
  authorId: 'original-author',
  projectId: PROJECT_ID,
  projectName: 'Proyecto',
  date: '2026-06-15',
  foremanName: 'Capataz',
  notes: 'Visita original',
  weather: 'Soleado',
  workersCount: 4,
  status: 'Autorizado',
};

describe('mergeFieldVisitUpdate', () => {
  it('preserves company and author while recording the editor', () => {
    const updated = mergeFieldVisitUpdate(
      existingFieldVisit,
      { notes: 'Nota actualizada', authorId: 'forged-author', companyId: 'foreign-company' },
      'foreign-company',
      'editor-1',
      '2026-11-16T12:00:00.000Z'
    );

    expect(updated.companyId).toBe(COMPANY_ID);
    expect(updated.authorId).toBe('original-author');
    expect(updated.updatedBy).toBe('editor-1');
    expect(updated.updatedAt).toBe('2026-11-16T12:00:00.000Z');
    expect(updated.notes).toBe('Nota actualizada');
  });
});

describe('mergeAttendanceUpdate', () => {
  it('preserves attendance author/company when edited by another member', () => {
    const existing: AttendanceRecord = {
      ...draftAttendance,
      companyId: COMPANY_ID,
      authorId: 'original-author',
    };
    const updated = mergeAttendanceUpdate(
      existing,
      { status: 'Permiso', authorId: 'forged-author', companyId: 'foreign-company' },
      'foreign-company',
      'editor-2',
      '2026-11-16T12:30:00.000Z'
    );

    expect(updated.companyId).toBe(COMPANY_ID);
    expect(updated.authorId).toBe('original-author');
    expect(updated.updatedBy).toBe('editor-2');
    expect(updated.updatedAt).toBe('2026-11-16T12:30:00.000Z');
    expect(updated.status).toBe('Permiso');
  });
});

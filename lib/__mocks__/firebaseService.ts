import { vi } from 'vitest';
import type { Unsubscribe } from 'firebase/firestore';
import type { Project, FieldVisit, ExpenseRecord, AttendanceRecord, CompanySettings, Employee, EmployeeDirectoryEntry, Machinery, MachineryLog, QuoteRecord, APUItem } from '@/lib/types';
import type { ProjectFormValues } from '@/lib/validation/project.schema';

export const firebaseConfigured = true;

export const app = null as any;
export const auth = null as any;
export const db = null as any;
export const storage = null as any;

export const getAuthOrThrow = vi.fn(() => auth);
export const getDbOrThrow = vi.fn(() => db);
export const getStorageOrThrow = vi.fn(() => storage);

export const testConnection = vi.fn(async (): Promise<boolean> => true);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const handleFirestoreError = vi.fn((error: unknown, operationType: OperationType, path: string | null): Error => new Error(String(error)));

export const saveProjectToFirestore = vi.fn(async (project: Project, companyId: string, userId: string): Promise<boolean> => true);
export const getProjectByCode = vi.fn(async (code: string): Promise<Project | null> => null);
export const saveProjectScheduleToFirestore = vi.fn(async (projectId: string, schedule: any, companyId: string, userId: string): Promise<boolean> => true);

export type ProjectCallback = (projects: Project[]) => void;
export type FieldVisitCallback = (visits: FieldVisit[]) => void;
export type ExpenseCallback = (expenses: ExpenseRecord[]) => void;
export type AttendanceCallback = (records: AttendanceRecord[]) => void;
export type EmployeeCallback = (employees: Array<Employee | EmployeeDirectoryEntry>) => void;
export type CompanySettingsCallback = (settings: CompanySettings | null) => void;
export type QuoteCallback = (quotes: QuoteRecord[]) => void;
export type APUItemCallback = (items: APUItem[]) => void;
export type MachineryCallback = (machinery: Machinery[]) => void;
export type MachineryLogCallback = (logs: MachineryLog[]) => void;

const subscribeMocks: Record<string, Unsubscribe> = {};

export const subscribeProjects = vi.fn((companyId: string, callback: ProjectCallback): Unsubscribe => {
  subscribeMocks[`projects:${companyId}`] = callback;
  return () => { delete subscribeMocks[`projects:${companyId}`]; };
});
export const subscribeFieldVisits = vi.fn((companyId: string, callback: FieldVisitCallback): Unsubscribe => {
  subscribeMocks[`fieldVisits:${companyId}`] = callback;
  return () => { delete subscribeMocks[`fieldVisits:${companyId}`]; };
});
export const subscribeExpenses = vi.fn((companyId: string, callback: ExpenseCallback): Unsubscribe => {
  subscribeMocks[`expenses:${companyId}`] = callback;
  return () => { delete subscribeMocks[`expenses:${companyId}`]; };
});
export const subscribeAttendance = vi.fn((companyId: string, callback: AttendanceCallback): Unsubscribe => {
  subscribeMocks[`attendance:${companyId}`] = callback;
  return () => { delete subscribeMocks[`attendance:${companyId}`]; };
});
export const subscribeEmployees = vi.fn((companyId: string, callback: EmployeeCallback): Unsubscribe => {
  subscribeMocks[`employees:${companyId}`] = callback;
  return () => { delete subscribeMocks[`employees:${companyId}`]; };
});
export const subscribeEmployeeDirectory = vi.fn((companyId: string, callback: EmployeeCallback): Unsubscribe => {
  subscribeMocks[`employeeDirectory:${companyId}`] = callback;
  return () => { delete subscribeMocks[`employeeDirectory:${companyId}`]; };
});
export const subscribeCompanySettings = vi.fn((companyId: string, callback: CompanySettingsCallback): Unsubscribe => {
  subscribeMocks[`companySettings:${companyId}`] = callback;
  return () => { delete subscribeMocks[`companySettings:${companyId}`]; };
});
export const subscribeQuotes = vi.fn((companyId: string, callback: QuoteCallback): Unsubscribe => {
  subscribeMocks[`quotes:${companyId}`] = callback;
  return () => { delete subscribeMocks[`quotes:${companyId}`]; };
});
export const subscribeAPUItems = vi.fn((companyId: string, callback: APUItemCallback): Unsubscribe => {
  subscribeMocks[`apuItems:${companyId}`] = callback;
  return () => { delete subscribeMocks[`apuItems:${companyId}`]; };
});
export const subscribeMachinery = vi.fn((companyId: string, callback: MachineryCallback): Unsubscribe => {
  subscribeMocks[`machinery:${companyId}`] = callback;
  return () => { delete subscribeMocks[`machinery:${companyId}`]; };
});
export const subscribeMachineryLogs = vi.fn((companyId: string, callback: MachineryLogCallback): Unsubscribe => {
  subscribeMocks[`machineryLogs:${companyId}`] = callback;
  return () => { delete subscribeMocks[`machineryLogs:${companyId}`]; };
});

export const invokeSubscribeCallback = vi.fn((key: string, data: any[]) => {
  const cb = subscribeMocks[key] as any;
  if (cb) cb(data);
});

export const deleteAttendanceFromFirestore = vi.fn(async (attendanceId: string): Promise<boolean> => true);
export const deleteEmployeeFromFirestore = vi.fn(async (employeeId: string, companyId: string): Promise<boolean> => true);
export const deleteMachineryFromFirestore = vi.fn(async (machineryId: string, companyId: string): Promise<boolean> => true);
export const saveFieldVisitToFirestore = vi.fn(async (visit: FieldVisit, companyId: string, userId: string): Promise<boolean> => true);
export const saveExpenseToFirestore = vi.fn(async (expense: ExpenseRecord, companyId: string, userId: string): Promise<boolean> => true);
export const deleteExpenseFromFirestore = vi.fn(async (expenseId: string): Promise<boolean> => true);
export const updateExpenseToFirestore = vi.fn(async (expense: ExpenseRecord, companyId: string, userId: string): Promise<boolean> => true);
export const saveAttendanceToFirestore = vi.fn(async (record: AttendanceRecord, companyId: string, userId: string): Promise<boolean> => true);
export const saveEmployeeToFirestore = vi.fn(async (employee: Employee, companyId: string, userId: string): Promise<boolean> => true);
export const saveCompanySettingsToFirestore = vi.fn(async (settings: CompanySettings, companyId: string): Promise<boolean> => true);
export const saveQuoteToFirestore = vi.fn(async (quote: QuoteRecord, companyId: string, userId: string): Promise<boolean> => true);
export const updateQuoteStatusInFirestore = vi.fn(async (quote: QuoteRecord, status: QuoteRecord['status'], companyId: string, userId: string): Promise<boolean> => true);
export const deleteQuoteFromFirestore = vi.fn(async (quoteId: string): Promise<boolean> => true);
export const saveAPUItemsToFirestore = vi.fn(async (items: APUItem[], projectId: string, companyId: string, userId: string): Promise<boolean> => true);
export const deleteAPUItemFromFirestore = vi.fn(async (itemId: string): Promise<boolean> => true);
export const saveMachineryToFirestore = vi.fn(async (machinery: Machinery, companyId: string, userId: string): Promise<boolean> => true);
export const updateMachineryStatusInFirestore = vi.fn(async (machinery: Machinery, status: Machinery['status'], companyId: string, userId: string): Promise<boolean> => true);
export const recordMachineryUse = vi.fn(async (log: MachineryLog, machinery: Machinery, companyId: string, userId: string): Promise<boolean> => true);
export const updateProjectFields = vi.fn(async (projectId: string, fields: any): Promise<boolean> => true);
export const validateProjectForm = vi.fn((data: ProjectFormValues) => ({ success: true, data, error: null }));
export const notifySyncStart = vi.fn(() => {});
export const notifySyncEnd = vi.fn(() => {});

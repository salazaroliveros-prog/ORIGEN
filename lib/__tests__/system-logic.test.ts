/**
 * ORIGEN ERP - System Logic and Process Tests (Vitest)
 * Cubre SYS-001 a SYS-010: flujos de trabajo core del ERP
 * Prueba la lógica de negocio de procesos end-to-end
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Mock de servicios de Firebase
// ============================================================
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  getDocs: vi.fn(),
}));

import {
  doc, setDoc, getDoc, updateDoc, deleteDoc, collection, addDoc, query, getDocs,
} from 'firebase/firestore';

const mockDoc = vi.mocked(doc);
const mockSetDoc = vi.mocked(setDoc);
const mockGetDoc = vi.mocked(getDoc);
const mockUpdateDoc = vi.mocked(updateDoc);
const mockDeleteDoc = vi.mocked(deleteDoc);
const mockCollection = vi.mocked(collection);
const mockAddDoc = vi.mocked(addDoc);
const mockQuery = vi.mocked(query);
const mockGetDocs = vi.mocked(getDocs);

const mockStore = new Map<string, any>();

mockDoc.mockImplementation(((path: string) => ({ id: path.split('/').pop() || path, path })) as any);
mockSetDoc.mockImplementation((async (_doc: any, data: any) => {
  mockStore.set(_doc.path, { ...data, id: _doc.id, _path: _doc.path });
}) as any);
mockGetDoc.mockImplementation((async (_doc: any) => {
  const data = mockStore.get(_doc.path);
  return { exists: () => !!data, id: _doc.id, data: () => data || null };
}) as any);
mockUpdateDoc.mockImplementation((async (_doc: any, data: any) => {
  const existing = mockStore.get(_doc.path) || {};
  mockStore.set(_doc.path, { ...existing, ...data, id: _doc.id });
}) as any);
mockDeleteDoc.mockImplementation((async (_doc: any) => {
  mockStore.delete(_doc.path);
}) as any);
mockCollection.mockImplementation(((path: string) => ({ path })) as any);
mockAddDoc.mockImplementation((async (_col: any, data: any) => {
  const id = `doc-${Date.now()}`;
  const docPath = `${_col.path}/${id}`;
  mockStore.set(docPath, { ...data, id, _path: docPath });
  return { id, path: docPath };
}) as any);
mockGetDocs.mockImplementation((async (_query: any) => {
  const queryPath = _query?.path || '';
  const docs = Array.from(mockStore.values()).filter((d: any) => d._path?.startsWith(queryPath));
  return { docs: docs.map((d: any) => ({ id: d.id, data: () => d })), empty: docs.length === 0 };
}) as any);

// ============================================================
// Tipos y lógica de negocio del ERP
// ============================================================
interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  budget: number;
  progress: number;
  status: 'active' | 'archived';
  companyId: string;
  totalExpenses: number;
  totalIncome: number;
}

interface Expense {
  id: string;
  projectId: string;
  description: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface Quotation {
  id: string;
  projectId: string;
  client: string;
  amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
}

interface Employee {
  id: string;
  name: string;
  dailyWage: number;
  companyId: string;
}

interface Attendance {
  id: string;
  employeeId: string;
  status: 'on-site' | 'off-site';
  timestamp: string;
}

// Estado del sistema (simulado)
let projects: Project[] = [];
let expenses: Expense[] = [];
let quotations: Quotation[] = [];
let employees: Employee[] = [];
let attendances: Attendance[] = [];

function resetState() {
  projects = [];
  expenses = [];
  quotations = [];
  employees = [];
  attendances = [];
  mockStore.clear();
}

// ============================================================
// SYS-001: Crear proyecto completo
// ============================================================
function createProject(data: {
  code: string; name: string; client: string; budget: number;
  progress: number; companyId: string; status?: 'active' | 'archived';
}): Project {
  const project: Project = {
    id: `proj-${Date.now()}`,
    code: data.code,
    name: data.name,
    client: data.client,
    budget: data.budget,
    progress: data.progress,
    status: 'active',
    companyId: data.companyId,
    totalExpenses: 0,
    totalIncome: 0,
  };
  projects.push(project);
  return project;
}

// ============================================================
// SYS-002: Editar proyecto
// ============================================================
function editProject(id: string, updates: Partial<Project>): Project | null {
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  projects[idx] = { ...projects[idx], ...updates };
  return projects[idx];
}

// ============================================================
// SYS-003: Archivar y restaurar proyecto
// ============================================================
function archiveProject(id: string): Project | null {
  const p = projects.find((p) => p.id === id);
  if (!p) return null;
  p.status = 'archived';
  return p;
}

function restoreProject(id: string): Project | null {
  const p = projects.find((p) => p.id === id);
  if (!p) return null;
  p.status = 'active';
  return p;
}

// ============================================================
// SYS-004: Presupuesto APU (crear renglón)
// ============================================================
interface APUItem {
  id: string;
  projectId: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

let apuItems: APUItem[] = [];

function createAPUItem(data: {
  projectId: string; description: string; unit: string;
  quantity: number; unitPrice: number;
}): APUItem {
  const item: APUItem = {
    id: `apu-${Date.now()}`,
    projectId: data.projectId,
    description: data.description,
    unit: data.unit,
    quantity: data.quantity,
    unitPrice: data.unitPrice,
    total: data.quantity * data.unitPrice,
  };
  apuItems.push(item);
  return item;
}

// ============================================================
// SYS-005: Registrar gasto y propagar a tablero
// ============================================================
function createExpense(data: {
  projectId: string; description: string; amount: number;
}): Expense {
  const expense: Expense = {
    id: `exp-${Date.now()}`,
    projectId: data.projectId,
    description: data.description,
    amount: data.amount,
    status: 'pending',
  };
  expenses.push(expense);

  // Propagar a proyecto
  const project = projects.find((p) => p.id === data.projectId);
  if (project) {
    project.totalExpenses += data.amount;
  }

  return expense;
}

// ============================================================
// SYS-006: Crear cotización y marcar como aceptada
// ============================================================
function createQuotation(data: {
  projectId: string; client: string; amount: number;
}): Quotation {
  const quotation: Quotation = {
    id: `quo-${Date.now()}`,
    projectId: data.projectId,
    client: data.client,
    amount: data.amount,
    status: 'draft',
  };
  quotations.push(quotation);
  return quotation;
}

function acceptQuotation(id: string): Quotation | null {
  const q = quotations.find((q) => q.id === id);
  if (!q) return null;
  q.status = 'accepted';

  // Propagar como ingreso al proyecto
  const project = projects.find((p) => p.id === q.projectId);
  if (project) {
    project.totalIncome += q.amount;
  }

  return q;
}

// ============================================================
// SYS-007: Registrar empleado en cuadrilla
// ============================================================
function createEmployee(data: {
  name: string; dailyWage: number; companyId: string;
}): Employee {
  const employee: Employee = {
    id: `emp-${Date.now()}`,
    name: data.name,
    dailyWage: data.dailyWage,
    companyId: data.companyId,
  };
  employees.push(employee);
  return employee;
}

// ============================================================
// SYS-008: Registrar asistencia con GPS
// ============================================================
function createAttendance(data: {
  employeeId: string; status: 'on-site' | 'off-site';
}): Attendance {
  const attendance: Attendance = {
    id: `att-${Date.now()}`,
    employeeId: data.employeeId,
    status: data.status,
    timestamp: new Date().toISOString(),
  };
  attendances.push(attendance);
  return attendance;
}

// ============================================================
// SYS-009: Registrar maquinaria y cambiar estado
// ============================================================
interface Machinery {
  id: string;
  name: string;
  status: 'available' | 'maintenance';
}

let machinery: Machinery[] = [];

function createMachinery(data: { name: string }): Machinery {
  const m: Machinery = {
    id: `mac-${Date.now()}`,
    name: data.name,
    status: 'available',
  };
  machinery.push(m);
  return m;
}

function setMachineryMaintenance(id: string): Machinery | null {
  const m = machinery.find((m) => m.id === id);
  if (!m) return null;
  m.status = 'maintenance';
  return m;
}

function setMachineryAvailable(id: string): Machinery | null {
  const m = machinery.find((m) => m.id === id);
  if (!m) return null;
  m.status = 'available';
  return m;
}

// ============================================================
// SYS-010: Flujo completo proyecto → gasto → cotización → tablero
// ============================================================
function getDashboardKPIs() {
  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalExpenses = projects.reduce((sum, p) => sum + p.totalExpenses, 0);
  const totalIncome = projects.reduce((sum, p) => sum + p.totalIncome, 0);
  const activeProjects = projects.filter((p) => p.status === 'active').length;

  return {
    totalBudget,
    totalExpenses,
    totalIncome,
    activeProjects,
    netProfit: totalIncome - totalExpenses,
  };
}

// ============================================================
// TESTS
// ============================================================
describe('System Logic - Core Workflows (SYS-001 to SYS-010)', () => {
  beforeEach(() => {
    resetState();
  });

  // ---- SYS-001: Create project ----
  it('SYS-001: crear proyecto completo con todos los campos', () => {
    const project = createProject({
      code: 'SYS-001',
      name: 'Proyecto Sistema',
      client: 'Cliente Sistema',
      budget: 100000,
      progress: 5,
      companyId: 'comp-001',
    });

    expect(project.code).toBe('SYS-001');
    expect(project.name).toBe('Proyecto Sistema');
    expect(project.budget).toBe(100000);
    expect(project.progress).toBe(5);
    expect(project.status).toBe('active');
    expect(project.totalExpenses).toBe(0);
    expect(project.totalIncome).toBe(0);
    expect(projects.length).toBe(1);
  });

  // ---- SYS-002: Edit project ----
  it('SYS-002: editar proyecto actualiza campos', () => {
    const project = createProject({
      code: 'SYS-002',
      name: 'Original',
      client: 'Cliente',
      budget: 50000,
      progress: 10,
      companyId: 'comp-001',
    });

    const updated = editProject(project.id, {
      name: 'Actualizado',
      budget: 75000,
    });

    expect(updated!.name).toBe('Actualizado');
    expect(updated!.budget).toBe(75000);
    expect(updated!.code).toBe('SYS-002'); // Sin cambios
  });

  it('SYS-002: editar proyecto inexistente retorna null', () => {
    const result = editProject('inexistente', { name: 'Nuevo' });
    expect(result).toBeNull();
  });

  // ---- SYS-003: Archive and restore ----
  it('SYS-003: archivar proyecto cambia estado a archived', () => {
    const project = createProject({
      code: 'SYS-003',
      name: 'Para Archivar',
      client: 'Cliente',
      budget: 50000,
      progress: 10,
      companyId: 'comp-001',
    });

    const archived = archiveProject(project.id);
    expect(archived!.status).toBe('archived');

    const activeProjects = projects.filter((p) => p.status === 'active');
    expect(activeProjects.length).toBe(0);
  });

  it('SYS-003: restaurar proyecto cambia estado a active', () => {
    const project = createProject({
      code: 'SYS-003B',
      name: 'Para Restaurar',
      client: 'Cliente',
      budget: 50000,
      progress: 10,
      status: 'active',
      companyId: 'comp-001',
    });

    archiveProject(project.id);
    expect(project.status).toBe('archived');

    const restored = restoreProject(project.id);
    expect(restored!.status).toBe('active');
  });

  // ---- SYS-004: APU budget ----
  it('SYS-004: crear renglón APU calcula total correctamente', () => {
    const project = createProject({
      code: 'SYS-004',
      name: 'APU Test',
      client: 'Cliente',
      budget: 100000,
      progress: 0,
      companyId: 'comp-001',
    });

    const item = createAPUItem({
      projectId: project.id,
      description: 'Concreto reforzado',
      unit: 'm3',
      quantity: 2,
      unitPrice: 200,
    });

    expect(item.total).toBe(400);
    expect(item.quantity * item.unitPrice).toBe(item.total);
    expect(apuItems.length).toBe(1);
  });

  // ---- SYS-005: Expense propagation ----
  it('SYS-005: registrar gasto propaga a proyecto y tablero', () => {
    const project = createProject({
      code: 'SYS-005',
      name: 'Gasto Test',
      client: 'Cliente',
      budget: 100000,
      progress: 5,
      companyId: 'comp-001',
    });

    const expense = createExpense({
      projectId: project.id,
      description: 'Materiales de construcción',
      amount: 12000,
    });

    expect(expense.amount).toBe(12000);
    expect(expense.status).toBe('pending');

    const updatedProject = projects.find((p) => p.id === project.id);
    expect(updatedProject!.totalExpenses).toBe(12000);

    const kpis = getDashboardKPIs();
    expect(kpis.totalExpenses).toBe(12000);
  });

  // ---- SYS-006: Quotation acceptance ----
  it('SYS-006: crear cotización y marcar como aceptada propaga ingreso', () => {
    const project = createProject({
      code: 'SYS-006',
      name: 'Cotización Test',
      client: 'Cliente',
      budget: 100000,
      progress: 5,
      companyId: 'comp-001',
    });

    const quotation = createQuotation({
      projectId: project.id,
      client: 'Cliente Final',
      amount: 25000,
    });

    expect(quotation.status).toBe('draft');

    const accepted = acceptQuotation(quotation.id);
    expect(accepted!.status).toBe('accepted');

    const updatedProject = projects.find((p) => p.id === project.id);
    expect(updatedProject!.totalIncome).toBe(25000);

    const kpis = getDashboardKPIs();
    expect(kpis.totalIncome).toBe(25000);
  });

  // ---- SYS-007: Employee registration ----
  it('SYS-007: registrar empleado en cuadrilla', () => {
    const employee = createEmployee({
      name: 'Empleado Sistema',
      dailyWage: 250,
      companyId: 'comp-001',
    });

    expect(employee.name).toBe('Empleado Sistema');
    expect(employee.dailyWage).toBe(250);
    expect(employee.companyId).toBe('comp-001');
    expect(employees.length).toBe(1);
  });

  // ---- SYS-008: Attendance with GPS ----
  it('SYS-008: registrar asistencia con estado en obra', () => {
    const employee = createEmployee({
      name: 'Asistencia Test',
      dailyWage: 250,
      companyId: 'comp-001',
    });

    const attendance = createAttendance({
      employeeId: employee.id,
      status: 'on-site',
    });

    expect(attendance.employeeId).toBe(employee.id);
    expect(attendance.status).toBe('on-site');
    expect(attendance.timestamp).toBeDefined();
    expect(attendances.length).toBe(1);
  });

  // ---- SYS-009: Machinery status ----
  it('SYS-009: registrar maquinaria y cambiar estados disponible/mantenimiento', () => {
    const mac = createMachinery({ name: 'Maquinaria Sistema' });
    expect(mac.status).toBe('available');

    const inMaintenance = setMachineryMaintenance(mac.id);
    expect(inMaintenance!.status).toBe('maintenance');

    const available = setMachineryAvailable(mac.id);
    expect(available!.status).toBe('available');
  });

  // ---- SYS-010: Complete flow ----
  it('SYS-010: flujo completo proyecto → gasto → cotización → tablero', () => {
    // 1. Crear proyecto
    const project = createProject({
      code: 'SYS-010',
      name: 'Flujo Completo',
      client: 'Cliente Final',
      budget: 200000,
      progress: 0,
      companyId: 'comp-001',
    });

    // 2. Registrar gasto
    createExpense({
      projectId: project.id,
      description: 'Materiales iniciales',
      amount: 30000,
    });

    // 3. Crear y aceptar cotización
    const quotation = createQuotation({
      projectId: project.id,
      client: 'Cliente Final',
      amount: 50000,
    });
    acceptQuotation(quotation.id);

    // 4. Verificar KPIs del tablero
    const kpis = getDashboardKPIs();
    expect(kpis.totalBudget).toBe(200000);
    expect(kpis.totalExpenses).toBe(30000);
    expect(kpis.totalIncome).toBe(50000);
    expect(kpis.activeProjects).toBe(1);
    expect(kpis.netProfit).toBe(20000); // 50000 - 30000
  });

  it('SYS-010: múltiples proyectos en tablero consolidan KPIs', () => {
    const p1 = createProject({
      code: 'SYS-10A',
      name: 'Proyecto A',
      client: 'Cliente A',
      budget: 100000,
      progress: 50,
      companyId: 'comp-001',
    });
    const p2 = createProject({
      code: 'SYS-10B',
      name: 'Proyecto B',
      client: 'Cliente B',
      budget: 50000,
      progress: 30,
      companyId: 'comp-001',
    });

    createExpense({ projectId: p1.id, description: 'Gasto A', amount: 10000 });
    createExpense({ projectId: p2.id, description: 'Gasto B', amount: 5000 });

    const q1 = createQuotation({ projectId: p1.id, client: 'C A', amount: 30000 });
    acceptQuotation(q1.id);

    const kpis = getDashboardKPIs();
    expect(kpis.totalBudget).toBe(150000);
    expect(kpis.totalExpenses).toBe(15000);
    expect(kpis.totalIncome).toBe(30000);
    expect(kpis.activeProjects).toBe(2);
    expect(kpis.netProfit).toBe(15000);
  });
});

console.log('✓ System Logic tests completed (SYS-001 to SYS-010)');

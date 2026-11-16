import type { CompanyRole } from '@/lib/types';

export const INVITABLE_COMPANY_ROLES: Exclude<CompanyRole, 'owner'>[] = [
  'admin',
  'project_manager',
  'finance',
  'field_worker',
  'warehouse_manager',
  'viewer',
];

const FULL_PERSONNEL_ROLES: CompanyRole[] = ['owner', 'admin', 'finance'];
const ATTENDANCE_ROLES: CompanyRole[] = [
  'owner',
  'admin',
  'project_manager',
  'finance',
  'field_worker',
];
const EXPENSE_WRITE_ROLES: CompanyRole[] = ['owner', 'admin', 'finance'];
const INVENTORY_READ_ROLES: CompanyRole[] = [
  'owner', 'admin', 'project_manager', 'finance', 'warehouse_manager', 'viewer',
];
const INVENTORY_WRITE_ROLES: CompanyRole[] = [
  'owner', 'admin', 'project_manager', 'warehouse_manager',
];
const PURCHASING_READ_ROLES: CompanyRole[] = [
  'owner', 'admin', 'project_manager', 'finance', 'warehouse_manager', 'viewer',
];
const PURCHASING_WRITE_ROLES: CompanyRole[] = [
  'owner', 'admin', 'project_manager', 'finance',
];
const EXPENSE_READ_ROLES: CompanyRole[] = [
  'owner',
  'admin',
  'project_manager',
  'finance',
  'viewer',
];

export function canReadFullPersonnel(role?: CompanyRole | null): boolean {
  return role !== undefined && role !== null && FULL_PERSONNEL_ROLES.includes(role);
}

export function canReadEmployeeDirectory(role?: CompanyRole | null): boolean {
  return role !== undefined && role !== null && ATTENDANCE_ROLES.includes(role);
}

export function canManagePersonnel(role?: CompanyRole | null): boolean {
  return canReadFullPersonnel(role);
}

export function canReadAttendance(role?: CompanyRole | null): boolean {
  return canReadEmployeeDirectory(role);
}

/**
 * Registrar/editar/aprobar gastos: solo roles financieros.
 * El Project Manager puede consultarlos, pero la aprobación por PM se define
 * en las reglas de Firestore y en el flujo de auditoría.
 */
/** Consulta del catálogo de artículos, bodegas, proveedores y compras. */
export function canReadInventory(role?: CompanyRole | null): boolean {
  return role != null && INVENTORY_READ_ROLES.includes(role);
}

/** Alta y mantenimiento de existencias/catálogos por personal autorizado de obra. */
export function canManageInventory(role?: CompanyRole | null): boolean {
  return role != null && INVENTORY_WRITE_ROLES.includes(role);
}

/** Consulta de órdenes y contratos asociados a compras. */
export function canReadPurchasing(role?: CompanyRole | null): boolean {
  return role != null && PURCHASING_READ_ROLES.includes(role);
}

/** Alta y autorización de órdenes de compra/subcontratos. */
export function canManagePurchasing(role?: CompanyRole | null): boolean {
  return role != null && PURCHASING_WRITE_ROLES.includes(role);
}

export function canWriteExpenses(role?: CompanyRole | null): boolean {
  return role !== undefined && role !== null && EXPENSE_WRITE_ROLES.includes(role);
}

/** Consultar gastos y facturas (incluye PM y auditoría de solo lectura). */
export function canReadExpenses(role?: CompanyRole | null): boolean {
  return role !== undefined && role !== null && EXPENSE_READ_ROLES.includes(role);
}

const ROLE_LABELS: Record<CompanyRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  project_manager: 'Project Manager / Director de Obra',
  finance: 'Finanzas',
  field_worker: 'Trabajador de Campo',
  warehouse_manager: 'Encargado de bodega',
  viewer: 'Consulta (solo lectura)',
};

/**
 * Etiqueta legible del rol para la bitácora de auditoría de gastos.
 * El nombre que se firma debe corresponder al rol real del usuario, no a un
 * texto fijo de demostración.
 */
export function roleLabel(role?: CompanyRole | null): string {
  if (!role) return 'Usuario autenticado';
  return ROLE_LABELS[role] ?? role;
}

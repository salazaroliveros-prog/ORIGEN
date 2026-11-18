import type { CompanyRole } from '@/lib/types';

const FULL_PERSONNEL_ROLES: CompanyRole[] = ['owner', 'admin', 'finance'];
const ATTENDANCE_ROLES: CompanyRole[] = [
  'owner',
  'admin',
  'project_manager',
  'finance',
  'field_worker',
];
const EXPENSE_WRITE_ROLES: CompanyRole[] = ['owner', 'admin', 'finance'];
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
export function canWriteExpenses(role?: CompanyRole | null): boolean {
  return role !== undefined && role !== null && EXPENSE_WRITE_ROLES.includes(role);
}

/** Consultar gastos y facturas (incluye PM y auditoría de solo lectura). */
export function canReadExpenses(role?: CompanyRole | null): boolean {
  return role !== undefined && role !== null && EXPENSE_READ_ROLES.includes(role);
}

/**
 * Emitir/editar/anular facturas FEL: mismas reglas que las escrituras
 * financieras (`firestore.rules` exige owner/admin/finance).
 */
export function canWriteFelInvoices(role?: CompanyRole | null): boolean {
  return canWriteExpenses(role);
}

const ROLE_LABELS: Record<CompanyRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  project_manager: 'Project Manager / Director de Obra',
  finance: 'Finanzas',
  field_worker: 'Trabajador de Campo',
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

import type { CompanyRole } from '@/lib/types';

const FULL_PERSONNEL_ROLES: CompanyRole[] = ['owner', 'admin', 'finance'];
const ATTENDANCE_ROLES: CompanyRole[] = [
  'owner',
  'admin',
  'project_manager',
  'finance',
  'field_worker',
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

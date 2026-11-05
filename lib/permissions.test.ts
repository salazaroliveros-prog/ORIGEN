import { describe, expect, it } from 'vitest';
import {
  canReadFullPersonnel,
  canReadEmployeeDirectory,
  canManagePersonnel,
  canReadAttendance,
} from './permissions';
import type { CompanyRole } from './types';

const ALL_ROLES: CompanyRole[] = [
  'owner',
  'admin',
  'project_manager',
  'finance',
  'field_worker',
  'viewer',
];

describe('canReadFullPersonnel', () => {
  it('grants owner, admin, finance', () => {
    expect(canReadFullPersonnel('owner')).toBe(true);
    expect(canReadFullPersonnel('admin')).toBe(true);
    expect(canReadFullPersonnel('finance')).toBe(true);
  });
  it('denies project_manager, field_worker, viewer', () => {
    expect(canReadFullPersonnel('project_manager')).toBe(false);
    expect(canReadFullPersonnel('field_worker')).toBe(false);
    expect(canReadFullPersonnel('viewer')).toBe(false);
  });
  it('returns false for null/undefined', () => {
    expect(canReadFullPersonnel(null)).toBe(false);
    expect(canReadFullPersonnel(undefined)).toBe(false);
  });
});

describe('canReadEmployeeDirectory', () => {
  it('grants all roles except viewer', () => {
    expect(canReadEmployeeDirectory('owner')).toBe(true);
    expect(canReadEmployeeDirectory('admin')).toBe(true);
    expect(canReadEmployeeDirectory('project_manager')).toBe(true);
    expect(canReadEmployeeDirectory('finance')).toBe(true);
    expect(canReadEmployeeDirectory('field_worker')).toBe(true);
    expect(canReadEmployeeDirectory('viewer')).toBe(false);
  });
  it('returns false for null/undefined', () => {
    expect(canReadEmployeeDirectory(null)).toBe(false);
    expect(canReadEmployeeDirectory(undefined)).toBe(false);
  });
});

describe('canManagePersonnel', () => {
  it('mirrors canReadFullPersonnel', () => {
    for (const role of ALL_ROLES) {
      expect(canManagePersonnel(role)).toBe(canReadFullPersonnel(role));
    }
  });
});

describe('canReadAttendance', () => {
  it('mirrors canReadEmployeeDirectory', () => {
    for (const role of ALL_ROLES) {
      expect(canReadAttendance(role)).toBe(canReadEmployeeDirectory(role));
    }
  });
  it('returns false for null/undefined', () => {
    expect(canReadAttendance(null)).toBe(false);
    expect(canReadAttendance(undefined)).toBe(false);
  });
});

describe('role hierarchy', () => {
  it('owner has all permissions', () => {
    expect(canReadFullPersonnel('owner')).toBe(true);
    expect(canReadEmployeeDirectory('owner')).toBe(true);
    expect(canManagePersonnel('owner')).toBe(true);
    expect(canReadAttendance('owner')).toBe(true);
  });
  it('viewer has no permissions', () => {
    expect(canReadFullPersonnel('viewer')).toBe(false);
    expect(canReadEmployeeDirectory('viewer')).toBe(false);
    expect(canManagePersonnel('viewer')).toBe(false);
    expect(canReadAttendance('viewer')).toBe(false);
  });
  it('field_worker can attend but not manage personnel', () => {
    expect(canReadAttendance('field_worker')).toBe(true);
    expect(canReadFullPersonnel('field_worker')).toBe(false);
  });
});

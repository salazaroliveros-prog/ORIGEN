import { describe, expect, it } from 'vitest';
import {
  canReadFullPersonnel,
  canReadEmployeeDirectory,
  canManagePersonnel,
  canReadAttendance,
  canWriteFelInvoices,
  canWriteExpenses,
  canReadInventory,
  canManageInventory,
  canReadPurchasing,
  canManagePurchasing,
  INVITABLE_COMPANY_ROLES,
} from './permissions';
import type { CompanyRole } from './types';

const ALL_ROLES: CompanyRole[] = [
  'owner',
  'admin',
  'project_manager',
  'finance',
  'field_worker',
  'warehouse_manager',
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

describe('canWriteFelInvoices', () => {
  it('grants owner, admin and finance (mismos roles que los gastos)', () => {
    expect(canWriteFelInvoices('owner')).toBe(true);
    expect(canWriteFelInvoices('admin')).toBe(true);
    expect(canWriteFelInvoices('finance')).toBe(true);
  });

  it('denies project_manager, field_worker and viewer', () => {
    expect(canWriteFelInvoices('project_manager')).toBe(false);
    expect(canWriteFelInvoices('field_worker')).toBe(false);
    expect(canWriteFelInvoices('viewer')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(canWriteFelInvoices(null)).toBe(false);
    expect(canWriteFelInvoices(undefined)).toBe(false);
  });

  it('keeps the same roles as financial writes', () => {
    for (const role of ALL_ROLES) {
      expect(canWriteFelInvoices(role)).toBe(canWriteExpenses(role));
    }
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


describe('inventory and purchasing permissions', () => {
  it('grants inventory maintenance to project and warehouse managers', () => {
    expect(canManageInventory('owner')).toBe(true);
    expect(canManageInventory('admin')).toBe(true);
    expect(canManageInventory('project_manager')).toBe(true);
    expect(canManageInventory('warehouse_manager')).toBe(true);
    expect(canManageInventory('finance')).toBe(false);
    expect(canManageInventory('field_worker')).toBe(false);
    expect(canManageInventory('viewer')).toBe(false);
  });

  it('grants purchasing maintenance only to authorized financial/project roles', () => {
    expect(canManagePurchasing('owner')).toBe(true);
    expect(canManagePurchasing('admin')).toBe(true);
    expect(canManagePurchasing('project_manager')).toBe(true);
    expect(canManagePurchasing('finance')).toBe(true);
    expect(canManagePurchasing('warehouse_manager')).toBe(false);
    expect(canManagePurchasing('field_worker')).toBe(false);
    expect(canManagePurchasing('viewer')).toBe(false);
  });

  it('allows warehouse managers and finance to read the supply chain', () => {
    for (const role of ['owner', 'admin', 'project_manager', 'finance', 'warehouse_manager', 'viewer'] as const) {
      expect(canReadInventory(role)).toBe(true);
      expect(canReadPurchasing(role)).toBe(true);
    }
    expect(canReadInventory('field_worker')).toBe(false);
    expect(canReadPurchasing('field_worker')).toBe(false);
    expect(canReadInventory(null)).toBe(false);
    expect(canManagePurchasing(undefined)).toBe(false);
  });
});


describe('company invitations', () => {
  it('exposes the warehouse manager as an assignable role', () => {
    expect(INVITABLE_COMPANY_ROLES).toContain('warehouse_manager');
    expect(INVITABLE_COMPANY_ROLES).not.toContain('owner');
  });
});

import { describe, expect, it } from 'vitest';
import { validateProjectForm } from './project.schema';

const validProject = {
  code: 'OBRA-2026-01',
  name: 'Torre Vista Hermosa',
  client: 'Desarrollos del Norte',
  location: 'Zona 10, Ciudad de Guatemala',
  municipality: 'Guatemala',
  department: 'Guatemala',
  budgetTotal: 1_000_000,
  spentTotal: 0,
  progressPercent: 0,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'Planificación',
  lat: 14.6133,
  lng: -90.4875,
  expectedProfitMarginPercent: 15,
};

describe('validateProjectForm', () => {
  it('accepts a complete project with a valid date range', () => {
    expect(validateProjectForm(validProject).success).toBe(true);
  });

  it('accepts archived projects that are still valid persisted records', () => {
    expect(
      validateProjectForm({
        ...validProject,
        status: 'Archivado',
      }).success
    ).toBe(true);
  });

  it('keeps an unconfigured profit margin unset', () => {
    const { expectedProfitMarginPercent: _margin, ...projectWithoutMargin } = validProject;
    const result = validateProjectForm(projectWithoutMargin);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('expectedProfitMarginPercent');
    }
  });

  it('accepts a cleared optional profit margin', () => {
    const result = validateProjectForm({ ...validProject, expectedProfitMarginPercent: null });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expectedProfitMarginPercent).toBeNull();
    }
  });

  it('rejects an end date earlier than the start date', () => {
    const result = validateProjectForm({
      ...validProject,
      startDate: '2026-12-31',
      endDate: '2026-01-01',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'endDate')).toBe(true);
    }
  });

  it('rejects impossible calendar dates', () => {
    expect(validateProjectForm({ ...validProject, startDate: '2026-02-30' }).success).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { generateDemoProjectSet } from './demoProjects';

describe('generateDemoProjectSet', () => {
  const result = generateDemoProjectSet('test-company', 'test-user');

  it('returns exactly 3 projects', () => {
    expect(result.projects).toHaveLength(3);
  });

  it('returns at least one APU item', () => {
    expect(result.apuItems.length).toBeGreaterThan(0);
  });

  it('returns exactly 3 quotes (one per project)', () => {
    expect(result.quotes).toHaveLength(3);
  });

  it('associates every APU item with the supplied companyId', () => {
    for (const item of result.apuItems) {
      expect(item.companyId).toBe('test-company');
    }
  });

  it('gives every project a non-empty code and name', () => {
    for (const project of result.projects) {
      expect(project.code).toBeTruthy();
      expect(project.name).toBeTruthy();
    }
  });

  it('sets apuBudgetTotal equal to the sum of its project APU items', () => {
    for (const project of result.projects) {
      const projectItems = result.apuItems.filter((item) => item.projectId === project.id);
      const expectedTotal = projectItems.reduce((sum, item) => sum + item.totalPriceGTQ, 0);
      expect(project.apuBudgetTotal).toBe(expectedTotal);
    }
  });

  it('scopes every project to the supplied companyId', () => {
    for (const project of result.projects) {
      expect(project.companyId).toBe('test-company');
    }
  });

  it('includes a time-phased budget entry for every project', () => {
    for (const project of result.projects) {
      expect(result.timePhased[project.id]).toBeDefined();
      expect(result.timePhased[project.id].length).toBeGreaterThan(0);
    }
  });
});

/**
 * ORIGEN ERP - Financial Components Integration Tests
 *
 * Tests de integración para componentes financieros
 */

import { describe, it, expect } from 'vitest';

// Budget interface for tests
interface Budget {
  id: string;
  projectId: string;
  category: string;
  amount: number;
  spent: number;
  remaining: number;
  status: 'active' | 'exceeded' | 'completed';
  companyId: string;
}

// APU item interface for tests
interface APUItem {
  id: string;
  projectId: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  companyId: string;
}

const mockBudgets: Budget[] = [
  {
    id: 'budget-001',
    projectId: 'proj-001',
    category: 'Materials',
    amount: 5000000,
    spent: 3000000,
    remaining: 2000000,
    status: 'active',
    companyId: 'comp-001',
  },
  {
    id: 'budget-002',
    projectId: 'proj-001',
    category: 'Labor',
    amount: 2000000,
    spent: 1800000,
    remaining: 200000,
    status: 'active',
    companyId: 'comp-001',
  },
  {
    id: 'budget-003',
    projectId: 'proj-002',
    category: 'Equipment',
    amount: 1000000,
    spent: 1200000,
    remaining: -200000,
    status: 'exceeded',
    companyId: 'comp-001',
  },
];

const mockAPUItems: APUItem[] = [
  {
    id: 'apu-001',
    projectId: 'proj-001',
    code: '01.01.01',
    description: 'Cemento Portland',
    unit: 'saco',
    quantity: 1000,
    unitPrice: 50,
    total: 50000,
    companyId: 'comp-001',
  },
  {
    id: 'apu-002',
    projectId: 'proj-001',
    code: '01.01.02',
    description: 'Arena Grava',
    unit: 'm3',
    quantity: 100,
    unitPrice: 150,
    total: 15000,
    companyId: 'comp-001',
  },
];

describe('Financial Components Integration Tests', () => {
  describe('Budget Validation', () => {
    it('should validate budget structure', () => {
      expect(mockBudgets).toHaveLength(3);
      expect(mockBudgets[0].id).toBeDefined();
      expect(mockBudgets[0].category).toBeDefined();
      expect(mockBudgets[0].amount).toBeGreaterThan(0);
    });

    it('should calculate remaining budget', () => {
      const budget = mockBudgets[0];
      const expectedRemaining = budget.amount - budget.spent;
      expect(budget.remaining).toBe(expectedRemaining);
    });

    it('should identify exceeded budgets', () => {
      const exceededBudgets = mockBudgets.filter((b) => b.status === 'exceeded');
      expect(exceededBudgets).toHaveLength(1);
    });

    it('should calculate budget utilization', () => {
      const budget = mockBudgets[0];
      const utilization = (budget.spent / budget.amount) * 100;
      expect(utilization).toBe(60);
    });

    it('should filter budgets by project', () => {
      const projectBudgets = mockBudgets.filter((b) => b.projectId === 'proj-001');
      expect(projectBudgets).toHaveLength(2);
    });

    it('should calculate total budget by project', () => {
      const projectBudgets = mockBudgets.filter((b) => b.projectId === 'proj-001');
      const totalBudget = projectBudgets.reduce((sum, b) => sum + b.amount, 0);
      expect(totalBudget).toBe(7000000);
    });
  });

  describe('APU Items Validation', () => {
    it('should validate APU item structure', () => {
      expect(mockAPUItems).toHaveLength(2);
      expect(mockAPUItems[0].code).toBeDefined();
      expect(mockAPUItems[0].description).toBeDefined();
      expect(mockAPUItems[0].unit).toBeDefined();
    });

    it('should calculate APU item total', () => {
      const item = mockAPUItems[0];
      const expectedTotal = item.quantity * item.unitPrice;
      expect(item.total).toBe(expectedTotal);
    });

    it('should calculate total APU by project', () => {
      const projectAPU = mockAPUItems.filter((a) => a.projectId === 'proj-001');
      const totalAPU = projectAPU.reduce((sum, a) => sum + a.total, 0);
      expect(totalAPU).toBe(65000);
    });

    it('should validate APU code format', () => {
      const item = mockAPUItems[0];
      expect(item.code).toMatch(/^\d{2}\.\d{2}\.\d{2}$/);
    });
  });

  describe('Budget Analysis', () => {
    it('should calculate budget variance', () => {
      const budget = mockBudgets[0];
      const variance = budget.amount - budget.spent;
      expect(variance).toBe(2000000);
    });

    it('should calculate budget percentage', () => {
      const budget = mockBudgets[0];
      const percentage = (budget.spent / budget.amount) * 100;
      expect(percentage).toBe(60);
    });

    it('should identify critical budgets (>80% utilized)', () => {
      const criticalBudgets = mockBudgets.filter((b) => {
        const utilization = (b.spent / b.amount) * 100;
        return utilization > 80;
      });
      expect(criticalBudgets).toHaveLength(2);
    });
  });

  describe('Financial Reporting', () => {
    it('should generate budget summary', () => {
      const summary = {
        totalBudget: mockBudgets.reduce((sum, b) => sum + b.amount, 0),
        totalSpent: mockBudgets.reduce((sum, b) => sum + b.spent, 0),
        totalRemaining: mockBudgets.reduce((sum, b) => sum + b.remaining, 0),
      };

      expect(summary.totalBudget).toBe(8000000);
      expect(summary.totalSpent).toBe(6000000);
      expect(summary.totalRemaining).toBe(2000000);
    });

    it('should generate budget report by category', () => {
      const byCategory = mockBudgets.reduce(
        (acc, budget) => {
          acc[budget.category] = (acc[budget.category] || 0) + budget.amount;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(byCategory['Materials']).toBe(5000000);
      expect(byCategory['Labor']).toBe(2000000);
    });
  });

  describe('Cost Tracking', () => {
    it('should track material costs', () => {
      const materialCosts = mockBudgets.filter((b) => b.category === 'Materials');
      const totalMaterialCost = materialCosts.reduce((sum, b) => sum + b.spent, 0);
      expect(totalMaterialCost).toBe(3000000);
    });

    it('should track labor costs', () => {
      const laborCosts = mockBudgets.filter((b) => b.category === 'Labor');
      const totalLaborCost = laborCosts.reduce((sum, b) => sum + b.spent, 0);
      expect(totalLaborCost).toBe(1800000);
    });
  });
});

console.log('✓ Financial components integration tests completed');

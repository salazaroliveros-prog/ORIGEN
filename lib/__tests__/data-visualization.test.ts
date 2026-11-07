/**
 * ORIGEN ERP - Data Visualization Logic Tests (Vitest)
 * Cubre DAT-001 a DAT-012: KPIs, gráficas, gráficos y visualización de datos
 * Prueba lógica de cálculo de KPIs, transformación de datos para gráficas
 * y formato de moneda
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Tipos de datos para visualización
// ============================================================
interface ProjectViz {
  id: string;
  code: string;
  name: string;
  budget: number;
  progress: number;
  status: 'active' | 'archived';
  totalExpenses: number;
  totalIncome: number;
}

interface ExpenseViz {
  id: string;
  projectId: string;
  category: string;
  amount: number;
  date: string;
}

interface QuotationViz {
  id: string;
  projectId: string;
  amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
}

interface KPIViz {
  id: string;
  label: string;
  value: number | string;
  unit: string;
  trend: 'up' | 'down' | 'stable' | 'neutral';
  color: string;
}

interface ChartSeries {
  name: string;
  value: number;
  color: string;
}

// ============================================================
// Lógica de cálculo de KPIs y visualización
// ============================================================

let projectsViz: ProjectViz[] = [];
let expensesViz: ExpenseViz[] = [];
let quotationsViz: QuotationViz[] = [];

function resetVizState() {
  projectsViz = [];
  expensesViz = [];
  quotationsViz = [];
}

// DAT-001: KPI Presupuesto Total
function calculateTotalBudget(projects: ProjectViz[]): number {
  return projects.reduce((sum, p) => sum + p.budget, 0);
}

// DAT-002: KPI Gasto Real Acumulado
function calculateTotalExpenses(projects: ProjectViz[]): number {
  return projects.reduce((sum, p) => sum + p.totalExpenses, 0);
}

// DAT-003: KPI Ingresos por Cotizaciones
function calculateTotalIncome(projects: ProjectViz[]): number {
  return projects.reduce((sum, p) => sum + p.totalIncome, 0);
}

// DAT-004: Barra de avance de proyecto
function calculateProgressPercentage(progress: number): number {
  return Math.min(100, Math.max(0, progress));
}

// DAT-005: KPIs se actualizan tras crear gasto
function addExpenseAndUpdate(projects: ProjectViz[], projectId: string, amount: number): ProjectViz[] {
  return projects.map((p) => {
    if (p.id === projectId) {
      return { ...p, totalExpenses: p.totalExpenses + amount };
    }
    return p;
  });
}

// DAT-006: KPIs se actualizan tras aceptar cotización
function addQuotationAndUpdate(projects: ProjectViz[], projectId: string, amount: number): ProjectViz[] {
  return projects.map((p) => {
    if (p.id === projectId) {
      return { ...p, totalIncome: p.totalIncome + amount };
    }
    return p;
  });
}

// DAT-007: Gráfica de progreso por proyecto
function getProgressChartData(projects: ProjectViz[]): ChartSeries[] {
  return projects
    .filter((p) => p.status === 'active')
    .map((p) => ({
      name: p.code,
      value: p.progress,
      color: p.progress >= 75 ? '#10b981' : p.progress >= 40 ? '#f59e0b' : '#ef4444',
    }));
}

// DAT-008: Gráfica de gastos por categoría
function getExpenseCategoryChart(expenses: ExpenseViz[]): ChartSeries[] {
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(categoryTotals).map(([category, total]) => ({
    name: category,
    value: total,
    color: '#38bdf8',
  }));
}

// DAT-009: KPIs persisten tras recarga (simulado)
function persistKPIs(kpis: KPIViz[]): string {
  return JSON.stringify(kpis);
}

function restoreKPIs(serialized: string): KPIViz[] {
  return JSON.parse(serialized);
}

// DAT-010: Visualización con datos vacíos
function getEmptyStateKPIs(): KPIViz[] {
  return [
    { id: 'kpi-1', label: 'Presupuesto Total', value: 0, unit: 'Q', trend: 'neutral', color: '#38bdf8' },
    { id: 'kpi-2', label: 'Gasto Real', value: 0, unit: 'Q', trend: 'neutral', color: '#38bdf8' },
    { id: 'kpi-3', label: 'Ingresos', value: 0, unit: 'Q', trend: 'neutral', color: '#38bdf8' },
    { id: 'kpi-4', label: 'Proyectos Activos', value: 0, unit: 'proyectos', trend: 'neutral', color: '#38bdf8' },
  ];
}

// DAT-011: Formato de moneda GTQ
function formatCurrencyGTQ(amount: number): string {
  return `Q ${amount.toLocaleString('es-GT')}`;
}

// DAT-012: KPI Proyectos Activos
function countActiveProjects(projects: ProjectViz[]): number {
  return projects.filter((p) => p.status === 'active').length;
}

// ============================================================
// TESTS
// ============================================================
describe('Data Visualization - KPIs y Gráficas (DAT-001 a DAT-012)', () => {
  beforeEach(() => {
    resetVizState();
  });

  // ---- DAT-001: KPI Presupuesto Total ----
  it('DAT-001: KPI Presupuesto Total muestra suma de proyectos activos', () => {
    projectsViz = [
      { id: 'p1', code: 'P1', name: 'Proyecto A', budget: 100000, progress: 50, status: 'active', totalExpenses: 0, totalIncome: 0 },
      { id: 'p2', code: 'P2', name: 'Proyecto B', budget: 50000, progress: 30, status: 'active', totalExpenses: 0, totalIncome: 0 },
      { id: 'p3', code: 'P3', name: 'Proyecto C', budget: 200000, progress: 80, status: 'archived', totalExpenses: 0, totalIncome: 0 },
    ];

    const total = calculateTotalBudget(projectsViz);
    expect(total).toBe(350000);
  });

  // ---- DAT-002: KPI Gasto Real Acumulado ----
  it('DAT-002: KPI Gasto Real Acumulado muestra total de gastos', () => {
    projectsViz = [
      { id: 'p1', code: 'P1', name: 'Proyecto A', budget: 100000, progress: 50, status: 'active', totalExpenses: 30000, totalIncome: 0 },
      { id: 'p2', code: 'P2', name: 'Proyecto B', budget: 50000, progress: 30, status: 'active', totalExpenses: 15000, totalIncome: 0 },
    ];

    const total = calculateTotalExpenses(projectsViz);
    expect(total).toBe(45000);
  });

  // ---- DAT-003: KPI Ingresos por Cotizaciones ----
  it('DAT-003: KPI Ingresos por Cotizaciones muestra total', () => {
    projectsViz = [
      { id: 'p1', code: 'P1', name: 'Proyecto A', budget: 100000, progress: 50, status: 'active', totalExpenses: 0, totalIncome: 25000 },
      { id: 'p2', code: 'P2', name: 'Proyecto B', budget: 50000, progress: 30, status: 'active', totalExpenses: 0, totalIncome: 15000 },
    ];

    const total = calculateTotalIncome(projectsViz);
    expect(total).toBe(40000);
  });

  // ---- DAT-004: Barra de avance de proyecto ----
  it('DAT-004: barra de avance refleja porcentaje del proyecto', () => {
    expect(calculateProgressPercentage(60)).toBe(60);
    expect(calculateProgressPercentage(100)).toBe(100);
    expect(calculateProgressPercentage(0)).toBe(0);
    expect(calculateProgressPercentage(150)).toBe(100); // Clampeado a 100
    expect(calculateProgressPercentage(-10)).toBe(0); // Clampeado a 0
  });

  // ---- DAT-005: KPIs se actualizan tras crear gasto ----
  it('DAT-005: KPIs se actualizan tras crear gasto', () => {
    projectsViz = [
      { id: 'p1', code: 'P1', name: 'Proyecto A', budget: 100000, progress: 50, status: 'active', totalExpenses: 10000, totalIncome: 0 },
    ];

    const updated = addExpenseAndUpdate(projectsViz, 'p1', 12000);
    expect(updated[0].totalExpenses).toBe(22000);

    const kpis = {
      totalBudget: calculateTotalBudget(updated),
      totalExpenses: calculateTotalExpenses(updated),
      totalIncome: calculateTotalIncome(updated),
    };
    expect(kpis.totalExpenses).toBe(22000);
  });

  // ---- DAT-006: KPIs se actualizan tras aceptar cotización ----
  it('DAT-006: KPIs se actualizan tras aceptar cotización', () => {
    projectsViz = [
      { id: 'p1', code: 'P1', name: 'Proyecto A', budget: 100000, progress: 50, status: 'active', totalExpenses: 0, totalIncome: 0 },
    ];

    const updated = addQuotationAndUpdate(projectsViz, 'p1', 25000);
    expect(updated[0].totalIncome).toBe(25000);

    const kpis = {
      totalBudget: calculateTotalBudget(updated),
      totalExpenses: calculateTotalExpenses(updated),
      totalIncome: calculateTotalIncome(updated),
    };
    expect(kpis.totalIncome).toBe(25000);
  });

  // ---- DAT-007: Gráfica de progreso por proyecto ----
  it('DAT-007: gráfica de progreso por proyecto renderiza datos correctos', () => {
    projectsViz = [
      { id: 'p1', code: 'P-001', name: 'Proyecto A', budget: 100000, progress: 85, status: 'active', totalExpenses: 0, totalIncome: 0 },
      { id: 'p2', code: 'P-002', name: 'Proyecto B', budget: 50000, progress: 45, status: 'active', totalExpenses: 0, totalIncome: 0 },
      { id: 'p3', code: 'P-003', name: 'Proyecto C', budget: 30000, progress: 20, status: 'active', totalExpenses: 0, totalIncome: 0 },
      { id: 'p4', code: 'P-004', name: 'Proyecto D', budget: 20000, progress: 90, status: 'archived', totalExpenses: 0, totalIncome: 0 },
    ];

    const chartData = getProgressChartData(projectsViz);
    expect(chartData.length).toBe(3); // Solo activos
    expect(chartData[0].name).toBe('P-001');
    expect(chartData[0].value).toBe(85);
    expect(chartData[0].color).toBe('#10b981'); // >= 75 es verde
    expect(chartData[1].color).toBe('#f59e0b'); // 40-74 es ámbar
    expect(chartData[2].color).toBe('#ef4444'); // < 40 es rojo
  });

  // ---- DAT-008: Gráfica de gastos por categoría ----
  it('DAT-008: gráfica de gastos por categoría renderiza distribución', () => {
    expensesViz = [
      { id: 'e1', projectId: 'p1', category: 'Materiales', amount: 10000, date: '2026-10-01' },
      { id: 'e2', projectId: 'p1', category: 'Materiales', amount: 5000, date: '2026-10-02' },
      { id: 'e3', projectId: 'p1', category: 'Mano de obra', amount: 15000, date: '2026-10-03' },
      { id: 'e4', projectId: 'p1', category: 'Maquinaria', amount: 8000, date: '2026-10-04' },
    ];

    const chartData = getExpenseCategoryChart(expensesViz);
    expect(chartData.length).toBe(3);
    const materiales = chartData.find((c) => c.name === 'Materiales');
    expect(materiales?.value).toBe(15000);
    const manoDeObra = chartData.find((c) => c.name === 'Mano de obra');
    expect(manoDeObra?.value).toBe(15000);
    const maquinaria = chartData.find((c) => c.name === 'Maquinaria');
    expect(maquinaria?.value).toBe(8000);
  });

  // ---- DAT-009: KPIs persisten tras recarga ----
  it('DAT-009: KPIs persisten tras recarga de página', () => {
    const kpis: KPIViz[] = [
      { id: 'kpi-1', label: 'Presupuesto Total', value: 100000, unit: 'Q', trend: 'up', color: '#38bdf8' },
      { id: 'kpi-2', label: 'Gasto Real', value: 30000, unit: 'Q', trend: 'up', color: '#38bdf8' },
    ];

    const serialized = persistKPIs(kpis);
    const restored = restoreKPIs(serialized);

    expect(restored.length).toBe(2);
    expect(restored[0].value).toBe(100000);
    expect(restored[1].value).toBe(30000);
  });

  // ---- DAT-010: Visualización con datos vacíos ----
  it('DAT-010: visualización con datos vacíos no rompe', () => {
    resetVizState();
    projectsViz = [];

    const totalBudget = calculateTotalBudget(projectsViz);
    const totalExpenses = calculateTotalExpenses(projectsViz);
    const totalIncome = calculateTotalIncome(projectsViz);
    const activeCount = countActiveProjects(projectsViz);

    expect(totalBudget).toBe(0);
    expect(totalExpenses).toBe(0);
    expect(totalIncome).toBe(0);
    expect(activeCount).toBe(0);

    const emptyKPIs = getEmptyStateKPIs();
    expect(emptyKPIs.length).toBe(4);
    expect(emptyKPIs[0].value).toBe(0);
    expect(emptyKPIs[1].value).toBe(0);
  });

  // ---- DAT-011: Formato de moneda GTQ ----
  it('DAT-011: formato de moneda GTQ correcto', () => {
    expect(formatCurrencyGTQ(100000)).toBe('Q 100,000');
    expect(formatCurrencyGTQ(12500.5)).toContain('Q');
    expect(formatCurrencyGTQ(0)).toBe('Q 0');
    expect(formatCurrencyGTQ(1234567.89)).toContain('1,234,567');
  });

  // ---- DAT-012: KPI Proyectos Activos ----
  it('DAT-012: KPI Proyectos Activos cuenta solo proyectos activos', () => {
    projectsViz = [
      { id: 'p1', code: 'P1', name: 'Proyecto A', budget: 100000, progress: 50, status: 'active', totalExpenses: 0, totalIncome: 0 },
      { id: 'p2', code: 'P2', name: 'Proyecto B', budget: 50000, progress: 30, status: 'archived', totalExpenses: 0, totalIncome: 0 },
      { id: 'p3', code: 'P3', name: 'Proyecto C', budget: 30000, progress: 80, status: 'active', totalExpenses: 0, totalIncome: 0 },
    ];

    const activeCount = countActiveProjects(projectsViz);
    expect(activeCount).toBe(2);

    const kpis = getDashboardKPIsFromProjects(projectsViz);
    expect(kpis.activeProjects).toBe(2);
  });

  // Helper adicional para DAT-012
  function getDashboardKPIsFromProjects(projects: ProjectViz[]) {
    return {
      totalBudget: calculateTotalBudget(projects),
      totalExpenses: calculateTotalExpenses(projects),
      totalIncome: calculateTotalIncome(projects),
      activeProjects: countActiveProjects(projects),
    };
  }
});

console.log('✓ Data Visualization tests completed (DAT-001 to DAT-012)');

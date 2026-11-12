import type { ComponentType } from 'react';
import type { CompanySettings, ExpenseRecord, Employee, AttendanceRecord } from '@/lib/types';
import type { Project as LibProject, Milestone as LibMilestone } from '@/lib/types';

export type Project = LibProject;
export type Milestone = LibMilestone;

export type WidgetId =
  | 'cashFlow'
  | 'laborCosts'
  | 'progressComparison'
  | 'stackedBudget'
  | 'expensesHistogram'
  | 'budgetUtilization'
  | 'projectBreakdown';

export type WidgetCategory = 'financiero' | 'mano_obra' | 'avance';
export type WidgetPriority = 'alta' | 'media';

export interface WidgetMetadata {
  id: WidgetId;
  title: string;
  description: string;
  category: WidgetCategory;
  priority: WidgetPriority;
  icon: ComponentType<{ className?: string; [key: string]: unknown }>;
}

export interface DashboardViewProps {
  projects: Project[];
  expenses?: ExpenseRecord[];
  company?: CompanySettings;
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  milestones?: Milestone[];
  employees?: Employee[];
  attendance?: AttendanceRecord[];
}

export interface ProgressChartDataPoint {
  id: string;
  name: string;
  fullName: string;
  code: string;
  avanceFisico: number;
  ejecucionFinanciera: number;
  presupuesto: number;
  gastoReal: number;
  descalce: number;
  isAlert: boolean;
}

export interface StackedChartDataPoint {
  id: string;
  name: string;
  fullName: string;
  presupuestoAsignado: number;
  gastoReal: number;
  saldoDisponible: number;
  sobrecostoExcedido: number;
  totalGasto: number;
  percentExecuted: number;
  isOverbudget: boolean;
}

export interface DashboardTotals {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  spentPercentage: number;
  overbudgetCount: number;
  overbudgetProjects: Project[];
  projectSpentMap: Map<string, number>;
}

export interface UpcomingMilestone extends Milestone {
  projectName: string;
  projectCode: string;
  diffDays: number;
}

export const DEFAULT_VISIBLE_WIDGETS: Record<WidgetId, boolean> = {
  cashFlow: true,
  laborCosts: true,
  progressComparison: true,
  stackedBudget: true,
  expensesHistogram: true,
  budgetUtilization: true,
  projectBreakdown: true,
};
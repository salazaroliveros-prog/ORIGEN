'use client';

import { useMemo } from 'react';
import type { CompanyRole, Project, ExpenseRecord, AttendanceRecord, Employee, QuoteRecord, APUItem, Machinery, MachineryLog, FieldVisit, CompanySettings } from '@/lib/types';
import { useProjects, UseProjectsReturn } from './useProjects';
import { useExpenses, UseExpensesReturn } from './useExpenses';
import { useAttendance, UseAttendanceReturn } from './useAttendance';
import { useEmployees, UseEmployeesReturn } from './useEmployees';
import { useAPUItems, UseAPUItemsReturn } from './useAPUItems';
import { useQuotes, UseQuotesReturn } from './useQuotes';
import { useMachinery, UseMachineryReturn } from './useMachinery';
import { useCompanySettings, UseCompanySettingsReturn } from './useCompanySettings';
import { useFieldVisits, UseFieldVisitsReturn } from './useFieldVisits';
import { calculateBudgetSummary, BudgetSummary } from '@/lib/utils/calculations';

interface UseProjectDataOptions {
  companyId?: string;
  currentUserId?: string;
  role?: CompanyRole;
}

interface UseProjectDataReturn {
  // Projects
  projects: Project[];
  activeProjects: Project[];
  projectsLoading: boolean;
  createProject: UseProjectsReturn['createProject'];
  updateProject: UseProjectsReturn['updateProject'];
  archiveProject: UseProjectsReturn['archiveProject'];
  restoreProject: UseProjectsReturn['restoreProject'];
  updateProjectSchedule: UseProjectsReturn['updateProjectSchedule'];
  getDefaultValues: UseProjectsReturn['getDefaultValues'];
  validateForm: UseProjectsReturn['validateForm'];

  // Expenses
  expenses: ExpenseRecord[];
  allExpenses: ExpenseRecord[];
  expensesLoading: boolean;
  projectExpenses: Map<string, ExpenseRecord[]>;
  addExpense: UseExpensesReturn['addExpense'];
  updateExpense: UseExpensesReturn['updateExpense'];
  deleteExpense: UseExpensesReturn['deleteExpense'];

  // Attendance
  attendance: AttendanceRecord[];
  allAttendance: AttendanceRecord[];
  attendanceLoading: boolean;
  addAttendance: UseAttendanceReturn['addAttendance'];
  deleteAttendance: UseAttendanceReturn['deleteAttendance'];

  // Employees
  employees: Array<Employee | { id: string; companyId: string; name: string; role: Employee['role'] }>;
  fullEmployees: Employee[];
  employeesLoading: boolean;
  addEmployee: UseEmployeesReturn['addEmployee'];
  deleteEmployee: UseEmployeesReturn['deleteEmployee'];

  // APU Items
  apuItems: APUItem[];
  apuItemsLoading: boolean;
  saveAPUItems: UseAPUItemsReturn['saveAPUItems'];
  deleteAPUItem: UseAPUItemsReturn['deleteAPUItem'];

  // Quotes
  quotes: QuoteRecord[];
  quotesLoading: boolean;
  addQuote: UseQuotesReturn['addQuote'];
  updateQuoteStatus: UseQuotesReturn['updateQuoteStatus'];
  deleteQuote: UseQuotesReturn['deleteQuote'];

  // Machinery
  machinery: Machinery[];
  machineryLogs: MachineryLog[];
  machineryLoading: boolean;
  addMachinery: UseMachineryReturn['addMachinery'];
  addMachineryLog: UseMachineryReturn['addMachineryLog'];
  setMachineryStatus: UseMachineryReturn['setMachineryStatus'];
  deleteMachinery: UseMachineryReturn['deleteMachinery'];

  // Company Settings
  company: CompanySettings | null;
  companySettingsLoading: boolean;
  saveCompanySettings: UseCompanySettingsReturn['saveCompanySettings'];

  // Field Visits
  fieldVisits: FieldVisit[];
  fieldVisitsLoading: boolean;
  saveFieldVisit: UseFieldVisitsReturn['saveFieldVisit'];

  // Computed
  budgetSummary: BudgetSummary;
  loading: boolean;
}

export function useProjectData({
  companyId,
  currentUserId,
  role,
}: UseProjectDataOptions): UseProjectDataReturn {
  const activeProjectIds = useMemo(() => {
    // This will be populated from projects
    return [] as string[];
  }, []);

  const projectsHook = useProjects({ companyId, currentUserId });
  const expensesHook = useExpenses({ companyId, currentUserId, projectIds: projectsHook.activeProjects.map(p => p.id) });
  const attendanceHook = useAttendance({ companyId, currentUserId, role, projectIds: projectsHook.activeProjects.map(p => p.id) });
  const employeesHook = useEmployees({ companyId, currentUserId, role });
  const apuItemsHook = useAPUItems({ companyId, currentUserId, projects: projectsHook.projects });
  const quotesHook = useQuotes({ companyId, currentUserId });
  const machineryHook = useMachinery({ companyId, currentUserId });
  const companySettingsHook = useCompanySettings({ companyId });
  const fieldVisitsHook = useFieldVisits({ companyId, currentUserId });

  const budgetSummary = useMemo(() => {
    if (apuItemsHook.apuItems.length === 0 && expensesHook.allExpenses.length === 0) {
      return {
        budgetTotal: 0,
        spentTotal: 0,
        remaining: 0,
        utilization: 0,
        variance: 0,
      };
    }

    try {
      return calculateBudgetSummary(
        apuItemsHook.apuItems,
        expensesHook.allExpenses.reduce((sum, exp) => sum + exp.amount, 0)
      );
    } catch {
      return {
        budgetTotal: 0,
        spentTotal: 0,
        remaining: 0,
        utilization: 0,
        variance: 0,
      };
    }
  }, [apuItemsHook.apuItems, expensesHook.allExpenses]);

  return {
    // Projects
    projects: projectsHook.projects,
    activeProjects: projectsHook.activeProjects,
    projectsLoading: projectsHook.loading,
    createProject: projectsHook.createProject,
    updateProject: projectsHook.updateProject,
    archiveProject: projectsHook.archiveProject,
    restoreProject: projectsHook.restoreProject,
    updateProjectSchedule: projectsHook.updateProjectSchedule,
    getDefaultValues: projectsHook.getDefaultValues,
    validateForm: projectsHook.validateForm,

    // Expenses
    expenses: expensesHook.expenses,
    allExpenses: expensesHook.allExpenses,
    expensesLoading: expensesHook.loading,
    projectExpenses: expensesHook.projectExpenses,
    addExpense: expensesHook.addExpense,
    updateExpense: expensesHook.updateExpense,
    deleteExpense: expensesHook.deleteExpense,

    // Attendance
    attendance: attendanceHook.attendance,
    allAttendance: attendanceHook.allAttendance,
    attendanceLoading: attendanceHook.loading,
    addAttendance: attendanceHook.addAttendance,
    deleteAttendance: attendanceHook.deleteAttendance,

    // Employees
    employees: employeesHook.employees,
    fullEmployees: employeesHook.fullEmployees,
    employeesLoading: employeesHook.loading,
    addEmployee: employeesHook.addEmployee,
    deleteEmployee: employeesHook.deleteEmployee,

    // APU Items
    apuItems: apuItemsHook.apuItems,
    apuItemsLoading: apuItemsHook.loading,
    saveAPUItems: apuItemsHook.saveAPUItems,
    deleteAPUItem: apuItemsHook.deleteAPUItem,

    // Quotes
    quotes: quotesHook.quotes,
    quotesLoading: quotesHook.loading,
    addQuote: quotesHook.addQuote,
    updateQuoteStatus: quotesHook.updateQuoteStatus,
    deleteQuote: quotesHook.deleteQuote,

    // Machinery
    machinery: machineryHook.machinery,
    machineryLogs: machineryHook.machineryLogs,
    machineryLoading: machineryHook.loading,
    addMachinery: machineryHook.addMachinery,
    addMachineryLog: machineryHook.addMachineryLog,
    setMachineryStatus: machineryHook.setMachineryStatus,
    deleteMachinery: machineryHook.deleteMachinery,

    // Company Settings
    company: companySettingsHook.company,
    companySettingsLoading: companySettingsHook.loading,
    saveCompanySettings: companySettingsHook.saveCompanySettings,

    // Field Visits
    fieldVisits: fieldVisitsHook.fieldVisits,
    fieldVisitsLoading: fieldVisitsHook.loading,
    saveFieldVisit: fieldVisitsHook.saveFieldVisit,

    // Computed
    budgetSummary,
    loading: projectsHook.loading || expensesHook.loading || attendanceHook.loading ||
      employeesHook.loading || apuItemsHook.loading || quotesHook.loading ||
      machineryHook.loading || companySettingsHook.loading || fieldVisitsHook.loading,
  };
}

// Re-export individual hooks for direct usage
export {
  useProjects,
  useExpenses,
  useAttendance,
  useEmployees,
  useAPUItems,
  useQuotes,
  useMachinery,
  useCompanySettings,
  useFieldVisits,
};
'use client';

import { useMemo, useState } from 'react';
import { startTransition } from 'react';
import type { Project, CompanySettings, Employee, TaskReminder, ExpenseRecord, Milestone } from '@/lib/types';
import { DashboardView } from '@/features/dashboard/DashboardView';
import { ProjectsView } from '@/features/projects/ProjectsView';
import { BudgetView } from '@/features/budget/BudgetView';
import { StaffView } from '@/features/staff/StaffView';
import { ReportsView } from '@/features/reports/ReportsView';
import { AiAssistantView } from '@/features/ai/AiAssistantView';
import { ExpensesManager } from '@/components/ExpensesManager';
import { CotizacionesView } from '@/components/CotizacionesView';
import { PayrollEstimateView } from '@/components/PayrollEstimateView';
import { GmailManager } from '@/components/GmailManager';
import { CompanyTeamManager } from '@/components/CompanyTeamManager';
import { MachineryManager } from '@/components/MachineryManager';
import { GanttSchedule } from '@/components/GanttSchedule';
import { PageHeader } from '@/components/PageHeader';
import { saveProjectScheduleToFirestore } from '@/lib/firebaseService';
import { useProjectData } from '@/lib/hooks/data';
import toast from 'react-hot-toast';

type TabKey =
  | 'dashboard'
  | 'proyectos'
  | 'apu_presupuestos'
  | 'personal'
  | 'reportes'
  | 'ai'
  | 'cotizaciones'
  | 'cronograma_gantt'
  | 'maquinaria'
  | 'planillas'
  | 'gastos'
  | 'gmail'
  | 'equipo';

type ProjectData = ReturnType<typeof useProjectData>;

const TAB_CONFIG: Record<TabKey, { id: TabKey; label: string; subtitle: string }> = {
  dashboard: { id: 'dashboard', label: 'Tablero de Control', subtitle: 'Resumen general de proyectos y estado del sistema' },
  proyectos: { id: 'proyectos', label: 'Proyectos y Firmas Digitales', subtitle: 'Gestión de proyectos con trazabilidad completa' },
  apu_presupuestos: { id: 'apu_presupuestos', label: 'Presupuestos APU y Gastos', subtitle: 'Control financiero con desglose por renglón y departamento' },
  personal: { id: 'personal', label: 'Personal y Asistencia IGSS', subtitle: 'Control de cuadrillas, planillas y cumplimiento laboral' },
  reportes: { id: 'reportes', label: 'Reportes Finales y Actas', subtitle: 'Generación de reportes ejecutivos y documentación de obra' },
  ai: { id: 'ai', label: 'Asistente Técnico IA', subtitle: 'Consultas sobre presupuestos, normativas AGIES y COGUANOR' },
  cotizaciones: { id: 'cotizaciones', label: 'Cotizaciones', subtitle: 'Gestión de cotizaciones y presupuestos de clientes' },
  cronograma_gantt: { id: 'cronograma_gantt', label: 'Seguimiento & Hitos', subtitle: 'Cronograma de obra y seguimiento de hitos' },
  maquinaria: { id: 'maquinaria', label: 'Maquinaria', subtitle: 'Control de flota de maquinaria y horómetros' },
  planillas: { id: 'planillas', label: 'Planillas Guate', subtitle: 'Planillas laborales y cumplimiento IGSS' },
  gastos: { id: 'gastos', label: 'Gastos & Facturas', subtitle: 'Registro y control de gastos operativos' },
  gmail: { id: 'gmail', label: 'Correo & Avisos', subtitle: 'Comunicaciones y notificaciones del proyecto' },
  equipo: { id: 'equipo', label: 'Equipo de la empresa', subtitle: 'Miembros, invitaciones y permisos de acceso' },
};

interface MainAppContentProps {
  activeTab: TabKey;
  activeProjectId: string;
  activeProjects: Project[];
  company: CompanySettings;
  data: ProjectData;
  permissions: ReturnType<typeof usePermissions>;
  onSelectProject: (projectId: string) => void;
  handleProjectCreated: (projectId: string) => void;
  currentUser: { uid: string; email: string } | null;
  workspace: { id: string } | null;
}

function usePermissions(role?: string) {
  return {
    canManageProjects: ['owner', 'admin', 'project_manager'].includes(role ?? ''),
    canManageQuotes: ['owner', 'admin', 'project_manager', 'finance'].includes(role ?? ''),
    canManageBudget: ['owner', 'admin', 'project_manager', 'finance'].includes(role ?? ''),
    canManageMachinery: ['owner', 'admin', 'project_manager', 'field_worker'].includes(role ?? ''),
    canManageExpenses: ['owner', 'admin', 'finance'].includes(role ?? ''),
    canManageEmployees: ['owner', 'admin', 'finance'].includes(role ?? ''),
    canManageAttendance: ['owner', 'admin', 'project_manager', 'field_worker'].includes(role ?? ''),
    canViewPersonnel: ['owner', 'admin', 'project_manager', 'finance', 'field_worker', 'viewer'].includes(role ?? ''),
    canViewFullPersonnel: ['owner', 'admin', 'finance'].includes(role ?? ''),
    canManageCompany: ['owner', 'admin'].includes(role ?? ''),
  };
}

export function MainAppContent({
  activeTab,
  activeProjectId,
  activeProjects,
  company,
  data,
  permissions,
  onSelectProject,
  handleProjectCreated,
  currentUser,
  workspace,
}: MainAppContentProps) {
  const tabConfig = TAB_CONFIG[activeTab];
  const activeProject = activeProjects.find((project) => project.id === activeProjectId) ?? activeProjects[0];

  const persistScheduleChanges = async (
    projectId: string,
    changes: Parameters<typeof saveProjectScheduleToFirestore>[1]
  ) => {
    if (!currentUser?.uid || !workspace?.id) {
      toast.error('Inicia sesión para guardar los cambios del cronograma.');
      return;
    }

    const saved = await saveProjectScheduleToFirestore(projectId, changes, workspace.id, currentUser.uid);
    if (!saved) {
      toast.error('No se pudieron guardar los cambios del cronograma.');
    }
  };

  const fullEmployees = useMemo(
    () => data.employees.filter((employee): employee is Employee => 'dailyRateGTQ' in employee),
    [data.employees]
  );

  const activeExpenses = useMemo(
    () => data.expenses.filter((expense: ExpenseRecord) => activeProjects.some((p) => p.id === expense.projectId)),
    [activeProjects, data.expenses]
  );

  const activeAttendance = useMemo(
    () => data.attendance.filter((record: typeof data.attendance[0]) => activeProjects.some((p) => p.id === record.projectId)),
    [activeProjects, data.attendance]
  );

  const milestones = useMemo(
    () => activeProjects.flatMap((project) => project.scheduleMilestones ?? []),
    [activeProjects]
  );

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (activeTab === 'dashboard') {
    return (
      <DashboardView
        projects={activeProjects}
        expenses={activeExpenses}
        company={company}
        activeProjectId={activeProject?.id ?? ''}
        onSelectProject={onSelectProject}
        milestones={milestones}
        employees={fullEmployees}
        attendance={activeAttendance}
      />
    );
  }

  if (activeTab === 'proyectos') {
    return (
      <ProjectsView
        company={company}
        projects={data.projects}
        expenses={data.expenses}
        budgetItems={data.apuItems}
        quotes={data.quotes}
        loading={data.loading}
        onCreateProject={data.createProject}
        onProjectCreated={handleProjectCreated}
        onUpdateProject={data.updateProject}
        onArchiveProject={data.archiveProject}
        onRestoreProject={data.restoreProject}
        canManageProjects={permissions.canManageProjects}
      />
    );
  }

  if (activeTab === 'apu_presupuestos') {
    return (
      <BudgetView
        projects={activeProjects}
        expenses={data.expenses}
        budgetItems={data.apuItems}
        quotes={data.quotes}
        activeProjectId={activeProject?.id ?? ''}
        canWrite={permissions.canManageBudget}
        company={company}
        onSaveItems={data.saveAPUItems}
        onDeleteItem={data.deleteAPUItem}
      />
    );
  }

  if (activeTab === 'personal' && permissions.canViewPersonnel) {
    return (
      <StaffView
        attendance={data.attendance}
        company={company}
        projects={activeProjects}
        employees={data.employees}
        activeProjectId={activeProject?.id ?? ''}
        onSelectProject={onSelectProject}
        onAddEmployee={permissions.canManageEmployees ? data.addEmployee : undefined}
        onAddAttendance={permissions.canManageAttendance ? data.addAttendance : undefined}
        onDeleteAttendance={permissions.canManageAttendance ? data.deleteAttendance : undefined}
        onDeleteEmployee={permissions.canManageEmployees ? data.deleteEmployee : undefined}
        canViewEmployeeDetails={permissions.canViewFullPersonnel}
      />
    );
  }

  if (activeTab === 'reportes') {
    return (
      <ReportsView
        projects={activeProjects}
        expenses={data.expenses}
        fieldVisits={data.fieldVisits}
        company={company}
        activeProjectId={activeProject?.id ?? ''}
        onSelectProject={onSelectProject}
        budgetItems={data.apuItems}
        attendance={data.attendance}
        quotes={data.quotes}
      />
    );
  }

  if (activeTab === 'gastos') {
    return (
      <ExpensesManager
        projects={data.projects}
        expenses={data.expenses}
        company={company}
        activeProjectId={activeProject?.id ?? ''}
        onAddExpense={permissions.canManageExpenses ? data.addExpense : () => {}}
        onUpdateExpense={permissions.canManageExpenses ? data.updateExpense : undefined}
        currency="GTQ"
      />
    );
  }

  if (activeTab === 'cotizaciones') {
    return (
      <CotizacionesView
        projects={activeProjects}
        budgetItems={data.apuItems}
        budgetItemsLoading={data.apuItemsLoading}
        company={company}
        quotes={data.quotes}
        canWrite={permissions.canManageQuotes}
        activeProjectId={activeProject?.id ?? ''}
        onSelectProject={onSelectProject}
        onSaveQuote={data.addQuote}
        onUpdateQuoteStatus={data.updateQuoteStatus}
        onDeleteQuote={data.deleteQuote}
      />
    );
  }

  if (activeTab === 'planillas' && permissions.canViewFullPersonnel) {
    return (
      <PayrollEstimateView
        employees={fullEmployees}
        attendance={data.attendance}
        company={company}
        onSaveRates={permissions.canManageCompany
          ? async (settings: Partial<CompanySettings>) => data.saveCompanySettings({ ...company, ...settings })
          : undefined}
      />
    );
  }

  if (activeTab === 'gmail') {
    return (
      <GmailManager
        company={company}
        projects={activeProjects}
        activeProjectId={activeProject?.id ?? ''}
        onSelectProject={onSelectProject}
        userEmail={currentUser?.email}
        accessToken={null}
        tokenExpiresAt={null}
        onAuthorize={async () => ({ accessToken: '', expiresAt: 0 })}
      />
    );
  }

  if (activeTab === 'equipo' && permissions.canManageCompany && workspace && currentUser) {
    return (
      <CompanyTeamManager
        companyId={workspace.id}
        company={company}
        currentUserId={currentUser.uid}
        currentUserEmail={currentUser.email}
      />
    );
  }

  if (activeTab === 'maquinaria') {
    return (
      <div className="responsive-container safe-area-top safe-area-bottom min-h-full space-y-5">
        <PageHeader
          title={tabConfig.label}
          subtitle={tabConfig.subtitle}
          logoUrl={company.logoUrl}
          companyName={company.companyName}
          breadcrumbs={[
            { label: 'Inicio', href: '/' },
            { label: 'Proyectos', href: '/projects' },
            { label: tabConfig.label },
          ]}
        />
        <MachineryManager
          machinery={data.machinery}
          machineryLogs={data.machineryLogs}
          projects={activeProjects}
          activeProjectId={activeProject?.id ?? ''}
          canWrite={permissions.canManageMachinery}
          onAddMachinery={data.addMachinery}
          onDeleteMachinery={permissions.canManageMachinery ? data.deleteMachinery : undefined}
          onRecordMachineryUse={data.addMachineryLog}
          onSetMachineryStatus={data.setMachineryStatus}
          currency="GTQ"
          company={company}
        />
      </div>
    );
  }

  if (activeTab === 'ai') {
    return <AiAssistantView company={company} activeProject={activeProject} />;
  }

  if (activeTab === 'cronograma_gantt') {
    return (
      <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
        <PageHeader
          title={tabConfig.label}
          subtitle={tabConfig.subtitle}
          logoUrl={company.logoUrl}
          companyName={company.companyName}
          breadcrumbs={[
            { label: 'Inicio', href: '/' },
            { label: 'Proyectos', href: '/projects' },
            { label: tabConfig.label },
          ]}
        />
        {activeProject ? (
          <GanttSchedule
            tasks={activeProject.scheduleTasks ?? []}
            milestones={activeProject.scheduleMilestones ?? []}
            reminders={activeProject.taskReminders ?? []}
            projects={activeProjects}
            activeProjectId={activeProject.id}
            onUpdateTasks={(scheduleTasks) =>
              void persistScheduleChanges(activeProject.id, { scheduleTasks })
            }
            onUpdateMilestones={(scheduleMilestones) =>
              void persistScheduleChanges(activeProject.id, { scheduleMilestones })
            }
            onAddReminder={(reminder) =>
              void persistScheduleChanges(activeProject.id, {
                taskReminders: [...(activeProject.taskReminders ?? []), reminder],
              })
            }
            onToggleReminder={(reminderId) => {
              const taskReminders = (activeProject.taskReminders ?? []).map((reminder) =>
                reminder.id === reminderId
                  ? { ...reminder, enabled: !reminder.enabled }
                  : reminder
              );
              void persistScheduleChanges(activeProject.id, { taskReminders });
            }}
            onDeleteReminder={(reminderId) => {
              const taskReminders = (activeProject.taskReminders ?? []).filter(
                (reminder: TaskReminder) => reminder.id !== reminderId
              );
              void persistScheduleChanges(activeProject.id, { taskReminders });
            }}
            onUpdateProjectProgress={(projectId, progressPercent) =>
              void persistScheduleChanges(projectId, { progressPercent })
            }
          />
        ) : (
          <div className="glass-panel p-8 text-center">
            <h3 className="mb-2 text-lg font-semibold text-white">
              Crea o selecciona un proyecto
            </h3>
            <p className="text-sm text-slate-400">
              El cronograma se guarda junto al proyecto activo. Primero agrega un proyecto
              para gestionar tareas e hitos.
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
}
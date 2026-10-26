'use client';

import { AuthDialog } from '@/components/AuthDialog';
import { LogoUpload } from '@/components/LogoUpload';
import { Navbar } from '@/components/Navbar';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { MobileHeader,PageHeader } from '@/components/PageHeader';
import { FocusTrap } from '@/components/a11y/FocusTrap';
import { Button } from '@/components/ui/Button';
import { TouchTarget } from '@/components/ui/TouchTarget';
import { AiAssistantView } from '@/features/ai/AiAssistantView';
import { BudgetView } from '@/features/budget/BudgetView';
import { DashboardView } from '@/features/dashboard/DashboardView';
import { ExpensesView } from '@/components/ExpensesView';
import { GanttSchedule } from '@/components/GanttSchedule';
import { CotizacionesView } from '@/components/CotizacionesView';
import { MachineryManager } from '@/components/MachineryManager';
import { PayrollEstimateView } from '@/components/PayrollEstimateView';
import { GmailManager } from '@/components/GmailManager';
import { ProjectsView } from '@/features/projects/ProjectsView';
import { ReportsView } from '@/features/reports/ReportsView';
import { StaffView } from '@/features/staff/StaffView';
import { CompanyTeamManager } from '@/components/CompanyTeamManager';
import { initialCompanySettings } from '@/lib/data';
import {
  saveProjectScheduleToFirestore,
  saveCompanySettingsToFirestore,
} from '@/lib/firebaseService';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { useCompanyWorkspace } from '@/lib/hooks/useCompanyWorkspace';
import { useProjectData } from '@/lib/services/projectData';
import type { CompanySettings, Employee, TaskReminder } from '@/lib/types';
import { isPrimaryAdministrator } from '@/lib/firebaseAuth';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  canManagePersonnel,
  canReadEmployeeDirectory,
  canReadFullPersonnel,
} from '@/lib/permissions';

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

const TAB_CONFIG: Record<TabKey, { id: TabKey; label: string; subtitle: string }> = {
  dashboard: {
    id: 'dashboard',
    label: 'Tablero de Control',
    subtitle: 'Resumen general de proyectos y estado del sistema',
  },
  proyectos: {
    id: 'proyectos',
    label: 'Proyectos y Firmas Digitales',
    subtitle: 'Gestión de proyectos con trazabilidad completa',
  },
  apu_presupuestos: {
    id: 'apu_presupuestos',
    label: 'Presupuestos APU y Gastos',
    subtitle: 'Control financiero con desglose por renglón y departamento',
  },
  personal: {
    id: 'personal',
    label: 'Personal y Asistencia IGSS',
    subtitle: 'Control de cuadrillas, planillas y cumplimiento laboral',
  },
  reportes: {
    id: 'reportes',
    label: 'Reportes Finales y Actas',
    subtitle: 'Generación de reportes ejecutivos y documentación de obra',
  },
  ai: {
    id: 'ai',
    label: 'Asistente Técnico IA',
    subtitle: 'Consultas sobre presupuestos, normativas AGIES y COGUANOR',
  },
  cotizaciones: {
    id: 'cotizaciones',
    label: 'Cotizaciones',
    subtitle: 'Gestión de cotizaciones y presupuestos de clientes',
  },
  cronograma_gantt: {
    id: 'cronograma_gantt',
    label: 'Seguimiento & Hitos',
    subtitle: 'Cronograma de obra y seguimiento de hitos',
  },
  maquinaria: {
    id: 'maquinaria',
    label: 'Maquinaria',
    subtitle: 'Control de flota de maquinaria y horómetros',
  },
  planillas: {
    id: 'planillas',
    label: 'Planillas Guate',
    subtitle: 'Planillas laborales y cumplimiento IGSS',
  },
  gastos: {
    id: 'gastos',
    label: 'Gastos & Facturas',
    subtitle: 'Registro y control de gastos operativos',
  },
  gmail: {
    id: 'gmail',
    label: 'Correo & Avisos',
    subtitle: 'Comunicaciones y notificaciones del proyecto',
  },
  equipo: {
    id: 'equipo',
    label: 'Equipo de la empresa',
    subtitle: 'Miembros, invitaciones y permisos de acceso',
  },
};

export default function MainApp() {
  const {
    currentUser,
    status: authStatus,
    authError,
    isSigningOut,
    signInWithGoogle,
    signInWithEmail,
    createEmailAccount,
    resetEmailPassword,
    signOut,
    gmailAccess,
    authorizeGmail,
  } = useAuthSession();
  const {
    workspace,
    membership,
    availableWorkspaces,
    selectWorkspace,
    loading: workspaceLoading,
    error: workspaceError,
  } = useCompanyWorkspace(currentUser);
  const data = useProjectData(workspace?.id, currentUser?.uid, membership?.role);
  const activeProjects = useMemo(
    () => data.projects.filter((project) => project.status !== 'Archivado'),
    [data.projects]
  );
  const activeProjectIds = useMemo(
    () => new Set(activeProjects.map((project) => project.id)),
    [activeProjects]
  );
  const activeExpenses = useMemo(
    () => data.expenses.filter((expense) => activeProjectIds.has(expense.projectId)),
    [activeProjectIds, data.expenses]
  );
  const activeAttendance = useMemo(
    () => data.attendance.filter((record) => activeProjectIds.has(record.projectId)),
    [activeProjectIds, data.attendance]
  );
  const fullEmployees = useMemo(
    () => data.employees.filter((employee): employee is Employee => 'dailyRateGTQ' in employee),
    [data.employees]
  );
  const canManageProjects = ['owner', 'admin', 'project_manager'].includes(membership?.role ?? '');
  const canManageQuotes = ['owner', 'admin', 'project_manager', 'finance'].includes(membership?.role ?? '');
  const canManageBudget = ['owner', 'admin', 'project_manager', 'finance'].includes(membership?.role ?? '');
  const canManageMachinery = ['owner', 'admin', 'project_manager', 'field_worker'].includes(membership?.role ?? '');
  const canManageExpenses = ['owner', 'admin', 'finance'].includes(membership?.role ?? '');
  const canManageEmployees = canManagePersonnel(membership?.role);
  const canManageAttendance = ['owner', 'admin', 'project_manager', 'field_worker'].includes(membership?.role ?? '');
  const canViewPersonnel = canReadEmployeeDirectory(membership?.role);
  const canViewFullPersonnel = canReadFullPersonnel(membership?.role);
  const canManageCompany = ['owner', 'admin'].includes(membership?.role ?? '');
  const [company, setCompany] = useState<CompanySettings>(initialCompanySettings);
  const [exchangeRateInput, setExchangeRateInput] = useState('');
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pendingProjectIdRef = useRef<string | null>(null);

  const tabConfig = TAB_CONFIG[activeTab];
  const hasInviteLink =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('invite');
  const verifiedEmailHandled = useRef(false);

  useEffect(() => {
    const params = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search);
    if (!params || !currentUser || !currentUser.emailVerified || params.get('verified') !== 'true') {
      return;
    }
    if (verifiedEmailHandled.current) return;

    verifiedEmailHandled.current = true;
    params.delete('verified');
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
    toast.success('Correo verificado correctamente. Ya puedes aceptar invitaciones y acceder a tu espacio.');
  }, [currentUser]);

  useEffect(() => {
    if (data.company) {
      setCompany((prev) => ({ ...prev, ...data.company }));
    } else {
      setCompany(initialCompanySettings);
    }
  }, [data.company]);

  useEffect(() => {
    setExchangeRateInput(company.exchangeRate > 0 ? String(company.exchangeRate) : '');
  }, [company.exchangeRate]);

  useEffect(() => {
    if (activeProjects.length === 0) {
      if (activeProjectId) setActiveProjectId('');
      return;
    }

    const pendingProjectId = pendingProjectIdRef.current;
    if (pendingProjectId) {
      if (activeProjects.some((project) => project.id === pendingProjectId)) {
        pendingProjectIdRef.current = null;
        if (activeProjectId !== pendingProjectId) setActiveProjectId(pendingProjectId);
        return;
      }
      if (activeProjectId === pendingProjectId) return;
    }

    if (!activeProjects.some((project) => project.id === activeProjectId)) {
      setActiveProjectId(activeProjects[0].id);
    }
  }, [activeProjects, activeProjectId]);

  const handleUpdateCompany = async (updates: Partial<CompanySettings>) => {
    if (!canManageCompany) {
      toast.error('Solo el propietario o un administrador puede cambiar la configuración de empresa.');
      return false;
    }
    if (!currentUser?.uid || !workspace?.id) {
      toast.error('Inicia sesión para guardar la configuración de empresa.');
      return false;
    }

    const nextSettings: CompanySettings = { ...company, ...updates, companyId: workspace.id, ownerId: workspace.id };
    setCompany(nextSettings);
    try {
      const saved = await saveCompanySettingsToFirestore(nextSettings, workspace.id);
      if (!saved) {
        toast.error('No se pudo guardar la configuración de empresa.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('No se pudo guardar la configuración de marca en Firestore:', error);
      toast.error('No se pudo guardar la configuración de marca.');
      return false;
    }
  };

  const handleSaveExchangeRate = async () => {
    const exchangeRate = Number(exchangeRateInput);
    if (!exchangeRateInput.trim() || !Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      toast.error('Ingresa un tipo de cambio mayor a cero.');
      return;
    }

    if (await handleUpdateCompany({ exchangeRate })) {
      toast.success('Tipo de cambio guardado.');
    }
  };

  const handleSelectProject = (projectId: string) => {
    pendingProjectIdRef.current = null;
    setActiveProjectId(projectId);
  };

  const handleProjectCreated = (projectId: string) => {
    pendingProjectIdRef.current = projectId;
    setActiveProjectId(projectId);
  };

  const handleSelectWorkspace = async (companyId: string) => {
    const changed = await selectWorkspace(companyId);
    if (!changed) {
      toast.error('No se pudo cambiar de empresa. Revisa tu acceso e inténtalo de nuevo.');
      return;
    }
    pendingProjectIdRef.current = null;
    setActiveProjectId('');
    setActiveTab('dashboard');
    toast.success('Espacio de trabajo cambiado.');
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId as TabKey);
    if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
  };

  const activeProject = activeProjects.find((project) => project.id === activeProjectId) ?? activeProjects[0];

  const persistScheduleChanges = async (
    projectId: string,
    changes: Parameters<typeof saveProjectScheduleToFirestore>[1]
  ) => {
    if (!currentUser?.uid || !workspace?.id) {
      toast.error('Inicia sesión para guardar los cambios del cronograma.');
      return;
    }

    const saved = await saveProjectScheduleToFirestore(
      projectId,
      changes,
      workspace.id,
      currentUser.uid
    );
    if (!saved) {
      toast.error('No se pudieron guardar los cambios del cronograma.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 safe-area-bottom">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-500 focus:text-slate-950 focus:rounded-lg"
      >
        Saltar al contenido principal
      </a>

      {/* Mobile header */}
      <MobileHeader
        title={tabConfig.label}
        logoUrl={company.logoUrl}
        companyName={company.companyName}
        onMenu={() => setIsMobileSidebarOpen((isOpen) => !isOpen)}
        menuOpen={isMobileSidebarOpen}
      />

      {/* Desktop Navbar - renders sidebar + top bar */}
      <Navbar
        company={company}
        projects={activeProjects}
        workspaces={availableWorkspaces}
        activeWorkspaceId={workspace?.id ?? ''}
        onSelectWorkspace={(companyId) => void handleSelectWorkspace(companyId)}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenAiAssistant={() => setActiveTab('ai')}
        onOpenBranding={() => setBrandingOpen(true)}
        currentUser={currentUser}
        authStatus={authStatus}
        isSigningOut={isSigningOut}
        onOpenSignIn={() => setAuthDialogOpen(true)}
        onSignOut={signOut}
        canManageCompany={canManageCompany}
        canViewPersonnel={canViewPersonnel}
        canViewPayroll={canViewFullPersonnel}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((isOpen) => !isOpen)}
      />

      <main
        id="main-content"
        aria-busy={authStatus === 'authenticated' && workspaceLoading}
        className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:ml-[280px] lg:mr-0 lg:max-w-[calc(100%-280px)] lg:px-8"
      >
        {authStatus === 'authenticated' && workspaceLoading && (
          <div role="status" className="mt-4 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            Preparando el espacio de trabajo y sincronizando los datos de la empresa...
          </div>
        )}
        {currentUser && isPrimaryAdministrator(currentUser.email) && !workspaceLoading && (
          <div
            role={
              currentUser.emailVerified &&
              (membership?.role === 'owner' || membership?.role === 'admin')
                ? 'status'
                : 'alert'
            }
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              currentUser.emailVerified &&
              (membership?.role === 'owner' || membership?.role === 'admin')
                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                : 'border-amber-400/30 bg-amber-500/10 text-amber-100'
            }`}
          >
            Correo de administración configurado: <strong>{currentUser.email}</strong>.{' '}
            {!currentUser.emailVerified
              ? 'El correo aún no está verificado.'
              : membership
                ? `Rol en ${workspace?.name ?? 'la empresa'}: ${membership.role}.`
                : 'No se encontró una membresía de empresa. Revisa la configuración del espacio de trabajo.'}
          </div>
        )}
        {(authStatus === 'unauthenticated' || authStatus === 'error' || Boolean(workspaceError)) && (
          <div
            role={authStatus === 'error' || workspaceError ? 'alert' : 'status'}
            className={`mt-4 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
              authStatus === 'error' || workspaceError
                ? 'border-red-400/30 bg-red-500/10'
                : 'border-amber-400/30 bg-amber-500/10'
            }`}
          >
            <div>
              <p className={`text-sm font-semibold ${authStatus === 'error' || workspaceError ? 'text-red-200' : 'text-amber-100'}`}>
                {workspaceError
                  ? 'No se pudo cargar la empresa.'
                  : authStatus === 'error'
                    ? 'No se pudo comprobar tu sesión.'
                    : 'Sesión no iniciada'}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {workspaceError ??
                  (authStatus === 'error'
                    ? authError ?? 'Revisa la configuración o intenta iniciar sesión de nuevo.'
                    : hasInviteLink
                      ? 'Inicia sesión o crea una cuenta con el correo invitado. Verifica esa dirección para aceptar el acceso compartido.'
                      : 'Inicia sesión con correo electrónico o Google para sincronizar y guardar tus datos.')}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAuthDialogOpen(true)}
              className="shrink-0"
            >
              Iniciar sesión
            </Button>
          </div>
        )}

        {/* Feature view content */}
        {!(authStatus === 'authenticated' && workspaceLoading) && <>
        {activeTab === 'dashboard' && (
          <DashboardView
            projects={activeProjects}
            expenses={activeExpenses}
            company={company}
            activeProjectId={activeProject?.id ?? ''}
            onSelectProject={handleSelectProject}
            milestones={activeProjects.flatMap((project) => project.scheduleMilestones ?? [])}
            employees={fullEmployees}
            attendance={activeAttendance}
          />
        )}
        {activeTab === 'proyectos' && (
          <ProjectsView
            company={company}
            projects={data.projects}
            expenses={data.expenses}
            loading={data.loading}
            onCreateProject={data.createProject}
            onProjectCreated={handleProjectCreated}
            onUpdateProject={data.updateProject}
            onArchiveProject={data.archiveProject}
            onRestoreProject={data.restoreProject}
            canManageProjects={canManageProjects}
          />
        )}
        {activeTab === 'apu_presupuestos' && (
          <BudgetView
            projects={activeProjects}
            expenses={data.expenses}
            budgetItems={data.apuItems}
            quotes={data.quotes}
            activeProjectId={activeProject?.id ?? ''}
            canWrite={canManageBudget}
            company={company}
            onSaveItems={data.saveAPUItems}
            onDeleteItem={data.deleteAPUItem}
          />
        )}
        {activeTab === 'personal' && canViewPersonnel && (
          <StaffView
            attendance={data.attendance}
            company={company}
            projects={activeProjects}
            employees={data.employees}
            activeProjectId={activeProject?.id ?? ''}
            onSelectProject={handleSelectProject}
            onAddEmployee={canManageEmployees ? data.addEmployee : undefined}
            onAddAttendance={canManageAttendance ? data.addAttendance : undefined}
            onDeleteAttendance={canManageAttendance ? data.deleteAttendance : undefined}
            canViewEmployeeDetails={canViewFullPersonnel}
          />
        )}
        {activeTab === 'reportes' && (
          <ReportsView
            projects={activeProjects}
            expenses={data.expenses}
            fieldVisits={data.fieldVisits}
            company={company}
            activeProjectId={activeProject?.id ?? ''}
            onSelectProject={handleSelectProject}
          />
        )}
        {activeTab === 'gastos' && (
          <ExpensesView
            projects={data.projects}
            expenses={data.expenses}
            company={company}
            activeProjectId={activeProject?.id ?? ''}
            onSelectProject={handleSelectProject}
            onAddExpense={canManageExpenses ? data.addExpense : undefined}
            onDeleteExpense={canManageExpenses ? data.deleteExpense : undefined}
          />
        )}
        {activeTab === 'cotizaciones' && (
          <CotizacionesView
            projects={activeProjects}
            budgetItems={data.apuItems}
            budgetItemsLoading={data.apuItemsLoading}
            company={company}
            quotes={data.quotes}
            canWrite={canManageQuotes}
            activeProjectId={activeProject?.id ?? ''}
            onSelectProject={handleSelectProject}
            onSaveQuote={data.addQuote}
            onUpdateQuoteStatus={data.updateQuoteStatus}
          />
        )}
        {activeTab === 'planillas' && canViewFullPersonnel && (
          <PayrollEstimateView
            employees={fullEmployees}
            attendance={data.attendance}
            company={company}
            onSaveRates={canManageCompany ? handleUpdateCompany : undefined}
          />
        )}
        {activeTab === 'gmail' && (
          <GmailManager
            company={company}
            projects={activeProjects}
            activeProjectId={activeProject?.id ?? ''}
            onSelectProject={handleSelectProject}
            userEmail={currentUser?.email}
            accessToken={gmailAccess?.accessToken}
            tokenExpiresAt={gmailAccess?.expiresAt}
            onAuthorize={authorizeGmail}
          />
        )}
        {activeTab === 'equipo' && canManageCompany && workspace && currentUser && (
          <CompanyTeamManager
            companyId={workspace.id}
            company={company}
            currentUserId={currentUser.uid}
            currentUserEmail={currentUser.email}
          />
        )}
        {activeTab === 'maquinaria' && (
          <div className="responsive-container safe-area-top safe-area-bottom min-h-full space-y-5">
            <PageHeader
              title={tabConfig.label}
              subtitle={tabConfig.subtitle}
              logoUrl={company.logoUrl}
              companyName={company.companyName}
            />
            <MachineryManager
              machinery={data.machinery}
              machineryLogs={data.machineryLogs}
              projects={activeProjects}
              activeProjectId={activeProject?.id ?? ''}
              canWrite={canManageMachinery}
              onAddMachinery={data.addMachinery}
              onRecordMachineryUse={data.addMachineryLog}
              onSetMachineryStatus={data.setMachineryStatus}
              currency="GTQ"
              company={company}
            />
          </div>
        )}
        {activeTab === 'ai' && (
          <AiAssistantView company={company} />
        )}
        {activeTab === 'cronograma_gantt' && (
          <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
            <PageHeader
              title={tabConfig.label}
              subtitle={tabConfig.subtitle}
              logoUrl={company.logoUrl}
              companyName={company.companyName}
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
                    reminder.id === reminderId ? { ...reminder, enabled: !reminder.enabled } : reminder
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
                <h3 className="text-white text-lg font-semibold mb-2">Crea o selecciona un proyecto</h3>
                <p className="text-slate-400 text-sm">
                  El cronograma se guarda junto al proyecto activo. Primero agrega un proyecto para gestionar tareas e hitos.
                </p>
              </div>
            )}
          </div>
        )}
        </>}
      </main>

      {/* Branding drawer (mobile-friendly) */}
      <FocusTrap isActive={brandingOpen} onEscape={() => setBrandingOpen(false)}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="branding-drawer-title"
          className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm p-4 ${
            brandingOpen ? '' : 'hidden'
          }`}
        >
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-t-3xl shadow-2xl w-full max-w-md p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <h3 id="branding-drawer-title" className="font-bold text-white text-lg">Marca y Personalización</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setBrandingOpen(false)} className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.05]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </Button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Sube el logo de tu empresa y personaliza los colores de marca.</p>
              <div className="space-y-2 rounded-xl border border-white/10 p-3">
                <label htmlFor="company-exchange-rate" className="block text-xs font-semibold text-slate-200">
                  Tipo de cambio configurado (GTQ por USD)
                </label>
                <input
                  id="company-exchange-rate"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={exchangeRateInput}
                  onChange={(event) => setExchangeRateInput(event.target.value)}
                  disabled={!canManageCompany}
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-60"
                />
                <p className="text-xs text-slate-400">
                  No se usa una tasa automática o simulada; configura la tasa que debe aplicar la empresa.
                </p>
                {canManageCompany && (
                  <Button variant="primary" size="sm" onClick={() => void handleSaveExchangeRate()}>
                    Guardar tipo de cambio
                  </Button>
                )}
              </div>
              <LogoUpload
                company={{
                  logoUrl: company.logoUrl,
                  companyName: company.companyName,
                  primaryColor: company.primaryColor,
                  secondaryColor: company.secondaryColor,
                }}
                onUpdateCompany={handleUpdateCompany}
                compact
              />
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
              <Button variant="primary" size="md" onClick={() => setBrandingOpen(false)} className="w-full md:w-auto">
                Aplicar a Toda la App
              </Button>
            </div>
          </div>
        </div>
      </FocusTrap>

      {authDialogOpen && (
        <AuthDialog
          onClose={() => setAuthDialogOpen(false)}
          onSignInWithGoogle={signInWithGoogle}
          onSignInWithEmail={signInWithEmail}
          onCreateAccount={createEmailAccount}
          onResetPassword={resetEmailPassword}
        />
      )}

      {/* Floating branding button */}
      {canManageCompany && !brandingOpen && (
        <TouchTarget
          onPress={() => setBrandingOpen(true)}
          style={{
            bottom: 'calc(5rem + env(safe-area-inset-bottom))',
            right: 'max(1.5rem, env(safe-area-inset-right))',
          }}
          className="fixed z-40 lg:hidden w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xl hover:bg-amber-400 transition-all"
          aria-label="Configuración de Marca"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        </TouchTarget>
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}

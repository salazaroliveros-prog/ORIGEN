'use client';

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
import { GanttSchedule } from '@/components/GanttSchedule';
import { ProjectsView } from '@/features/projects/ProjectsView';
import { ReportsView } from '@/features/reports/ReportsView';
import { StaffView } from '@/features/staff/StaffView';
import { initialCompanySettings } from '@/lib/data';
import {
  saveProjectScheduleToFirestore,
  saveCompanySettingsToFirestore,
} from '@/lib/firebaseService';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { useProjectData } from '@/lib/services/projectData';
import type { CompanySettings, TaskReminder } from '@/lib/types';
import { useEffect,useState } from 'react';
import { toast } from 'react-hot-toast';

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
  | 'gmail';

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
};

export default function MainApp() {
  const { currentUser, signIn, signOut } = useAuthSession();
  const data = useProjectData(currentUser?.uid);
  const [company, setCompany] = useState<CompanySettings>(initialCompanySettings);
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const tabConfig = TAB_CONFIG[activeTab];

  useEffect(() => {
    if (data.company) {
      setCompany((prev) => ({ ...prev, ...data.company }));
    } else {
      setCompany(initialCompanySettings);
    }
  }, [data.company]);

  useEffect(() => {
    if (data.projects.length > 0 && !activeProjectId) {
      setActiveProjectId(data.projects[0].id);
    }
  }, [data.projects, activeProjectId]);

  const handleUpdateCompany = async (updates: Partial<CompanySettings>) => {
    if (!currentUser?.uid) {
      return;
    }
    setCompany((prev) => ({ ...prev, ...updates }));
    try {
      await saveCompanySettingsToFirestore(
        { ...company, ...updates } as CompanySettings,
        currentUser.uid
      );
    } catch {
      console.warn('No se pudo guardar la configuración de marca en Firestore');
    }
  };

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId as TabKey);
    if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
  };

  const activeProject = data.projects.find((project) => project.id === activeProjectId) ?? data.projects[0];

  const persistScheduleChanges = async (
    projectId: string,
    changes: Parameters<typeof saveProjectScheduleToFirestore>[1]
  ) => {
    if (!currentUser?.uid) {
      toast.error('Inicia sesión para guardar los cambios del cronograma.');
      return;
    }

    const saved = await saveProjectScheduleToFirestore(projectId, changes, currentUser.uid);
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
        projects={data.projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenAiAssistant={() => setActiveTab('ai')}
        onOpenBranding={() => setBrandingOpen(true)}
        currentUser={currentUser}
        onSignIn={signIn}
        onSignOut={signOut}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <main id="main-content" className="max-w-7xl mx-auto px-4 pb-24 sm:px-6 lg:px-8">
        {/* Feature view content */}
        {activeTab === 'dashboard' && (
          <DashboardView projects={data.projects} company={company} />
        )}
        {activeTab === 'proyectos' && (
          <ProjectsView company={company} />
        )}
        {activeTab === 'apu_presupuestos' && (
          <BudgetView projects={data.projects} expenses={data.expenses} company={company} />
        )}
        {activeTab === 'personal' && (
          <StaffView attendance={data.attendance} company={company} />
        )}
        {activeTab === 'reportes' && (
          <ReportsView projects={data.projects} expenses={data.expenses} company={company} />
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
                projects={data.projects}
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
        {['cotizaciones', 'maquinaria', 'planillas', 'gastos', 'gmail'].includes(activeTab) && (
          <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
            <PageHeader
              title={tabConfig.label}
              subtitle={tabConfig.subtitle}
              logoUrl={company?.logoUrl}
              companyName={company?.companyName}
            />
            <div className="glass-panel p-8 text-center">
              <h3 className="text-white text-lg font-semibold mb-2">
                Módulo en desarrollo
              </h3>
              <p className="text-slate-400 text-sm">
                La sección de {tabConfig.label} estará disponible próximamente.
              </p>
            </div>
          </div>
        )}
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

      {/* Floating branding button */}
      {!brandingOpen && (
        <TouchTarget
          onPress={() => setBrandingOpen(true)}
          style={{
            bottom: 'max(1.5rem, env(safe-area-inset-bottom))',
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

'use client';

import React, { useState, useEffect } from 'react';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { useProjectData } from '@/lib/services/projectData';
import { Navbar } from '@/components/Navbar';
import { LogoUpload } from '@/components/LogoUpload';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { MobileHeader } from '@/components/PageHeader';
import { DashboardView } from '@/features/dashboard/DashboardView';
import { ProjectsView } from '@/features/projects/ProjectsView';
import { BudgetView } from '@/features/budget/BudgetView';
import { StaffView } from '@/features/staff/StaffView';
import { ReportsView } from '@/features/reports/ReportsView';
import { AiAssistantView } from '@/features/ai/AiAssistantView';
import type { CompanySettings } from '@/lib/types';
import { initialCompanySettings } from '@/lib/data';

type TabKey = 'dashboard' | 'projects' | 'budget' | 'staff' | 'reports' | 'ai';

const TAB_CONFIG: Record<TabKey, { id: TabKey; label: string; subtitle: string }> = {
  dashboard: { id: 'dashboard', label: 'Tablero de Control', subtitle: 'Resumen general de proyectos y estado del sistema' },
  projects: { id: 'projects', label: 'Proyectos y Firmas Digitales', subtitle: 'Gestión de proyectos con trazabilidad completa' },
  budget: { id: 'budget', label: 'Presupuestos APU y Gastos', subtitle: 'Control financiero con desglose por renglón y departamento' },
  staff: { id: 'staff', label: 'Personal y Asistencia IGSS', subtitle: 'Control de cuadrillas, planillas y cumplimiento laboral' },
  reports: { id: 'reports', label: 'Reportes Finales y Actas', subtitle: 'Generación de reportes ejecutivos y documentación de obra' },
  ai: { id: 'ai', label: 'Asistente Técnico IA', subtitle: 'Consultas sobre presupuestos, normativas AGIES y COGUANOR' },
};

export default function MainApp() {
  const { currentUser, signIn, signOut } = useAuthSession();
  const data = useProjectData(currentUser?.uid);
  const [company, setCompany] = useState<CompanySettings>(initialCompanySettings);
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const tabConfig = TAB_CONFIG[activeTab];

  useEffect(() => {
    if (data.company) {
      setCompany((prev) => ({ ...prev, ...data.company }));
    } else {
      setCompany(initialCompanySettings);
    }
  }, [data.company]);

  const handleUpdateCompany = (updates: Partial<CompanySettings>) => {
    setCompany((prev) => ({ ...prev, ...updates }));
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId as TabKey);
    if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
  };

  const activeProjectId = data.projects[0]?.id || '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 safe-area-top safe-area-bottom safe-area-left safe-area-right">
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
        onMenu={() => setIsMobileSidebarOpen(true)}
      />

      <div id="main-content" className="pt-16 pb-24">
        {/* Desktop Navbar - renders sidebar + top bar */}
        <Navbar
          company={company}
          projects={data.projects}
          activeProjectId={activeProjectId}
          onSelectProject={() => {}}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          currency="GTQ"
          onToggleCurrency={() => {}}
          onOpenAiAssistant={() => setActiveTab('ai')}
          onOpenBranding={() => setBrandingOpen(true)}
          currentUser={currentUser}
          onSignIn={signIn}
          onSignOut={signOut}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Feature view content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {activeTab === 'dashboard' && (
            <DashboardView projects={data.projects} company={company} />
          )}
          {activeTab === 'projects' && (
            <ProjectsView projects={data.projects} company={company} />
          )}
          {activeTab === 'budget' && (
            <BudgetView projects={data.projects} expenses={data.expenses} company={company} />
          )}
          {activeTab === 'staff' && (
            <StaffView attendance={data.attendance} company={company} />
          )}
          {activeTab === 'reports' && (
            <ReportsView projects={data.projects} expenses={data.expenses} company={company} />
          )}
          {activeTab === 'ai' && (
            <AiAssistantView company={company} />
          )}
        </div>
      </div>

      {/* Branding drawer (mobile-friendly) */}
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
            <button onClick={() => setBrandingOpen(false)} className="text-slate-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
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
            <button
              onClick={() => setBrandingOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-amber-500 text-slate-950 hover:bg-amber-400 transition"
            >
              Aplicar a Toda la App
            </button>
          </div>
        </div>
      </div>

      {/* Floating branding button - only on desktop, bottom right */}
      {!brandingOpen && (
        <button
          onClick={() => setBrandingOpen(true)}
          className="fixed bottom-6 right-6 z-40 lg:hidden w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xl hover:bg-amber-400 transition"
          title="Configuración de Marca"
          aria-label="Configuración de Marca"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        </button>
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}

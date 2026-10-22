'use client';

import React, { useState, useEffect } from 'react';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { useProjectData } from '@/lib/services/projectData';
import { DashboardView } from '@/features/dashboard/DashboardView';
import { ProjectsView } from '@/features/projects/ProjectsView';
import { BudgetView } from '@/features/budget/BudgetView';
import { StaffView } from '@/features/staff/StaffView';
import { ReportsView } from '@/features/reports/ReportsView';
import { AiAssistantView } from '@/features/ai/AiAssistantView';
import { LogoUpload } from '@/components/LogoUpload';
import type { CompanySettings } from '@/lib/types';
import { initialCompanySettings } from '@/lib/data';

type TabKey = 'dashboard' | 'projects' | 'budget' | 'staff' | 'reports' | 'ai';

export default function MainApp() {
  const { currentUser, signIn, signOut } = useAuthSession();
  const data = useProjectData(currentUser?.uid);
  const [company, setCompany] = useState<CompanySettings>(initialCompanySettings);
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

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

  const renderView = () => {
    const viewProps = { projects: data.projects, expenses: data.expenses, attendance: data.attendance, company };
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView {...viewProps} />;
      case 'projects':
        return <ProjectsView {...viewProps} />;
      case 'budget':
        return <BudgetView {...viewProps} />;
      case 'staff':
        return <StaffView {...viewProps} />;
      case 'reports':
        return <ReportsView {...viewProps} />;
      case 'ai':
        return <AiAssistantView {...viewProps} />;
      default:
        return <DashboardView {...viewProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="flex gap-2 border-b border-slate-800 p-4">
        {[
          ['dashboard', 'Dashboard'],
          ['projects', 'Proyectos'],
          ['budget', 'Presupuesto'],
          ['staff', 'Personal'],
          ['reports', 'Reportes'],
          ['ai', 'IA'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as TabKey)}
            className={`rounded-lg px-3 py-2 text-sm ${
              activeTab === key ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {renderView()}

      <LogoUpload
        company={{
          logoUrl: company.logoUrl,
          companyName: company.companyName,
          primaryColor: company.primaryColor,
          secondaryColor: company.secondaryColor,
        }}
        onUpdateCompany={handleUpdateCompany}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 ${
          brandingOpen ? '' : 'hidden'
        }`}
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <h3 className="font-bold text-base">Marca y Personalización</h3>
            </div>
            <button onClick={() => setBrandingOpen(false)} className="text-slate-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">Sube el logo de tu empresa y personaliza los colores de marca.</p>
            <LogoUpload
              company={{
                logoUrl: company.logoUrl,
                companyName: company.companyName,
                primaryColor: company.primaryColor,
                secondaryColor: company.secondaryColor,
              }}
              onUpdateCompany={handleUpdateCompany}
            />
          </div>
          <div className="p-4 border-t border-slate-200 flex justify-end">
            <button
              onClick={() => setBrandingOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700"
            >
              Aplicar a Toda la App
            </button>
          </div>
        </div>
      </div>

      {/* Settings button to open branding modal */}
      <button
        onClick={() => setBrandingOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xl hover:bg-amber-400 transition"
        title="Configuración de Marca"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
      </button>
    </div>
  );
}

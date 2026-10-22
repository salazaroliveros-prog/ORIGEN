'use client';

import React, { useState } from 'react';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { useProjectData } from '@/lib/services/projectData';
import { DashboardView } from '@/features/dashboard/DashboardView';
import { ProjectsView } from '@/features/projects/ProjectsView';
import { BudgetView } from '@/features/budget/BudgetView';
import { StaffView } from '@/features/staff/StaffView';
import { ReportsView } from '@/features/reports/ReportsView';
import { AiAssistantView } from '@/features/ai/AiAssistantView';

type TabKey = 'dashboard' | 'projects' | 'budget' | 'staff' | 'reports' | 'ai';

export default function MainApp() {
  const { currentUser } = useAuthSession();
  const data = useProjectData(currentUser?.uid);

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView projects={data.projects} />;
      case 'projects':
        return <ProjectsView projects={data.projects} />;
      case 'budget':
        return <BudgetView projects={data.projects} expenses={data.expenses} />;
      case 'staff':
        return <StaffView attendance={data.attendance} />;
      case 'reports':
        return <ReportsView projects={data.projects} expenses={data.expenses} />;
      case 'ai':
        return <AiAssistantView />;
      default:
        return <DashboardView projects={data.projects} />;
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
    </div>
  );
}

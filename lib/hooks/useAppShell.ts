import { useMemo, useState } from 'react';
import type { Project } from '@/lib/types';

export type AppTab = 'dashboard' | 'projects' | 'budget' | 'staff' | 'reports' | 'ai';

export function useAppShell(projects: Project[]) {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');

  const activeTabLabel = useMemo(() => {
    const map: Record<AppTab, string> = {
      dashboard: 'Dashboard',
      projects: 'Proyectos',
      budget: 'Presupuesto',
      staff: 'Personal',
      reports: 'Reportes',
      ai: 'IA',
    };

    return map[activeTab];
  }, [activeTab]);

  return {
    activeTab,
    setActiveTab,
    activeTabLabel,
    projectsCount: projects.length,
  };
}

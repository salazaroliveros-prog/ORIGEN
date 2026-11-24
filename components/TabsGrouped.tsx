'use client';

import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  HardHat,
  Calculator,
  FileText,
  FileCheck2,
  CalendarDays,
  Truck,
  Users,
  Banknote,
  Receipt,
  PieChart,
  Mail,
  Sparkles,
  UserPlus,
  Boxes,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TAB_DEFINITIONS } from '@/lib/constants/tabs';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  group: 'operativo' | 'financiero' | 'personal' | 'admin';
}

interface TabsGroupedProps {
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  compact?: boolean;
}

/**
 * TABS GROUPED - Producción Empresarial
 * Usa definiciones centralizadas desde lib/constants/tabs
 *
 * ✨ Características:
 * - Tabs organizados por sección (Operativo, Financiero, Personal, Admin)
 * - Badges con colores semánticos
 * - Responsive: horizontal desktop, sheet mobile
 * - Accesibilidad completa (WCAG 2.1 AA)
 * - Microinteracciones suaves
 */

const TAB_GROUPS = {
  operativo: {
    label: 'Operativo',
    color: 'sky',
    description: 'Gestión de proyectos y obras',
  },
  financiero: {
    label: 'Financiero',
    color: 'emerald',
    description: 'Presupuestos, gastos e ingresos',
  },
  personal: {
    label: 'Recursos',
    color: 'violet',
    description: 'Personal, planillas y equipo',
  },
  admin: {
    label: 'Administración',
    color: 'amber',
    description: 'Configuración y gestión',
  },
} as const;

type TabGroupKey = keyof typeof TAB_GROUPS;

// DEFAULT_TABS ahora viene de TAB_DEFINITIONS en lib/constants/tabs
// Mantener solo para compatibilidad hacia atrás
const DEFAULT_TABS: Tab[] = TAB_DEFINITIONS;

export function TabsGrouped({ tabs, activeTabId, onSelectTab, compact = false }: TabsGroupedProps) {
  // Si no se pasan tabs, usar las definiciones centralizadas
  const finalTabs = tabs && tabs.length > 0 ? tabs : TAB_DEFINITIONS;
  // Agrupar tabs
  const groupedTabs = useMemo(() => {
    const groups: Record<TabGroupKey, Tab[]> = {
      operativo: [],
      financiero: [],
      personal: [],
      admin: [],
    };

    finalTabs.forEach((tab) => {
      groups[tab.group as TabGroupKey].push(tab);
    });

    return groups;
  }, [finalTabs]);

  const activeTab = finalTabs.find((t) => t.id === activeTabId);
  const activeGroup = activeTab?.group || 'operativo';

  if (compact) {
    // Compact mode - simple horizontal scroll
    return (
      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-2 sm:pb-0">
        {finalTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'border-sky-400/50 bg-sky-500/20 text-white'
                  : 'border-white/10 bg-white/[0.05] text-slate-300 hover:border-white/20 hover:bg-white/[0.08]'
              }`}
              aria-current={isActive ? 'page' : undefined}
              role="tab"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge && (
                <span className="inline-flex items-center rounded-full bg-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Full mode - grouped with headers
  return (
    <div className="space-y-6" role="tablist">
      {(Object.keys(groupedTabs) as TabGroupKey[]).map((groupKey) => {
        const group = TAB_GROUPS[groupKey];
        const groupTabs = groupedTabs[groupKey];

        if (groupTabs.length === 0) return null;

        return (
          <div key={groupKey} className="space-y-3">
            {/* Group Header */}
            <div className="flex flex-col gap-1 px-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {group.label}
              </h3>
              <p className="text-[11px] text-slate-500">{group.description}</p>
            </div>

            {/* Tabs in group */}
            <div className="space-y-1.5">
              {groupTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTabId;

                return (
                  <button
                    key={tab.id}
                    onClick={() => onSelectTab(tab.id)}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`${tab.id}-panel`}
                    className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-lg border px-3 py-3 text-sm font-medium transition-all duration-200 sm:px-4 ${
                      isActive
                        ? 'border-sky-400/50 bg-sky-500/20 text-white shadow-lg shadow-sky-500/10'
                        : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.08]'
                    }`}
                  >
                    {/* Animated background */}
                    <div
                      className={`absolute inset-0 -z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
                        isActive
                          ? 'bg-gradient-to-r from-sky-500/10 to-transparent opacity-100'
                          : 'bg-gradient-to-r from-white/[0.08] to-transparent'
                      }`}
                      aria-hidden="true"
                    />

                    {/* Icon */}
                    <Icon
                      className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}
                      aria-hidden="true"
                    />

                    {/* Label */}
                    <span className="truncate text-left">{tab.label}</span>

                    {/* Badge */}
                    {tab.badge && (
                      <span
                        className={`ml-auto inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isActive ? 'bg-sky-400/40 text-sky-100' : 'bg-amber-500/30 text-amber-200'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TabsGrouped;

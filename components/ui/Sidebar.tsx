'use client';

import React from 'react';
import Link from 'next/link';
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
  ChevronRight,
  Phone,
  LogOut,
  Building2,
  Settings,
} from 'lucide-react';
import type { CompanySettings, CompanyWorkspaceOption, Project } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProjectSelectorEnhanced } from '@/components/ProjectSelectorEnhanced';
import { TabsGrouped } from '@/components/TabsGrouped';
import { TAB_DEFINITIONS, filterTabsByPermissions, getTabGroup } from '@/lib/constants/tabs';

interface SidebarProps {
  company: CompanySettings;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentUser?: { name?: string | null; email?: string | null } | null;
  isSigningOut?: boolean;
  onSignOut?: () => Promise<boolean>;
  canManageCompany?: boolean;
  workspaces?: CompanyWorkspaceOption[];
  activeWorkspaceId?: string;
  onSelectWorkspace?: (companyId: string) => void;
  onOpenBranding?: () => void;
  canViewPersonnel?: boolean;
  canViewPayroll?: boolean;
  canViewExpenses?: boolean;
  canViewSupplyChain?: boolean;
  className?: string;
}

export function Sidebar({
  company,
  projects,
  activeProjectId,
  onSelectProject,
  activeTab,
  onSelectTab,
  currentUser,
  isSigningOut,
  onSignOut,
  canManageCompany = false,
  workspaces = [],
  activeWorkspaceId = '',
  onSelectWorkspace,
  onOpenBranding,
  canViewPersonnel = false,
  canViewPayroll = false,
  canViewExpenses = false,
  canViewSupplyChain = false,
  className = '',
}: SidebarProps) {
  // Usar definiciones centralizadas de tabs
  const tabs = filterTabsByPermissions({
    canViewPersonnel,
    canViewPayroll,
    canViewExpenses,
    canViewSupplyChain,
    canManageCompany,
  });

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-slate-950/90 backdrop-blur-xl ${className}`}
      aria-label="Navegación principal"
    >
      {/* Header de empresa - MEJORADO */}
      <div className="flex flex-col items-center gap-3 border-b border-white/10 px-5 py-6">
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary-500/20 to-sky-500/20 p-3 shadow-[0_8px_24px_rgba(14,165,233,0.2)]">
          <div className="flex items-center justify-center rounded-lg bg-white/20 p-1">
            <Building2 className="h-6 w-6 stroke-[2.5] text-primary-500" />
          </div>
          <div className="flex flex-col">
            <h2 className="truncate text-sm font-bold text-white">
              {company.commercialName || company.companyName || company.legalName || 'ORIGEN ERP'}
            </h2>
            <p className="text-[10px] leading-tight text-slate-400">Construcción y Arquitectura</p>
          </div>
        </div>
        {company.phone && (
          <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/[0.1] hover:text-white">
            <Phone className="h-4 w-4" />
            <span className="max-w-[140px] truncate">{company.phone}</span>
          </button>
        )}
      </div>

      {/* Project Selector - MEJORADO CON ProjectSelectorEnhanced */}
      {projects.length > 0 && (
        <div className="border-b border-white/10 px-4 py-3">
          <ProjectSelectorEnhanced
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={onSelectProject}
            compact
          />
        </div>
      )}

      {/* Workspace selector (si hay múltiples empresas) */}
      {workspaces.length > 1 && (
        <div className="px-4 py-3">
          <label className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Empresa
          </label>
          <select
            id="workspace-select"
            value={activeWorkspaceId}
            onChange={(e) => onSelectWorkspace?.(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
          >
            {workspaces.map((ws) => (
              <option key={ws.workspace.id} value={ws.workspace.id}>
                {ws.workspace.name} · {ws.membership.role}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navegación principal - MEJORADA CON TabsGrouped */}
      <nav
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4"
        aria-label="Navegación"
      >
        <TabsGrouped tabs={tabs} activeTabId={activeTab} onSelectTab={onSelectTab} />
      </nav>

      {/* Footer con acceso a configuración, usuario y cerrar sesión - MEJORADO */}
      <div className="border-t border-white/10 p-4">
        {canManageCompany && onOpenBranding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenBranding}
            aria-label="Configuración de Marca"
            className="mb-3 flex w-full items-center justify-center gap-2"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            <span>Configuración</span>
          </Button>
        )}
        <div className="flex cursor-pointer items-center gap-3 rounded-xl bg-white/[0.05] px-2 py-2 transition-colors hover:bg-white/[0.1]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500/20 text-xs font-bold text-primary-500">
            {currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {currentUser?.email || 'Usuario'}
            </p>
            <p className="truncate text-[10px] text-slate-400">
              {canManageCompany ? 'Administrador' : 'Usuario'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSignOut}
            disabled={isSigningOut}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="h-7 w-7 p-0"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

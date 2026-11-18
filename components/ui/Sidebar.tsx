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
  ChevronRight,
  Phone,
  LogOut,
  Building2,
} from 'lucide-react';
import type { CompanySettings, CompanyWorkspaceOption, Project } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
  canViewPersonnel?: boolean;
  canViewPayroll?: boolean;
  canViewExpenses?: boolean;
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
  canViewPersonnel = false,
  canViewPayroll = false,
  canViewExpenses = false,
  className = '',
}: SidebarProps) {
  const tabs = [
    { id: 'dashboard', label: 'Tablero', icon: LayoutDashboard },
    { id: 'proyectos', label: 'Proyectos & Firmas', icon: HardHat, badge: 'Firma' },
    { id: 'apu_presupuestos', label: 'Presupuestos APU', icon: Calculator },
    { id: 'cotizaciones', label: 'Cotizaciones', icon: FileText },
    { id: 'cronograma_gantt', label: 'Seguimiento & Hitos', icon: CalendarDays, badge: 'Avance' },
    { id: 'maquinaria', label: 'Maquinaria', icon: Truck },
    { id: 'personal', label: 'Personal & IGSS', icon: Users },
    { id: 'planillas', label: 'Planillas Guate', icon: Banknote },
    { id: 'gastos', label: 'Gastos & Facturas', icon: Receipt },
    { id: 'fel_invoices', label: 'Facturas FEL', icon: FileCheck2 },
    { id: 'reportes', label: 'Reportes Finales', icon: PieChart },
    { id: 'ai', label: 'Asistente IA', icon: Sparkles },
    { id: 'gmail', label: 'Correo & Avisos', icon: Mail },
    ...(canManageCompany ? [{ id: 'equipo', label: 'Equipo de la empresa', icon: UserPlus }] : []),
  ].filter((tab) => {
    if (tab.id === 'personal') return canViewPersonnel;
    if (tab.id === 'planillas') return canViewPayroll;
    if (tab.id === 'gastos') return canViewExpenses;
    return true;
  });

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-slate-950/90 backdrop-blur-xl ${className}`}
      aria-label="Navegación principal"
    >
      {/* Header de empresa */}
      <div className="flex flex-col items-center gap-3 border-b border-white/10 px-5 py-6">
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-amber-400/20 to-sky-500/20 p-3 shadow-[0_8px_24px_rgba(245,158,11,0.2)]">
          <div className="flex items-center justify-center rounded-lg bg-white/20 p-1">
            <Building2 className="h-6 w-6 stroke-[2.5] text-amber-400" />
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
            className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1"
          >
            {workspaces.map((ws) => (
              <option key={ws.workspace.id} value={ws.workspace.id}>
                {ws.workspace.name} · {ws.membership.role}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navegación principal */}
      <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Navegación">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isExternalRoute = tab.id === 'fel_invoices';
          const itemClassName = `w-full flex items-center gap-3 rounded-lg border border-white/10 bg-white/${isActive ? '15' : '0'} px-3 py-2 text-sm ${isActive ? 'text-slate-950 bg-white/[0.05]' : 'text-slate-400 hover:bg-white/[0.05]'} transition-colors`;
          const content = (
            <>
              <div className="flex items-center gap-3">
                <tab.icon
                  className={`h-4 w-4 shrink-0 ${isActive ? 'stroke-[2.5] text-slate-950' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <span className="truncate">{tab.label}</span>
                {tab.badge && (
                  <Badge
                    variant="primary"
                    size="sm"
                    className={isActive ? 'border-slate-950/30 bg-slate-950/20 text-slate-950' : ''}
                  >
                    {tab.badge}
                  </Badge>
                )}
              </div>
              {isActive && <ChevronRight className="h-3 w-3 shrink-0 text-slate-950" />}
            </>
          );

          if (isExternalRoute) {
            return (
              <Link
                key={tab.id}
                href={`/${tab.id === 'fel_invoices' ? 'fel-invoices' : tab.id}`}
                className={itemClassName}
                aria-current={isActive ? 'page' : undefined}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`${itemClassName} text-left`}
              aria-current={isActive ? 'page' : undefined}
            >
              {content}
            </button>
          );
        })}
      </nav>

      {/* Footer con usuario y cerrar sesión */}
      <div className="border-t border-white/10 p-4">
        <div className="flex cursor-pointer items-center gap-3 rounded-xl bg-white/[0.05] px-2 py-2 transition-colors hover:bg-white/[0.1]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-400/20 text-xs font-bold text-amber-400">
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
            variant="outline"
            size="sm"
            onClick={onSignOut}
            disabled={isSigningOut}
            className="h-7 w-7 p-0"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  HardHat,
  Calculator,
  FileText,
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
  canViewPersonnel = false,
  canViewPayroll = false,
  canViewExpenses = false,
  canViewSupplyChain = false,
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
    { id: 'inventario', label: 'Inventario & Compras', icon: Boxes },
    { id: 'reportes', label: 'Reportes Finales', icon: PieChart },
    { id: 'ai', label: 'Asistente IA', icon: Sparkles },
    { id: 'gmail', label: 'Correo & Avisos', icon: Mail },
    ...(canManageCompany ? [{ id: 'equipo', label: 'Equipo de la empresa', icon: UserPlus }] : []),
  ].filter((tab) => {
    if (tab.id === 'personal') return canViewPersonnel;
    if (tab.id === 'planillas') return canViewPayroll;
    if (tab.id === 'gastos') return canViewExpenses;
    if (tab.id === 'inventario') return canViewSupplyChain;
    return true;
  });

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-slate-950/90 border-r border-white/10 backdrop-blur-xl ${className}`}
      aria-label="Navegación principal"
    >
      {/* Header de empresa */}
      <div className="flex flex-col items-center gap-3 px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-amber-400/20 to-sky-500/20 shadow-[0_8px_24px_rgba(245,158,11,0.2)]">
          <div className="flex items-center justify-center rounded-lg bg-white/20 p-1">
            <Building2 className="h-6 w-6 text-amber-400 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-white truncate">{company.commercialName || company.companyName || company.legalName || 'ORIGEN ERP'}</h2>
            <p className="text-[10px] text-slate-400 leading-tight">Construcción y Arquitectura</p>
          </div>
        </div>
        {company.phone && (
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-slate-300 hover:bg-white/[0.1] hover:text-white transition-colors">
            <Phone className="h-4 w-4" />
            <span className="truncate max-w-[140px]">{company.phone}</span>
          </button>
        )}
      </div>

      {/* Selector de proyecto activo: los módulos operativos usan activeProjectId. */}
      {projects.length > 0 && (
        <div className="px-4 py-3 border-b border-white/10">
          <label
            htmlFor="active-project-select"
            className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2"
          >
            Proyecto activo
          </label>
          <select
            id="active-project-select"
            aria-label="Proyecto activo"
            value={activeProject?.id ?? ''}
            onChange={(event) => onSelectProject(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} · {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Workspace selector (si hay múltiples empresas) */}
      {workspaces.length > 1 && (
        <div className="px-4 py-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
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
      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-0.5 px-3 py-4" aria-label="Navegación">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/${tab.id}`}
              className={`w-full flex items-center gap-3 rounded-lg border border-white/10 bg-white/${isActive ? '15' : '0'} px-3 py-2 text-sm ${isActive ? 'text-slate-950 bg-white/[0.05]' : 'text-slate-400 hover:bg-white/[0.05]'} transition-colors`}
              aria-current={isActive ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault();
                onSelectTab(tab.id);
              }}
            >
              <div className="flex items-center gap-3">
                <tab.icon className={`h-4 w-4 shrink-0 ${isActive ? 'stroke-[2.5] text-slate-950' : 'text-slate-400'}`} aria-hidden="true" />
                <span className="truncate">{tab.label}</span>
                {tab.badge && (
                  <Badge variant="primary" size="sm" className={isActive ? 'border-slate-950/30 bg-slate-950/20 text-slate-950' : ''}>
                    {tab.badge}
                  </Badge>
                )}
              </div>
              {isActive && <ChevronRight className="h-3 w-3 shrink-0 text-slate-950" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer con usuario y cerrar sesión */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] cursor-pointer transition-colors">
          <div className="h-8 w-8 rounded-full bg-brand-400/20 flex items-center justify-center text-amber-400 font-bold text-xs">
            {currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{currentUser?.email || 'Usuario'}</p>
            <p className="text-[10px] text-slate-400 truncate">{canManageCompany ? 'Administrador' : 'Usuario'}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onSignOut} disabled={isSigningOut} aria-label="Cerrar sesión" title="Cerrar sesión" className="h-7 w-7 p-0">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

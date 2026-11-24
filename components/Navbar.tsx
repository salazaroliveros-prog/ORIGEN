'use client';

import React, { useState } from 'react';
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
  X,
  Menu,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { AuthSessionStatus } from '@/lib/firebaseAuth';
import type { CompanySettings, Project, CompanyWorkspaceOption } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Sidebar } from '@/components/ui/Sidebar';
import { BottomNav } from '@/components/ui/BottomNav';
import { MobileSheet } from '@/components/ui/MobileSheet';
import { FocusTrap } from '@/components/a11y/FocusTrap';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface NavbarProps {
  company: CompanySettings;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAiAssistant: () => void;
  onOpenBranding: () => void;
  currentUser: User | null;
  authStatus: AuthSessionStatus;
  isSigningOut: boolean;
  onSignOut: () => Promise<boolean>;
  canManageCompany?: boolean;
  workspaces?: CompanyWorkspaceOption[];
  activeWorkspaceId?: string;
  onSelectWorkspace?: (companyId: string) => void;
  canViewPersonnel?: boolean;
  canViewPayroll?: boolean;
  canViewExpenses?: boolean;
  canViewSupplyChain?: boolean;
  isMobileSidebarOpen?: boolean;
  onToggleMobileSidebar?: () => void;
  children?: React.ReactNode;
}

const TABS = [
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
  { id: 'inventario', label: 'Inventario & Compras', icon: Boxes },
  { id: 'reportes', label: 'Reportes Finales', icon: PieChart },
  { id: 'ai', label: 'Asistente IA', icon: Sparkles },
  { id: 'gmail', label: 'Correo & Avisos', icon: Mail },
];

const MOBILE_TABS = [
  { id: 'dashboard', label: 'Tablero', icon: LayoutDashboard },
  { id: 'proyectos', label: 'Obras', icon: HardHat },
  { id: 'cronograma_gantt', label: 'Seguimiento', icon: CalendarDays },
  { id: 'personal', label: 'Personal', icon: Users },
  { id: 'fel_invoices', label: 'FEL', icon: FileCheck2 },
  { id: 'inventario', label: 'Inventario', icon: Boxes },
];

export function Navbar({
  company,
  projects,
  activeProjectId,
  onSelectProject,
  activeTab,
  onSelectTab,
  onOpenAiAssistant,
  onOpenBranding,
  currentUser,
  authStatus,
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
  isMobileSidebarOpen = false,
  onToggleMobileSidebar,
  children,
}: NavbarProps) {
  const tabs = [
    ...TABS,
    ...(canManageCompany ? [{ id: 'equipo', label: 'Equipo de la empresa', icon: UserPlus }] : []),
  ].filter((tab) => {
    if (tab.id === 'personal') return canViewPersonnel;
    if (tab.id === 'planillas') return canViewPayroll;
    if (tab.id === 'gastos') return canViewExpenses;
    if (tab.id === 'inventario') return canViewSupplyChain;
    return true;
  });

  const mobileTabs = MOBILE_TABS.filter((tab) => {
    if (tab.id === 'personal') return canViewPersonnel;
    if (tab.id === 'inventario') return canViewSupplyChain;
    return true;
  });

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  return (
    <div className="flex h-full flex-col">
      {/* ================= MOBILE SHELL ================= */}
      <div className="hidden h-full flex-col lg:flex">
        {/* Desktop Sidebar */}
        <Sidebar
          company={company}
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={onSelectProject}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          currentUser={currentUser}
          isSigningOut={isSigningOut}
          onSignOut={onSignOut}
          canManageCompany={canManageCompany}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={onSelectWorkspace}
          onOpenBranding={onOpenBranding}
          canViewPersonnel={canViewPersonnel}
          canViewPayroll={canViewPayroll}
          canViewExpenses={canViewExpenses}
          canViewSupplyChain={canViewSupplyChain}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-slate-950">{children}</div>
      </div>

      {/* ================= MOBILE SHELL ================= */}
      <div className="flex h-full flex-col lg:hidden">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-white/10 bg-white/[0.05] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMobileSidebar}
            className="rounded-xl text-slate-300 backdrop-blur-sm hover:bg-white/[0.1]"
            aria-label={
              isMobileSidebarOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
            }
            aria-expanded={isMobileSidebarOpen}
            aria-controls="mobile-navigation"
            aria-haspopup="dialog"
          >
            {isMobileSidebarOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>

          <span className="flex-1 truncate text-base font-semibold leading-tight text-white">
            {tabs.find((t) => t.id === activeTab)?.label || 'Tablero'}
          </span>

          <ThemeToggle />
        </header>

        <div className="flex-1 overflow-y-auto pb-20">{children}</div>

        <BottomNav
          items={mobileTabs.map((tab) => ({
            key: tab.id,
            ...(tab.id === 'fel_invoices'
              ? { href: '/fel-invoices' }
              : { onSelect: () => onSelectTab(tab.id) }),
            label: tab.label,
            icon: <tab.icon className="h-5 w-5" />,
            activeIcon: <tab.icon className="h-5 w-5" />,
            active: activeTab === tab.id,
            ariaLabel: `Ir a ${tab.label}`,
          }))}
        />

        <FocusTrap isActive={isMobileSidebarOpen} onEscape={onToggleMobileSidebar} returnFocus>
          <MobileSheet
            id="mobile-navigation"
            labelledBy="mobile-navigation-title"
            isOpen={isMobileSidebarOpen}
            onClose={onToggleMobileSidebar ?? (() => {})}
            swipeToClose
            header={
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-400/20 text-amber-400">
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="mobile-navigation-title"
                      className="truncate text-sm font-bold text-white"
                    >
                      {company.commercialName || company.companyName || 'ORIGEN ERP'}
                    </h2>
                    <p className="text-[11px] text-slate-400">Construcción y Arquitectura</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <ThemeToggle />
                  <button
                    type="button"
                    onClick={onToggleMobileSidebar}
                    className="min-h-[44px] min-w-[44px] rounded-lg p-2 text-slate-300 hover:bg-white/[0.08] hover:text-white"
                    aria-label="Cerrar menú"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            }
          >
            <div className="space-y-4 px-3 py-3">
              {workspaces.length > 1 && (
                <div>
                  <label
                    htmlFor="mobile-workspace-select"
                    className="mb-1.5 block text-xs font-semibold text-slate-400"
                  >
                    Empresa activa
                  </label>
                  <select
                    id="mobile-workspace-select"
                    value={activeWorkspaceId}
                    onChange={(event) => {
                      onSelectWorkspace?.(event.target.value);
                      onToggleMobileSidebar?.();
                    }}
                    className="min-h-[44px] w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"
                  >
                    {workspaces.map((workspaceOption) => (
                      <option
                        key={workspaceOption.workspace.id}
                        value={workspaceOption.workspace.id}
                      >
                        {workspaceOption.workspace.name} · {workspaceOption.membership.role}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {projects.length > 0 && (
                <div>
                  <label
                    htmlFor="mobile-active-project-select"
                    className="mb-1.5 block text-xs font-semibold text-slate-400"
                  >
                    Proyecto activo
                  </label>
                  <select
                    id="mobile-active-project-select"
                    aria-label="Proyecto activo"
                    value={activeProject?.id ?? ''}
                    onChange={(event) => {
                      onSelectProject(event.target.value);
                      onToggleMobileSidebar?.();
                    }}
                    className="min-h-[44px] w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.code} · {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <nav className="space-y-1" aria-label="Navegación principal">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const itemClassName = [
                    'flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors',
                    isActive
                      ? 'border-brand-400/50 bg-brand-400/20 text-white'
                      : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.05]',
                  ].join(' ');
                  const content = (
                    <>
                      <tab.icon
                        className={
                          isActive
                            ? 'h-5 w-5 shrink-0 text-amber-300'
                            : 'h-5 w-5 shrink-0 text-slate-400'
                        }
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">{tab.label}</span>
                      {isActive && (
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-amber-300"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  );

                  if (tab.id === 'fel_invoices') {
                    return (
                      <Link
                        key={tab.id}
                        href="/fel-invoices"
                        className={itemClassName}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={'Ir a ' + tab.label}
                        onClick={() => onToggleMobileSidebar?.()}
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={itemClassName}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={'Ir a ' + tab.label}
                      onClick={() => onSelectTab(tab.id)}
                    >
                      {content}
                    </button>
                  );
                })}
              </nav>

              <div className="space-y-3 border-t border-white/10 pt-3">
                {canManageCompany && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onToggleMobileSidebar?.();
                      onOpenBranding();
                    }}
                    className="min-h-[44px] w-full justify-center gap-2"
                    aria-label="Configuración de Marca"
                  >
                    <span>Configuración de Marca</span>
                  </Button>
                )}

                <div className="flex min-w-0 items-center gap-3 rounded-xl bg-white/[0.05] px-3 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-400/20 text-sm font-bold text-amber-300">
                    {currentUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {currentUser?.email || 'Usuario'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {canManageCompany ? 'Administrador' : 'Usuario'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => void onSignOut()}
                    disabled={isSigningOut}
                    aria-label="Cerrar sesión"
                    title="Cerrar sesión"
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                    CONTROL DE OBRA
                  </span>
                  <span className="font-semibold text-amber-300">
                    {'Q ' + company.exchangeRate.toFixed(2) + '/USD'}
                  </span>
                </div>
              </div>
            </div>
          </MobileSheet>
        </FocusTrap>
      </div>
    </div>
  );
}

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
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { AuthSessionStatus } from '@/lib/firebaseAuth';
import type { CompanySettings, Project, CompanyWorkspaceOption } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Sidebar } from '@/components/ui/Sidebar';
import { MobileHeader } from '@/components/ui/MobileHeader';
import { BottomNav } from '@/components/ui/BottomNav';
import { MobileSheet } from '@/components/ui/MobileSheet';

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
  const tabs = TABS.filter((tab) => {
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
    <div className="flex flex-col h-full">
      {/* ================= MOBILE SHELL ================= */}
      <div className="hidden lg:flex flex-col h-full">
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
          canViewPersonnel={canViewPersonnel}
          canViewPayroll={canViewPayroll}
          canViewExpenses={canViewExpenses}
          canViewSupplyChain={canViewSupplyChain}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-slate-950">
          {children}
        </div>
      </div>

      {/* ================= MOBILE SHELL ================= */}
      <div className="lg:hidden flex flex-col h-full">
        <MobileHeader
          title={tabs.find((t) => t.id === activeTab)?.label || 'Tablero'}
          onMenuToggle={onToggleMobileSidebar}
          onBack={() => {}}
          userName={currentUser?.email?.split('@')[0] || 'Usuario'}
          userEmail={currentUser?.email || undefined}
        />

        <div className="flex-1 overflow-y-auto pb-20">
          {children}
        </div>

        <BottomNav
          items={mobileTabs.map((tab) => ({
            key: tab.id,
            ...(tab.id === 'fel_invoices' ? { href: '/fel-invoices' } : { onSelect: () => onSelectTab(tab.id) }),
            label: tab.label,
            icon: <tab.icon className="h-5 w-5" />,
            activeIcon: <tab.icon className="h-5 w-5" />,
            active: activeTab === tab.id,
          }))}
        />

        <MobileSheet
          isOpen={isMobileSidebarOpen}
          onClose={onToggleMobileSidebar ?? (() => {})}
          header={
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-400/20 text-amber-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{company.commercialName || company.companyName}</p>
                  <p className="text-[10px] text-slate-400">Construcción y Arquitectura</p>
                </div>
              </div>
              <button
                onClick={onToggleMobileSidebar}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          }
        >
          <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Navegación principal">
            {mobileTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const itemClassName = `flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/${isActive ? '15' : '0'} px-3 py-2 text-sm ${isActive ? 'text-slate-950 bg-white/[0.05]' : 'text-slate-400 hover:bg-white/[0.05]'} transition-colors`;
              const content = (
                <>
                  <div className="flex items-center gap-3">
                    <tab.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} aria-hidden="true" />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3 w-3 text-slate-950" />}
                </>
              );

              if (tab.id === 'fel_invoices') {
                return (
                  <Link key={tab.id} href="/fel-invoices" className={itemClassName} aria-current={isActive ? 'page' : undefined}>
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`${itemClassName} text-left`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    onSelectTab(tab.id);
                    onToggleMobileSidebar?.();
                  }}
                >
                  {content}
                </button>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#4ade80]" />
                CONTROL DE OBRA
              </span>
              <span className="font-bold text-amber-400">
                {company.exchangeRate > 0 ? `Q ${company.exchangeRate.toFixed(2)}/USD` : 'Sin tipo de cambio'}
              </span>
            </div>
          </div>
        </MobileSheet>
      </div>
    </div>
  );
}

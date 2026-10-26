'use client';

import React, { useState } from 'react';
import {
  Building2,
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
  Settings,
  LogOut,
  LogIn,
  X,
  ChevronDown,
  MoreHorizontal,
  UserPlus,
} from 'lucide-react';
import { CompanySettings, Project } from '@/lib/types';
import type { User } from 'firebase/auth';
import type { AuthSessionStatus } from '@/lib/firebaseAuth';
import type { CompanyWorkspaceOption } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FocusTrap } from '@/components/a11y/FocusTrap';

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
  onOpenSignIn: () => void;
  onSignOut: () => Promise<boolean>;
  canManageCompany?: boolean;
  workspaces?: CompanyWorkspaceOption[];
  activeWorkspaceId?: string;
  onSelectWorkspace?: (companyId: string) => void;
  canViewPersonnel?: boolean;
  canViewPayroll?: boolean;
  isMobileSidebarOpen?: boolean;
  onToggleMobileSidebar?: () => void;
}

function WorkspaceSelector({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  className,
  id,
}: {
  workspaces: CompanyWorkspaceOption[];
  activeWorkspaceId: string;
  onSelectWorkspace?: (companyId: string) => void;
  className?: string;
  id: string;
}) {
  if (workspaces.length < 2) return null;

  const activeWorkspace = workspaces.find(
    (option) => option.workspace.id === activeWorkspaceId
  );

  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <label
        htmlFor={id}
        className="text-xs font-semibold text-slate-300"
      >
        Empresa activa
      </label>
      <select
        id={id}
        value={activeWorkspaceId}
        onChange={(event) => onSelectWorkspace?.(event.target.value)}
        className="min-h-[44px] w-full rounded-lg border border-white/15 bg-slate-900 px-3 text-sm text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400"
      >
        {workspaces.map(({ workspace: item, membership }) => (
          <option key={item.id} value={item.id}>
            {item.name || item.id} · {membership.role}
          </option>
        ))}
      </select>
      {activeWorkspace && (
        <p className="truncate text-[11px] text-slate-400">
          Acceso: {activeWorkspace.membership.role}
        </p>
      )}
    </div>
  );
}

export const Navbar: React.FC<NavbarProps> = ({
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
  onOpenSignIn,
  onSignOut,
  canManageCompany = false,
  workspaces = [],
  activeWorkspaceId = '',
  onSelectWorkspace,
  canViewPersonnel = false,
  canViewPayroll = false,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
}) => {
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

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
    { id: 'reportes', label: 'Reportes Finales', icon: PieChart },
    { id: 'ai', label: 'Asistente IA', icon: Sparkles },
    { id: 'gmail', label: 'Correo & Avisos', icon: Mail },
    ...(canManageCompany ? [{ id: 'equipo', label: 'Equipo de la empresa', icon: UserPlus }] : []),
  ].filter((tab) => {
    if (tab.id === 'personal') return canViewPersonnel;
    if (tab.id === 'planillas') return canViewPayroll;
    return true;
  });
  const mobileQuickTabs = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'proyectos', label: 'Obras', icon: HardHat },
    { id: 'cronograma_gantt', label: 'Agenda', icon: CalendarDays },
    { id: 'personal', label: 'Personal', icon: Users },
  ].filter((tab) => tab.id !== 'personal' || canViewPersonnel);

  const currentTabName = tabs.find((t) => t.id === activeTab)?.label || 'Tablero';

  return (
    <>
      {/* ================= FIXED GLASS SIDEBAR (Desktop) ================= */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-[280px] z-50 flex-col bg-slate-950/60 backdrop-blur-xl border-r border-white/10 p-6 overflow-y-auto select-none">
        {/* Brand Header */}
        <div className="pb-6 border-b border-white/10 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 flex items-center justify-center shadow-[0_8px_24px_rgba(56,189,248,0.4)]">
            <Building2 className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white">ConstructERP</span>
              <Badge variant="primary" size="sm">
                Guatemala
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1 truncate">
              {company.commercialName || 'Volcanes Proyectos & Ingeniería'}
            </p>
          </div>
        </div>

        {workspaces.length > 1 && (
          <WorkspaceSelector
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSelectWorkspace={onSelectWorkspace}
            className="mt-4"
            id="desktop-workspace-select"
          />
        )}

        {/* Navigation List */}
        <nav
          aria-label="Navegación principal"
          className="flex-1 py-6 space-y-1.5 overflow-y-auto no-scrollbar"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant={isActive ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onSelectTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full text-left justify-between ${isActive ? 'shadow-[inset_0_0_12px_rgba(56,189,248,0.3)]' : ''}`}
              >
                <div className="flex items-center gap-3 w-full">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span className="truncate">{tab.label}</span>
                </div>
                {tab.badge && (
                  <Badge variant="primary" size="sm">{tab.badge}</Badge>
                )}
              </Button>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAiAssistant}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Gemini IA Asistente</span>
            </Button>
            {canManageCompany && <Button
              variant="ghost"
              size="sm"
              onClick={onOpenBranding}
              className="ml-2 p-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.05]"
              title="Configuración de Empresa"
            >
              <Settings className="w-4 h-4" />
            </Button>}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#4ade80]"></span>
              CONTROL DE OBRA • GUATEMALA
            </span>
            <span className="text-amber-400 font-bold">
              {company.exchangeRate > 0
                ? `Q ${company.exchangeRate.toFixed(2)}/USD`
                : 'Tipo de cambio sin configurar'}
            </span>
          </div>
        </div>
      </aside>

      {/* ================= MOBILE DRAWER SIDEBAR ================= */}
      {isMobileSidebarOpen && (
        <FocusTrap onEscape={onToggleMobileSidebar}>
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              aria-hidden="true"
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={onToggleMobileSidebar}
            />
            <aside
              id="mobile-navigation"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-navigation-title"
              className="relative w-72 max-w-[85vw] bg-slate-950/95 backdrop-blur-2xl border-r border-white/15 px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col z-50 h-full overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-md">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 id="mobile-navigation-title" className="text-base font-bold text-white leading-tight">
                      Menú de navegación
                    </h2>
                    <span className="font-mono text-[9px] uppercase text-amber-400 font-bold">Guatemala</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={onToggleMobileSidebar}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/[0.05]"
                  aria-label="Cerrar menú de navegación"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </Button>
              </div>

              {workspaces.length > 1 && (
                <WorkspaceSelector
                  workspaces={workspaces}
                  activeWorkspaceId={activeWorkspaceId}
                  onSelectWorkspace={onSelectWorkspace}
                  className="mt-4"
                  id="mobile-workspace-select"
                />
              )}

              <nav
                aria-label="Navegación principal"
                className="flex-1 py-4 space-y-1 overflow-y-auto"
              >
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <Button
                      key={tab.id}
                      variant={isActive ? 'primary' : 'ghost'}
                      size="md"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        onSelectTab(tab.id);
                      }}
                      className={`w-full text-left justify-between ${isActive ? 'shadow-[inset_0_0_10px_rgba(56,189,248,0.3)]' : ''}`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                        <span>{tab.label}</span>
                      </div>
                      {tab.badge && (
                        <Badge variant="primary" size="sm">{tab.badge}</Badge>
                      )}
                    </Button>
                  );
                })}
              </nav>
              <div className="shrink-0 space-y-3 border-t border-white/10 pt-4">
                {canManageCompany && <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    onOpenBranding();
                    onToggleMobileSidebar?.();
                  }}
                  className="w-full justify-start"
                >
                  <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                  Marca y personalización
                </Button>}
                <div className="space-y-2">
                  <label
                    htmlFor="mobile-project-select"
                    className="text-xs font-semibold text-slate-300"
                  >
                    Proyecto activo
                  </label>
                  <select
                    id="mobile-project-select"
                    value={activeProjectId}
                    onChange={(event) => onSelectProject(event.target.value)}
                    disabled={projects.length === 0}
                    className="min-h-[44px] w-full rounded-lg border border-white/15 bg-slate-900 px-3 text-sm text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400 disabled:opacity-60"
                  >
                    {projects.length === 0 ? (
                      <option value="">Sin proyectos disponibles</option>
                    ) : (
                      projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.code} - {project.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="truncate text-xs text-slate-400">
                    {currentUser?.email ||
                      (authStatus === 'loading'
                        ? 'Verificando sesión…'
                        : authStatus === 'error'
                          ? 'No se pudo verificar la sesión'
                          : 'Sesión no iniciada')}
                  </p>
                  {currentUser ? (
                    <Button
                      variant="danger"
                      size="md"
                      isLoading={isSigningOut}
                      onClick={() => {
                        void onSignOut().then((signedOut) => {
                          if (signedOut) onToggleMobileSidebar?.();
                        });
                      }}
                      className="w-full justify-start"
                    >
                      <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                      Cerrar sesión
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="md"
                      disabled={authStatus === 'loading'}
                      onClick={() => {
                        onOpenSignIn();
                        onToggleMobileSidebar?.();
                      }}
                      className="w-full justify-start"
                    >
                      <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                      {authStatus === 'loading' ? 'Verificando sesión…' : 'Iniciar sesión'}
                    </Button>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </FocusTrap>
      )}

      <nav
        aria-label="Navegación rápida"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-white/10 bg-slate-950/95 px-1 pt-1.5 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(2,6,23,0.28)] backdrop-blur-xl lg:hidden"
      >
        {mobileQuickTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-400 ${
                isActive ? 'text-amber-300' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="max-w-full truncate">{tab.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          aria-expanded={Boolean(isMobileSidebarOpen)}
          aria-controls="mobile-navigation"
          className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-400 ${
            isMobileSidebarOpen ? 'text-amber-300' : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          <span>Más</span>
        </button>
      </nav>

      {/* ================= GLASS TOP NAV BAR (Desktop only - MobileHeader handles mobile) ================= */}
      <header className="hidden lg:flex sticky top-0 z-40 bg-slate-950/40 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 lg:px-8 py-3 lg:ml-[280px]">
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          {/* Current view */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                VISTA DE {currentTabName.toUpperCase()} / Q (Quetzales)
              </span>
              <span className="text-xs font-bold text-white hidden sm:block">
                {activeProject ? `${activeProject.code} - ${activeProject.name}` : 'ConstructERP Guatemala'}
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Project Dropdown Selector */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                disabled={projects.length === 0}
                aria-expanded={isProjectDropdownOpen}
                aria-haspopup="listbox"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200"
              >
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                <span className="max-w-[110px] sm:max-w-[160px] truncate">
                  {activeProject?.name ?? 'Sin proyecto'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </Button>

              {isProjectDropdownOpen && (
                <div role="menu" aria-label="Cambiar proyecto activo" className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-2 z-50 space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/10">
                    Cambiar Proyecto Activo
                  </div>
                  {projects.map((proj) => (
                    <Button
                      key={proj.id}
                      role="menuitem"
                      variant={proj.id === activeProjectId ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        onSelectProject(proj.id);
                        setIsProjectDropdownOpen(false);
                      }}
                      className={`w-full text-left justify-between ${
                        proj.id === activeProjectId
                          ? 'shadow-[inset_0_0_10px_rgba(56,189,248,0.3)]'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-amber-400 mr-1.5">{proj.code}</span>
                          <span className="truncate">{proj.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono ml-2">{proj.progressPercent}%</span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* User Pill with Status Dot */}
            <div className="user-pill flex items-center gap-2 px-3 py-2 rounded-full bg-white/[0.06] border border-white/15 text-xs text-slate-200">
              <span className={`status-dot w-2 h-2 rounded-full ${currentUser ? 'bg-emerald-400 shadow-[0_0_8px_#4ade80]' : 'bg-slate-500'}`}></span>
              <span className="font-semibold truncate max-w-[140px] sm:max-w-[180px]">
                {currentUser?.email ||
                  (authStatus === 'loading'
                    ? 'Verificando sesión…'
                    : authStatus === 'error'
                      ? 'Error al verificar sesión'
                      : 'Sesión no iniciada')}
              </span>
            </div>

            {/* Auth / Logout Button */}
            {currentUser ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => void onSignOut()}
                isLoading={isSigningOut}
                aria-label="Cerrar sesión"
                className="p-2.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/20"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSignIn}
                disabled={authStatus === 'loading'}
                className="gap-2 px-3 text-slate-200"
                title="Iniciar sesión con correo electrónico o Google"
              >
                <LogIn className="w-4 h-4" />
                <span>{authStatus === 'loading' ? 'Verificando…' : 'Iniciar sesión'}</span>
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

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
} from 'lucide-react';
import { CompanySettings, Project } from '@/lib/types';
import { User } from 'firebase/auth';
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
  onSignIn: () => void;
  onSignOut: () => void;
  isMobileSidebarOpen?: boolean;
  onToggleMobileSidebar?: () => void;
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
  onSignIn,
  onSignOut,
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
  ];

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
              <h1 className="text-xl font-extrabold tracking-tight text-white">ConstructERP</h1>
              <Badge variant="primary" size="sm">
                Guatemala
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1 truncate">
              {company.commercialName || 'Volcanes Proyectos & Ingeniería'}
            </p>
          </div>
        </div>

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
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenBranding}
              className="ml-2 p-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.05]"
              title="Configuración de Empresa"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#4ade80]"></span>
              SAT & IGSS 2025
            </span>
            <span className="text-amber-400 font-bold">Q 7.80/USD</span>
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
              className="relative w-72 max-w-[85vw] bg-slate-950/95 backdrop-blur-2xl border-r border-white/15 p-6 flex flex-col z-50 h-full overflow-y-auto"
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
                        if (onToggleMobileSidebar) onToggleMobileSidebar();
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
                    {currentUser?.email || 'Sesión no iniciada'}
                  </p>
                  {currentUser ? (
                    <Button
                      variant="danger"
                      size="md"
                      onClick={() => {
                        onSignOut();
                        onToggleMobileSidebar?.();
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
                      onClick={() => {
                        onSignIn();
                        onToggleMobileSidebar?.();
                      }}
                      className="w-full justify-start"
                    >
                      <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                      Iniciar sesión
                    </Button>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </FocusTrap>
      )}

      {/* ================= GLASS TOP NAV BAR (Desktop only - MobileHeader handles mobile) ================= */}
      <header className="hidden lg:flex sticky top-0 z-40 bg-slate-950/40 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 lg:px-8 py-3 lg:ml-[280px]">
        <div className="flex items-center justify-between gap-4">
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
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200"
              >
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                <span className="max-w-[110px] sm:max-w-[160px] truncate">{activeProject?.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </Button>

              {isProjectDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-2 z-50 space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/10">
                    Cambiar Proyecto Activo
                  </div>
                  {projects.map((proj) => (
                    <Button
                      key={proj.id}
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
              <span className="status-dot w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#4ade80]"></span>
              <span className="font-semibold truncate max-w-[140px] sm:max-w-[180px]">
                {currentUser?.email || 'salazaroliveros@gmail.com'}
              </span>
            </div>

            {/* Auth / Logout Button */}
            {currentUser ? (
              <Button
                variant="danger"
                size="sm"
                onClick={onSignOut}
                className="p-2.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/20"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onSignIn}
                className="p-2.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-sky-500/20"
                title="Iniciar Sesión con Google"
              >
                <LogIn className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

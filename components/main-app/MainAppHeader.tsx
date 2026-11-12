'use client';

import { useMemo } from 'react';
import { LogoUpload } from '@/components/LogoUpload';
import { Navbar } from '@/components/Navbar';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { MobileHeader, PageHeader } from '@/components/PageHeader';
import { FocusTrap } from '@/components/a11y/FocusTrap';
import { Button } from '@/components/ui/Button';
import { TouchTarget } from '@/components/ui/TouchTarget';
import { Settings } from 'lucide-react';
import type { CompanySettings, Employee, TaskReminder } from '@/lib/types';
import { initialCompanySettings } from '@/lib/data';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { useCompanyWorkspace } from '@/lib/hooks/useCompanyWorkspace';
import { useProjectData } from '@/lib/hooks/data';
import { isPrimaryAdministrator } from '@/lib/firebaseAuth';
import { startTransition } from 'react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  canManagePersonnel,
  canReadEmployeeDirectory,
  canReadFullPersonnel,
} from '@/lib/permissions';

type TabKey =
  | 'dashboard'
  | 'proyectos'
  | 'apu_presupuestos'
  | 'personal'
  | 'reportes'
  | 'ai'
  | 'cotizaciones'
  | 'cronograma_gantt'
  | 'maquinaria'
  | 'planillas'
  | 'gastos'
  | 'gmail'
  | 'equipo';

const TAB_CONFIG: Record<TabKey, { id: TabKey; label: string; subtitle: string }> = {
  dashboard: {
    id: 'dashboard',
    label: 'Tablero de Control',
    subtitle: 'Resumen general de proyectos y estado del sistema',
  },
  proyectos: {
    id: 'proyectos',
    label: 'Proyectos y Firmas Digitales',
    subtitle: 'Gestión de proyectos con trazabilidad completa',
  },
  apu_presupuestos: {
    id: 'apu_presupuestos',
    label: 'Presupuestos APU y Gastos',
    subtitle: 'Control financiero con desglose por renglón y departamento',
  },
  personal: {
    id: 'personal',
    label: 'Personal y Asistencia IGSS',
    subtitle: 'Control de cuadrillas, planillas y cumplimiento laboral',
  },
  reportes: {
    id: 'reportes',
    label: 'Reportes Finales y Actas',
    subtitle: 'Generación de reportes ejecutivos y documentación de obra',
  },
  ai: {
    id: 'ai',
    label: 'Asistente Técnico IA',
    subtitle: 'Consultas sobre presupuestos, normativas AGIES y COGUANOR',
  },
  cotizaciones: {
    id: 'cotizaciones',
    label: 'Cotizaciones',
    subtitle: 'Gestión de cotizaciones y presupuestos de clientes',
  },
  cronograma_gantt: {
    id: 'cronograma_gantt',
    label: 'Seguimiento & Hitos',
    subtitle: 'Cronograma de obra y seguimiento de hitos',
  },
  maquinaria: {
    id: 'maquinaria',
    label: 'Maquinaria',
    subtitle: 'Control de flota de maquinaria y horómetros',
  },
  planillas: {
    id: 'planillas',
    label: 'Planillas Guate',
    subtitle: 'Planillas laborales y cumplimiento IGSS',
  },
  gastos: {
    id: 'gastos',
    label: 'Gastos & Facturas',
    subtitle: 'Registro y control de gastos operativos',
  },
  gmail: {
    id: 'gmail',
    label: 'Correo & Avisos',
    subtitle: 'Comunicaciones y notificaciones del proyecto',
  },
  equipo: {
    id: 'equipo',
    label: 'Equipo de la empresa',
    subtitle: 'Miembros, invitaciones y permisos de acceso',
  },
};

export function MainAppHeader({
  company,
  activeTab,
  brandingOpen,
  setBrandingOpen,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  exchangeRateInput,
  setExchangeRateInput,
  permissions,
  handleUpdateCompany,
  handleSaveExchangeRate,
}: {
  company: CompanySettings;
  activeTab: TabKey;
  brandingOpen: boolean;
  setBrandingOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  exchangeRateInput: string;
  setExchangeRateInput: (value: string) => void;
  permissions: ReturnType<typeof usePermissions>;
  handleUpdateCompany: (updates: Partial<CompanySettings>) => Promise<boolean>;
  handleSaveExchangeRate: () => Promise<void>;
}) {
  const tabConfig = TAB_CONFIG[activeTab];

  return (
    <>
      <MobileHeader
        title={tabConfig.label}
        logoUrl={company.logoUrl}
        companyName={company.companyName}
        onMenu={() => setIsMobileSidebarOpen((isOpen) => !isOpen)}
        menuOpen={isMobileSidebarOpen}
      />

      <Navbar
        company={company}
        projects={[]}
        workspaces={[]}
        activeWorkspaceId=""
        onSelectWorkspace={() => {}}
        activeProjectId=""
        onSelectProject={() => {}}
        activeTab={activeTab}
        onSelectTab={() => {}}
        onOpenAiAssistant={() => {}}
        onOpenBranding={() => setBrandingOpen(true)}
        currentUser={null}
        authStatus="authenticated"
        isSigningOut={false}
        onSignOut={async () => false}
        canManageCompany={permissions.canManageCompany}
        canViewPersonnel={permissions.canViewPersonnel}
        canViewPayroll={permissions.canViewFullPersonnel}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((isOpen) => !isOpen)}
      />

      <FocusTrap isActive={brandingOpen} onEscape={() => setBrandingOpen(false)}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="branding-drawer-title"
          className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-sm ${brandingOpen ? '' : 'hidden'}`}
        >
          <div className="animate-in slide-in-from-bottom w-full max-w-md rounded-t-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md duration-300">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-amber-400" aria-hidden="true" />
                <h3 id="branding-drawer-title" className="text-lg font-bold text-white">
                  Marca y Personalización
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBrandingOpen(false)}
                className="rounded-lg p-2 text-slate-300 hover:bg-white/[0.05] hover:text-white"
                aria-label="Cerrar configuración de marca"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </Button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Sube el logo de tu empresa y personaliza los colores de marca.
              </p>
              <div className="space-y-2 rounded-xl border border-white/10 p-3">
                <label
                  htmlFor="company-exchange-rate"
                  className="block text-xs font-semibold text-slate-200"
                >
                  Tipo de cambio configurado (GTQ por USD)
                </label>
                <input
                  id="company-exchange-rate"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={exchangeRateInput}
                  onChange={(event) => setExchangeRateInput(event.target.value)}
                  disabled={!permissions.canManageCompany}
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-60"
                />
                <p className="text-xs text-slate-400">
                  No se usa una tasa automática o simulada; configura la tasa que debe aplicar la
                  empresa.
                </p>
                {permissions.canManageCompany && (
                  <Button variant="primary" size="sm" onClick={() => void handleSaveExchangeRate()}>
                    Guardar tipo de cambio
                  </Button>
                )}
              </div>
              <LogoUpload
                company={{
                  logoUrl: company.logoUrl,
                  companyName: company.companyName,
                  primaryColor: company.primaryColor,
                  secondaryColor: company.secondaryColor,
                }}
                onUpdateCompany={handleUpdateCompany}
                compact
              />
            </div>
            <div className="mt-6 flex justify-end border-t border-white/10 pt-4">
              <Button
                variant="primary"
                size="md"
                onClick={() => setBrandingOpen(false)}
                className="w-full md:w-auto"
              >
                Aplicar a Toda la App
              </Button>
            </div>
          </div>
        </div>
      </FocusTrap>

      {permissions.canManageCompany && !brandingOpen && (
        <TouchTarget
          onPress={() => setBrandingOpen(true)}
          style={{
            bottom: 'calc(5rem + env(safe-area-inset-bottom))',
            right: 'max(1.5rem, env(safe-area-inset-right))',
          }}
          className="fixed z-40 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-xl transition hover:bg-amber-400 lg:hidden"
          aria-label="Configuración de Marca"
        >
          <Settings className="h-6 w-6" aria-hidden="true" />
        </TouchTarget>
      )}

      <PWAInstallPrompt />
    </>
  );
}

function usePermissions(role?: string) {
  return useMemo(() => ({
    canManageProjects: ['owner', 'admin', 'project_manager'].includes(role ?? ''),
    canManageQuotes: ['owner', 'admin', 'project_manager', 'finance'].includes(role ?? ''),
    canManageBudget: ['owner', 'admin', 'project_manager', 'finance'].includes(role ?? ''),
    canManageMachinery: ['owner', 'admin', 'project_manager', 'field_worker'].includes(role ?? ''),
    canManageExpenses: ['owner', 'admin', 'finance'].includes(role ?? ''),
    canManageEmployees: canManagePersonnel(role as any),
    canManageAttendance: ['owner', 'admin', 'project_manager', 'field_worker'].includes(role ?? ''),
    canViewPersonnel: canReadEmployeeDirectory(role as any),
    canViewFullPersonnel: canReadFullPersonnel(role as any),
    canManageCompany: ['owner', 'admin'].includes(role ?? ''),
  }), [role]);
}
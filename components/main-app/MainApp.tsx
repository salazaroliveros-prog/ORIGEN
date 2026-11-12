'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { startTransition } from 'react';
import type { CompanySettings, Employee, Project, CompanyRole } from '@/lib/types';
import { initialCompanySettings } from '@/lib/data';
import { isPrimaryAdministrator } from '@/lib/firebaseAuth';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { useCompanyWorkspace } from '@/lib/hooks/useCompanyWorkspace';
import { useProjectData } from '@/lib/hooks/data';
import { MainAppHeader } from './MainAppHeader';
import { MainAppContent } from './MainAppContent';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import toast from 'react-hot-toast';

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
  dashboard: { id: 'dashboard', label: 'Tablero de Control', subtitle: 'Resumen general de proyectos y estado del sistema' },
  proyectos: { id: 'proyectos', label: 'Proyectos y Firmas Digitales', subtitle: 'Gestión de proyectos con trazabilidad completa' },
  apu_presupuestos: { id: 'apu_presupuestos', label: 'Presupuestos APU y Gastos', subtitle: 'Control financiero con desglose por renglón y departamento' },
  personal: { id: 'personal', label: 'Personal y Asistencia IGSS', subtitle: 'Control de cuadrillas, planillas y cumplimiento laboral' },
  reportes: { id: 'reportes', label: 'Reportes Finales y Actas', subtitle: 'Generación de reportes ejecutivos y documentación de obra' },
  ai: { id: 'ai', label: 'Asistente Técnico IA', subtitle: 'Consultas sobre presupuestos, normativas AGIES y COGUANOR' },
  cotizaciones: { id: 'cotizaciones', label: 'Cotizaciones', subtitle: 'Gestión de cotizaciones y presupuestos de clientes' },
  cronograma_gantt: { id: 'cronograma_gantt', label: 'Seguimiento & Hitos', subtitle: 'Cronograma de obra y seguimiento de hitos' },
  maquinaria: { id: 'maquinaria', label: 'Maquinaria', subtitle: 'Control de flota de maquinaria y horómetros' },
  planillas: { id: 'planillas', label: 'Planillas Guate', subtitle: 'Planillas laborales y cumplimiento IGSS' },
  gastos: { id: 'gastos', label: 'Gastos & Facturas', subtitle: 'Registro y control de gastos operativos' },
  gmail: { id: 'gmail', label: 'Correo & Avisos', subtitle: 'Comunicaciones y notificaciones del proyecto' },
  equipo: { id: 'equipo', label: 'Equipo de la empresa', subtitle: 'Miembros, invitaciones y permisos de acceso' },
};

export default function MainApp() {
  const {
    currentUser,
    status: authStatus,
    authError,
    isSigningOut,
    signOut,
    gmailAccess,
    authorizeGmail,
  } = useAuthSession();

  const {
    workspace,
    membership,
    availableWorkspaces,
    selectWorkspace,
    loading: workspaceLoading,
    error: workspaceError,
  } = useCompanyWorkspace(currentUser);

  const data = useProjectData({ companyId: workspace?.id, currentUserId: currentUser?.uid, role: membership?.role });

  const activeProjects = useMemo(
    () => data.projects.filter((project) => project.status !== 'Archivado'),
    [data.projects]
  );

  const permissions = useMemo(() => {
    const role = membership?.role || null;
    return {
      canManageProjects: ['owner', 'admin', 'project_manager'].includes(role ?? ''),
      canManageQuotes: ['owner', 'admin', 'project_manager', 'finance'].includes(role ?? ''),
      canManageBudget: ['owner', 'admin', 'project_manager', 'finance'].includes(role ?? ''),
      canManageMachinery: ['owner', 'admin', 'project_manager', 'field_worker'].includes(role ?? ''),
      canManageExpenses: ['owner', 'admin', 'finance'].includes(role ?? ''),
      canManageEmployees: ['owner', 'admin', 'finance'].includes(role ?? ''),
      canManageAttendance: ['owner', 'admin', 'project_manager', 'field_worker'].includes(role ?? ''),
      canViewPersonnel: ['owner', 'admin', 'project_manager', 'finance', 'field_worker', 'viewer'].includes(role ?? ''),
      canViewFullPersonnel: ['owner', 'admin', 'finance'].includes(role ?? ''),
      canManageCompany: ['owner', 'admin'].includes(role ?? ''),
    };
  }, [membership?.role]);

  const [company, setCompany] = useState<CompanySettings>(initialCompanySettings);
  const [exchangeRateInput, setExchangeRateInput] = useState('');
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pendingProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    startTransition(() => {});
  }, [activeTab]);

  const hasInviteLink =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('invite');
  const verifiedEmailHandled = useRef(false);

  useEffect(() => {
    const params =
      typeof window === 'undefined' ? null : new URLSearchParams(window.location.search);
    if (
      !params ||
      !currentUser ||
      !currentUser.emailVerified ||
      params.get('verified') !== 'true'
    ) {
      return;
    }
    if (verifiedEmailHandled.current) return;

    verifiedEmailHandled.current = true;
    params.delete('verified');
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
    toast.success(
      'Correo verificado correctamente. Ya puedes aceptar invitaciones y acceder a tu espacio.'
    );
  }, [currentUser]);

  useEffect(() => {
    if (data.company) {
      setCompany((prev) => ({ ...prev, ...data.company }));
    } else {
      setCompany(initialCompanySettings);
    }
  }, [data.company]);

  useEffect(() => {
    setExchangeRateInput(company.exchangeRate > 0 ? String(company.exchangeRate) : '');
  }, [company.exchangeRate]);

  useEffect(() => {
    if (activeProjects.length === 0) {
      if (activeProjectId) setActiveProjectId('');
      return;
    }

    const pendingProjectId = pendingProjectIdRef.current;
    if (pendingProjectId) {
      if (activeProjects.some((project) => project.id === pendingProjectId)) {
        pendingProjectIdRef.current = null;
        if (activeProjectId !== pendingProjectId) setActiveProjectId(pendingProjectId);
        return;
      }
      if (activeProjectId === pendingProjectId) return;
    }

    if (!activeProjects.some((project) => project.id === activeProjectId)) {
      setActiveProjectId(activeProjects[0].id);
    }
  }, [activeProjects, activeProjectId]);

  if (!currentUser) {
    return null;
  }

  const handleUpdateCompany = async (updates: Partial<CompanySettings>) => {
    if (!permissions.canManageCompany) {
      toast.error('Solo el propietario o un administrador puede cambiar la configuración de empresa.');
      return false;
    }
    if (!currentUser?.uid || !workspace?.id) {
      toast.error('Inicia sesión para guardar la configuración de empresa.');
      return false;
    }

    const nextSettings: CompanySettings = {
      ...company,
      ...updates,
      companyId: workspace.id,
      ownerId: workspace.id,
    };
    setCompany(nextSettings);
    try {
      const saved = await data.saveCompanySettings(nextSettings);
      if (!saved) {
        toast.error('No se pudo guardar la configuración de empresa.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('No se pudo guardar la configuración de marca en Firestore:', error);
      toast.error('No se pudo guardar la configuración de marca.');
      return false;
    }
  };

  const handleSaveExchangeRate = async () => {
    const exchangeRate = Number(exchangeRateInput);
    if (!exchangeRateInput.trim() || !Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      toast.error('Ingresa un tipo de cambio mayor a cero.');
      return;
    }

    if (await handleUpdateCompany({ exchangeRate })) {
      toast.success('Tipo de cambio guardado.');
    }
  };

  const handleSelectProject = (projectId: string) => {
    pendingProjectIdRef.current = null;
    setActiveProjectId(projectId);
  };

  const handleProjectCreated = (projectId: string) => {
    pendingProjectIdRef.current = projectId;
    setActiveProjectId(projectId);
  };

  const handleSelectWorkspace = async (companyId: string) => {
    const changed = await selectWorkspace(companyId);
    if (!changed) {
      toast.error('No se pudo cambiar de empresa. Revisa tu acceso e inténtalo de nuevo.');
      return;
    }
    pendingProjectIdRef.current = null;
    setActiveProjectId('');
    setActiveTab('dashboard');
    toast.success('Espacio de trabajo cambiado.');
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId as TabKey);
    if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
  };

  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="p-8 text-center text-red-400" onClick={reset}>
          Error en la aplicación: {error.message}. Haz clic para recargar.
        </div>
      )}
    >
      <div className="safe-area-bottom min-h-screen bg-slate-950 text-slate-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-amber-500 focus:px-4 focus:py-2 focus:text-slate-950"
        >
          Saltar al contenido principal
        </a>

        <MainAppHeader
          company={company}
          activeTab={activeTab}
          brandingOpen={brandingOpen}
          setBrandingOpen={setBrandingOpen}
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
          exchangeRateInput={exchangeRateInput}
          setExchangeRateInput={setExchangeRateInput}
          permissions={permissions}
          handleUpdateCompany={handleUpdateCompany}
          handleSaveExchangeRate={handleSaveExchangeRate}
        />

        <main
          id="main-content"
          aria-busy={authStatus === 'authenticated' && workspaceLoading}
          className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:ml-[280px] lg:mr-0 lg:max-w-[calc(100%-280px)] lg:px-8"
        >
          {authStatus === 'authenticated' && workspaceLoading && (
            <div
              role="status"
              className="mt-4 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100"
            >
              Preparando el espacio de trabajo y sincronizando los datos de la empresa...
            </div>
          )}
          {authStatus === 'authenticated' && !workspaceLoading && data.loading && (
            <div
              role="status"
              className="mt-4 rounded-xl border border-amber-400/30 bg-slate-900/80 px-4 py-3 text-sm text-amber-100 backdrop-blur-md"
            >
              Cargando proyectos, presupuestos y gastos…
            </div>
          )}
          {currentUser && isPrimaryAdministrator(currentUser.email) && !workspaceLoading && (
            <div
              role="status"
              aria-live="polite"
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                currentUser.emailVerified &&
                (membership?.role === 'owner' || membership?.role === 'admin')
                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                  : 'border-amber-400/30 bg-amber-500/10 text-amber-100'
              }`}
            >
              Correo de administración configurado: <strong>{currentUser.email}</strong>.{' '}
              {!currentUser.emailVerified
                ? 'El correo aún no está verificado.'
                : membership
                ? `Rol en ${workspace?.name ?? 'la empresa'}: ${membership.role}.`
                : 'No se encontró una membresía de empresa. Revisa la configuración del espacio de trabajo.'}
            </div>
          )}
          {(authStatus === 'unauthenticated' ||
            authStatus === 'error' ||
            Boolean(workspaceError)) && (
            <div
              role={authStatus === 'error' || workspaceError ? 'alert' : 'status'}
              className={`mt-4 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                authStatus === 'error' || workspaceError
                  ? 'border-red-400/30 bg-red-500/10'
                  : 'border-amber-400/30 bg-amber-500/10'
              }`}
            >
              <div>
                <p
                  className={`text-sm font-semibold ${authStatus === 'error' || workspaceError ? 'text-red-200' : 'text-amber-100'}`}
                >
                  {workspaceError
                    ? 'No se pudo cargar la empresa.'
                    : authStatus === 'error'
                    ? 'No se pudo comprobar tu sesión.'
                    : 'Sesión no iniciada'}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {workspaceError ??
                    (authStatus === 'error'
                      ? (authError ?? 'Revisa la configuración o intenta iniciar sesión de nuevo.')
                      : hasInviteLink
                      ? 'Inicia sesión o crea una cuenta con el correo invitado. Verifica esa dirección para aceptar el acceso compartido.'
                      : 'Inicia sesión con correo electrónico y contraseña para sincronizar y guardar tus datos.')}
                </p>
              </div>
            </div>
          )}

          {!workspaceLoading && (
            <MainAppContent
              activeTab={activeTab}
              activeProjectId={activeProjectId}
              activeProjects={activeProjects}
              company={company}
              data={data}
              permissions={permissions}
              onSelectProject={handleSelectProject}
              handleProjectCreated={handleProjectCreated}
              currentUser={currentUser ? { uid: currentUser.uid, email: currentUser.email ?? '' } : null}
              workspace={workspace}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
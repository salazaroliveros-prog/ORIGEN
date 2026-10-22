export function DashboardView({ projects, company }: { projects: any[]; company?: any }) {
  const logoUrl = company?.logoUrl || '/assets/branding/web-banner-logo.png';
  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
        <div className="flex-shrink-0">
          <img
            src={logoUrl}
            alt="Empresa"
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover shadow-lg"
          />
        </div>
        <div className="flex-1">
          <h1 className="responsive-text font-bold text-white tracking-tight">
            Tablero de Control
          </h1>
          <p className="mt-2 text-slate-300 text-sm md:text-base">
            {projects.length} proyectos activos bajo administración
          </p>
        </div>
      </div>
      <div className="mt-6 responsive-grid">
        <div className="glass-panel">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Proyectos Activos</h3>
          <p className="text-2xl font-bold text-white">{projects.length}</p>
        </div>
        <div className="glass-panel">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Estado del Sistema</h3>
          <p className="text-2xl font-bold text-emerald-400">Operativo</p>
        </div>
      </div>
    </div>
  );
}

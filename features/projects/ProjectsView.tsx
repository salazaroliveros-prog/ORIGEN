export function ProjectsView({ projects, company }: { projects: any[]; company?: any }) {
  const logoUrl = company?.logoUrl || '/assets/branding/web-banner-logo.png';
  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center mb-6">
        <div className="flex-shrink-0">
          <img
            src={logoUrl}
            alt="Empresa"
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover shadow-lg"
          />
        </div>
        <div className="flex-1">
          <h1 className="responsive-text font-bold text-white tracking-tight">
            Proyectos y Firmas Digitales
          </h1>
          <p className="mt-2 text-slate-300 text-sm md:text-base">
            Gestión de {projects.length} proyectos con trazabilidad completa
          </p>
        </div>
      </div>
      <div className="responsive-grid">
        <div className="glass-panel overflow-y-auto max-h-[60vh] lg:max-h-none">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Listado de Proyectos</h3>
          <ul className="space-y-2">
            {projects.map((p: any) => (
              <li key={p.id || p.code} className="glass-l1 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                <span className="text-sm text-slate-200 truncate">{p.code || 'PRO-001'} - {p.name || 'Proyecto'}</span>
                <span className="text-[10px] px-2 py-1 rounded bg-sky-500/20 text-sky-200">
                  {p.progressPercent ?? 0}%
                </span>
              </li>
            ))}
            {projects.length === 0 && (
              <li className="glass-l1 p-3 rounded-xl text-center text-slate-400 text-sm">
                No hay proyectos registrados
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

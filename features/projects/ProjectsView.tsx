import { PageHeader } from '@/components/PageHeader';

export function ProjectsView({ projects, company }: { projects: any[]; company?: any }) {
  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
      <PageHeader
        title="Proyectos y Firmas Digitales"
        subtitle="Gestión de proyectos con trazabilidad completa"
        logoUrl={company?.logoUrl}
        companyName={company?.companyName}
      />
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

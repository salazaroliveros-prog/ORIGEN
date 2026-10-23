import { PageHeader } from '@/components/PageHeader';

export function DashboardView({ projects, company }: { projects: any[]; company?: any }) {
  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
      <PageHeader
        title="Tablero de Control"
        subtitle={`${projects.length} proyectos activos bajo administración`}
        logoUrl={company?.logoUrl}
        companyName={company?.companyName}
      />
      <div className="responsive-grid">
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

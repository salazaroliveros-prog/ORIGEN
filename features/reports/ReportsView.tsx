export function ReportsView({ projects, expenses, company }: { projects: any[]; expenses: any[]; company?: any }) {
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
            Reportes Finales y Actas
          </h1>
          <p className="mt-2 text-slate-300 text-sm md:text-base">
            Generación de reportes ejecutivos y documentación de obra
          </p>
        </div>
      </div>
      <div className="responsive-grid">
        <div className="glass-panel">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Proyectos para Reporte</h3>
          <p className="text-2xl font-bold text-white">{projects.length}</p>
        </div>
        <div className="glass-panel">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Gastos Documentados</h3>
          <p className="text-2xl font-bold text-white">{expenses.length}</p>
        </div>
      </div>
      <div className="mt-6 glass-panel">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Acciones de Reporte</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button className="glass-l1 p-3 rounded-xl border border-white/10 text-left text-sm text-slate-200 hover:bg-white/5 transition">
            Exportar Resumen PDF
          </button>
          <button className="glass-l1 p-3 rounded-xl border border-white/10 text-left text-sm text-slate-200 hover:bg-white/5 transition">
            Generar Acta de Obra
          </button>
        </div>
      </div>
    </div>
  );
}

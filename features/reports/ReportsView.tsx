import { PageHeader } from '@/components/PageHeader';
import type { CompanySettings, ExpenseRecord, Project } from '@/lib/types';

export function ReportsView({ projects, expenses, company }: { projects: Project[]; expenses: ExpenseRecord[]; company?: CompanySettings }) {
  const letterheadLogo = '/assets/branding/report-letterhead-logo.png';
  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
      <PageHeader
        title="Reportes Finales y Actas"
        subtitle="Generación de reportes ejecutivos y documentación de obra"
        logoUrl={company?.logoUrl}
        companyName={company?.companyName}
      />
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
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Encabezado de Reporte (Letterhead)</h3>
        <div className="flex items-center justify-center p-4 bg-white/5 border border-white/10 rounded-xl">
          <img
            src={letterheadLogo}
            alt="Letterhead de empresa"
            className="max-w-full h-auto max-h-48 object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>
        <p className="mt-3 text-xs text-slate-400 text-center">
          El logo de carta membretada se utiliza en reportes PDF exportados y actas de obra.
        </p>
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

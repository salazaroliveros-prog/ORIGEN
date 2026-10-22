export function BudgetView({ projects, expenses, company }: { projects: any[]; expenses: any[]; company?: any }) {
  const logoUrl = company?.logoUrl || '/assets/branding/web-banner-logo.png';
  const totalBudget = projects.reduce((acc: number, p: any) => acc + (p.budgetTotal || 0), 0);
  const totalSpent = expenses.reduce((acc: number, e: any) => acc + (e.amount || 0), 0);
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
            Presupuestos APU y Gastos
          </h1>
          <p className="mt-2 text-slate-300 text-sm md:text-base">
            Control financiero con desglose por renglón y departamento
          </p>
        </div>
      </div>
      <div className="responsive-grid">
        <div className="glass-panel">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Presupuesto Total</h3>
          <p className="text-2xl font-bold text-white">Q{totalBudget.toLocaleString('es-GT')}</p>
        </div>
        <div className="glass-panel">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Gastos Ejecutados</h3>
          <p className="text-2xl font-bold text-amber-400">Q{totalSpent.toLocaleString('es-GT')}</p>
        </div>
        <div className="glass-panel">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Saldo Disponible</h3>
          <p className="text-2xl font-bold text-emerald-400">Q{(totalBudget - totalSpent).toLocaleString('es-GT')}</p>
        </div>
      </div>
    </div>
  );
}

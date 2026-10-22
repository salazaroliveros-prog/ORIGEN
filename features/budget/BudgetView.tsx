export function BudgetView({ projects, expenses }: { projects: any[]; expenses: any[] }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white">Presupuesto</h1>
      <p className="mt-3 text-slate-300">{projects.length} proyectos y {expenses.length} gastos registrados.</p>
    </div>
  );
}

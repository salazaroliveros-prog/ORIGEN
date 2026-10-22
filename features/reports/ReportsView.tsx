export function ReportsView({ projects, expenses }: { projects: any[]; expenses: any[] }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white">Reportes</h1>
      <p className="mt-3 text-slate-300">Reportes de {projects.length} proyectos y {expenses.length} gastos.</p>
    </div>
  );
}

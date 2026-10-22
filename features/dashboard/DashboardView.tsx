export function DashboardView({ projects }: { projects: any[] }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <p className="mt-3 text-slate-300">Total de proyectos: {projects.length}</p>
    </div>
  );
}

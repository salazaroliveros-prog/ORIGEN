export function StaffView({ attendance }: { attendance: any[] }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white">Personal</h1>
      <p className="mt-3 text-slate-300">{attendance.length} registros de asistencia.</p>
    </div>
  );
}

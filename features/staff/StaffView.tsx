export function StaffView({ attendance, company }: { attendance: any[]; company?: any }) {
  const logoUrl = company?.logoUrl || '/assets/branding/web-banner-logo.png';
  const present = attendance.filter((a: any) => a.status === 'Presente').length;
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
            Personal y Asistencia IGSS
          </h1>
          <p className="mt-2 text-slate-300 text-sm md:text-base">
            Control de cuadrillas, planillas y cumplimiento laboral guatemalteco
          </p>
        </div>
      </div>
      <div className="responsive-grid">
        <div className="glass-panel">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Registros Totales</h3>
          <p className="text-2xl font-bold text-white">{attendance.length}</p>
        </div>
        <div className="glass-panel">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Presentes Hoy</h3>
          <p className="text-2xl font-bold text-emerald-400">{present}</p>
        </div>
        <div className="glass-panel">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Ausencias</h3>
          <p className="text-2xl font-bold text-rose-400">{attendance.length - present}</p>
        </div>
      </div>
    </div>
  );
}

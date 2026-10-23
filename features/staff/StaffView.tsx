import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import type { AttendanceRecord, CompanySettings } from '@/lib/types';

export function StaffView({ attendance, company }: { attendance: AttendanceRecord[]; company?: CompanySettings }) {
  const present = attendance.filter((a) => a.status === 'Presente').length;

  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
      <PageHeader
        title="Personal y Asistencia IGSS"
        subtitle="Control de cuadrillas, planillas y cumplimiento laboral guatemalteco"
        logoUrl={company?.logoUrl}
        companyName={company?.companyName}
      />
      <div className="responsive-grid">
        <Card variant="elevated" padding="lg">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Registros Totales</h3>
          <p className="text-3xl font-bold text-white">{attendance.length}</p>
        </Card>
        <Card variant="elevated" padding="lg">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Presentes Hoy</h3>
          <p className="text-3xl font-bold text-emerald-400">{present}</p>
        </Card>
        <Card variant="elevated" padding="lg">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Ausencias</h3>
          <p className="text-3xl font-bold text-rose-400">{attendance.length - present}</p>
        </Card>
      </div>
    </div>
  );
}

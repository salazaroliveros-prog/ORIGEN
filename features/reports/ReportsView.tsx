import Image from 'next/image';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
        <Card variant="elevated" padding="lg">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Proyectos para Reporte</h3>
          <p className="text-3xl font-bold text-white">{projects.length}</p>
        </Card>
        <Card variant="elevated" padding="lg">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Gastos Documentados</h3>
          <p className="text-3xl font-bold text-white">{expenses.length}</p>
        </Card>
      </div>
      <div className="mt-6">
        <Card variant="elevated" padding="lg">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Encabezado de Reporte (Letterhead)</h3>
          <div className="flex items-center justify-center p-4 bg-white/5 border border-white/10 rounded-xl">
            <Image
              src={letterheadLogo}
              alt="Letterhead de empresa"
              width={800}
              height={200}
              unoptimized
              className="max-w-full h-auto max-h-48 object-contain"
            />
          </div>
          <p className="mt-3 text-xs text-slate-400 text-center">
            Este logotipo aparece en los encabezados de los reportes PDF exportados.
          </p>
        </Card>
      </div>
      <div className="mt-6">
        <Card variant="elevated" padding="lg">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Acciones de Reporte</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="primary" size="sm" className="w-full">
              Exportar Resumen PDF
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              Generar Acta de Obra
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

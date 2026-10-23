import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import type { CompanySettings, ExpenseRecord, Project } from '@/lib/types';

export function BudgetView({ projects, expenses, company }: { projects: Project[]; expenses: ExpenseRecord[]; company?: CompanySettings }) {
  const totalBudget = projects.reduce((acc: number, p: any) => acc + (p.budgetTotal || 0), 0);
  const totalSpent = expenses.reduce((acc: number, e: any) => acc + (e.amount || 0), 0);

  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
      <PageHeader
        title="Presupuestos APU y Gastos"
        subtitle="Control financiero con desglose por renglón y departamento"
        logoUrl={company?.logoUrl}
        companyName={company?.companyName}
      />
      <div className="responsive-grid">
        <Card variant="elevated" padding="lg">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Presupuesto Total</h3>
          <p className="text-3xl font-bold text-white">Q{totalBudget.toLocaleString('es-GT')}</p>
        </Card>
        <Card variant="elevated" padding="lg">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Gastos Ejecutados</h3>
          <p className="text-3xl font-bold text-amber-400">Q{totalSpent.toLocaleString('es-GT')}</p>
        </Card>
        <Card variant="elevated" padding="lg">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Saldo Disponible</h3>
          <p className="text-3xl font-bold text-emerald-400">Q{(totalBudget - totalSpent).toLocaleString('es-GT')}</p>
        </Card>
      </div>
    </div>
  );
}

import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { BudgetAndAPU } from '@/components/BudgetAndAPU';
import type { APUItem, CompanySettings, ExpenseRecord, Project, QuoteRecord } from '@/lib/types';

interface BudgetViewProps {
  projects: Project[];
  expenses: ExpenseRecord[];
  budgetItems: APUItem[];
  quotes: QuoteRecord[];
  activeProjectId: string;
  canWrite: boolean;
  company: CompanySettings;
  onSaveItems: (items: APUItem[], projectId: string) => Promise<boolean>;
  onDeleteItem: (itemId: string) => Promise<boolean>;
}

export function BudgetView({
  projects,
  expenses,
  budgetItems,
  quotes,
  activeProjectId,
  canWrite,
  company,
  onSaveItems,
  onDeleteItem,
}: BudgetViewProps) {
  const totalBudget = projects.reduce((total, project) => total + project.budgetTotal, 0);
  const totalAPU = budgetItems.reduce((total, item) => total + item.totalPriceGTQ, 0);
  const totalSpent = expenses.reduce((total, expense) => total + expense.amount, 0);
  const project = projects.find((item) => item.id === activeProjectId) ?? projects[0];
  const projectItems = budgetItems.filter((item) => item.projectId === project?.id);

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
          <h3 className="text-sm font-semibold text-slate-300 mb-2">APU estimado registrado</h3>
          <p className="text-3xl font-bold text-sky-400">Q{totalAPU.toLocaleString('es-GT')}</p>
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
      {project ? (
        <BudgetAndAPU
          budgetItems={projectItems}
          activeProjectId={project.id}
          projects={projects}
          canWrite={canWrite}
          onAddBudgetItem={(item) => onSaveItems([...projectItems, item], project.id)}
          onUpdateBudgetItems={(items) => onSaveItems(items, project.id)}
          onDeleteBudgetItem={onDeleteItem}
          currency="GTQ"
          company={company}
          expenses={expenses}
          quotes={quotes}
          tasks={project.scheduleTasks ?? []}
        />
      ) : (
        <Card variant="elevated" padding="lg">
          <p className="font-semibold text-white">Aún no hay proyectos para presupuestar.</p>
          <p className="mt-1 text-sm text-slate-300">Crea un proyecto y vuelve aquí para registrar sus partidas APU.</p>
        </Card>
      )}
    </div>
  );
}

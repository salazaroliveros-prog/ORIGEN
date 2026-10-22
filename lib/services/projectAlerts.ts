import type { Project } from '@/lib/types';

export type ProjectAlert = {
  projectId: string;
  title: string;
  message: string;
  severity: 'warning' | 'critical';
};

export function buildProjectAlerts(projects: Project[]): ProjectAlert[] {
  return projects
    .map((project) => {
      const budgetTotal = project.budgetTotal || 0;
      const spentTotal = project.spentTotal || 0;
      const expectedMarginPercent = project.expectedProfitMarginPercent ?? 15;
      const budgetUsagePercent = budgetTotal > 0 ? (spentTotal / budgetTotal) * 100 : 0;
      const projectMarginPercent = budgetTotal > 0 ? ((budgetTotal - spentTotal) / budgetTotal) * 100 : 100;
      const marginThreshold = 100 - expectedMarginPercent;
      const isCritical = budgetUsagePercent >= 80 || spentTotal >= (budgetTotal * marginThreshold) / 100;

      if (!isCritical && budgetUsagePercent < 60) {
        return null;
      }

      const title = isCritical ? 'Alerta crítica de presupuesto' : 'Presupuesto cerca del límite';
      const message = isCritical
        ? `El proyecto "${project.name}" ha superado el umbral crítico de gasto: ${budgetUsagePercent.toFixed(1)}% del presupuesto y margen restante ${projectMarginPercent.toFixed(1)}%.`
        : `El proyecto "${project.name}" está en nivel de advertencia: ${budgetUsagePercent.toFixed(1)}% del presupuesto ejecutado.`;

      return {
        projectId: project.id,
        title,
        message,
        severity: isCritical ? 'critical' : 'warning',
      };
    })
    .filter((item): item is ProjectAlert => Boolean(item));
}

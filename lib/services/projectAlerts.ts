import type { Project } from '@/lib/types';
import { summarizeProjectFinance } from '@/lib/domain/projectFinance';

export type ProjectAlert = {
  projectId: string;
  title: string;
  message: string;
  severity: 'warning' | 'critical';
};

export function buildProjectAlerts(projects: Project[]): ProjectAlert[] {
  return projects
    .map((project) => {
      const summary = summarizeProjectFinance(project);
      if (!summary.isCritical && !summary.isWarning) {
        return null;
      }

      const title = summary.isCritical
        ? 'Alerta crítica de presupuesto'
        : 'Presupuesto cerca del límite';
      const message = summary.isCritical
        ? `El proyecto "${project.name}" ha superado el umbral crítico de gasto: ${summary.budgetUsagePercent.toFixed(1)}% del presupuesto y margen restante ${summary.projectMarginPercent.toFixed(1)}%.`
        : `El proyecto "${project.name}" está en nivel de advertencia: ${summary.budgetUsagePercent.toFixed(1)}% del presupuesto ejecutado.`;

      return {
        projectId: project.id,
        title,
        message,
        severity: summary.isCritical ? 'critical' : 'warning',
      };
    })
    .filter((item): item is ProjectAlert => Boolean(item));
}

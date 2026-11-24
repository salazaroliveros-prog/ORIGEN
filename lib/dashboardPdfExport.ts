import { Project, ExpenseRecord, CompanySettings } from './types';
import { formatGTQ, formatUSD } from './data';
import { buildPortfolioAuditMetrics } from './domain/auditMetrics';

export interface DashboardPdfOptions {
  projects: Project[];
  expenses: ExpenseRecord[];
  company: CompanySettings;
  visibleWidgets: Record<string, boolean>;
  currency: 'GTQ' | 'USD';
}

export async function exportDashboardPerformancePdf(options: DashboardPdfOptions): Promise<void> {
  const { projects, expenses, company, visibleWidgets, currency } = options;

  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;
  let y = margin;

  const formatMoney = (val: number) => {
    return currency === 'GTQ' ? formatGTQ(val) : formatUSD(val, company.exchangeRate);
  };

  // Aggregated totals
  // El informe separa ejecución aprobada de solicitudes pendientes y presupuesto comprometido.
  const auditMetrics = buildPortfolioAuditMetrics({ projects, expenses });
  const {
    totalBudget,
    totalSpent,
    totalPending,
    totalCommitted,
    remainingBudget,
    spentPercent,
    commitmentPercent,
    overbudgetCount,
  } = auditMetrics;

  // Header Banner Background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Accent Line
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 32, pageWidth, 2, 'F');

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(company.commercialName || 'ConstructERP Guatemala', margin, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('INFORME EJECUTIVO DE DESEMPEÑO Y TABLERO DE CONTROL', margin, 21);

  doc.setFontSize(8);
  doc.text(
    `Fecha de Emisión: ${new Date().toLocaleDateString('es-GT')} | Moneda: ${currency}`,
    margin,
    27
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(252, 211, 77); // amber-300
  doc.text('REPORTE OFICIAL PDF', pageWidth - margin - 35, 14);

  y = 42;

  // SECTION 1: RESUMEN DE INDICADORES CLAVE (KPIs)
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. Indicadores Clave de Desempeño Financiero (KPIs)', margin, y);
  y += 6;

  // KPI Grid Cards (2 columns, 3 rows)
  const cardW = (usableWidth - 6) / 2;
  const cardH = 16;

  const kpis = [
    { label: 'Proyectos Activos Registrados:', val: `${projects.length} Obras` },
    { label: 'Presupuesto Total Proyectado:', val: formatMoney(totalBudget) },
    { label: 'Gasto Real Aprobado:', val: formatMoney(totalSpent) },
    { label: 'Solicitudes Pendientes:', val: formatMoney(totalPending) },
    { label: 'Saldo tras Compromisos:', val: formatMoney(remainingBudget) },
    { label: 'Alertas por Sobrecompromiso:', val: `${overbudgetCount} Obras en Alerta` },
  ];

  kpis.forEach((kpi, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const cx = margin + col * (cardW + 6);
    const cy = y + row * (cardH + 4);

    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(kpi.label, cx + 4, cy + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, cx + 4, cy + 12);
  });

  y += 3 * (cardH + 4) + 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Ejecución aprobada: ${spentPercent}%  |  Presupuesto comprometido: ${commitmentPercent}% (${formatMoney(totalCommitted)})`,
    margin,
    y
  );
  y += 5;
  if (totalPending > 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(146, 64, 14);
    doc.text(
      `Las solicitudes pendientes por ${formatMoney(totalPending)} no se incluyen en el gasto real aprobado, pero sí reducen el saldo disponible.`,
      margin,
      y
    );
    y += 5;
  }

  if (auditMetrics.rejectedCount > 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Nota: ${auditMetrics.rejectedCount} gasto(s) rechazado(s) por ${formatMoney(
        auditMetrics.rejectedAmount
      )} no se incluyen en el gasto real aprobado.`,
      margin,
      y
    );
    y += 5;
  }

  // SECTION 2: CONFIGURACIÓN DE WIDGETS ACTIVOS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Módulos & Widgets de Rendimiento Configurados', margin, y);
  y += 6;

  const widgetLabels: Record<string, string> = {
    cashFlow: 'Proyección de Flujo de Caja Semestral',
    laborCosts: 'Costos de Mano de Obra Activa & Productividad',
    progressComparison: 'Avance Físico vs. Presupuesto Comprometido (%) [Líneas Recharts]',
    stackedBudget: 'Presupuesto Asignado vs. Compromisos Registrados (Apilados)',
    expensesHistogram: 'Histórico de Gastos Registrados (Aprobados + Pendientes)',
    budgetUtilization: 'Utilización de Presupuesto APU (D3)',
    projectBreakdown: 'Tarjetas Resumen por Proyecto',
  };

  const activeWidgets = Object.entries(visibleWidgets)
    .filter(([_, active]) => active)
    .map(([key]) => widgetLabels[key] || key);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Se visualizan ${activeWidgets.length} de ${Object.keys(widgetLabels).length} widgets activos en la sesión actual:`,
    margin,
    y
  );
  y += 5;

  activeWidgets.forEach((wName) => {
    doc.setFillColor(224, 231, 255); // indigo-100
    doc.roundedRect(margin, y, usableWidth, 6, 1, 1, 'F');
    doc.setTextColor(30, 58, 138);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`• ${wName} - [Activo y Verificado]`, margin + 3, y + 4.2);
    y += 7.5;
  });

  y += 4;

  // SECTION 3: TABLA DE MATRIZ DE RENDIMIENTO POR PROYECTO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Matriz Analítica de Obras en Ejecución', margin, y);
  y += 6;

  // Table Header
  const colWidths = [20, 50, 30, 30, 25, 27];
  const tableHeaders = [
    'Código',
    'Proyecto',
    'Presupuesto',
    'Comprometido',
    '% Comprometido',
    'Estado',
  ];

  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, y, usableWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  let currentX = margin;
  tableHeaders.forEach((h, i) => {
    doc.text(h, currentX + 2, y + 5);
    currentX += colWidths[i];
  });

  y += 7;

  // Table Rows
  auditMetrics.projects.forEach((item, idx) => {
    const p = item.project;
    if (y > pageHeight - 35) {
      doc.addPage();
      y = margin;
    }

    const spent = item.committed;
    const budget = item.budgetTotal;
    const isOver = item.isOverBudget;
    const pct = item.budgetUsagePercent;

    doc.setFillColor(
      idx % 2 === 0 ? 248 : 255,
      idx % 2 === 0 ? 250 : 255,
      idx % 2 === 0 ? 252 : 255
    );
    doc.rect(margin, y, usableWidth, 7, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    let xPos = margin;
    doc.text(p.code || p.id, xPos + 2, y + 5);
    xPos += colWidths[0];

    doc.text(p.name.substring(0, 26), xPos + 2, y + 5);
    xPos += colWidths[1];

    doc.text(formatMoney(budget), xPos + 2, y + 5);
    xPos += colWidths[2];

    doc.setFont('helvetica', isOver ? 'bold' : 'normal');
    if (isOver) doc.setTextColor(225, 29, 72); // rose-600
    doc.text(formatMoney(spent), xPos + 2, y + 5);
    xPos += colWidths[3];

    doc.setTextColor(15, 23, 42);
    doc.text(`${pct}%`, xPos + 2, y + 5);
    xPos += colWidths[4];

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isOver ? 225 : 16, isOver ? 29 : 185, isOver ? 72 : 129);
    doc.text(isOver ? 'SOBRECOMPROMISO' : 'EN RANGO', xPos + 2, y + 5);

    y += 7;
  });

  // Footer Signature & AGIES Seal
  y += 12;
  if (y > pageHeight - 35) {
    doc.addPage();
    y = margin + 10;
  }

  doc.setLineWidth(0.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + 60, y);
  doc.line(pageWidth - margin - 60, y, pageWidth - margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const architectName = company?.architectName?.trim();
  doc.setFont('helvetica', architectName ? 'bold' : 'italic');
  doc.text(architectName || 'Nombre y firma', margin, y + 4);
  doc.setFont('helvetica', 'italic');
  doc.text('Nombre y firma', pageWidth - margin - 60, y + 4);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Documento generado automáticamente por ConstructERP Guatemala a partir de los registros capturados en la plataforma.',
    margin,
    pageHeight - 8
  );

  // Save PDF
  doc.save(`Informe_Ejecutivo_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`);
}

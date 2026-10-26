import { Project, ExpenseRecord, CompanySettings } from './types';
import { formatGTQ, formatUSD } from './data';
import { loadReportLetterheadLogo } from './pdfBranding';

export interface MonthlyHistogramItem {
  mes: string;
  mesCompleto: string;
  gastos: number;
}

export interface ExportPdfOptions {
  projects: Project[];
  selectedProject: Project | null;
  expenses: ExpenseRecord[];
  monthlyData: MonthlyHistogramItem[];
  company: CompanySettings;
  currency: 'GTQ' | 'USD';
}

export async function exportExpensesBudgetPdf(options: ExportPdfOptions): Promise<void> {
  const {
    projects,
    selectedProject,
    expenses,
    monthlyData,
    company,
    currency,
  } = options;

  const { jsPDF } = await import('jspdf');
  const reportLogo = await loadReportLetterheadLogo();

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

  // Compute key totals
  const targetProjects = selectedProject ? [selectedProject] : projects;
  const totalBudget = targetProjects.reduce((acc, p) => acc + p.budgetTotal, 0);
  const totalSpent = targetProjects.reduce((acc, p) => acc + p.spentTotal, 0);
  const balance = totalBudget - totalSpent;
  const progressPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Filter expenses for target projects
  const relevantExpenses = selectedProject
    ? expenses.filter((e) => e.projectId === selectedProject.id)
    : expenses;

  // Header helper
  const drawHeader = (isFirstPage = true) => {
    // Dark top container bar (Slate-900)
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, usableWidth, 24, 'F');

    doc.addImage(reportLogo, 'PNG', margin + 2, y + 3, 18, 18);

    // Amber-500 accent stripe
    doc.setFillColor(245, 158, 11);
    doc.rect(margin, y + 23, usableWidth, 1.2, 'F');

    // Left title & metadata
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text((company.legalName || 'CONSTRUCTERP GUATEMALA').toUpperCase(), margin + 22, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(
      `NIT: ${company.nit}  •  ${company.address}  •  Tel: ${company.phone}`,
      margin + 22,
      y + 13
    );
    doc.text(
      `Arq. Responsable: ${company.architectName} (${company.architectColNumber})  •  Moneda: ${currency}`,
      margin + 22,
      y + 19
    );

    // Right side: date & doc ID
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(251, 191, 36); // amber-400
    const now = new Date();
    const dateStr = `Emisión: ${now.toLocaleDateString('es-GT')} ${now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}`;
    doc.text(dateStr, pageWidth - margin - 4, y + 7, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    const docRef = `REF: CERP-EXP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    doc.text(docRef, pageWidth - margin - 4, y + 13, { align: 'right' });

    y += 29;

    if (isFirstPage) {
      // Document Title Box
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin, y, usableWidth, 14, 'F');
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.rect(margin, y, usableWidth, 14, 'S');

      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const titleText = selectedProject
        ? `ESTADO FINANCIERO & HISTOGRAMA DE GASTOS: ${selectedProject.name.toUpperCase()}`
        : 'ESTADO FINANCIERO & HISTOGRAMA CONSOLIDADO DE OBRAS';
      doc.text(titleText, margin + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105); // slate-600
      const subTitle = selectedProject
        ? `Código: ${selectedProject.code} • Cliente: ${selectedProject.client} • Ubicación: ${selectedProject.location}`
        : `Consolidado de ${projects.length} proyectos activos con balance mensual vs proyección presupuestaria`;
      doc.text(subTitle, margin + 4, y + 11);

      y += 18;
    }
  };

  // Footer helper
  const drawFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - margin + 4;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(
      'ConstructERP Guatemala • Control Presupuestario, APU & Liquidación de Obra • Verificación Electrónica SAT/FEL',
      margin,
      footerY
    );
    doc.text(
      `Página ${pageNum} de ${totalPages}`,
      pageWidth - margin,
      footerY,
      { align: 'right' }
    );
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 15) {
      doc.addPage();
      y = margin;
      drawHeader(false);
    }
  };

  // Draw Page 1
  drawHeader(true);

  // 1. KPI Cards (4 summary boxes)
  const cardWidth = (usableWidth - 3 * 3) / 4;
  const cardHeight = 16;

  const kpis = [
    {
      label: 'PRESUPUESTO TOTAL',
      val: formatMoney(totalBudget),
      color: [30, 58, 138], // blue-900
      bg: [239, 246, 255], // blue-50
      border: [191, 219, 254], // blue-200
    },
    {
      label: 'GASTOS REALES',
      val: formatMoney(totalSpent),
      color: [180, 83, 9], // amber-700
      bg: [254, 243, 199], // amber-50
      border: [253, 230, 138], // amber-200
    },
    {
      label: 'SALDO DISPONIBLE',
      val: formatMoney(balance),
      color: balance >= 0 ? [5, 150, 105] : [225, 29, 72], // emerald / rose
      bg: balance >= 0 ? [236, 253, 245] : [255, 241, 242],
      border: balance >= 0 ? [167, 243, 208] : [254, 205, 211],
    },
    {
      label: 'EJECUCIÓN FINANCIERA',
      val: `${progressPercent.toFixed(1)}%`,
      color: [15, 23, 42],
      bg: [248, 250, 252],
      border: [226, 232, 240],
    },
  ];

  kpis.forEach((card, idx) => {
    const cx = margin + idx * (cardWidth + 3);
    doc.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
    doc.rect(cx, y, cardWidth, cardHeight, 'F');
    doc.setDrawColor(card.border[0], card.border[1], card.border[2]);
    doc.rect(cx, y, cardWidth, cardHeight, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, cx + 3, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.val, cx + 3, y + 12);
  });

  y += cardHeight + 6;

  // 2. Section: Proyectos Desglose
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. RESUMEN DE PROYECTOS Y BALANCE PRESUPUESTARIO', margin, y);
  y += 4;

  // Project Table Header
  const projColWidths = [24, 48, 30, 28, 28, 24];
  const projHeaders = ['Código', 'Proyecto', 'Presupuesto', 'Gastos Reales', 'Saldo', 'Avance'];

  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, y, usableWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  let curX = margin;
  projHeaders.forEach((h, i) => {
    const align = i >= 2 ? 'right' : 'left';
    const textX = align === 'right' ? curX + projColWidths[i] - 2 : curX + 2;
    doc.text(h, textX, y + 4.2, { align });
    curX += projColWidths[i];
  });
  y += 6;

  // Project Table Rows
  targetProjects.forEach((proj, idx) => {
    checkPageBreak(7);
    const rowBg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(margin, y, usableWidth, 6, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6, margin + usableWidth, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    let rx = margin;
    // Código
    doc.text(proj.code, rx + 2, y + 4.2);
    rx += projColWidths[0];
    // Nombre
    const truncatedName = proj.name.length > 32 ? proj.name.substring(0, 30) + '...' : proj.name;
    doc.text(truncatedName, rx + 2, y + 4.2);
    rx += projColWidths[1];
    // Presupuesto
    doc.text(formatMoney(proj.budgetTotal), rx + projColWidths[2] - 2, y + 4.2, { align: 'right' });
    rx += projColWidths[2];
    // Gastos Reales
    doc.text(formatMoney(proj.spentTotal), rx + projColWidths[3] - 2, y + 4.2, { align: 'right' });
    rx += projColWidths[3];
    // Saldo
    const pBalance = proj.budgetTotal - proj.spentTotal;
    if (pBalance < 0) {
      doc.setTextColor(225, 29, 72); // rose
    } else {
      doc.setTextColor(5, 150, 105); // emerald
    }
    doc.text(formatMoney(pBalance), rx + projColWidths[4] - 2, y + 4.2, { align: 'right' });
    rx += projColWidths[4];
    // Avance
    doc.setTextColor(15, 23, 42);
    doc.text(`${proj.progressPercent}%`, rx + projColWidths[5] - 2, y + 4.2, { align: 'right' });

    y += 6;
  });

  y += 5;

  // 3. Section: Monthly expenses from recorded invoices
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. GASTOS REGISTRADOS POR MES', margin, y);
  y += 4;

  const histColWidths = [110, 72];
  const histHeaders = ['Mes / Periodo', 'Gastos registrados'];

  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, y, usableWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  let hx = margin;
  histHeaders.forEach((h, i) => {
    const align = i === 1 ? 'right' : 'left';
    const textX = align === 'right' ? hx + histColWidths[i] - 2 : hx + 2;
    doc.text(h, textX, y + 4.2, { align });
    hx += histColWidths[i];
  });
  y += 6;

  monthlyData.forEach((item, idx) => {
    checkPageBreak(6.5);
    const rowBg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(margin, y, usableWidth, 6, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6, margin + usableWidth, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    let cx = margin;
    // Mes
    doc.text(item.mesCompleto || item.mes, cx + 2, y + 4.2);
    cx += histColWidths[0];
    doc.text(formatMoney(item.gastos), cx + histColWidths[1] - 2, y + 4.2, { align: 'right' });

    y += 6;
  });

  y += 5;

  // 4. Section: Distribución por Categoría de Gasto
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. DESGLOSE DE GASTOS EJECUTADOS POR CATEGORÍA', margin, y);
  y += 4;

  const categories = [
    'Materiales (Cementos, Hierro)',
    'Mano de Obra',
    'Maquinaria y Combustible',
    'Permisos & Licencias',
    'Imprevistos',
  ] as const;

  const catTotals = categories.map((cat) => {
    const total = relevantExpenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
    return { category: cat, total };
  });

  const sumAllCats = catTotals.reduce((a, b) => a + b.total, 0) || 1;

  const catColWidths = [80, 52, 50];
  const catHeaders = ['Categoría APU', 'Monto Ejecutado', '% de Distribución'];

  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, usableWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  let catX = margin;
  catHeaders.forEach((h, i) => {
    const align = i >= 1 ? 'right' : 'left';
    const textX = align === 'right' ? catX + catColWidths[i] - 2 : catX + 2;
    doc.text(h, textX, y + 4.2, { align });
    catX += catColWidths[i];
  });
  y += 6;

  catTotals.forEach((catItem, idx) => {
    checkPageBreak(6.5);
    const rowBg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(margin, y, usableWidth, 6, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6, margin + usableWidth, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    let cx = margin;
    doc.text(catItem.category, cx + 2, y + 4.2);
    cx += catColWidths[0];
    doc.text(formatMoney(catItem.total), cx + catColWidths[1] - 2, y + 4.2, { align: 'right' });
    cx += catColWidths[1];
    const pct = ((catItem.total / sumAllCats) * 100).toFixed(1);
    doc.text(`${pct}%`, cx + catColWidths[2] - 2, y + 4.2, { align: 'right' });

    y += 6;
  });

  y += 5;

  // 5. Section: Facturas y Comprobantes Recientes (Audit FEL)
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. MUESTRA DE FACTURAS Y COMPROBANTES DE GASTO EN CAMPO (FEL)', margin, y);
  y += 4;

  const expColWidths = [22, 26, 52, 44, 38];
  const expHeaders = ['Fecha', 'Factura FEL', 'Proveedor / Contratista', 'Categoría', 'Monto Total'];

  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, usableWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  let exX = margin;
  expHeaders.forEach((h, i) => {
    const align = i === 4 ? 'right' : 'left';
    const textX = align === 'right' ? exX + expColWidths[i] - 2 : exX + 2;
    doc.text(h, textX, y + 4.2, { align });
    exX += expColWidths[i];
  });
  y += 6;

  const displayExpenses = relevantExpenses.slice(0, 8);
  if (displayExpenses.length === 0) {
    checkPageBreak(6.5);
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, usableWidth, 6, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('No hay comprobantes de gasto registrados para este criterio.', margin + 2, y + 4.2);
    y += 6;
  } else {
    displayExpenses.forEach((exp, idx) => {
      checkPageBreak(6.5);
      const rowBg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(rowBg, rowBg, rowBg);
      doc.rect(margin, y, usableWidth, 6, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6, margin + usableWidth, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);

      let cx = margin;
      doc.text(exp.date, cx + 2, y + 4.2);
      cx += expColWidths[0];
      doc.text(exp.facturaNumber || 'S/N', cx + 2, y + 4.2);
      cx += expColWidths[1];
      const truncSup = exp.supplier.length > 28 ? exp.supplier.substring(0, 26) + '...' : exp.supplier;
      doc.text(truncSup, cx + 2, y + 4.2);
      cx += expColWidths[2];
      const truncCat = exp.category.length > 24 ? exp.category.substring(0, 22) + '...' : exp.category;
      doc.text(truncCat, cx + 2, y + 4.2);
      cx += expColWidths[3];
      doc.text(formatMoney(exp.amount), cx + expColWidths[4] - 2, y + 4.2, { align: 'right' });

      y += 6;
    });
  }

  y += 8;

  // 6. Section: Formal Signatures Block
  checkPageBreak(38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('VALIDACIÓN TÉCNICA, FINANCIERA Y CONFORMIDAD DE OBRA', margin, y);
  y += 4;

  const sigBoxWidth = (usableWidth - 2 * 6) / 3;
  const sigBoxHeight = 26;

  const signatures = [
    {
      title: 'ARQUITECTO / ING. RESIDENTE',
      name: company.architectName || 'Arq. Alejandro Morales',
      detail: `Colegiado No. ${company.architectColNumber || 'CIG-12940'}`,
    },
    {
      title: 'CAPATAZ GENERAL DE CAMPO',
      name: 'Rigoberto Chivalán',
      detail: 'DPI: 2109 55432 0108 • Conformidad Obra',
    },
    {
      title: 'AUDITORÍA & GERENCIA GENERAL',
      name: 'Licda. Sofia Arévalo',
      detail: 'Revisión y Aprobación Financiera',
    },
  ];

  signatures.forEach((sig, idx) => {
    const sx = margin + idx * (sigBoxWidth + 6);
    doc.setFillColor(248, 250, 252);
    doc.rect(sx, y, sigBoxWidth, sigBoxHeight, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(sx, y, sigBoxWidth, sigBoxHeight, 'S');

    // Signature line
    doc.setDrawColor(148, 163, 184);
    doc.line(sx + 5, y + 15, sx + sigBoxWidth - 5, y + 15);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(sig.title, sx + sigBoxWidth / 2, y + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(sig.name, sx + sigBoxWidth / 2, y + 19, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(sig.detail, sx + sigBoxWidth / 2, y + 23, { align: 'center' });
  });

  y += sigBoxHeight + 6;

  // Render footers on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  // Generate filename and trigger download
  const now = new Date();
  const safeProjectName = selectedProject
    ? selectedProject.code.replace(/[^a-zA-Z0-9_-]/g, '_')
    : 'Consolidado_Todas_Las_Obras';
  const fileName = `Resumen_Gastos_Presupuesto_${safeProjectName}_${now.toISOString().split('T')[0]}.pdf`;

  doc.save(fileName);
}

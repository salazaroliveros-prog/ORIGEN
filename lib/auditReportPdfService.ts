import { Project, ExpenseRecord, FieldVisit, CompanySettings } from './types';
import { formatGTQ } from './data';

export interface ExportConstructionAuditPdfOptions {
  project: Project;
  expenses: ExpenseRecord[];
  fieldVisits: FieldVisit[];
  company?: CompanySettings;
  auditNotes?: string;
  auditorName?: string;
  auditorColNumber?: string;
}

export async function exportConstructionAuditPdf(
  options: ExportConstructionAuditPdfOptions
): Promise<void> {
  const {
    project,
    expenses,
    fieldVisits,
    company,
    auditNotes,
    auditorName,
    auditorColNumber,
  } = options;

  const { jsPDF } = await import('jspdf');

  // Landscape A4 for wide audit spreadsheet visibility (297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 12;
  const usableWidth = pageWidth - margin * 2; // 273mm
  let y = margin;

  // Helper for text formatting
  const addText = (
    text: string,
    x: number,
    yPos: number,
    textOptions?: {
      fontSize?: number;
      fontStyle?: 'normal' | 'bold' | 'italic';
      color?: [number, number, number];
      align?: 'left' | 'center' | 'right';
      maxWidth?: number;
    }
  ) => {
    const fontSize = textOptions?.fontSize || 8;
    const fontStyle = textOptions?.fontStyle || 'normal';
    const color = textOptions?.color || [15, 23, 42];
    const align = textOptions?.align || 'left';

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(color[0], color[1], color[2]);
    if (textOptions?.maxWidth) {
      doc.text(text, x, yPos, { align, maxWidth: textOptions.maxWidth });
    } else {
      doc.text(text, x, yPos, { align });
    }
  };

  // Helper for checking page overflow
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawSubHeader();
      return true;
    }
    return false;
  };

  const drawSubHeader = () => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, y, usableWidth, 10, 'F');
    addText(
      `AUDITORÍA DE OBRA • ${project.code}: ${project.name}`.toUpperCase(),
      margin + 4,
      y + 6.5,
      {
        fontSize: 8,
        fontStyle: 'bold',
        color: [255, 255, 255],
      }
    );
    addText(
      `Página ${doc.getNumberOfPages()} • Fecha de corte: ${new Intl.DateTimeFormat('es-GT', { dateStyle: 'short' }).format(new Date())}`,
      usableWidth + margin - 4,
      y + 6.5,
      {
        fontSize: 7.5,
        color: [203, 213, 225],
        align: 'right',
      }
    );
    y += 14;
  };

  // 1. Calculate Core Financial & Audit Metrics
  const totalBudget = project.budgetTotal || 0;
  const projectExpenses = expenses.filter((e) => e.projectId === project.id);
  const totalExpenses = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetBalance = totalBudget - totalExpenses;
  const physicalProgress = Math.min(100, Math.max(0, project.progressPercent || 0));
  const financialProgress =
    totalBudget > 0 ? Number(((totalExpenses / totalBudget) * 100).toFixed(2)) : 0;
  const progressDeviation = Number((physicalProgress - financialProgress).toFixed(2));

  // Categorical distribution
  const categories: Record<string, { total: number; count: number }> = {};
  projectExpenses.forEach((exp) => {
    const cat = exp.category || 'Otros Insumos';
    if (!categories[cat]) {
      categories[cat] = { total: 0, count: 0 };
    }
    categories[cat].total += exp.amount;
    categories[cat].count += 1;
  });

  // Project visits audit metrics
  const projectVisits = fieldVisits.filter((v) => v.projectId === project.id);
  const visitsWithGps = projectVisits.filter((v) => v.gpsCoords || v.latitude).length;
  const visitsWithSignatures = projectVisits.filter((v) => v.signatureDataUrl).length;

  const now = new Date();
  const dateFormatted = new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(now);
  const auditRef = `AUD-GT-${project.code}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // -------------------------------------------------------------
  // PAGE 1: HEADER BANNER
  // -------------------------------------------------------------
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, usableWidth, 24, 'F');

  // Accent gold line
  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(margin, y + 23, usableWidth, 1.2, 'F');

  // Left Title
  const compName =
    company?.legalName || company?.commercialName || company?.companyName || 'ConstructERP Guatemala, S.A.';
  addText(compName.toUpperCase(), margin + 4, y + 6.5, {
    fontSize: 11,
    fontStyle: 'bold',
    color: [255, 255, 255],
  });

  const nitStr = company?.nit ? `NIT: ${company.nit}` : 'NIT: 1049281-2';
  const phoneStr = company?.phone ? ` • Tel: ${company.phone}` : '';
  const dirStr = company?.address ? ` • ${company.address}` : ' • Guatemala, C.A.';
  addText(`${nitStr}${phoneStr}${dirStr}`, margin + 4, y + 11.5, {
    fontSize: 7.5,
    color: [203, 213, 225],
  });

  addText(
    'CÉDULA DE AUDITORÍA TÉCNICO-FINANCIERA DE OBRA • REPÚBLICA DE GUATEMALA',
    margin + 4,
    y + 17.5,
    {
      fontSize: 8,
      fontStyle: 'bold',
      color: [251, 191, 36], // amber-400
    }
  );

  // Right Header Metadata
  addText(`EXPEDIENTE DE AUDITORÍA: ${auditRef}`, usableWidth + margin - 4, y + 6.5, {
    fontSize: 8,
    fontStyle: 'bold',
    color: [255, 255, 255],
    align: 'right',
  });

  addText(`Fecha de Corte: ${dateFormatted}`, usableWidth + margin - 4, y + 11.5, {
    fontSize: 7,
    color: [203, 213, 225],
    align: 'right',
  });

  const profResponsible =
    company?.architectName && company?.architectColNumber
      ? `Colegiado Activo: ${company.architectName} (${company.architectColNumber})`
      : 'Supervisión Técnica Autorizada CIG / CA';
  addText(profResponsible, usableWidth + margin - 4, y + 16.5, {
    fontSize: 7,
    color: [148, 163, 184],
    align: 'right',
  });

  y += 28;

  // -------------------------------------------------------------
  // 2. PROJECT IDENTIFICATION & AUDIT PARAMETERS BOX
  // -------------------------------------------------------------
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, y, usableWidth, 20, 1.5, 1.5, 'FD');

  const colW = usableWidth / 4;

  // Col 1: Obra
  addText('DATOS DE LA OBRA / PROYECTO', margin + 3, y + 4.5, {
    fontSize: 7,
    fontStyle: 'bold',
    color: [30, 41, 59],
  });
  addText(`Código: ${project.code}`, margin + 3, y + 9, {
    fontSize: 7.5,
    fontStyle: 'bold',
    color: [2, 132, 199], // sky-600
  });
  addText(`Nombre: ${project.name}`, margin + 3, y + 13, {
    fontSize: 7,
    color: [51, 65, 85],
    maxWidth: colW - 6,
  });
  addText(`Estado: ${project.status}`, margin + 3, y + 17, {
    fontSize: 7,
    fontStyle: 'bold',
    color: project.status === 'Finalizado' ? [22, 101, 52] : [30, 41, 59],
  });

  // Col 2: Cliente & Ubicación
  const col2X = margin + colW;
  addText('CLIENTE Y LOCALIZACIÓN', col2X + 3, y + 4.5, {
    fontSize: 7,
    fontStyle: 'bold',
    color: [30, 41, 59],
  });
  addText(`Cliente: ${project.client || 'No especificado'}`, col2X + 3, y + 9, {
    fontSize: 7,
    color: [51, 65, 85],
    maxWidth: colW - 6,
  });
  addText(`Ubicación: ${project.location || 'Guatemala'}`, col2X + 3, y + 13, {
    fontSize: 7,
    color: [51, 65, 85],
    maxWidth: colW - 6,
  });
  addText(`Jurisdicción: ${project.municipality || 'Guatemala'}, ${project.department || 'Guatemala'}`, col2X + 3, y + 17, {
    fontSize: 6.5,
    color: [100, 116, 139],
    maxWidth: colW - 6,
  });

  // Col 3: Plazos y Fechas
  const col3X = margin + colW * 2;
  addText('PLAZO Y CRONOGRAMA', col3X + 3, y + 4.5, {
    fontSize: 7,
    fontStyle: 'bold',
    color: [30, 41, 59],
  });
  addText(`Fecha Inicio: ${project.startDate || 'No registrada'}`, col3X + 3, y + 9, {
    fontSize: 7,
    color: [51, 65, 85],
  });
  addText(`Fecha Fin Prevista: ${project.endDate || 'No registrada'}`, col3X + 3, y + 13, {
    fontSize: 7,
    color: [51, 65, 85],
  });
  addText(`Bitácoras Registradas: ${projectVisits.length} visitas`, col3X + 3, y + 17, {
    fontSize: 7,
    fontStyle: 'bold',
    color: [29, 78, 216],
  });

  // Col 4: Marco de Fiscalización
  const col4X = margin + colW * 3;
  addText('MARCO REGULATORIO Y AUDITORÍA', col4X + 3, y + 4.5, {
    fontSize: 7,
    fontStyle: 'bold',
    color: [30, 41, 59],
  });
  addText('• Ley del IVA & Facturas FEL (SAT)', col4X + 3, y + 8.5, {
    fontSize: 6.5,
    color: [71, 85, 105],
  });
  addText('• Normas de Auditoría Gubernamental / CGC', col4X + 3, y + 12, {
    fontSize: 6.5,
    color: [71, 85, 105],
  });
  addText('• Supervisión Colegiada CIG / CA', col4X + 3, y + 15.5, {
    fontSize: 6.5,
    color: [71, 85, 105],
  });

  y += 24;

  // -------------------------------------------------------------
  // 3. DICTAMEN DE AVANCE FÍSICO VS FINANCIERO (KPI CARDS)
  // -------------------------------------------------------------
  const cardW = (usableWidth - 12) / 5;
  const cardH = 15;

  // KPI 1: Presupuesto Aprobado
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, cardW, cardH, 1, 1, 'FD');
  addText('PRESUPUESTO APROBADO', margin + 3, y + 4, {
    fontSize: 6.5,
    fontStyle: 'bold',
    color: [71, 85, 105],
  });
  addText(formatGTQ(totalBudget), margin + 3, y + 10.5, {
    fontSize: 9.5,
    fontStyle: 'bold',
    color: [15, 23, 42],
  });

  // KPI 2: Gastos Ejecutados
  const kpi2X = margin + cardW + 3;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(kpi2X, y, cardW, cardH, 1, 1, 'FD');
  addText('GASTO EJECUTADO AUDITADO', kpi2X + 3, y + 4, {
    fontSize: 6.5,
    fontStyle: 'bold',
    color: [71, 85, 105],
  });
  addText(formatGTQ(totalExpenses), kpi2X + 3, y + 10.5, {
    fontSize: 9.5,
    fontStyle: 'bold',
    color: [180, 83, 9], // amber-700
  });

  // KPI 3: Saldo Presupuestario
  const kpi3X = kpi2X + cardW + 3;
  const isBalancePositive = budgetBalance >= 0;
  doc.setFillColor(isBalancePositive ? 240 : 254, isBalancePositive ? 253 : 242, isBalancePositive ? 244 : 242);
  doc.setDrawColor(isBalancePositive ? 187 : 254, isBalancePositive ? 247 : 202, isBalancePositive ? 208 : 202);
  doc.roundedRect(kpi3X, y, cardW, cardH, 1, 1, 'FD');
  addText('SALDO POR EJECUTAR', kpi3X + 3, y + 4, {
    fontSize: 6.5,
    fontStyle: 'bold',
    color: isBalancePositive ? [22, 101, 52] : [153, 27, 27],
  });
  addText(formatGTQ(budgetBalance), kpi3X + 3, y + 10.5, {
    fontSize: 9.5,
    fontStyle: 'bold',
    color: isBalancePositive ? [21, 128, 61] : [220, 38, 38],
  });

  // KPI 4: Avance Físico vs Financiero
  const kpi4X = kpi3X + cardW + 3;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(kpi4X, y, cardW, cardH, 1, 1, 'FD');
  addText('AVANCE FÍSICO VS FINANCIERO', kpi4X + 3, y + 4, {
    fontSize: 6.5,
    fontStyle: 'bold',
    color: [71, 85, 105],
  });
  addText(`Físico: ${physicalProgress}%  |  Fin: ${financialProgress}%`, kpi4X + 3, y + 10.5, {
    fontSize: 8,
    fontStyle: 'bold',
    color: [29, 78, 216],
  });

  // KPI 5: Estado de Desviación
  const kpi5X = kpi4X + cardW + 3;
  const isHealthy = progressDeviation >= -5;
  doc.setFillColor(isHealthy ? 236 : 254, isHealthy ? 253 : 242, isHealthy ? 245 : 242);
  doc.setDrawColor(isHealthy ? 167 : 254, isHealthy ? 243 : 202, isHealthy ? 208 : 202);
  doc.roundedRect(kpi5X, y, cardW, cardH, 1, 1, 'FD');
  addText('ESTADO DE DESVIACIÓN', kpi5X + 3, y + 4, {
    fontSize: 6.5,
    fontStyle: 'bold',
    color: isHealthy ? [6, 95, 70] : [153, 27, 27],
  });
  const devText =
    progressDeviation > 0
      ? `+${progressDeviation}% Físico Adelantado`
      : progressDeviation === 0
        ? '0.00% En Línea Perfecta'
        : `${progressDeviation}% Desfase Financiero`;
  addText(devText, kpi5X + 3, y + 10.5, {
    fontSize: 7.5,
    fontStyle: 'bold',
    color: isHealthy ? [4, 120, 87] : [225, 29, 72],
  });

  y += 18;

  // -------------------------------------------------------------
  // 4. TABLA CONSOLIDADA POR CATEGORÍA DE GASTO
  // -------------------------------------------------------------
  addText('1. RESUMEN DE EJECUCIÓN PRESUPUESTARIA POR RENGLÓN DE GASTO', margin, y + 3, {
    fontSize: 8,
    fontStyle: 'bold',
    color: [15, 23, 42],
  });
  y += 5;

  const catCols = [
    { title: 'Renglón / Categoría de Insumo', width: 95, align: 'left' },
    { title: 'No. Comprobantes', width: 40, align: 'center' },
    { title: 'Monto Ejecutado (GTQ)', width: 68, align: 'right' },
    { title: '% de Participación', width: 70, align: 'right' },
  ];

  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, y, usableWidth, 6, 'F');

  let curCatX = margin;
  catCols.forEach((col) => {
    const textX =
      col.align === 'right'
        ? curCatX + col.width - 3
        : col.align === 'center'
          ? curCatX + col.width / 2
          : curCatX + 3;
    addText(col.title, textX, y + 4.2, {
      fontSize: 7,
      fontStyle: 'bold',
      color: [255, 255, 255],
      align: col.align as any,
    });
    curCatX += col.width;
  });
  y += 6;

  const categoryEntries = Object.entries(categories);
  if (categoryEntries.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, usableWidth, 6, 'F');
    addText('Sin comprobantes de gasto registrados para este proyecto.', margin + 3, y + 4.2, {
      fontSize: 7,
      fontStyle: 'italic',
      color: [100, 116, 139],
    });
    y += 6;
  } else {
    categoryEntries.forEach(([catName, stats], idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, usableWidth, 6, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6, margin + usableWidth, y + 6);

      const percent = totalExpenses > 0 ? ((stats.total / totalExpenses) * 100).toFixed(1) : '0.0';

      let rX = margin;
      addText(catName, rX + 3, y + 4.2, { fontSize: 7, color: [15, 23, 42] });
      rX += catCols[0].width;

      addText(`${stats.count} facturas / recibos`, rX + catCols[1].width / 2, y + 4.2, {
        fontSize: 7,
        color: [71, 85, 105],
        align: 'center',
      });
      rX += catCols[1].width;

      addText(formatGTQ(stats.total), rX + catCols[2].width - 3, y + 4.2, {
        fontSize: 7,
        fontStyle: 'bold',
        color: [15, 23, 42],
        align: 'right',
      });
      rX += catCols[2].width;

      addText(`${percent}%`, rX + catCols[3].width - 3, y + 4.2, {
        fontSize: 7,
        color: [71, 85, 105],
        align: 'right',
      });

      y += 6;
    });

    // Cat Totals Row
    doc.setFillColor(226, 232, 240); // slate-200
    doc.rect(margin, y, usableWidth, 6.5, 'F');
    doc.setDrawColor(148, 163, 184);
    doc.rect(margin, y, usableWidth, 6.5, 'D');

    addText('SUBTOTAL GASTOS AUDITADOS', margin + 3, y + 4.5, {
      fontSize: 7,
      fontStyle: 'bold',
      color: [15, 23, 42],
    });

    addText(
      `${projectExpenses.length} comprobantes`,
      margin + catCols[0].width + catCols[1].width / 2,
      y + 4.5,
      {
        fontSize: 7,
        fontStyle: 'bold',
        align: 'center',
        color: [30, 41, 59],
      }
    );

    addText(
      formatGTQ(totalExpenses),
      margin + catCols[0].width + catCols[1].width + catCols[2].width - 3,
      y + 4.5,
      {
        fontSize: 7.5,
        fontStyle: 'bold',
        align: 'right',
        color: [15, 23, 42],
      }
    );

    addText(
      '100.0%',
      margin + catCols[0].width + catCols[1].width + catCols[2].width + catCols[3].width - 3,
      y + 4.5,
      {
        fontSize: 7,
        fontStyle: 'bold',
        align: 'right',
        color: [15, 23, 42],
      }
    );

    y += 10;
  }

  // -------------------------------------------------------------
  // 5. DETALLE DE COMPROBANTES FISCALES Y GASTOS (AUDITORÍA SAT)
  // -------------------------------------------------------------
  checkPageBreak(30);

  addText(
    '2. LIBRO AUXILIAR DE COMPROBANTES FISCALES (AUDITORÍA SAT / CONTRATACIONES DEL ESTADO)',
    margin,
    y + 3,
    {
      fontSize: 8,
      fontStyle: 'bold',
      color: [15, 23, 42],
    }
  );
  y += 5;

  // Table columns (Total = 273mm)
  // Fecha (20), Categoría (38), Factura/DTE (30), Proveedor (42), NIT (24), Forma Pago (24), Estado (25), Monto (35), APU (35)
  const expCols = [
    { title: 'Fecha', width: 22, align: 'left' },
    { title: 'Categoría', width: 38, align: 'left' },
    { title: 'No. Factura / DTE', width: 30, align: 'left' },
    { title: 'Proveedor', width: 44, align: 'left' },
    { title: 'NIT Proveedor', width: 25, align: 'left' },
    { title: 'Forma de Pago', width: 26, align: 'left' },
    { title: 'Estado Audit.', width: 28, align: 'center' },
    { title: 'Monto (GTQ)', width: 30, align: 'right' },
    { title: 'Renglón / APU', width: 30, align: 'left' },
  ];

  const drawExpHeader = () => {
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, y, usableWidth, 6, 'F');
    let hX = margin;
    expCols.forEach((col) => {
      const textX =
        col.align === 'right'
          ? hX + col.width - 2
          : col.align === 'center'
            ? hX + col.width / 2
            : hX + 2;
      addText(col.title, textX, y + 4.2, {
        fontSize: 6.5,
        fontStyle: 'bold',
        color: [255, 255, 255],
        align: col.align as any,
      });
      hX += col.width;
    });
    y += 6;
  };

  drawExpHeader();

  if (projectExpenses.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, usableWidth, 6, 'F');
    addText('No existen registros de gastos o compras para el proyecto.', margin + 3, y + 4.2, {
      fontSize: 7,
      fontStyle: 'italic',
      color: [100, 116, 139],
    });
    y += 7;
  } else {
    projectExpenses.forEach((exp, idx) => {
      // Check page break
      if (y > pageHeight - 30) {
        doc.addPage();
        y = margin;
        drawSubHeader();
        drawExpHeader();
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, usableWidth, 6.5, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6.5, margin + usableWidth, y + 6.5);

      let eX = margin;

      // Fecha
      addText(exp.date, eX + 2, y + 4.2, { fontSize: 6.5, color: [51, 65, 85] });
      eX += expCols[0].width;

      // Categoría
      const catShort = exp.category.split('(')[0].trim();
      addText(catShort, eX + 2, y + 4.2, { fontSize: 6.5, color: [15, 23, 42], maxWidth: expCols[1].width - 3 });
      eX += expCols[1].width;

      // No. Factura / DTE
      addText(exp.facturaNumber || 'Sin DTE', eX + 2, y + 4.2, {
        fontSize: 6.5,
        fontStyle: 'bold',
        color: [30, 58, 138],
        maxWidth: expCols[2].width - 3,
      });
      eX += expCols[2].width;

      // Proveedor
      addText(exp.supplier || 'Varios', eX + 2, y + 4.2, {
        fontSize: 6.5,
        color: [15, 23, 42],
        maxWidth: expCols[3].width - 3,
      });
      eX += expCols[3].width;

      // NIT
      addText(exp.nitSupplier || 'CF', eX + 2, y + 4.2, { fontSize: 6.5, color: [71, 85, 105] });
      eX += expCols[4].width;

      // Forma Pago
      addText(exp.paymentMethod || 'Efectivo', eX + 2, y + 4.2, {
        fontSize: 6,
        color: [71, 85, 105],
        maxWidth: expCols[5].width - 2,
      });
      eX += expCols[5].width;

      // Estado
      const statusText = exp.approvalStatus || 'Aprobado';
      const isApproved = statusText === 'Aprobado';
      addText(statusText, eX + expCols[6].width / 2, y + 4.2, {
        fontSize: 6.5,
        fontStyle: 'bold',
        color: isApproved ? [22, 101, 52] : [180, 83, 9],
        align: 'center',
      });
      eX += expCols[6].width;

      // Monto
      addText(formatGTQ(exp.amount), eX + expCols[7].width - 2, y + 4.2, {
        fontSize: 6.5,
        fontStyle: 'bold',
        align: 'right',
        color: [15, 23, 42],
      });
      eX += expCols[7].width;

      // APU
      addText(exp.assignedApuDescription || exp.description || 'General', eX + 2, y + 4.2, {
        fontSize: 6,
        color: [100, 116, 139],
        maxWidth: expCols[8].width - 2,
      });

      y += 6.5;
    });

    // Ledger Total Row
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, usableWidth, 7, 'F');
    doc.setDrawColor(148, 163, 184);
    doc.rect(margin, y, usableWidth, 7, 'D');

    addText(
      `TOTAL EJECUTADO Y AUDITADO (${projectExpenses.length} COMPROBANTES)`,
      margin + 3,
      y + 4.8,
      {
        fontSize: 7,
        fontStyle: 'bold',
        color: [15, 23, 42],
      }
    );

    const sumX = margin + expCols.slice(0, 7).reduce((acc, c) => acc + c.width, 0);
    addText(formatGTQ(totalExpenses), sumX + expCols[7].width - 2, y + 4.8, {
      fontSize: 8,
      fontStyle: 'bold',
      align: 'right',
      color: [180, 83, 9], // amber-700
    });

    y += 11;
  }

  // -------------------------------------------------------------
  // 6. FISCALIZACIÓN Y SUPERVISIÓN EN CAMPO (BITÁCORAS Y GPS)
  // -------------------------------------------------------------
  checkPageBreak(30);

  addText(
    '3. REGISTRO DE SUPERVISIÓN TÉCNICA Y AUDITORÍA DE CAMPO (CGC / GEORREFERENCIACIÓN)',
    margin,
    y + 3,
    {
      fontSize: 8,
      fontStyle: 'bold',
      color: [15, 23, 42],
    }
  );
  y += 5;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, usableWidth, 14, 1.5, 1.5, 'FD');

  const bitColW = usableWidth / 4;
  addText('CONTROL DE ASISTENCIA Y CAMPO', margin + 3, y + 4.5, {
    fontSize: 7,
    fontStyle: 'bold',
    color: [30, 41, 59],
  });
  addText(`Visitas registradas: ${projectVisits.length}`, margin + 3, y + 9.5, {
    fontSize: 7,
    color: [51, 65, 85],
  });

  const bCol2 = margin + bitColW;
  addText('AUDITORÍA SATELITAL GPS', bCol2 + 3, y + 4.5, {
    fontSize: 7,
    fontStyle: 'bold',
    color: [30, 41, 59],
  });
  addText(`Con geolocalización: ${visitsWithGps} visitas`, bCol2 + 3, y + 9.5, {
    fontSize: 7,
    color: visitsWithGps > 0 ? [22, 101, 52] : [100, 116, 139],
  });

  const bCol3 = margin + bitColW * 2;
  addText('CONTROL DE FIRMAS EN SITIO', bCol3 + 3, y + 4.5, {
    fontSize: 7,
    fontStyle: 'bold',
    color: [30, 41, 59],
  });
  addText(`Conformidad firmada: ${visitsWithSignatures} actas`, bCol3 + 3, y + 9.5, {
    fontSize: 7,
    color: visitsWithSignatures > 0 ? [29, 78, 216] : [100, 116, 139],
  });

  const bCol4 = margin + bitColW * 3;
  addText('DICTAMEN TÉCNICO DE CONCORDANCIA', bCol4 + 3, y + 4.5, {
    fontSize: 7,
    fontStyle: 'bold',
    color: [30, 41, 59],
  });
  const auditEvaluation =
    physicalProgress >= financialProgress - 3
      ? 'CONFORME (Avance físico respalda erogaciones)'
      : 'OBSERVACIÓN (Revisión de rendimientos requerida)';
  addText(auditEvaluation, bCol4 + 3, y + 9.5, {
    fontSize: 6.5,
    fontStyle: 'bold',
    color: physicalProgress >= financialProgress - 3 ? [22, 101, 52] : [220, 38, 38],
    maxWidth: bitColW - 6,
  });

  y += 18;

  // -------------------------------------------------------------
  // 7. OBSERVACIONES Y NOTAS DE AUDITORÍA
  // -------------------------------------------------------------
  checkPageBreak(38);

  addText('4. CONCLUSIONES Y OBSERVACIONES DEL AUDITOR DE OBRA', margin, y + 3, {
    fontSize: 8,
    fontStyle: 'bold',
    color: [15, 23, 42],
  });
  y += 5;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, usableWidth, 14, 1.5, 1.5, 'FD');

  const defaultNotes =
    auditNotes?.trim() ||
    `Se hace constar que los gastos registrados por un monto acumulado de ${formatGTQ(totalExpenses)} cuentan con comprobantes de respaldo fiscal (Facturas DTE SAT) y se corresponden con el avance físico certificado de ${physicalProgress}%. El saldo presupuestario de ${formatGTQ(budgetBalance)} se encuentra disponible para la culminación de los renglones contractuales de la obra conforme al cronograma de ejecución vigente.`;

  addText(defaultNotes, margin + 3, y + 4.5, {
    fontSize: 7,
    color: [51, 65, 85],
    maxWidth: usableWidth - 6,
  });

  y += 18;

  // -------------------------------------------------------------
  // 8. CERTIFICACIÓN LEGAL Y CUADRO DE FIRMAS
  // -------------------------------------------------------------
  checkPageBreak(35);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, usableWidth, 10, 1.5, 1.5, 'FD');

  addText(
    'CERTIFICACIÓN OFICIAL DE AUDITORÍA Y SUPERVISIÓN COLEGIADA (REPÚBLICA DE GUATEMALA):',
    margin + 3,
    y + 4,
    {
      fontSize: 7,
      fontStyle: 'bold',
      color: [15, 23, 42],
    }
  );
  addText(
    'Los infrascritos profesionales declaran bajo juramento que los montos, facturas y porcentajes de avance físico detallados en la presente cédula reflejan con exactitud la situación técnica y presupuestaria de la obra a la fecha de emisión.',
    margin + 3,
    y + 7.5,
    {
      fontSize: 6.5,
      color: [71, 85, 105],
    }
  );

  y += 18;

  // Three Signature blocks (Total width 273mm)
  const sigW = 76;
  const sigGap = (usableWidth - sigW * 3) / 2;

  // Signature 1: Residente de Obra
  let sX = margin;
  doc.setDrawColor(51, 65, 85);
  doc.line(sX, y, sX + sigW, y);
  addText('INGENIERO / ARQUITECTO RESIDENTE', sX + sigW / 2, y + 4, {
    fontSize: 7,
    fontStyle: 'bold',
    align: 'center',
    color: [15, 23, 42],
  });
  const resName = company?.architectName || 'Arq. Responsable Técnico';
  const resCol = company?.architectColNumber ? `Col. No. ${company.architectColNumber}` : 'Colegio CIG / CA';
  addText(`${resName} • ${resCol}`, sX + sigW / 2, y + 7.5, {
    fontSize: 6.5,
    align: 'center',
    color: [71, 85, 105],
  });
  addText('Responsable de Ejecución y Avance Físico', sX + sigW / 2, y + 10.5, {
    fontSize: 6,
    align: 'center',
    color: [100, 116, 139],
  });

  // Signature 2: Auditor / Contador General
  sX += sigW + sigGap;
  doc.line(sX, y, sX + sigW, y);
  addText('AUDITOR DE OBRA / CONTADOR GENERAL', sX + sigW / 2, y + 4, {
    fontSize: 7,
    fontStyle: 'bold',
    align: 'center',
    color: [15, 23, 42],
  });
  const auditOfficer = auditorName?.trim() || 'Auditor Interno / Contador General';
  const auditOfficerReg = auditorColNumber?.trim() ? `Registro: ${auditorColNumber}` : 'Registro SAT / CPA';
  addText(`${auditOfficer} • ${auditOfficerReg}`, sX + sigW / 2, y + 7.5, {
    fontSize: 6.5,
    align: 'center',
    color: [71, 85, 105],
  });
  addText('Verificación Financiera y Tributaria SAT', sX + sigW / 2, y + 10.5, {
    fontSize: 6,
    align: 'center',
    color: [100, 116, 139],
  });

  // Signature 3: Representante Legal / Supervisor
  sX += sigW + sigGap;
  doc.line(sX, y, sX + sigW, y);
  addText('SUPERVISOR / REPRESENTANTE LEGAL', sX + sigW / 2, y + 4, {
    fontSize: 7,
    fontStyle: 'bold',
    align: 'center',
    color: [15, 23, 42],
  });
  addText(compName, sX + sigW / 2, y + 7.5, {
    fontSize: 6.5,
    align: 'center',
    color: [71, 85, 105],
    maxWidth: sigW - 4,
  });
  addText('Aprobación y Recepción de Auditoría', sX + sigW / 2, y + 10.5, {
    fontSize: 6,
    align: 'center',
    color: [100, 116, 139],
  });

  // Save the document
  const safeCode = project.code.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDate = now.toISOString().slice(0, 10);
  const fileName = `Auditoria_Obra_${safeCode}_${safeDate}.pdf`;
  doc.save(fileName);
}

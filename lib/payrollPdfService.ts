import { EmployeePayrollCalculation, STATUTORY_RATES } from './guatemalanPayroll';
import { CompanySettings } from './types';
import { formatGTQ } from './data';

export interface ExportPayrollPdfOptions {
  company: CompanySettings;
  periodLabel: string;
  frequencyLabel: string;
  dateRangeLabel: string;
  calculations: EmployeePayrollCalculation[];
  totals: {
    baseSalary: number;
    overtimeAmount: number;
    salarioAfectoIGSS: number;
    bonoIncentivo: number;
    totalDevengado: number;
    igssLaboral: number;
    otherDeductions: number;
    totalDeducciones: number;
    salarioLiquido: number;
    provisionBono14: number;
    provisionAguinaldo: number;
    igssPatronalTotal: number;
    costoTotalPatrono: number;
  };
}

export async function exportPayrollAccountingPdf(options: ExportPayrollPdfOptions): Promise<void> {
  const { company, periodLabel, frequencyLabel, dateRangeLabel, calculations, totals } = options;

  const { jsPDF } = await import('jspdf');

  // Landscape A4 format for horizontal table visibility
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
    options?: { fontSize?: number; fontStyle?: 'normal' | 'bold' | 'italic'; color?: [number, number, number]; align?: 'left' | 'center' | 'right' }
  ) => {
    const fontSize = options?.fontSize || 9;
    const fontStyle = options?.fontStyle || 'normal';
    const color = options?.color || [15, 23, 42];
    const align = options?.align || 'left';

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, x, yPos, { align });
  };

  // 1. Header Banner Box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, usableWidth, 22, 'F');

  addText(company.commercialName || 'ConstructERP Guatemala, S.A.', margin + 4, y + 6, {
    fontSize: 12,
    fontStyle: 'bold',
    color: [255, 255, 255],
  });

  addText(`NIT: ${company.nit || '1049281-2'} • No. Patronal IGSS: 08-94102-3 • ${company.address || 'Guatemala, C.A.'}`, margin + 4, y + 11, {
    fontSize: 8,
    color: [203, 213, 225],
  });

  addText('REPORTE OFICIAL DE PLANILLA & AUDITABLE CONTABLE', margin + 4, y + 17, {
    fontSize: 8,
    fontStyle: 'bold',
    color: [251, 191, 36], // amber-400
  });

  addText(`Frecuencia: ${frequencyLabel.toUpperCase()}`, usableWidth + margin - 4, y + 6, {
    fontSize: 9,
    fontStyle: 'bold',
    color: [255, 255, 255],
    align: 'right',
  });

  addText(`Período: ${periodLabel}`, usableWidth + margin - 4, y + 11, {
    fontSize: 8,
    color: [226, 232, 240],
    align: 'right',
  });

  addText(`Rango: ${dateRangeLabel}`, usableWidth + margin - 4, y + 16, {
    fontSize: 8,
    color: [148, 163, 184],
    align: 'right',
  });

  y += 26;

  // 2. Statutory Legal Reference Box for Accountants
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, y, usableWidth, 13, 2, 2, 'FD');

  addText('PARÁMETROS Y RETENCIONES LEGALES DE GUATEMALA (AUDITORÍA SAT / IGSS):', margin + 3, y + 4.5, {
    fontSize: 7.5,
    fontStyle: 'bold',
    color: [30, 41, 59],
  });

  const paramStr =
    '• IGSS Laboral: 4.83% (Acuerdo 1118)  • IGSS Patronal: 10.67% + IRTRA 1% + INTECAP 1% = 12.67% Total  ' +
    '• Bonificación Incentivo Dto. 37-2001: Q250.00 mensual / Q125.00 quincenal (Exento IGSS)  ' +
    '• Prov. Bono 14 (Dto. 42-92): 8.33%  • Prov. Aguinaldo (Dto. 76-78): 8.33%';

  addText(paramStr, margin + 3, y + 9, {
    fontSize: 7,
    color: [51, 65, 85],
  });

  y += 16;

  // 3. Table Column Layout
  // Columns (Widths in mm total = 273mm):
  // Colaborador/Puesto (40), DPI/IGSS (36), Días (10), Sueldo Base (22), Hrs Extra (18), Afecto IGSS (22),
  // Bono Dto 37 (20), IGSS Lab 4.83% (20), Prov. Bono 14 (20), Prov. Aguinaldo (20), Líquido (23), IGSS Pat 12.67% (22)
  const cols = [
    { title: 'Colaborador / Puesto', width: 40, align: 'left' },
    { title: 'DPI / No. IGSS', width: 36, align: 'left' },
    { title: 'Días', width: 10, align: 'center' },
    { title: 'Base (Q)', width: 21, align: 'right' },
    { title: 'Hrs Ex (Q)', width: 18, align: 'right' },
    { title: 'Afecto IGSS', width: 21, align: 'right' },
    { title: 'Bono Dto37', width: 19, align: 'right' },
    { title: 'IGSS (4.83%)', width: 20, align: 'right' },
    { title: 'Prov.Bono14', width: 20, align: 'right' },
    { title: 'Prov.Aguin.', width: 20, align: 'right' },
    { title: 'Líquido (Q)', width: 24, align: 'right' },
    { title: 'IGSS Pat12.67', width: 24, align: 'right' },
  ];

  // Table Header Background
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, y, usableWidth, 7, 'F');

  let curX = margin;
  cols.forEach((col) => {
    const textX =
      col.align === 'right' ? curX + col.width - 2 : col.align === 'center' ? curX + col.width / 2 : curX + 2;

    addText(col.title, textX, y + 4.8, {
      fontSize: 7,
      fontStyle: 'bold',
      color: [255, 255, 255],
      align: col.align as any,
    });
    curX += col.width;
  });

  y += 7;

  // Table Body Rows
  calculations.forEach((c, index) => {
    // Check page overflow
    if (y > pageHeight - 35) {
      doc.addPage();
      y = margin;

      // Repeat Table Header
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, y, usableWidth, 7, 'F');
      let headerX = margin;
      cols.forEach((col) => {
        const textX =
          col.align === 'right' ? headerX + col.width - 2 : col.align === 'center' ? headerX + col.width / 2 : headerX + 2;
        addText(col.title, textX, y + 4.8, {
          fontSize: 7,
          fontStyle: 'bold',
          color: [255, 255, 255],
          align: col.align as any,
        });
        headerX += col.width;
      });
      y += 7;
    }

    // Zebra row striping
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, usableWidth, 8, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 8, margin + usableWidth, y + 8);

    let rowX = margin;

    // Colaborador / Role
    addText(c.employeeName, rowX + 2, y + 3.5, { fontSize: 7, fontStyle: 'bold', color: [15, 23, 42] });
    addText(c.role, rowX + 2, y + 6.8, { fontSize: 6, color: [100, 116, 139] });
    rowX += cols[0].width;

    // DPI / IGSS
    addText(`DPI: ${c.dpi}`, rowX + 2, y + 3.5, { fontSize: 6.5, color: [51, 65, 85] });
    addText(`IGSS: ${c.igssNumber}`, rowX + 2, y + 6.8, { fontSize: 6, color: [37, 99, 235] });
    rowX += cols[1].width;

    // Días
    addText(`${c.daysWorked}d`, rowX + cols[2].width / 2, y + 5, { fontSize: 7, align: 'center', color: [51, 65, 85] });
    rowX += cols[2].width;

    // Sueldo Base
    addText(formatGTQ(c.baseSalary), rowX + cols[3].width - 2, y + 5, { fontSize: 7, align: 'right', color: [15, 23, 42] });
    rowX += cols[3].width;

    // Horas Extras
    addText(c.overtimeAmount > 0 ? formatGTQ(c.overtimeAmount) : 'Q0.00', rowX + cols[4].width - 2, y + 5, {
      fontSize: 7,
      align: 'right',
      color: c.overtimeAmount > 0 ? [3, 105, 161] : [148, 163, 184],
    });
    rowX += cols[4].width;

    // Afecto IGSS
    addText(formatGTQ(c.salarioAfectoIGSS), rowX + cols[5].width - 2, y + 5, {
      fontSize: 7,
      fontStyle: 'bold',
      align: 'right',
      color: [30, 58, 138],
    });
    rowX += cols[5].width;

    // Bono Dto 37
    addText(formatGTQ(c.bonoIncentivo), rowX + cols[6].width - 2, y + 5, {
      fontSize: 7,
      align: 'right',
      color: [4, 120, 87],
    });
    rowX += cols[6].width;

    // IGSS Laboral 4.83%
    addText(`-${formatGTQ(c.igssLaboral)}`, rowX + cols[7].width - 2, y + 5, {
      fontSize: 7,
      fontStyle: 'bold',
      align: 'right',
      color: [225, 29, 72], // rose-600
    });
    rowX += cols[7].width;

    // Provisión Bono 14
    addText(formatGTQ(c.provisionBono14), rowX + cols[8].width - 2, y + 5, {
      fontSize: 7,
      align: 'right',
      color: [180, 83, 9], // amber-700
    });
    rowX += cols[8].width;

    // Provisión Aguinaldo
    addText(formatGTQ(c.provisionAguinaldo), rowX + cols[9].width - 2, y + 5, {
      fontSize: 7,
      align: 'right',
      color: [180, 83, 9],
    });
    rowX += cols[9].width;

    // Líquido a Pagar
    addText(formatGTQ(c.salarioLiquido), rowX + cols[10].width - 2, y + 5, {
      fontSize: 7.5,
      fontStyle: 'bold',
      align: 'right',
      color: [6, 95, 70], // emerald-800
    });
    rowX += cols[10].width;

    // IGSS Patronal 12.67%
    addText(formatGTQ(c.igssPatronalTotal), rowX + cols[11].width - 2, y + 5, {
      fontSize: 7,
      align: 'right',
      color: [29, 78, 216],
    });

    y += 8;
  });

  // 4. Totals Row for Accountant
  y += 2;
  doc.setFillColor(226, 232, 240); // slate-200
  doc.rect(margin, y, usableWidth, 9, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.rect(margin, y, usableWidth, 9, 'D');

  let totX = margin;
  addText(`TOTALES PLANILLA (${calculations.length} COLABORADORES)`, totX + 2, y + 5.5, {
    fontSize: 7.5,
    fontStyle: 'bold',
    color: [15, 23, 42],
  });

  totX += cols[0].width + cols[1].width + cols[2].width;

  // Base
  addText(formatGTQ(totals.baseSalary), totX + cols[3].width - 2, y + 5.5, {
    fontSize: 7.5,
    fontStyle: 'bold',
    align: 'right',
  });
  totX += cols[3].width;

  // Hrs Extra
  addText(formatGTQ(totals.overtimeAmount), totX + cols[4].width - 2, y + 5.5, {
    fontSize: 7.5,
    fontStyle: 'bold',
    align: 'right',
    color: [3, 105, 161],
  });
  totX += cols[4].width;

  // Afecto
  addText(formatGTQ(totals.salarioAfectoIGSS), totX + cols[5].width - 2, y + 5.5, {
    fontSize: 7.5,
    fontStyle: 'bold',
    align: 'right',
    color: [30, 58, 138],
  });
  totX += cols[5].width;

  // Bono Dto 37
  addText(formatGTQ(totals.bonoIncentivo), totX + cols[6].width - 2, y + 5.5, {
    fontSize: 7.5,
    fontStyle: 'bold',
    align: 'right',
    color: [4, 120, 87],
  });
  totX += cols[6].width;

  // IGSS Lab
  addText(`-${formatGTQ(totals.igssLaboral)}`, totX + cols[7].width - 2, y + 5.5, {
    fontSize: 7.5,
    fontStyle: 'bold',
    align: 'right',
    color: [225, 29, 72],
  });
  totX += cols[7].width;

  // Prov Bono 14
  addText(formatGTQ(totals.provisionBono14), totX + cols[8].width - 2, y + 5.5, {
    fontSize: 7.5,
    fontStyle: 'bold',
    align: 'right',
    color: [180, 83, 9],
  });
  totX += cols[8].width;

  // Prov Aguin
  addText(formatGTQ(totals.provisionAguinaldo), totX + cols[9].width - 2, y + 5.5, {
    fontSize: 7.5,
    fontStyle: 'bold',
    align: 'right',
    color: [180, 83, 9],
  });
  totX += cols[9].width;

  // Líquido
  addText(formatGTQ(totals.salarioLiquido), totX + cols[10].width - 2, y + 5.5, {
    fontSize: 8,
    fontStyle: 'bold',
    align: 'right',
    color: [6, 95, 70],
  });
  totX += cols[10].width;

  // IGSS Pat
  addText(formatGTQ(totals.igssPatronalTotal), totX + cols[11].width - 2, y + 5.5, {
    fontSize: 7.5,
    fontStyle: 'bold',
    align: 'right',
    color: [29, 78, 216],
  });

  y += 14;

  // 5. Accountant Summary Box & Signature Block
  if (y > pageHeight - 35) {
    doc.addPage();
    y = margin;
  }

  // Summary Card for Cost
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, usableWidth, 12, 1.5, 1.5, 'FD');

  const summaryText =
    `Masa Salarial Imponible IGSS: ${formatGTQ(totals.salarioAfectoIGSS)}  |  ` +
    `Retención IGSS 4.83%: ${formatGTQ(totals.igssLaboral)}  |  ` +
    `Provisiones Prestaciones (Bono 14 + Aguinaldo): ${formatGTQ(totals.provisionBono14 + totals.provisionAguinaldo)}  |  ` +
    `Costo Total Empleador: ${formatGTQ(totals.costoTotalPatrono)}`;

  addText('RESUMEN DE CONTABILIDAD Y NÓMINA PATRONAL:', margin + 3, y + 4.5, {
    fontSize: 7.5,
    fontStyle: 'bold',
    color: [15, 23, 42],
  });

  addText(summaryText, margin + 3, y + 9.5, {
    fontSize: 7,
    fontStyle: 'bold',
    color: [30, 58, 138],
  });

  y += 20;

  // Signatures
  const sigWidth = 70;
  const gap = (usableWidth - sigWidth * 3) / 2;

  // Sig 1
  let sigX = margin;
  doc.line(sigX, y, sigX + sigWidth, y);
  addText('Elaborado por: Contador General / Nóminas', sigX + sigWidth / 2, y + 4, {
    fontSize: 7,
    fontStyle: 'bold',
    align: 'center',
  });
  addText('Reg. Contador SAT / Firma & Sello', sigX + sigWidth / 2, y + 7.5, {
    fontSize: 6,
    color: [100, 116, 139],
    align: 'center',
  });

  // Sig 2
  sigX += sigWidth + gap;
  doc.line(sigX, y, sigX + sigWidth, y);
  addText('Revisado por: Gerencia de Recursos Humanos', sigX + sigWidth / 2, y + 4, {
    fontSize: 7,
    fontStyle: 'bold',
    align: 'center',
  });
  addText('Conformidad de Asistencia y Salarios', sigX + sigWidth / 2, y + 7.5, {
    fontSize: 6,
    color: [100, 116, 139],
    align: 'center',
  });

  // Sig 3
  sigX += sigWidth + gap;
  doc.line(sigX, y, sigX + sigWidth, y);
  addText('Aprobado por: Representante Legal / Dirección', sigX + sigWidth / 2, y + 4, {
    fontSize: 7,
    fontStyle: 'bold',
    align: 'center',
  });
  addText(company.commercialName || 'ConstructERP Guatemala, S.A.', sigX + sigWidth / 2, y + 7.5, {
    fontSize: 6,
    color: [100, 116, 139],
    align: 'center',
  });

  // Save the document
  const fileName = `Planilla_Contable_${frequencyLabel}_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);
}

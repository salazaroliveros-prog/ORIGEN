import { CompanySettings } from './types';
import { formatGTQ } from './data';

export interface QuoteItem {
  id?: string;
  description: string;
  qty: number;
  unit: string;
  unitPriceGTQ: number;
}

export interface QuotePdfData {
  quoteCode: string;
  projectName: string;
  clientName: string;
  clientNit: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  date: string;
  validUntil: string;
  estimatedDuration: string;
  items: QuoteItem[];
  discountPercent?: number;
  taxPercent?: number; // 12 for IVA SAT
  notes?: string;
  paymentTerms?: string;
  templateName?: string;
}

export async function generateQuoteCommercialPdf(
  quote: QuotePdfData,
  company: CompanySettings
): Promise<void> {
  const { jsPDF } = await import('jspdf');

  // Portrait A4 format for commercial architectural proposals
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const usableWidth = pageWidth - margin * 2; // 182mm
  let y = margin;

  // Text helper
  const addText = (
    text: string,
    x: number,
    yPos: number,
    options?: {
      fontSize?: number;
      fontStyle?: 'normal' | 'bold' | 'italic';
      color?: [number, number, number];
      align?: 'left' | 'center' | 'right';
      maxWidth?: number;
    }
  ) => {
    const fontSize = options?.fontSize || 9;
    const fontStyle = options?.fontStyle || 'normal';
    const color = options?.color || [15, 23, 42];
    const align = options?.align || 'left';

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(color[0], color[1], color[2]);

    if (options?.maxWidth) {
      doc.text(text, x, yPos, { align, maxWidth: options.maxWidth });
    } else {
      doc.text(text, x, yPos, { align });
    }
  };

  // Top Accent Banner (Deep Blue and Gold)
  doc.setFillColor(30, 58, 138); // Primary dark blue (#1e3a8a)
  doc.rect(0, 0, pageWidth, 6, 'F');
  doc.setFillColor(217, 119, 6); // Amber accent (#d97706)
  doc.rect(0, 6, pageWidth, 1.5, 'F');

  y = 14;

  // Header: Company Logo / Name & Commercial Proposal Title
  addText(company.commercialName || company.companyName, margin, y, {
    fontSize: 14,
    fontStyle: 'bold',
    color: [30, 58, 138],
  });
  y += 4.5;

  addText(`NIT: ${company.nit} • ${company.legalName}`, margin, y, {
    fontSize: 8,
    color: [100, 116, 139],
  });
  y += 3.8;

  addText(`Dirección: ${company.address}`, margin, y, {
    fontSize: 8,
    color: [100, 116, 139],
    maxWidth: 110,
  });
  y += 3.8;

  addText(`Tel: ${company.phone} • Email: ${company.email}`, margin, y, {
    fontSize: 8,
    color: [100, 116, 139],
  });

  // Top Right: Quotation Badge Box
  const badgeX = pageWidth - margin - 60;
  const badgeY = 12;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(badgeX, badgeY, 60, 26, 2, 2, 'FD');

  addText('PROPUESTA COMERCIAL', badgeX + 30, badgeY + 5.5, {
    fontSize: 8,
    fontStyle: 'bold',
    color: [217, 119, 6],
    align: 'center',
  });

  addText(quote.quoteCode, badgeX + 30, badgeY + 11.5, {
    fontSize: 11,
    fontStyle: 'bold',
    color: [15, 23, 42],
    align: 'center',
  });

  addText(`Emisión: ${quote.date}`, badgeX + 30, badgeY + 17, {
    fontSize: 7.5,
    color: [100, 116, 139],
    align: 'center',
  });

  addText(`Vigencia: ${quote.validUntil}`, badgeX + 30, badgeY + 21.5, {
    fontSize: 7.5,
    fontStyle: 'bold',
    color: [30, 58, 138],
    align: 'center',
  });

  y = 36;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Client & Project Information Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, usableWidth, 24, 2, 2, 'F');

  const col1X = margin + 4;
  const col2X = margin + (usableWidth / 2) + 4;
  let clientY = y + 5;

  addText('DATOS DEL CLIENTE / PROPIETARIO', col1X, clientY, {
    fontSize: 7.5,
    fontStyle: 'bold',
    color: [30, 58, 138],
  });
  addText('DATOS DEL PROYECTO / OBRA', col2X, clientY, {
    fontSize: 7.5,
    fontStyle: 'bold',
    color: [30, 58, 138],
  });
  clientY += 4.5;

  addText(`Cliente: ${quote.clientName}`, col1X, clientY, {
    fontSize: 8.5,
    fontStyle: 'bold',
    color: [15, 23, 42],
  });
  addText(`Proyecto: ${quote.projectName}`, col2X, clientY, {
    fontSize: 8.5,
    fontStyle: 'bold',
    color: [15, 23, 42],
  });
  clientY += 4;

  addText(`NIT: ${quote.clientNit || 'No especificado'} ${quote.clientPhone ? `• Tel: ${quote.clientPhone}` : ''}`, col1X, clientY, {
    fontSize: 8,
    color: [71, 85, 105],
  });
  addText(`Plazo Estimado de Ejecución: ${quote.estimatedDuration || 'No especificado'}`, col2X, clientY, {
    fontSize: 8,
    color: [71, 85, 105],
  });
  clientY += 4;

  addText(`Email: ${quote.clientEmail || 'No especificado'}`, col1X, clientY, {
    fontSize: 7.5,
    color: [100, 116, 139],
  });
  addText(`Ubicación: ${quote.clientAddress || 'No especificada'}`, col2X, clientY, {
    fontSize: 7.5,
    color: [100, 116, 139],
  });

  y += 28;

  // Table of Items / Work Breakdown Structure
  addText('PRESUPUESTO DESGLOSADO DE PARTIDAS Y RENGLONES', margin, y, {
    fontSize: 8.5,
    fontStyle: 'bold',
    color: [30, 58, 138],
  });
  if (quote.templateName) {
    addText(`Plantilla: ${quote.templateName}`, pageWidth - margin, y, {
      fontSize: 8,
      fontStyle: 'italic',
      color: [100, 116, 139],
      align: 'right',
    });
  }
  y += 3;

  // Table Header
  const colW = {
    num: 8,
    desc: 98,
    qty: 18,
    unit: 16,
    unitPrice: 21,
    subtotal: 21,
  };

  const xPos = {
    num: margin + 2,
    desc: margin + colW.num + 2,
    qty: margin + colW.num + colW.desc + colW.qty - 2,
    unit: margin + colW.num + colW.desc + colW.qty + 2,
    unitPrice: margin + colW.num + colW.desc + colW.qty + colW.unit + colW.unitPrice - 2,
    subtotal: margin + usableWidth - 2,
  };

  doc.setFillColor(30, 58, 138);
  doc.rect(margin, y, usableWidth, 7, 'F');

  addText('#', xPos.num, y + 4.8, { fontSize: 7.5, fontStyle: 'bold', color: [255, 255, 255] });
  addText('Descripción Técnica del Renglón', xPos.desc, y + 4.8, { fontSize: 7.5, fontStyle: 'bold', color: [255, 255, 255] });
  addText('Cant.', xPos.qty, y + 4.8, { fontSize: 7.5, fontStyle: 'bold', color: [255, 255, 255], align: 'right' });
  addText('Unidad', xPos.unit, y + 4.8, { fontSize: 7.5, fontStyle: 'bold', color: [255, 255, 255] });
  addText('P. Unitario', xPos.unitPrice, y + 4.8, { fontSize: 7.5, fontStyle: 'bold', color: [255, 255, 255], align: 'right' });
  addText('Subtotal (GTQ)', xPos.subtotal, y + 4.8, { fontSize: 7.5, fontStyle: 'bold', color: [255, 255, 255], align: 'right' });

  y += 7;

  let grossSubtotal = 0;

  // Draw Items Rows
  quote.items.forEach((item, index) => {
    const itemSubtotal = item.qty * item.unitPriceGTQ;
    grossSubtotal += itemSubtotal;

    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, usableWidth, 6.5, 'F');
    }

    addText(String(index + 1), xPos.num, y + 4.5, { fontSize: 7.5, color: [100, 116, 139] });

    // Truncate description if too long
    const cleanDesc = item.description.length > 58 ? `${item.description.substring(0, 56)}...` : item.description;
    addText(cleanDesc, xPos.desc, y + 4.5, { fontSize: 8, fontStyle: 'bold', color: [30, 41, 59] });

    addText(String(item.qty), xPos.qty, y + 4.5, { fontSize: 7.5, color: [51, 65, 85], align: 'right' });
    addText(item.unit, xPos.unit, y + 4.5, { fontSize: 7.5, color: [100, 116, 139] });
    addText(formatGTQ(item.unitPriceGTQ), xPos.unitPrice, y + 4.5, { fontSize: 7.5, color: [51, 65, 85], align: 'right' });
    addText(formatGTQ(itemSubtotal), xPos.subtotal, y + 4.5, { fontSize: 8, fontStyle: 'bold', color: [15, 23, 42], align: 'right' });

    y += 6.5;

    // Check page break if many items
    if (y > pageHeight - 65) {
      doc.addPage();
      y = margin;
    }
  });

  y += 2;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Calculations for Discount, VAT (IVA), and Grand Total
  const discountVal = quote.discountPercent ? (grossSubtotal * quote.discountPercent) / 100 : 0;
  const netBeforeTax = grossSubtotal - discountVal;
  const ivaTaxVal = (netBeforeTax * (quote.taxPercent ?? 12)) / 100;
  const grandTotalGTQ = netBeforeTax + ivaTaxVal;

  // Bottom Financial Summary Box
  const summaryBoxW = 75;
  const summaryBoxX = pageWidth - margin - summaryBoxW;
  const summaryY = y;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(summaryBoxX, summaryY, summaryBoxW, 30, 2, 2, 'FD');

  let sY = summaryY + 5;
  addText('Subtotal Partidas:', summaryBoxX + 4, sY, { fontSize: 8, color: [71, 85, 105] });
  addText(formatGTQ(grossSubtotal), summaryBoxX + summaryBoxW - 4, sY, { fontSize: 8, fontStyle: 'bold', align: 'right' });
  sY += 4.5;

  if (quote.discountPercent) {
    addText(`Descuento (${quote.discountPercent}%):`, summaryBoxX + 4, sY, { fontSize: 8, color: [225, 29, 72] });
    addText(`-${formatGTQ(discountVal)}`, summaryBoxX + summaryBoxW - 4, sY, { fontSize: 8, fontStyle: 'bold', color: [225, 29, 72], align: 'right' });
    sY += 4.5;
  }

  addText('IVA Débito Fiscal (12% SAT):', summaryBoxX + 4, sY, { fontSize: 8, color: [71, 85, 105] });
  addText(formatGTQ(ivaTaxVal), summaryBoxX + summaryBoxW - 4, sY, { fontSize: 8, fontStyle: 'bold', align: 'right' });
  sY += 5;

  doc.setFillColor(30, 58, 138);
  doc.rect(summaryBoxX, sY - 1, summaryBoxW, 9.5, 'F');

  addText('TOTAL PROPUESTA:', summaryBoxX + 4, sY + 5, {
    fontSize: 8.5,
    fontStyle: 'bold',
    color: [255, 255, 255],
  });
  addText(formatGTQ(grandTotalGTQ), summaryBoxX + summaryBoxW - 4, sY + 5, {
    fontSize: 10,
    fontStyle: 'bold',
    color: [255, 255, 255],
    align: 'right',
  });

  // Left Side: Terms and Conditions
  const termsW = usableWidth - summaryBoxW - 6;
  let tY = y + 2;

  addText('CONDICIONES COMERCIALES Y FORMA DE PAGO:', margin, tY, {
    fontSize: 7.5,
    fontStyle: 'bold',
    color: [30, 58, 138],
  });
  tY += 4;

  const defaultTerms = [
    '• Anticipo del 30% a la firma de contrato para movilización y compra de materiales.',
    '• 60% amortizado en estimaciones quincenales según avance físico verificado en bitácora.',
    '• 10% de fondo de garantía retenido contra entrega formal y finiquito de obra.',
    '• Precios sujetos a vigencia de 30 días calendario por fluctuaciones de acero y cemento.',
    '• Incluye supervisión colegiada, pruebas de probetas a 4,000 PSI y licencias municipales.',
  ];

  defaultTerms.forEach((line) => {
    addText(line, margin, tY, { fontSize: 7, color: [71, 85, 105], maxWidth: termsW });
    tY += 3.8;
  });

  // Additional note if present
  if (quote.notes) {
    tY += 1;
    addText(`Nota especial: ${quote.notes}`, margin, tY, {
      fontSize: 7,
      fontStyle: 'italic',
      color: [100, 116, 139],
      maxWidth: termsW,
    });
  }

  y = Math.max(summaryY + 34, tY + 4);

  // Signatures Section
  y = Math.min(y, pageHeight - 40);

  const sigW = 75;
  const sig1X = margin + 10;
  const sig2X = pageWidth - margin - sigW - 10;

  doc.setDrawColor(148, 163, 184);
  doc.line(sig1X, y + 14, sig1X + sigW, y + 14);
  doc.line(sig2X, y + 14, sig2X + sigW, y + 14);

  addText(company.architectName || 'Arq. Alejandro Morales', sig1X + sigW / 2, y + 18, {
    fontSize: 8,
    fontStyle: 'bold',
    color: [15, 23, 42],
    align: 'center',
  });
  addText(`Arquitecto Responsable • Col. ${company.architectColNumber || 'CIG-12940'}`, sig1X + sigW / 2, y + 21.5, {
    fontSize: 7,
    color: [100, 116, 139],
    align: 'center',
  });
  addText(company.commercialName || company.companyName, sig1X + sigW / 2, y + 25, {
    fontSize: 7,
    color: [100, 116, 139],
    align: 'center',
  });

  addText(quote.clientName, sig2X + sigW / 2, y + 18, {
    fontSize: 8,
    fontStyle: 'bold',
    color: [15, 23, 42],
    align: 'center',
  });
  addText('Firma de Aceptación del Cliente Propietario', sig2X + sigW / 2, y + 21.5, {
    fontSize: 7,
    color: [100, 116, 139],
    align: 'center',
  });
  addText(`NIT: ${quote.clientNit || 'CF'} • Fecha de Aceptación: ___________`, sig2X + sigW / 2, y + 25, {
    fontSize: 7,
    color: [100, 116, 139],
    align: 'center',
  });

  // Footer: Document Verification & Watermark
  addText(
    `Documento comercial generado por ConstructERP Guatemala • Certificación AGIES / COGUANOR • Página 1 de 1`,
    pageWidth / 2,
    pageHeight - 6,
    {
      fontSize: 6.5,
      color: [148, 163, 184],
      align: 'center',
    }
  );

  // Save / Download PDF
  const filename = `Cotizacion_${quote.quoteCode}_${quote.clientName.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}

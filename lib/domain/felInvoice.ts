/**
 * Reglas de negocio y cálculos para Facturas Electrónicas de Guatemala (FEL).
 *
 * Toda la información se ingresa manualmente por el usuario a partir de
 * facturas ya emitidas por el SAT (Agencia Virtual del Contribuyente).
 * No se usa ninguna API ni credenciales del SAT.
 */

import type { FelInvoice, FelInvoiceItem } from '@/lib/types';

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const IVA_RATE_GT = 0.12; // 12% IVA Guatemala

/**
 * Calcula el total de un ítem (quantity * unitPriceGTQ).
 */
export function calculateItemTotal(
  qty: number,
  unitPriceGTQ: number
): number {
  return round2(qty * unitPriceGTQ);
}

/**
 * Calcula el impuesto (IVA) de un ítem.
 */
export function calculateItemTax(
  totalPriceGTQ: number,
  taxRate: number = IVA_RATE_GT
): number {
  return round2(totalPriceGTQ * taxRate);
}

/**
 * Valida y normaliza un ítem de factura: recalcula totalPriceGTQ y taxAmountGTQ.
 */
export function normalizeFelInvoiceItem(item: FelInvoiceItem): FelInvoiceItem {
  const totalPriceGTQ = calculateItemTotal(
    item.quantity,
    item.unitPriceGTQ
  );
  const taxRate = item.taxRate ?? IVA_RATE_GT;
  const taxAmountGTQ = calculateItemTax(totalPriceGTQ, taxRate);

  return {
    ...item,
    totalPriceGTQ,
    taxAmountGTQ,
  };
}

/**
 * Valida y normaliza todos los ítems de una factura.
 */
export function normalizeFelInvoiceItems(items: FelInvoiceItem[]): FelInvoiceItem[] {
  return items.map(normalizeFelInvoiceItem);
}

/**
 * Calcula los totales de la factura (subtotal, IVA, total).
 */
export function calculateFelInvoiceTotals(
  items: FelInvoiceItem[]
): {
  subtotalGTQ: number;
  taxAmountGTQ: number;
  totalGTQ: number;
} {
  const subtotalGTQ = round2(
    items.reduce((sum, item) => sum + item.totalPriceGTQ, 0)
  );
  const taxAmountGTQ = round2(
    items.reduce((sum, item) => sum + (item.taxAmountGTQ ?? 0), 0)
  );
  const totalGTQ = round2(subtotalGTQ + taxAmountGTQ);

  return { subtotalGTQ, taxAmountGTQ, totalGTQ };
}

/**
 * Valida que una factura tenga los datos mínimos requeridos.
 * Retorna un array de mensajes de error (vacío si es válida).
 */
export function validateFelInvoice(invoice: FelInvoice): string[] {
  const errors: string[] = [];

  if (!invoice.dteNumber.trim()) {
    errors.push('El número de DTE es requerido');
  }
  if (!invoice.serie.trim()) {
    errors.push('La serie es requerida');
  }
  if (!invoice.correlativo.trim()) {
    errors.push('El correlativo es requerido');
  }
  if (!invoice.date) {
    errors.push('La fecha de emisión es requerida');
  }
  if (!invoice.emisor.nit.trim()) {
    errors.push('El NIT del emisor es requerido');
  }
  if (!invoice.emisor.nombre.trim()) {
    errors.push('El nombre del emisor es requerido');
  }
  if (!invoice.receptor.nit.trim()) {
    errors.push('El NIT del receptor es requerido');
  }
  if (!invoice.receptor.nombre.trim()) {
    errors.push('El nombre del receptor es requerido');
  }
  if (!invoice.receptor.direccion.trim()) {
    errors.push('La dirección del receptor es requerida');
  }
  if (invoice.items.length === 0) {
    errors.push('La factura debe tener al menos un ítem');
  } else {
    invoice.items.forEach((item, idx) => {
      if (!item.description.trim()) {
        errors.push(`Ítem ${idx + 1}: la descripción es requerida`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Ítem ${idx + 1}: la cantidad debe ser mayor a 0`);
      }
      if (!item.unitPriceGTQ || item.unitPriceGTQ < 0) {
        errors.push(`Ítem ${idx + 1}: el precio unitario es inválido`);
      }
    });
  }

  return errors;
}

/**
 * Formatea un número de DTE para impresión: "FAC-001-000000001"
 */
export function formatFelDteNumber(
  serie: string,
  correlativo: string
): string {
  return `${serie}-${correlativo.padStart(9, '0')}`;
}

/**
 * Genera un número de DTE provisional si el usuario aún no tiene el del SAT.
 * Formato: "MANUAL-{serie}-{correlativo}"
 */
export function generateProvisionalDteNumber(
  serie: string,
  correlativo: string
): string {
  return `MANUAL-${serie}-${correlativo.padStart(9, '0')}`;
}

/**
 * Formatea moneda GTQ para impresión.
 */
export function formatFelCurrency(value: number): string {
  return `Q ${value.toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

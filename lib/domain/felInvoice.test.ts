/**
 * Pruebas de los cálculos y validaciones de las Facturas Electrónicas (FEL).
 *
 * La regla de oro: el IVA de Guatemala es el 12 % y se aplica una sola vez
 * sobre el subtotal, nunca sobre el total.
 */

import { describe, expect, it } from 'vitest';
import {
  IVA_RATE_GT,
  IVA_RATE_PERCENT_GT,
  calculateFelInvoiceTotals,
  calculateItemTax,
  calculateItemTotal,
  formatFelDteNumber,
  formatFelCurrency,
  generateProvisionalDteNumber,
  normalizeFelInvoiceItem,
  normalizeFelInvoiceItems,
  toTaxFraction,
  validateFelInvoice,
} from '@/lib/domain/felInvoice';
import type { FelInvoice, FelInvoiceItem } from '@/lib/types';

const item = (overrides: Partial<FelInvoiceItem> = {}): FelInvoiceItem => ({
  id: 'item-1',
  description: 'Block de concreto',
  quantity: 10,
  unit: 'Und',
  unitPriceGTQ: 25,
  totalPriceGTQ: 0,
  taxRate: IVA_RATE_GT,
  taxAmountGTQ: 0,
  ...overrides,
});

const validInvoice = (overrides: Partial<FelInvoice> = {}): FelInvoice => ({
  id: 'fel-1',
  dteNumber: 'FAC-001-000000001',
  serie: 'F',
  correlativo: '000000001',
  date: '2026-03-15',
  status: 'Emitida',
  emisor: {
    nit: '1234567-8',
    nombre: 'Materiales La Unión',
    direccion: 'Zona 1, Guatemala',
    correo: 'ventas@launion.com',
  },
  receptor: {
    nit: 'CF',
    nombre: 'Constructora Origen',
    direccion: 'Zona 10, Guatemala',
    correo: 'compras@origen.gt',
  },
  items: [item()],
  subtotalGTQ: 250,
  taxAmountGTQ: 30,
  totalGTQ: 280,
  paymentMethod: 'Efectivo',
  ...overrides,
});

describe('IVA de Guatemala', () => {
  it('es el 12 % expresado como fracción y como porcentaje', () => {
    expect(IVA_RATE_GT).toBe(0.12);
    expect(IVA_RATE_PERCENT_GT).toBe(12);
  });

  it('normaliza la tasa: porcentaje o fracción dan el mismo resultado', () => {
    expect(toTaxFraction(12)).toBe(0.12);
    expect(toTaxFraction(12.5)).toBe(0.125);
    expect(toTaxFraction(0.12)).toBe(0.12);
    expect(toTaxFraction(0)).toBe(0);
    expect(toTaxFraction(-5)).toBe(0);
    // Nunca se permite una tasa mayor al 100 %.
    expect(toTaxFraction(500)).toBe(1);
  });
});

describe('cálculos por ítem', () => {
  it('totaliza cantidad por precio unitario', () => {
    expect(calculateItemTotal(10, 25)).toBe(250);
    expect(calculateItemTotal(1.5, 10.33)).toBe(15.5); // redondeo a 2 decimales
  });

  it('calcula el IVA del 12 % sobre el total del ítem', () => {
    expect(calculateItemTax(250)).toBe(30);
    expect(calculateItemTax(250, 0.12)).toBe(30);
  });

  it('normaliza la tasa en porcentaje guardada por formularios antiguos', () => {
    // Antes de la corrección, `taxRate: 12` producía un IVA de 1200 %.
    const normalized = normalizeFelInvoiceItem(item({ taxRate: 12 }));
    expect(normalized.taxRate).toBe(0.12);
    expect(normalized.totalPriceGTQ).toBe(250);
    expect(normalized.taxAmountGTQ).toBe(30);
  });

  it('recalcula total e impuesto al normalizar', () => {
    const normalized = normalizeFelInvoiceItem(
      item({ quantity: 10, unitPriceGTQ: 25, totalPriceGTQ: 999, taxAmountGTQ: 999 })
    );
    expect(normalized.totalPriceGTQ).toBe(250);
    expect(normalized.taxAmountGTQ).toBe(30);
  });

  it('normaliza una lista completa', () => {
    const normalized = normalizeFelInvoiceItems([item(), item({ id: 'item-2', quantity: 2 })]);
    expect(normalized).toHaveLength(2);
    expect(normalized.every((i) => i.taxRate === 0.12)).toBe(true);
  });
});

describe('totales de la factura', () => {
  it('total = subtotal + IVA', () => {
    const totals = calculateFelInvoiceTotals(normalizeFelInvoiceItems([item()]));
    expect(totals.subtotalGTQ).toBe(250);
    expect(totals.taxAmountGTQ).toBe(30);
    expect(totals.totalGTQ).toBe(280);
  });

  it('suma varios ítems', () => {
    const totals = calculateFelInvoiceTotals(
      normalizeFelInvoiceItems([item(), item({ id: 'item-2', quantity: 4, unitPriceGTQ: 100 })])
    );
    expect(totals.subtotalGTQ).toBe(650);
    expect(totals.taxAmountGTQ).toBe(78);
    expect(totals.totalGTQ).toBe(728);
  });

  it('no aplica el IVA dos veces cuando los ítems ya vienen normalizados', () => {
    const items = normalizeFelInvoiceItems([item()]);
    const totals = calculateFelInvoiceTotals(items);
    expect(totals.taxAmountGTQ).toBe(30);
    expect(totals.totalGTQ).toBe(280);
  });
});

describe('validación de la factura', () => {
  it('acepta una factura completa', () => {
    expect(validateFelInvoice(validInvoice())).toEqual([]);
  });

  it('exige número de DTE, serie, correlativo y fecha', () => {
    const errors = validateFelInvoice(
      validInvoice({ dteNumber: '', serie: '', correlativo: '', date: '' })
    );
    expect(errors).toContain('El número de DTE es requerido');
    expect(errors).toContain('La serie es requerida');
    expect(errors).toContain('El correlativo es requerido');
    expect(errors).toContain('La fecha de emisión es requerida');
  });

  it('exige los datos del emisor y del receptor', () => {
    const errors = validateFelInvoice(
      validInvoice({
        emisor: { nit: '', nombre: '', direccion: '', correo: '' },
        receptor: { nit: '', nombre: '', direccion: '', correo: '' },
      })
    );
    expect(errors).toContain('El NIT del emisor es requerido');
    expect(errors).toContain('El nombre del emisor es requerido');
    expect(errors).toContain('El NIT del receptor es requerido');
    expect(errors).toContain('El nombre del receptor es requerido');
    expect(errors).toContain('La dirección del receptor es requerida');
  });

  it('exige al menos un ítem válido', () => {
    expect(validateFelInvoice(validInvoice({ items: [] }))).toContain(
      'La factura debe tener al menos un ítem'
    );
    expect(
      validateFelInvoice(
        validInvoice({ items: [item({ quantity: 0, unitPriceGTQ: 0, description: '' })] })
      )
    ).toEqual([
      'Ítem 1: la descripción es requerida',
      'Ítem 1: la cantidad debe ser mayor a 0',
      'Ítem 1: el precio unitario es inválido',
    ]);
  });
});

describe('formato para impresión', () => {
  it('compone el número de DTE', () => {
    expect(formatFelDteNumber('FAC-001', '000000001')).toBe('FAC-001-000000001');
    expect(formatFelDteNumber('F', '25')).toBe('F-000000025');
  });

  it('genera un DTE provisional cuando la factura aún no viene del SAT', () => {
    expect(generateProvisionalDteNumber('F', '1')).toBe('MANUAL-F-000000001');
  });

  it('formatea montos en quetzales', () => {
    expect(formatFelCurrency(280)).toContain('280');
    expect(formatFelCurrency(280).trim().startsWith('Q')).toBe(true);
  });
});

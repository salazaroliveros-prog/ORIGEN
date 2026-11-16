import { describe, expect, it } from 'vitest';
import {
  getSubcontractExpiryAlerts,
  recordPurchaseReceipt,
  validatePurchaseOrder,
  validateSubcontract,
  validateSupplier,
  type PurchaseOrderRecord,
  type SubcontractRecord,
  type SupplierRecord,
} from './procurement';

const supplier: SupplierRecord = {
  id: 'supplier-1', companyId: 'company-1', name: ' Materiales del Norte ',
  nit: '1234567-8', phone: '+502 5555-5555', email: 'ventas@example.com',
  active: true, createdBy: 'user-1',
};

const order: PurchaseOrderRecord = {
  id: 'po-1', companyId: 'company-1', projectId: 'project-1',
  supplierId: 'supplier-1', number: 'OC-0001', status: 'approved',
  currency: 'GTQ',
  lines: [
    { itemId: 'cemento', description: 'Cemento', unit: 'saco', quantity: 10, receivedQuantity: 0, unitPriceGTQ: 75 },
    { itemId: 'arena', description: 'Arena', unit: 'm3', quantity: 2, receivedQuantity: 0, unitPriceGTQ: 100 },
  ],
  subtotalGTQ: 950, discountGTQ: 0, taxPercent: 12, taxGTQ: 114, totalGTQ: 1064,
  requestedBy: 'user-1', approvedBy: 'owner-1',
  createdAt: '2026-11-01T08:00:00.000Z', updatedAt: '2026-11-01T08:00:00.000Z',
};

const subcontract = (overrides: Partial<SubcontractRecord> = {}): SubcontractRecord => ({
  id: 'sub-1', companyId: 'company-1', projectId: 'project-1',
  supplierId: 'supplier-1', contractNumber: 'SUB-001',
  description: 'Instalación eléctrica', startDate: '2026-10-01',
  endDate: '2026-11-30', amountGTQ: 100_000, paidGTQ: 20_000,
  status: 'active', createdBy: 'user-1', ...overrides,
});

describe('procurement domain', () => {
  it('validates and normalizes supplier identity fields', () => {
    expect(validateSupplier(supplier).name).toBe('Materiales del Norte');
    expect(() => validateSupplier({ ...supplier, email: 'correo-invalido' })).toThrow('Correo');
  });

  it('validates approved purchase orders and their calculated tax totals', () => {
    expect(validatePurchaseOrder(order)).toEqual(order);
    expect(() => validatePurchaseOrder({ ...order, totalGTQ: 100 })).toThrow('totales');
    expect(() => validatePurchaseOrder({ ...order, approvedBy: undefined })).toThrow('autorizó');
  });

  it('rejects invalid tax rates, negative subtotals and unknown order states', () => {
    expect(() => validatePurchaseOrder({ ...order, subtotalGTQ: -1 })).toThrow('Subtotal');
    expect(() => validatePurchaseOrder({ ...order, taxPercent: 101 })).toThrow('Porcentaje de IVA');
    expect(() => validatePurchaseOrder({ ...order, status: 'unknown' as PurchaseOrderRecord['status'] })).toThrow('estado');
  });

  it('rejects supplier lengths and invalid subcontract states', () => {
    expect(() => validateSupplier({ ...supplier, name: 'x'.repeat(201) })).toThrow('longitud');
    expect(() => validateSupplier({ ...supplier, nit: '1'.repeat(31) })).toThrow('longitud');
    expect(() => validateSubcontract(subcontract({ status: 'unknown' as SubcontractRecord['status'] }))).toThrow('estado');
  });

  it('records partial and complete receipts without over-receiving', () => {
    const partial = recordPurchaseReceipt(order, [4, 1], '2026-11-02T10:00:00.000Z');
    expect(partial.status).toBe('partially_received');
    expect(partial.lines.map(line => line.receivedQuantity)).toEqual([4, 1]);
    const complete = recordPurchaseReceipt(partial, [6, 1], '2026-11-03T10:00:00.000Z');
    expect(complete.status).toBe('received');
    expect(() => recordPurchaseReceipt(complete, [1, 0], '2026-11-04T10:00:00.000Z')).toThrow('aprobadas');
    expect(() => recordPurchaseReceipt(order, [11, 0], '2026-11-02T10:00:00.000Z')).toThrow('supera lo pendiente');
  });

  it('rejects incomplete quantities marked as fully received', () => {
    expect(() => validatePurchaseOrder({
      ...order, status: 'received',
      lines: order.lines.map((line, i) => ({ ...line, receivedQuantity: i === 0 ? 10 : 0 })),
    })).toThrow('cantidades pendientes');
  });

  it('validates subcontract dates and prevents overpayment', () => {
    expect(validateSubcontract(subcontract())).toBeTruthy();
    expect(() => validateSubcontract(subcontract({ endDate: '2026-09-30' }))).toThrow('período');
    expect(() => validateSubcontract(subcontract({ paidGTQ: 100_001 }))).toThrow('superar');
  });

  it('creates ordered expiry alerts only for active contracts in the warning window', () => {
    const contracts = [
      subcontract({ id: 'expired', endDate: '2026-10-31' }),
      subcontract({ id: 'urgent', endDate: '2026-11-20' }),
      subcontract({ id: 'upcoming', endDate: '2026-11-28' }),
      subcontract({ id: 'far', endDate: '2027-01-01' }),
      subcontract({ id: 'completed', endDate: '2026-11-01', status: 'completed' }),
    ];
    const alerts = getSubcontractExpiryAlerts(contracts, '2026-11-16', 30);
    expect(alerts.map(alert => alert.subcontractId)).toEqual(['expired', 'urgent', 'upcoming']);
    expect(alerts[0].severity).toBe('expired');
    expect(alerts[1].severity).toBe('urgent');
  });
});

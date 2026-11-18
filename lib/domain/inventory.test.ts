import { describe, expect, it } from 'vitest';
import {
  applyStockMovement,
  applyWarehouseTransfer,
  calculateInventoryBalance,
  calculatePurchaseOrderTotals,
  getReorderAlerts,
  type InventoryBalance,
  type StockMovement,
} from './inventory';

const openingBalance: InventoryBalance = {
  itemId: 'cemento-42',
  warehouseId: 'bodega-obra-1',
  quantity: 10,
  averageUnitCostGTQ: 75,
  reorderLevel: 5,
};

const movement = (overrides: Partial<StockMovement> = {}): StockMovement => ({
  id: 'mov-1',
  companyId: 'company-1',
  projectId: 'project-1',
  itemId: 'cemento-42',
  warehouseId: 'bodega-obra-1',
  kind: 'purchase_receipt',
  quantity: 10,
  unitCostGTQ: 85,
  occurredAt: '2026-11-01T10:00:00.000Z',
  createdBy: 'user-1',
  ...overrides,
});

describe('inventory domain', () => {
  it('updates weighted average cost on receipt', () => {
    const result = applyStockMovement(openingBalance, movement());
    expect(result.quantity).toBe(20);
    expect(result.averageUnitCostGTQ).toBe(80);
  });

  it('preserves fractional material quantities to four decimal places', () => {
    const result = applyStockMovement(
      { ...openingBalance, quantity: 0 },
      movement({ quantity: 1.2345 })
    );
    expect(result.quantity).toBe(1.2345);
    const issued = applyStockMovement(
      result,
      movement({ kind: 'project_issue', quantity: 0.2345, unitCostGTQ: 0 })
    );
    expect(issued.quantity).toBe(1);
  });

  it('calculates a warehouse transfer atomically and preserves the source valuation', () => {
    const result = applyWarehouseTransfer(
      { ...openingBalance, quantity: 8, averageUnitCostGTQ: 80 },
      { ...openingBalance, warehouseId: 'bodega-general', quantity: 2, averageUnitCostGTQ: 70 },
      {
        id: 'transfer-001',
        companyId: 'company-1',
        itemId: 'cemento-42',
        fromWarehouseId: 'bodega-obra-1',
        toWarehouseId: 'bodega-general',
        quantity: 3,
        occurredAt: '2026-11-16T10:00:00.000Z',
        createdBy: 'user-1',
      }
    );

    expect(result.sourceBalance.quantity).toBe(5);
    expect(result.sourceBalance.averageUnitCostGTQ).toBe(80);
    expect(result.destinationBalance.quantity).toBe(5);
    expect(result.destinationBalance.averageUnitCostGTQ).toBe(76);
    expect(result.outgoing.kind).toBe('transfer_out');
    expect(result.incoming.kind).toBe('transfer_in');
    expect(result.outgoing.referenceId).toBe(result.incoming.referenceId);
    expect(result.outgoing.unitCostGTQ).toBe(result.incoming.unitCostGTQ);
  });

  it('rejects invalid warehouse transfers before calculating either balance', () => {
    const input = {
      id: 'transfer-invalid',
      companyId: 'company-1',
      itemId: 'cemento-42',
      fromWarehouseId: 'bodega-obra-1',
      toWarehouseId: 'bodega-general',
      quantity: 1,
      occurredAt: '2026-11-16T10:00:00.000Z',
      createdBy: 'user-1',
    };
    const source = { ...openingBalance, quantity: 2 };
    const destination = { ...openingBalance, warehouseId: 'bodega-general' };

    expect(() => applyWarehouseTransfer(source, destination, { ...input, quantity: 3 })).toThrow('Existencia insuficiente');
    expect(() => applyWarehouseTransfer(source, destination, { ...input, toWarehouseId: input.fromWarehouseId })).toThrow('diferentes');
    expect(() => applyWarehouseTransfer(source, destination, { ...input, occurredAt: 'fecha-invalida' })).toThrow('fecha');
    expect(() => applyWarehouseTransfer(source, destination, { ...input, id: 'transfer/con-invalid' })).toThrow('ID del traslado');
    expect(() => applyWarehouseTransfer(source, destination, { ...input, notes: 'x'.repeat(1001) })).toThrow('notas del traslado');
  });

  it('recalculates weighted-average cost for positive adjustments', () => {
    const result = applyStockMovement(
      { ...openingBalance, quantity: 10, averageUnitCostGTQ: 75 },
      movement({ kind: 'adjustment_in', quantity: 5, unitCostGTQ: 90 })
    );
    expect(result.quantity).toBe(15);
    expect(result.averageUnitCostGTQ).toBe(80);
  });

  it('preserves average cost for negative adjustments and rejects overdraws', () => {
    const adjusted = applyStockMovement(
      { ...openingBalance, quantity: 10, averageUnitCostGTQ: 75 },
      movement({ kind: 'adjustment_out', quantity: 4, unitCostGTQ: 75 })
    );
    expect(adjusted.quantity).toBe(6);
    expect(adjusted.averageUnitCostGTQ).toBe(75);
    expect(() => applyStockMovement(
      { ...openingBalance, quantity: 3 },
      movement({ kind: 'adjustment_out', quantity: 4 })
    )).toThrow('Existencia insuficiente');
  });

  it('rejects issue above available stock', () => {
    expect(() =>
      applyStockMovement(openingBalance, movement({ kind: 'project_issue', quantity: 11 }))
    ).toThrow('Existencia insuficiente');
  });

  it('resets weighted average cost when an outgoing movement depletes the warehouse', () => {
    const result = applyStockMovement(
      { ...openingBalance, quantity: 10, averageUnitCostGTQ: 82.35 },
      movement({ kind: 'transfer_out', quantity: 10, unitCostGTQ: 0 })
    );
    expect(result.quantity).toBe(0);
    expect(result.averageUnitCostGTQ).toBe(0);
  });

  it('rejects corrupted current balances before applying a movement', () => {
    expect(() => applyStockMovement({ ...openingBalance, quantity: -1 }, movement())).toThrow('existencia actual');
    expect(() => applyStockMovement({ ...openingBalance, averageUnitCostGTQ: Number.NaN }, movement())).toThrow('costo promedio actual');
  });

  it('rejects movements without audit identity or a valid timestamp', () => {
    expect(() => applyStockMovement(openingBalance, movement({ createdBy: '' }))).toThrow('ID, empresa y usuario');
    expect(() => applyStockMovement(openingBalance, movement({ occurredAt: 'fecha-invalida' }))).toThrow('fecha del movimiento');
  });

  it('orders movements by their actual instant even when timezone offsets differ', () => {
    const result = calculateInventoryBalance({
      itemId: 'cemento-42',
      warehouseId: 'bodega-obra-1',
      movements: [
        movement({ id: 'later', kind: 'project_issue', quantity: 2, unitCostGTQ: 0, occurredAt: '2026-11-01T12:00:00+02:00' }),
        movement({ id: 'earlier', quantity: 5, unitCostGTQ: 80, occurredAt: '2026-11-01T09:00:00Z' }),
      ],
    });
    expect(result.quantity).toBe(3);
    expect(result.averageUnitCostGTQ).toBe(80);
  });

  it('calculates stock in chronological order and ignores other warehouses', () => {
    const result = calculateInventoryBalance({
      itemId: 'cemento-42',
      warehouseId: 'bodega-obra-1',
      reorderLevel: 4,
      movements: [
        movement({ id: 'receipt', quantity: 10, unitCostGTQ: 80 }),
        movement({
          id: 'issue',
          kind: 'project_issue',
          quantity: 3,
          unitCostGTQ: 0,
          occurredAt: '2026-11-02T10:00:00.000Z',
        }),
        movement({ id: 'other', warehouseId: 'bodega-general', quantity: 100 }),
      ],
    });
    expect(result.quantity).toBe(7);
    expect(result.averageUnitCostGTQ).toBe(80);
  });

  it('rejects duplicate movement IDs', () => {
    const receipt = movement({ id: 'duplicate' });
    expect(() =>
      calculateInventoryBalance({
        itemId: receipt.itemId,
        warehouseId: receipt.warehouseId,
        movements: [receipt, receipt],
      })
    ).toThrow('Movimiento duplicado');
  });

  it('calculates purchase order subtotal, discount and Guatemala IVA', () => {
    expect(
      calculatePurchaseOrderTotals({
        lines: [
          { itemId: 'cemento', description: 'Cemento', quantity: 10, unit: 'saco', unitPriceGTQ: 75 },
          { itemId: 'arena', description: 'Arena', quantity: 2, unit: 'm3', unitPriceGTQ: 100 },
        ],
        discountPercent: 5,
      })
    ).toEqual({
      subtotalGTQ: 950,
      discountGTQ: 47.5,
      taxableBaseGTQ: 902.5,
      taxGTQ: 108.3,
      totalGTQ: 1010.8,
    });
  });

  it('rejects invalid purchase order lines and percentages', () => {
    expect(() =>
      calculatePurchaseOrderTotals({
        lines: [{ itemId: 'x', description: 'X', quantity: 0, unit: 'u', unitPriceGTQ: 1 }],
      })
    ).toThrow('cantidad');
    expect(() =>
      calculatePurchaseOrderTotals({
        lines: [{ itemId: 'x', description: 'X', quantity: 1, unit: 'u', unitPriceGTQ: 1 }],
        taxPercent: 120,
      })
    ).toThrow('no pueden superar');
  });

  it('alerts when stock is at or below reorder level', () => {
    expect(
      getReorderAlerts([
        { ...openingBalance, quantity: 5 },
        { ...openingBalance, warehouseId: 'bodega-2', quantity: 9 },
        { ...openingBalance, quantity: 0 },
      ])
    ).toHaveLength(2);
  });
});

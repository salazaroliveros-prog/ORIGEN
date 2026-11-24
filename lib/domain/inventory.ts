/**
 * Dominio de inventario de ORIGEN.
 *
 * Funciones puras para calcular existencias y validar movimientos antes de
 * conectar formularios, servicios y reglas de Firestore. Todos los importes
 * se expresan en GTQ y las cantidades deben usar la unidad del artículo.
 */

export type StockMovementKind =
  | 'opening'
  | 'purchase_receipt'
  | 'project_issue'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'return';

export interface InventoryBalance {
  itemId: string;
  warehouseId: string;
  quantity: number;
  averageUnitCostGTQ: number;
  reorderLevel: number;
}

export interface StockMovement {
  id: string;
  companyId: string;
  projectId?: string;
  itemId: string;
  warehouseId: string;
  kind: StockMovementKind;
  quantity: number;
  unitCostGTQ: number;
  occurredAt: string;
  referenceId?: string;
  balanceId?: string;
  receiptNumber?: string;
  /** Renglón de la orden al que pertenece la recepción. */
  lineIndex?: number;
  notes?: string;
  createdBy: string;
}

export interface PurchaseOrderLine {
  itemId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceGTQ: number;
}

export interface PurchaseOrderTotals {
  subtotalGTQ: number;
  discountGTQ: number;
  taxableBaseGTQ: number;
  taxGTQ: number;
  totalGTQ: number;
}

const roundCurrency = (amount: number): number => Math.round((amount + Number.EPSILON) * 100) / 100;
const roundQuantity = (amount: number): number =>
  Math.round((amount + Number.EPSILON) * 10_000) / 10_000;

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} debe ser un número mayor a cero.`);
  }
}

function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} no puede ser negativo ni inválido.`);
  }
}

/** Aplica un movimiento a un saldo sin permitir existencias negativas. */
export function applyStockMovement(
  balance: InventoryBalance,
  movement: StockMovement
): InventoryBalance {
  if (!balance.itemId.trim() || !balance.warehouseId.trim()) {
    throw new Error('El saldo debe identificar un artículo y una bodega.');
  }
  assertNonNegativeFinite(balance.quantity, 'La existencia actual');
  assertNonNegativeFinite(balance.averageUnitCostGTQ, 'El costo promedio actual');
  assertNonNegativeFinite(balance.reorderLevel, 'El mínimo de reorden');
  if (movement.itemId !== balance.itemId || movement.warehouseId !== balance.warehouseId) {
    throw new Error('El movimiento no corresponde al artículo y bodega del saldo.');
  }
  if (!movement.id.trim() || !movement.companyId.trim() || !movement.createdBy.trim()) {
    throw new Error('El movimiento debe identificar su ID, empresa y usuario creador.');
  }
  if (!Number.isFinite(Date.parse(movement.occurredAt))) {
    throw new Error('La fecha del movimiento no es válida.');
  }
  assertPositiveFinite(movement.quantity, 'La cantidad');
  assertNonNegativeFinite(movement.unitCostGTQ, 'El costo unitario');

  const incoming = [
    'opening',
    'purchase_receipt',
    'transfer_in',
    'adjustment_in',
    'return',
  ].includes(movement.kind);
  const outgoing = ['project_issue', 'transfer_out', 'adjustment_out'].includes(movement.kind);
  if (!incoming && !outgoing) throw new Error('Tipo de movimiento no reconocido.');

  if (outgoing) {
    if (movement.quantity > balance.quantity) {
      throw new Error('Existencia insuficiente para completar el movimiento.');
    }
    const remainingQuantity = roundQuantity(balance.quantity - movement.quantity);
    return {
      ...balance,
      quantity: remainingQuantity,
      // A fully depleted warehouse must not retain a stale average cost.
      averageUnitCostGTQ: remainingQuantity === 0 ? 0 : balance.averageUnitCostGTQ,
    };
  }

  const newQuantity = roundQuantity(balance.quantity + movement.quantity);
  const newAverage =
    newQuantity === 0
      ? 0
      : roundCurrency(
          (balance.quantity * balance.averageUnitCostGTQ +
            movement.quantity * movement.unitCostGTQ) /
            newQuantity
        );

  return {
    ...balance,
    quantity: newQuantity,
    averageUnitCostGTQ: newAverage,
  };
}

export interface WarehouseTransferInput {
  id: string;
  companyId: string;
  itemId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  occurredAt: string;
  createdBy: string;
  notes?: string;
}

export interface WarehouseTransferResult {
  outgoing: StockMovement;
  incoming: StockMovement;
  sourceBalance: InventoryBalance;
  destinationBalance: InventoryBalance;
}

/**
 * Calcula ambos lados de un traslado. No persiste datos: el servicio Firestore
 * debe escribir los dos movimientos y ambos saldos en una sola transacción.
 */
export function applyWarehouseTransfer(
  source: InventoryBalance,
  destination: InventoryBalance,
  input: WarehouseTransferInput
): WarehouseTransferResult {
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(input.id)) {
    throw new Error(
      'El ID del traslado debe contener entre 1 y 120 caracteres alfanuméricos, guion o guion bajo.'
    );
  }
  if (!input.companyId.trim() || !input.createdBy.trim()) {
    throw new Error('El traslado debe identificar su empresa y usuario creador.');
  }
  if (input.notes !== undefined && (typeof input.notes !== 'string' || input.notes.length > 1000)) {
    throw new Error('Las notas del traslado no pueden superar 1000 caracteres.');
  }
  if (!input.itemId.trim() || !input.fromWarehouseId.trim() || !input.toWarehouseId.trim()) {
    throw new Error('El traslado debe identificar el artículo y las dos bodegas.');
  }
  if (input.fromWarehouseId === input.toWarehouseId) {
    throw new Error('La bodega de origen y destino deben ser diferentes.');
  }
  assertPositiveFinite(input.quantity, 'La cantidad del traslado');
  if (!Number.isFinite(Date.parse(input.occurredAt))) {
    throw new Error('La fecha del traslado no es válida.');
  }
  if (
    source.itemId !== input.itemId ||
    destination.itemId !== input.itemId ||
    source.warehouseId !== input.fromWarehouseId ||
    destination.warehouseId !== input.toWarehouseId
  ) {
    throw new Error('Los saldos no corresponden al artículo y bodegas del traslado.');
  }

  const unitCostGTQ = source.averageUnitCostGTQ;
  const base = {
    companyId: input.companyId,
    itemId: input.itemId,
    quantity: input.quantity,
    unitCostGTQ,
    occurredAt: input.occurredAt,
    referenceId: input.id,
    createdBy: input.createdBy,
    ...(input.notes ? { notes: input.notes } : {}),
  };
  const outgoing: StockMovement = {
    ...base,
    id: `tr_${input.id}_out`,
    warehouseId: input.fromWarehouseId,
    kind: 'transfer_out',
  };
  const incoming: StockMovement = {
    ...base,
    id: `tr_${input.id}_in`,
    warehouseId: input.toWarehouseId,
    kind: 'transfer_in',
  };

  return {
    outgoing,
    incoming,
    sourceBalance: applyStockMovement(source, outgoing),
    destinationBalance: applyStockMovement(destination, incoming),
  };
}

/** Construye el saldo de una combinación artículo/bodega a partir de movimientos. */
export function calculateInventoryBalance(params: {
  itemId: string;
  warehouseId: string;
  reorderLevel?: number;
  movements: StockMovement[];
}): InventoryBalance {
  const { itemId, warehouseId, movements, reorderLevel = 0 } = params;
  if (!itemId.trim() || !warehouseId.trim()) {
    throw new Error('El cálculo requiere un artículo y una bodega.');
  }
  if (!Array.isArray(movements)) throw new Error('El historial de movimientos no es válido.');
  assertNonNegativeFinite(reorderLevel, 'El mínimo de reorden');
  const relevant = movements
    .filter((movement) => movement.itemId === itemId && movement.warehouseId === warehouseId)
    .sort(
      (a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id.localeCompare(b.id)
    );

  let balance: InventoryBalance = {
    itemId,
    warehouseId,
    quantity: 0,
    averageUnitCostGTQ: 0,
    reorderLevel,
  };
  const processedIds = new Set<string>();

  for (const movement of relevant) {
    if (processedIds.has(movement.id)) {
      throw new Error(`Movimiento duplicado: ${movement.id}`);
    }
    processedIds.add(movement.id);
    balance = applyStockMovement(balance, movement);
  }

  return balance;
}

/** Calcula subtotal, descuento e IVA de una orden de compra. */
export function calculatePurchaseOrderTotals(params: {
  lines: PurchaseOrderLine[];
  discountPercent?: number;
  taxPercent?: number;
}): PurchaseOrderTotals {
  const { lines, discountPercent = 0, taxPercent = 12 } = params;
  assertNonNegativeFinite(discountPercent, 'El descuento');
  assertNonNegativeFinite(taxPercent, 'El IVA');
  if (discountPercent > 100 || taxPercent > 100) {
    throw new Error('Los porcentajes no pueden superar 100%.');
  }
  if (lines.length === 0) throw new Error('La orden de compra debe incluir al menos un renglón.');

  const subtotalGTQ = roundCurrency(
    lines.reduce((sum, line) => {
      assertPositiveFinite(line.quantity, 'La cantidad del renglón');
      assertNonNegativeFinite(line.unitPriceGTQ, 'El precio unitario');
      if (!line.itemId.trim() || !line.description.trim() || !line.unit.trim()) {
        throw new Error('Cada renglón requiere artículo, descripción y unidad.');
      }
      return sum + line.quantity * line.unitPriceGTQ;
    }, 0)
  );
  const discountGTQ = roundCurrency(subtotalGTQ * (discountPercent / 100));
  const taxableBaseGTQ = roundCurrency(subtotalGTQ - discountGTQ);
  const taxGTQ = roundCurrency(taxableBaseGTQ * (taxPercent / 100));

  return {
    subtotalGTQ,
    discountGTQ,
    taxableBaseGTQ,
    taxGTQ,
    totalGTQ: roundCurrency(taxableBaseGTQ + taxGTQ),
  };
}

/** Identifica artículos que alcanzaron o bajaron del mínimo de reorden. */
export function getReorderAlerts(balances: InventoryBalance[]): InventoryBalance[] {
  return balances.filter(
    (balance) =>
      Number.isFinite(balance.quantity) &&
      Number.isFinite(balance.reorderLevel) &&
      balance.reorderLevel > 0 &&
      balance.quantity <= balance.reorderLevel
  );
}

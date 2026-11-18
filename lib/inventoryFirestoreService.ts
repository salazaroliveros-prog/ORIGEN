/**
 * Persistencia Firestore para inventario y abastecimiento de ORIGEN.
 *
 * Este módulo crea los documentos base y suscripciones por empresa. Las
 * recepciones de compra y los movimientos que cambian existencias se mantienen
 * fuera de este módulo hasta contar con una operación transaccional que los
 * registre conjuntamente.
 */
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  type Transaction,
  type Unsubscribe,
} from 'firebase/firestore';

import { getDbOrThrow, handleFirestoreError, OperationType } from './firebaseService';
import {
  getSubcontractExpiryAlerts,
  recordPurchaseReceipt,
  validatePurchaseOrder,
  validateSubcontract,
  validateSupplier,
  isValidCalendarDate,
  type PurchaseOrderRecord,
  type SubcontractRecord,
  type SubcontractPaymentRecord,
  type SupplierRecord,
} from './domain/procurement';
import { stripUndefined } from './utils/firestorePayload';
import type { ExpenseRecord } from './types';
import {
  applyStockMovement,
  applyWarehouseTransfer,
  type InventoryBalance,
  type StockMovement,
} from './domain/inventory';

export interface WarehouseRecord {
  id: string;
  companyId: string;
  name: string;
  type: 'general' | 'project';
  projectId?: string;
  active: boolean;
  createdBy: string;
}

export interface InventoryItemRecord {
  id: string;
  companyId: string;
  name: string;
  unit: string;
  reorderLevel: number;
  active: boolean;
  createdBy: string;
}

export interface InventoryBalanceRecord extends InventoryBalance {
  id: string;
  companyId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMovementId: string;
}

export interface PurchaseReceiptResult {
  order: PurchaseOrderRecord;
  movement: StockMovement;
  balance: InventoryBalanceRecord;
  alreadyProcessed: boolean;
}

type WarehouseInput = Omit<WarehouseRecord, 'id' | 'companyId' | 'createdBy'>;
type InventoryItemInput = Omit<InventoryItemRecord, 'id' | 'companyId' | 'createdBy'>;
type SupplierInput = Omit<SupplierRecord, 'id' | 'companyId' | 'createdBy'>;
type SubcontractInput = Omit<SubcontractRecord, 'id' | 'companyId' | 'createdBy'>;
type PurchaseOrderLineInput = Omit<PurchaseOrderRecord['lines'][number], 'receivedQuantity'> & {
  receivedQuantity?: number;
};
type PurchaseOrderInput = Omit<
  PurchaseOrderRecord,
  'id' | 'companyId' | 'requestedBy' | 'createdAt' | 'updatedAt' | 'lines'
> & {
  lines: PurchaseOrderLineInput[];
  createdAt?: string;
  updatedAt?: string;
};

function assertSafeDocumentId(value: string, label: string): void {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(value)) {
    throw new Error(`${label} contiene caracteres no permitidos.`);
  }
}

function assertText(value: string, label: string, maxLength: number): void {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new Error(`${label} es obligatorio y debe tener máximo ${maxLength} caracteres.`);
  }
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} debe ser un número válido igual o mayor a cero.`);
  }
}

async function persistNewRecord<T extends { id: string }>(
  collectionName: string,
  record: T
): Promise<void> {
  const db = getDbOrThrow();
  const ref = doc(collection(db, collectionName), record.id);
  try {
    // No se usa merge: las reglas deben evaluar una creación, no una
    // actualización accidental de un documento histórico con el mismo ID.
    await runTransaction(db, async (transaction: Transaction) => {
      transaction.set(ref, stripUndefined(record));
    });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.CREATE, `${collectionName}/${record.id}`);
  }
}

async function assertCompanyReference(
  transaction: Transaction,
  collectionName: string,
  id: string,
  companyId: string,
  label: string
): Promise<void> {
  assertSafeDocumentId(id, label);
  const snapshot = await transaction.get(doc(getDbOrThrow(), collectionName, id));
  if (!snapshot.exists() || snapshot.data().companyId !== companyId) {
    throw new Error(`${label} no existe o no pertenece a la empresa activa.`);
  }
}

export async function createSupplierToFirestore(
  input: SupplierInput,
  companyId: string,
  userId: string
): Promise<SupplierRecord> {
  const db = getDbOrThrow();
  const ref = doc(collection(db, 'suppliers'));
  assertText(companyId, 'Empresa', 128);
  assertText(userId, 'Usuario creador', 128);
  const supplier = validateSupplier({ ...input, id: ref.id, companyId, createdBy: userId });
  await persistNewRecord('suppliers', supplier);
  return supplier;
}

export async function createWarehouseToFirestore(
  input: WarehouseInput,
  companyId: string,
  userId: string
): Promise<WarehouseRecord> {
  assertText(input.name, 'Nombre de bodega', 150);
  if (input.type !== 'general' && input.type !== 'project') {
    throw new Error('El tipo de bodega no es válido.');
  }
  assertText(companyId, 'Empresa', 128);
  assertText(userId, 'Usuario creador', 128);
  if (typeof input.active !== 'boolean') throw new Error('El estado de la bodega no es válido.');
  if (input.type === 'general' && input.projectId) {
    throw new Error('Una bodega general no debe tener un proyecto asignado.');
  }
  if (input.type === 'project' && !input.projectId) {
    throw new Error('Una bodega de proyecto debe tener un proyecto asignado.');
  }
  const db = getDbOrThrow();
  const ref = doc(collection(db, 'warehouses'));
  const warehouse: WarehouseRecord = {
    id: ref.id,
    companyId,
    name: input.name.trim(),
    type: input.type,
    ...(input.type === 'project' ? { projectId: input.projectId } : {}),
    active: input.active,
    createdBy: userId,
  };
  await runTransaction(db, async (transaction: Transaction) => {
    if (warehouse.projectId) {
      await assertCompanyReference(transaction, 'projects', warehouse.projectId, companyId, 'Proyecto');
    }
    transaction.set(ref, stripUndefined(warehouse));
  }).catch((error: unknown) => {
    throw handleFirestoreError(error, OperationType.CREATE, `warehouses/${ref.id}`);
  });
  return warehouse;
}

export async function createInventoryItemToFirestore(
  input: InventoryItemInput,
  companyId: string,
  userId: string
): Promise<InventoryItemRecord> {
  assertText(input.name, 'Nombre de artículo', 200);
  assertText(input.unit, 'Unidad de medida', 32);
  assertText(companyId, 'Empresa', 128);
  assertText(userId, 'Usuario creador', 128);
  assertFiniteNonNegative(input.reorderLevel, 'Mínimo de reorden');
  if (typeof input.active !== 'boolean') throw new Error('El estado del artículo no es válido.');
  const db = getDbOrThrow();
  const ref = doc(collection(db, 'inventoryItems'));
  const item: InventoryItemRecord = {
    id: ref.id,
    companyId,
    name: input.name.trim(),
    unit: input.unit.trim(),
    reorderLevel: input.reorderLevel,
    active: input.active,
    createdBy: userId,
  };
  await persistNewRecord('inventoryItems', item);
  return item;
}

export async function createPurchaseOrderToFirestore(
  input: PurchaseOrderInput,
  companyId: string,
  userId: string
): Promise<PurchaseOrderRecord> {
  const db = getDbOrThrow();
  const ref = doc(collection(db, 'purchaseOrders'));
  const now = new Date().toISOString();
  assertText(companyId, 'Empresa', 128);
  assertText(userId, 'Usuario solicitante', 128);
  if (!Array.isArray(input.lines) || input.lines.length < 1 || input.lines.length > 2) {
    throw new Error('Cada orden debe contener entre 1 y 2 renglones.');
  }
  const order = validatePurchaseOrder({
    ...input,
    id: ref.id,
    companyId,
    requestedBy: userId,
    lines: input.lines.map((line) => ({ ...line, receivedQuantity: line.receivedQuantity ?? 0 })),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  });
  if (order.status !== 'draft') {
    throw new Error('Una orden nueva debe crearse como borrador; la aprobación se habilitará con el flujo auditable.');
  }

  try {
    await runTransaction(db, async (transaction: Transaction) => {
      await assertCompanyReference(transaction, 'projects', order.projectId, companyId, 'Proyecto');
      await assertCompanyReference(transaction, 'suppliers', order.supplierId, companyId, 'Proveedor');
      const uniqueItemIds = [...new Set(order.lines.map((line) => line.itemId))];
      for (const itemId of uniqueItemIds) {
        await assertCompanyReference(transaction, 'inventoryItems', itemId, companyId, 'Artículo');
      }
      transaction.set(ref, stripUndefined(order));
    });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.CREATE, `purchaseOrders/${ref.id}`);
  }
  return order;
}

/**
 * Aprueba una orden de compra. Esta transición no modifica existencias:
 * únicamente registra quién autorizó y cuándo.
 */
export async function approvePurchaseOrderToFirestore(
  orderId: string,
  companyId: string,
  userId: string
): Promise<PurchaseOrderRecord> {
  assertSafeDocumentId(orderId, 'Orden de compra');
  assertText(companyId, 'Empresa', 128);
  assertText(userId, 'Usuario que aprueba', 128);
  const db = getDbOrThrow();
  const orderRef = doc(db, 'purchaseOrders', orderId);
  const now = new Date().toISOString();

  try {
    return await runTransaction(db, async (transaction: Transaction) => {
      const snapshot = await transaction.get(orderRef);
      if (!snapshot.exists()) throw new Error('La orden de compra no existe.');
      const current = snapshot.data() as PurchaseOrderRecord;
      if (current.companyId !== companyId) throw new Error('La orden no pertenece a la empresa activa.');
      if (current.status !== 'draft') throw new Error('Solo se pueden aprobar órdenes en borrador.');
      const approved = validatePurchaseOrder({
        ...current,
        status: 'approved',
        approvedBy: userId,
        updatedAt: now,
      });
      transaction.update(orderRef, {
        status: approved.status,
        approvedBy: approved.approvedBy,
        updatedAt: approved.updatedAt,
      });
      return approved;
    });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.UPDATE, `purchaseOrders/${orderId}`);
  }
}

/**
 * Recibe una entrega de una OC de un solo renglón. El movimiento, el saldo
 * ponderado y la cantidad recibida de la OC se confirman en una sola
 * transacción. El número de recepción es la clave de idempotencia por orden.
 */
export async function receivePurchaseOrderToWarehouse(input: {
  orderId: string;
  lineIndex: number;
  warehouseId: string;
  quantity: number;
  receiptNumber: string;
  companyId: string;
  userId: string;
}): Promise<PurchaseReceiptResult> {
  const { orderId, lineIndex, warehouseId, quantity, receiptNumber, companyId, userId } = input;
  assertSafeDocumentId(orderId, 'Orden de compra');
  assertSafeDocumentId(warehouseId, 'Bodega');
  assertText(companyId, 'Empresa', 128);
  assertText(userId, 'Usuario que recibe', 128);
  if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex > 1) {
    throw new Error('El renglón de la orden no es válido.');
  }
  assertFiniteNonNegative(quantity, 'Cantidad recibida');
  if (quantity <= 0) throw new Error('La cantidad recibida debe ser mayor a cero.');
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(receiptNumber.trim())) {
    throw new Error('El número de recepción solo puede contener letras, números, guion y guion bajo (máximo 40).');
  }

  const db = getDbOrThrow();
  const orderRef = doc(db, 'purchaseOrders', orderId);
  const warehouseRef = doc(db, 'warehouses', warehouseId);
  const now = new Date().toISOString();

  try {
    return await runTransaction(db, async (transaction: Transaction) => {
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists()) throw new Error('La orden de compra no existe.');
      const order = orderSnapshot.data() as PurchaseOrderRecord;
      if (order.companyId !== companyId) throw new Error('La orden no pertenece a la empresa activa.');
      if (!Array.isArray(order.lines) || order.lines.length < 1 || order.lines.length > 2 || lineIndex >= order.lines.length) {
        throw new Error('El renglón seleccionado no existe en esta orden.');
      }

      const line = order.lines[lineIndex];
      const itemId = line.itemId;
      assertSafeDocumentId(itemId, 'Artículo');
      if (warehouseId.length > 55 || itemId.length > 55 || orderId.length > 55) {
        throw new Error('El identificador de bodega, artículo u orden supera el límite para referencias de inventario.');
      }

      const balanceId = `bal_${warehouseId}_${itemId}`;
      const movementId = `rec_${orderId}_${lineIndex}_${receiptNumber.trim()}`;
      assertSafeDocumentId(balanceId, 'Saldo de inventario');
      assertSafeDocumentId(movementId, 'Movimiento de inventario');
      const balanceRef = doc(db, 'inventoryBalances', balanceId);
      const movementRef = doc(db, 'stockMovements', movementId);
      const itemRef = doc(db, 'inventoryItems', itemId);

      const [warehouseSnapshot, itemSnapshot, balanceSnapshot, movementSnapshot] = await Promise.all([
        transaction.get(warehouseRef),
        transaction.get(itemRef),
        transaction.get(balanceRef),
        transaction.get(movementRef),
      ]);

      if (movementSnapshot.exists()) {
        const previous = movementSnapshot.data() as StockMovement;
        if (!balanceSnapshot.exists()) {
          throw new Error('Se encontró una recepción previa sin saldo asociado. Se requiere revisión de inventario.');
        }
        if (
          previous.companyId === companyId &&
          previous.referenceId === orderId &&
          previous.lineIndex === lineIndex &&
          previous.receiptNumber === receiptNumber.trim() &&
          previous.warehouseId === warehouseId &&
          previous.itemId === itemId &&
          previous.quantity === quantity &&
          previous.unitCostGTQ === line.unitPriceGTQ
        ) {
          const previousBalance = balanceSnapshot.data() as InventoryBalanceRecord;
          if (
            previousBalance.companyId !== companyId ||
            previousBalance.warehouseId !== warehouseId ||
            previousBalance.itemId !== itemId ||
            previousBalance.id !== balanceId
          ) {
            throw new Error('El saldo asociado a la recepción no coincide con la empresa, bodega o artículo.');
          }
          return {
            order,
            movement: previous,
            balance: previousBalance,
            alreadyProcessed: true,
          };
        }
        throw new Error('El número de recepción ya fue utilizado para otro movimiento.');
      }

      if (!['approved', 'partially_received'].includes(order.status)) {
        throw new Error('Solo se pueden recibir órdenes aprobadas.');
      }
      if (!order.approvedBy) throw new Error('La orden no tiene una aprobación registrada.');
      if (!warehouseSnapshot.exists()) throw new Error('La bodega seleccionada no existe.');
      const warehouse = warehouseSnapshot.data() as WarehouseRecord;
      if (warehouse.companyId !== companyId || !warehouse.active) {
        throw new Error('La bodega no está activa o no pertenece a la empresa.');
      }
      if (warehouse.type === 'project' && warehouse.projectId !== order.projectId) {
        throw new Error('La bodega pertenece a otro proyecto.');
      }
      if (!itemSnapshot.exists()) throw new Error('El artículo de la orden ya no existe.');
      const item = itemSnapshot.data() as InventoryItemRecord;
      if (item.companyId !== companyId || !item.active) {
        throw new Error('El artículo no está activo o no pertenece a la empresa.');
      }

      const movement: StockMovement = {
        id: movementId,
        companyId,
        projectId: order.projectId,
        itemId,
        warehouseId,
        kind: 'purchase_receipt',
        quantity,
        unitCostGTQ: line.unitPriceGTQ,
        occurredAt: now,
        referenceId: orderId,
        balanceId,
        receiptNumber: receiptNumber.trim(),
        lineIndex,
        createdBy: userId,
      };
      const previousBalance: InventoryBalance = balanceSnapshot.exists()
        ? {
            itemId,
            warehouseId,
            quantity: Number(balanceSnapshot.data().quantity),
            averageUnitCostGTQ: Number(balanceSnapshot.data().averageUnitCostGTQ),
            reorderLevel: item.reorderLevel,
          }
        : {
            itemId,
            warehouseId,
            quantity: 0,
            averageUnitCostGTQ: 0,
            reorderLevel: item.reorderLevel,
          };

      if (balanceSnapshot.exists() && balanceSnapshot.data().companyId !== companyId) {
        throw new Error('El saldo de inventario no pertenece a la empresa activa.');
      }

      const nextBalance = applyStockMovement(previousBalance, movement);
      const receivedQuantities = order.lines.map((_, index) => index === lineIndex ? quantity : 0);
      const updatedOrder = recordPurchaseReceipt(order, receivedQuantities, now);
      updatedOrder.lastReceiptMovementId = movementId;

      const balance: InventoryBalanceRecord = {
        id: balanceId,
        companyId,
        itemId,
        warehouseId,
        quantity: nextBalance.quantity,
        averageUnitCostGTQ: nextBalance.averageUnitCostGTQ,
        reorderLevel: nextBalance.reorderLevel,
        createdBy: balanceSnapshot.exists() ? String(balanceSnapshot.data().createdBy) : userId,
        createdAt: balanceSnapshot.exists() ? String(balanceSnapshot.data().createdAt) : now,
        updatedAt: now,
        lastMovementId: movementId,
      };

      transaction.set(movementRef, stripUndefined(movement));
      transaction.set(balanceRef, stripUndefined(balance));
      transaction.update(orderRef, {
        lines: updatedOrder.lines,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt,
        lastReceiptMovementId: movementId,
      });

      return { order: updatedOrder, movement, balance, alreadyProcessed: false };
    });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.UPDATE, `purchaseOrders/${orderId}`);
  }
}


export interface OpeningStockResult {
  movement: StockMovement;
  balance: InventoryBalanceRecord;
  alreadyProcessed: boolean;
}

/**
 * Registers the initial physical stock for an item/warehouse pair.
 * The opening movement is append-only and the first balance is created in
 * the same transaction. An existing balance permanently prevents a second
 * opening for that pair, even after the quantity later reaches zero.
 */
export async function recordOpeningStockToFirestore(input: {
  movementId: string;
  itemId: string;
  warehouseId: string;
  quantity: number;
  unitCostGTQ: number;
  reference: string;
  notes?: string;
  companyId: string;
  userId: string;
}): Promise<OpeningStockResult> {
  const {
    movementId, itemId, warehouseId, quantity, unitCostGTQ,
    reference, notes, companyId, userId,
  } = input;
  assertSafeDocumentId(movementId, 'Movimiento de inventario inicial');
  assertSafeDocumentId(itemId, 'Artículo');
  assertSafeDocumentId(warehouseId, 'Bodega');
  assertText(companyId, 'Empresa', 128);
  assertText(userId, 'Usuario que registra', 128);
  assertText(reference, 'Referencia de inventario inicial', 100);
  assertFiniteNonNegative(quantity, 'Cantidad inicial');
  if (quantity <= 0) throw new Error('La cantidad inicial debe ser mayor a cero.');
  assertFiniteNonNegative(unitCostGTQ, 'Costo unitario inicial');
  if (notes !== undefined && (typeof notes !== 'string' || notes.length > 1000)) {
    throw new Error('Las notas no pueden superar 1000 caracteres.');
  }
  if (warehouseId.length > 55 || itemId.length > 55) {
    throw new Error('El identificador de bodega o artículo supera el límite para referencias de inventario.');
  }

  const db = getDbOrThrow();
  const balanceId = `bal_${warehouseId}_${itemId}`;
  assertSafeDocumentId(balanceId, 'Saldo de inventario');
  const movementRef = doc(db, 'stockMovements', movementId);
  const balanceRef = doc(db, 'inventoryBalances', balanceId);
  const warehouseRef = doc(db, 'warehouses', warehouseId);
  const itemRef = doc(db, 'inventoryItems', itemId);
  const now = new Date().toISOString();

  try {
    // Reference metadata is preflighted outside the transaction. Firestore
    // rules revalidate company, active state and project ownership at commit.
    const previousMovement = await getDoc(movementRef);
    let warehouse: WarehouseRecord | null = null;
    let item: InventoryItemRecord | null = null;

    if (!previousMovement.exists()) {
      const [warehouseSnapshot, itemSnapshot] = await Promise.all([
        getDoc(warehouseRef),
        getDoc(itemRef),
      ]);
      if (!warehouseSnapshot.exists()) throw new Error('La bodega seleccionada no existe.');
      if (!itemSnapshot.exists()) throw new Error('El artículo seleccionado no existe.');
      warehouse = warehouseSnapshot.data() as WarehouseRecord;
      item = itemSnapshot.data() as InventoryItemRecord;
      if (warehouse.companyId !== companyId || !warehouse.active) {
        throw new Error('La bodega no está activa o no pertenece a la empresa.');
      }
      if (item.companyId !== companyId || !item.active) {
        throw new Error('El artículo no está activo o no pertenece a la empresa.');
      }
      if (warehouse.type === 'project' && !warehouse.projectId) {
        throw new Error('La bodega de proyecto no tiene un proyecto asignado.');
      }
    }

    return await runTransaction(db, async (transaction: Transaction) => {
      const [movementSnapshot, balanceSnapshot] = await Promise.all([
        transaction.get(movementRef),
        transaction.get(balanceRef),
      ]);

      if (movementSnapshot.exists()) {
        const previous = movementSnapshot.data() as StockMovement;
        if (!balanceSnapshot.exists()) {
          throw new Error('Se encontró un movimiento inicial sin saldo asociado. Se requiere revisión de inventario.');
        }
        const previousBalance = balanceSnapshot.data() as InventoryBalanceRecord;
        const sameOperation =
          previous.id === movementId &&
          previous.kind === 'opening' &&
          previous.companyId === companyId &&
          previous.itemId === itemId &&
          previous.warehouseId === warehouseId &&
          previous.quantity === quantity &&
          previous.unitCostGTQ === unitCostGTQ &&
          previous.referenceId === reference.trim() &&
          previous.createdBy === userId;
        if (!sameOperation) {
          throw new Error('El ID del movimiento inicial ya fue utilizado para otra operación.');
        }
        if (
          previous.balanceId !== balanceId ||
          previousBalance.id !== balanceId ||
          previousBalance.companyId !== companyId ||
          previousBalance.itemId !== itemId ||
          previousBalance.warehouseId !== warehouseId
        ) {
          throw new Error('El saldo del inventario inicial no coincide con la empresa, artículo o bodega.');
        }
        assertFiniteNonNegative(previousBalance.quantity, 'La existencia del saldo inicial');
        assertFiniteNonNegative(previousBalance.averageUnitCostGTQ, 'El costo promedio del saldo inicial');
        return { movement: previous, balance: previousBalance, alreadyProcessed: true };
      }

      if (balanceSnapshot.exists()) {
        throw new Error('Esta combinación de artículo y bodega ya tiene historial. Usa un ajuste de inventario, no otra apertura.');
      }
      if (!warehouse || !item) {
        throw new Error('No se pudieron validar las referencias del inventario inicial.');
      }

      const movement: StockMovement = {
        id: movementId,
        companyId,
        ...(warehouse.type === 'project' && warehouse.projectId ? { projectId: warehouse.projectId } : {}),
        itemId,
        warehouseId,
        kind: 'opening',
        quantity,
        unitCostGTQ,
        occurredAt: now,
        referenceId: reference.trim(),
        balanceId,
        notes: notes?.trim() || undefined,
        createdBy: userId,
      };
      const next = applyStockMovement(
        {
          itemId,
          warehouseId,
          quantity: 0,
          averageUnitCostGTQ: 0,
          reorderLevel: item.reorderLevel,
        },
        movement
      );
      const balance: InventoryBalanceRecord = {
        id: balanceId,
        companyId,
        itemId,
        warehouseId,
        quantity: next.quantity,
        averageUnitCostGTQ: next.averageUnitCostGTQ,
        reorderLevel: next.reorderLevel,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        lastMovementId: movementId,
      };

      transaction.set(movementRef, stripUndefined(movement));
      transaction.set(balanceRef, stripUndefined(balance));
      return { movement, balance, alreadyProcessed: false };
    });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.CREATE, `inventoryBalances/${balanceId}`);
  }
}

export interface StockAdjustmentResult {
  movement: StockMovement;
  balance: InventoryBalanceRecord;
  alreadyProcessed: boolean;
}

/**
 * Records a physical stock reconciliation without mutating the ledger.
 * Adjustment movement and balance update are committed in one transaction.
 * Outgoing adjustments use the current weighted-average cost; incoming
 * adjustments require the counted unit cost supplied by the operator.
 */
export async function adjustInventoryStockToFirestore(input: {
  movementId: string;
  itemId: string;
  warehouseId: string;
  kind: 'adjustment_in' | 'adjustment_out';
  quantity: number;
  unitCostGTQ?: number;
  reference: string;
  reason: string;
  companyId: string;
  userId: string;
}): Promise<StockAdjustmentResult> {
  const {
    movementId, itemId, warehouseId, kind, quantity, unitCostGTQ,
    reference, reason, companyId, userId,
  } = input;
  assertSafeDocumentId(movementId, 'Movimiento de ajuste');
  assertSafeDocumentId(itemId, 'Artículo');
  assertSafeDocumentId(warehouseId, 'Bodega');
  assertText(companyId, 'Empresa', 128);
  assertText(userId, 'Usuario que registra', 128);
  assertText(reference, 'Referencia del ajuste', 100);
  assertText(reason, 'Motivo del ajuste', 1000);
  if (kind !== 'adjustment_in' && kind !== 'adjustment_out') {
    throw new Error('Tipo de ajuste no válido.');
  }
  assertFiniteNonNegative(quantity, 'Cantidad del ajuste');
  if (quantity <= 0) throw new Error('La cantidad del ajuste debe ser mayor a cero.');
  if (kind === 'adjustment_in') {
    if (typeof unitCostGTQ !== 'number') {
      throw new Error('El ajuste de entrada requiere costo unitario promedio en GTQ.');
    }
    assertFiniteNonNegative(unitCostGTQ, 'Costo unitario del ajuste');
  }
  if (warehouseId.length > 55 || itemId.length > 55) {
    throw new Error('El identificador de bodega o artículo supera el límite para referencias de inventario.');
  }

  const db = getDbOrThrow();
  const balanceId = `bal_${warehouseId}_${itemId}`;
  assertSafeDocumentId(balanceId, 'Saldo de inventario');
  const movementRef = doc(db, 'stockMovements', movementId);
  const balanceRef = doc(db, 'inventoryBalances', balanceId);
  const warehouseRef = doc(db, 'warehouses', warehouseId);
  const itemRef = doc(db, 'inventoryItems', itemId);
  const now = new Date().toISOString();

  try {
    // The deterministic movement ID is checked first so an unknown network
    // outcome can be retried without creating a second adjustment.
    const previousMovement = await getDoc(movementRef);
    let warehouse: WarehouseRecord | null = null;
    let item: InventoryItemRecord | null = null;

    if (!previousMovement.exists()) {
      const [warehouseSnapshot, itemSnapshot] = await Promise.all([
        getDoc(warehouseRef),
        getDoc(itemRef),
      ]);
      if (!warehouseSnapshot.exists()) throw new Error('La bodega seleccionada no existe.');
      if (!itemSnapshot.exists()) throw new Error('El artículo seleccionado no existe.');
      warehouse = warehouseSnapshot.data() as WarehouseRecord;
      item = itemSnapshot.data() as InventoryItemRecord;
      if (warehouse.companyId !== companyId || !warehouse.active) {
        throw new Error('La bodega no está activa o no pertenece a la empresa.');
      }
      if (item.companyId !== companyId || !item.active) {
        throw new Error('El artículo no está activo o no pertenece a la empresa.');
      }
      if (warehouse.type === 'project' && !warehouse.projectId) {
        throw new Error('La bodega de proyecto no tiene un proyecto asignado.');
      }
      if (warehouse.type === 'project' && warehouse.projectId) {
        const projectSnapshot = await getDoc(doc(db, 'projects', warehouse.projectId));
        if (!projectSnapshot.exists() || projectSnapshot.data().companyId !== companyId) {
          throw new Error('El proyecto asociado a la bodega no pertenece a la empresa activa.');
        }
      }
    }

    return await runTransaction(db, async (transaction: Transaction) => {
      const [movementSnapshot, balanceSnapshot] = await Promise.all([
        transaction.get(movementRef),
        transaction.get(balanceRef),
      ]);

      if (movementSnapshot.exists()) {
        const previous = movementSnapshot.data() as StockMovement;
        if (!balanceSnapshot.exists()) {
          throw new Error('Se encontró un ajuste previo sin saldo asociado. Se requiere revisión de inventario.');
        }
        const previousBalance = balanceSnapshot.data() as InventoryBalanceRecord;
        const sameOperation =
          previous.id === movementId &&
          previous.kind === kind &&
          previous.companyId === companyId &&
          previous.itemId === itemId &&
          previous.warehouseId === warehouseId &&
          previous.quantity === quantity &&
          previous.referenceId === reference.trim() &&
          previous.notes === reason.trim() &&
          previous.createdBy === userId &&
          (kind !== 'adjustment_in' || previous.unitCostGTQ === unitCostGTQ);
        if (!sameOperation) {
          throw new Error('El ID del movimiento de ajuste ya fue utilizado para otra operación.');
        }
        if (
          previous.balanceId !== balanceId ||
          previousBalance.id !== balanceId ||
          previousBalance.companyId !== companyId ||
          previousBalance.itemId !== itemId ||
          previousBalance.warehouseId !== warehouseId
        ) {
          throw new Error('El saldo del ajuste previo no coincide con la empresa, artículo o bodega.');
        }
        assertFiniteNonNegative(previousBalance.quantity, 'La existencia del saldo ajustado');
        assertFiniteNonNegative(previousBalance.averageUnitCostGTQ, 'El costo promedio del saldo ajustado');
        return { movement: previous, balance: previousBalance, alreadyProcessed: true };
      }

      if (!balanceSnapshot.exists()) {
        throw new Error('No existe saldo de inventario para ajustar. Registra primero el inventario inicial o una recepción.');
      }
      if (!warehouse || !item) {
        throw new Error('No se pudieron validar las referencias del ajuste de inventario.');
      }

      const current = balanceSnapshot.data() as InventoryBalanceRecord;
      if (
        current.companyId !== companyId ||
        current.itemId !== itemId ||
        current.warehouseId !== warehouseId
      ) {
        throw new Error('El saldo no coincide con la empresa, artículo o bodega seleccionada.');
      }
      assertFiniteNonNegative(current.quantity, 'La existencia del saldo');
      assertFiniteNonNegative(current.averageUnitCostGTQ, 'El costo promedio del saldo');
      const movement: StockMovement = {
        id: movementId,
        companyId,
        ...(warehouse.type === 'project' && warehouse.projectId ? { projectId: warehouse.projectId } : {}),
        itemId,
        warehouseId,
        kind,
        quantity,
        unitCostGTQ: kind === 'adjustment_in' ? unitCostGTQ! : current.averageUnitCostGTQ,
        occurredAt: now,
        referenceId: reference.trim(),
        balanceId,
        notes: reason.trim(),
        createdBy: userId,
      };
      const next = applyStockMovement(
        {
          itemId,
          warehouseId,
          quantity: current.quantity,
          averageUnitCostGTQ: current.averageUnitCostGTQ,
          reorderLevel: current.reorderLevel,
        },
        movement
      );
      const balance: InventoryBalanceRecord = {
        ...current,
        quantity: next.quantity,
        averageUnitCostGTQ: next.averageUnitCostGTQ,
        reorderLevel: next.reorderLevel,
        updatedAt: now,
        lastMovementId: movementId,
      };

      transaction.set(movementRef, stripUndefined(movement));
      transaction.update(balanceRef, stripUndefined(balance));
      return { movement, balance, alreadyProcessed: false };
    });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.UPDATE, `inventoryBalances/${balanceId}`);
  }
}

export interface StockIssueResult {
  movement: StockMovement;
  balance: InventoryBalanceRecord;
  alreadyProcessed: boolean;
}

/**
 * Registers an outbound issue to a construction project. The append-only
 * movement and the reduced balance are committed together in one transaction.
 * A caller-supplied movement ID makes retries idempotent.
 */
export async function recordProjectStockIssueToFirestore(input: {
  movementId: string;
  projectId: string;
  itemId: string;
  warehouseId: string;
  quantity: number;
  reference: string;
  notes?: string;
  companyId: string;
  userId: string;
}): Promise<StockIssueResult> {
  const { movementId, projectId, itemId, warehouseId, quantity, reference, notes, companyId, userId } = input;
  assertSafeDocumentId(movementId, 'Movimiento de salida');
  assertSafeDocumentId(projectId, 'Proyecto');
  assertSafeDocumentId(itemId, 'Artículo');
  assertSafeDocumentId(warehouseId, 'Bodega');
  assertText(companyId, 'Empresa', 128);
  assertText(userId, 'Usuario que registra', 128);
  assertText(reference, 'Referencia de salida', 100);
  assertFiniteNonNegative(quantity, 'Cantidad de salida');
  if (quantity <= 0) throw new Error('La cantidad de salida debe ser mayor a cero.');
  if (notes !== undefined && (typeof notes !== 'string' || notes.length > 1000)) {
    throw new Error('Las notas no pueden superar 1000 caracteres.');
  }
  if (warehouseId.length > 55 || itemId.length > 55) {
    throw new Error('El identificador de bodega o artículo supera el límite para referencias de inventario.');
  }

  const db = getDbOrThrow();
  const movementRef = doc(db, 'stockMovements', movementId);
  const balanceId = `bal_${warehouseId}_${itemId}`;
  assertSafeDocumentId(balanceId, 'Saldo de inventario');
  const balanceRef = doc(db, 'inventoryBalances', balanceId);
  const warehouseRef = doc(db, 'warehouses', warehouseId);
  const itemRef = doc(db, 'inventoryItems', itemId);
  const projectRef = doc(db, 'projects', projectId);
  const now = new Date().toISOString();

  try {
    // Check the deterministic movement ID before doing reference lookups.
    // Existing retries only need the movement and its balance; reading project,
    // warehouse and item again inside the transaction adds no safety because
    // Firestore rules validate those references on the atomic write itself.
    const previousMovement = await getDoc(movementRef);
    let projectPreflightPassed = false;
    let preflightWarehouse: WarehouseRecord | null = null;
    let preflightItem: InventoryItemRecord | null = null;

    if (!previousMovement.exists()) {
      const [projectSnapshot, warehouseSnapshot, itemSnapshot] = await Promise.all([
        getDoc(projectRef),
        getDoc(warehouseRef),
        getDoc(itemRef),
      ]);
      if (!projectSnapshot.exists() || projectSnapshot.data().companyId !== companyId) {
        throw new Error('El proyecto no existe o no pertenece a la empresa activa.');
      }
      if (!warehouseSnapshot.exists()) throw new Error('La bodega seleccionada no existe.');
      if (!itemSnapshot.exists()) throw new Error('El artículo seleccionado no existe.');
      projectPreflightPassed = true;
      preflightWarehouse = warehouseSnapshot.data() as WarehouseRecord;
      preflightItem = itemSnapshot.data() as InventoryItemRecord;
      if (preflightWarehouse.companyId !== companyId || !preflightWarehouse.active) {
        throw new Error('La bodega no está activa o no pertenece a la empresa.');
      }
      if (preflightWarehouse.type === 'project' && preflightWarehouse.projectId !== projectId) {
        throw new Error('La bodega pertenece a otro proyecto.');
      }
      if (preflightItem.companyId !== companyId || !preflightItem.active) {
        throw new Error('El artículo no está activo o no pertenece a la empresa.');
      }
    }

    return await runTransaction(db, async (transaction: Transaction) => {
      const [movementSnapshot, balanceSnapshot] = await Promise.all([
        transaction.get(movementRef),
        transaction.get(balanceRef),
      ]);

      if (movementSnapshot.exists()) {
        const previous = movementSnapshot.data() as StockMovement;
        if (
          previous.companyId === companyId &&
          previous.kind === 'project_issue' &&
          previous.projectId === projectId &&
          previous.itemId === itemId &&
          previous.warehouseId === warehouseId &&
          previous.quantity === quantity &&
          previous.referenceId === reference.trim() &&
          previous.createdBy === userId
        ) {
          if (
            previous.id !== movementId ||
            previous.balanceId !== balanceId ||
            !balanceSnapshot.exists()
          ) {
            throw new Error('Se encontró una salida previa sin saldo asociado o con referencias inconsistentes. Se requiere revisión de inventario.');
          }
          const balance = balanceSnapshot.data() as InventoryBalanceRecord;
          if (
            balance.id !== balanceId ||
            balance.companyId !== companyId ||
            balance.itemId !== itemId ||
            balance.warehouseId !== warehouseId
          ) {
            throw new Error('El saldo de la salida previa no coincide con la empresa, artículo o bodega. Se requiere revisión de inventario.');
          }
          assertFiniteNonNegative(balance.quantity, 'La existencia del saldo de salida');
          assertFiniteNonNegative(balance.averageUnitCostGTQ, 'El costo promedio del saldo de salida');
          return { movement: previous, balance, alreadyProcessed: true };
        }
        throw new Error('La referencia de salida ya fue utilizada para otro movimiento.');
      }

      // Reference documents were preflighted above. The transaction still
      // atomically rereads the balance and deterministic movement; security
      // rules revalidate project, warehouse, item and company ownership at commit.
      if (!projectPreflightPassed || !preflightWarehouse || !preflightItem) {
        throw new Error('No se pudieron validar las referencias de la salida.');
      }
      const item = preflightItem;
      if (!balanceSnapshot.exists()) {
        throw new Error('No hay saldo registrado para este artículo en la bodega. Registra una recepción antes de retirar material.');
      }

      const current = balanceSnapshot.data() as InventoryBalanceRecord;
      if (
        current.companyId !== companyId ||
        current.itemId !== itemId ||
        current.warehouseId !== warehouseId
      ) {
        throw new Error('El saldo no coincide con la empresa, artículo o bodega seleccionada.');
      }
      if (quantity > current.quantity) {
        throw new Error(`Existencia insuficiente. Disponible: ${current.quantity} ${item.unit}.`);
      }

      const movement: StockMovement = {
        id: movementId,
        companyId,
        projectId,
        itemId,
        warehouseId,
        kind: 'project_issue',
        quantity,
        unitCostGTQ: current.averageUnitCostGTQ,
        occurredAt: now,
        referenceId: reference.trim(),
        balanceId,
        notes: notes?.trim() || undefined,
        createdBy: userId,
      };
      const next = applyStockMovement(
        {
          itemId,
          warehouseId,
          quantity: current.quantity,
          averageUnitCostGTQ: current.averageUnitCostGTQ,
          reorderLevel: item.reorderLevel,
        },
        movement
      );
      const balance: InventoryBalanceRecord = {
        ...current,
        quantity: next.quantity,
        averageUnitCostGTQ: next.averageUnitCostGTQ,
        reorderLevel: next.reorderLevel,
        updatedAt: now,
        lastMovementId: movementId,
      };

      transaction.set(movementRef, stripUndefined(movement));
      transaction.update(balanceRef, stripUndefined(balance));
      return { movement, balance, alreadyProcessed: false };
    });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.UPDATE, `inventoryBalances/${balanceId}`);
  }
}


export interface WarehouseTransferResult {
  outgoing: StockMovement;
  incoming: StockMovement;
  sourceBalance: InventoryBalanceRecord;
  destinationBalance: InventoryBalanceRecord;
  alreadyProcessed: boolean;
}

/**
 * Moves stock between company warehouses. Both append-only movements and
 * both balances are committed in one Firestore transaction.
 */
export async function transferInventoryBetweenWarehousesToFirestore(input: {
  transferId: string;
  itemId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  notes?: string;
  companyId: string;
  userId: string;
}): Promise<WarehouseTransferResult> {
  const {
    transferId, itemId, fromWarehouseId, toWarehouseId,
    quantity, notes, companyId, userId,
  } = input;
  assertSafeDocumentId(transferId, 'Traslado');
  assertSafeDocumentId(itemId, 'Artículo');
  assertSafeDocumentId(fromWarehouseId, 'Bodega de origen');
  assertSafeDocumentId(toWarehouseId, 'Bodega de destino');
  assertText(companyId, 'Empresa', 128);
  assertText(userId, 'Usuario que registra', 128);
  assertFiniteNonNegative(quantity, 'Cantidad del traslado');
  if (quantity <= 0) throw new Error('La cantidad del traslado debe ser mayor a cero.');
  if (fromWarehouseId === toWarehouseId) throw new Error('Selecciona dos bodegas diferentes.');
  if (transferId.length > 75 || itemId.length > 55 || fromWarehouseId.length > 55 || toWarehouseId.length > 55) {
    throw new Error('El ID del traslado, artículo o bodega supera el límite permitido.');
  }
  if (notes !== undefined && (typeof notes !== 'string' || notes.length > 1000)) {
    throw new Error('Las notas del traslado no pueden superar 1000 caracteres.');
  }

  const db = getDbOrThrow();
  const sourceBalanceId = `bal_${fromWarehouseId}_${itemId}`;
  const destinationBalanceId = `bal_${toWarehouseId}_${itemId}`;
  const outgoingId = `tr_${transferId}_out`;
  const incomingId = `tr_${transferId}_in`;
  const sourceBalanceRef = doc(db, 'inventoryBalances', sourceBalanceId);
  const destinationBalanceRef = doc(db, 'inventoryBalances', destinationBalanceId);
  const outgoingRef = doc(db, 'stockMovements', outgoingId);
  const incomingRef = doc(db, 'stockMovements', incomingId);
  const sourceWarehouseRef = doc(db, 'warehouses', fromWarehouseId);
  const destinationWarehouseRef = doc(db, 'warehouses', toWarehouseId);
  const itemRef = doc(db, 'inventoryItems', itemId);
  const now = new Date().toISOString();

  try {
    // Existing deterministic transfer pairs are handled using only the two
    // movements and two balances. For a new transfer, warehouse/item metadata
    // is preflighted outside the transaction; Firestore rules remain the final
    // authority and revalidate company, active state and warehouse ownership.
    const [previousOutgoing, previousIncoming] = await Promise.all([
      getDoc(outgoingRef),
      getDoc(incomingRef),
    ]);
    let sourceWarehouse: WarehouseRecord | null = null;
    let destinationWarehouse: WarehouseRecord | null = null;
    let item: InventoryItemRecord | null = null;

    if (!previousOutgoing.exists() && !previousIncoming.exists()) {
      const [sourceWarehouseSnapshot, destinationWarehouseSnapshot, itemSnapshot] = await Promise.all([
        getDoc(sourceWarehouseRef),
        getDoc(destinationWarehouseRef),
        getDoc(itemRef),
      ]);
      if (!sourceWarehouseSnapshot.exists() || !destinationWarehouseSnapshot.exists()) {
        throw new Error('La bodega de origen o destino no existe.');
      }
      if (!itemSnapshot.exists()) throw new Error('El artículo seleccionado no existe.');
      sourceWarehouse = sourceWarehouseSnapshot.data() as WarehouseRecord;
      destinationWarehouse = destinationWarehouseSnapshot.data() as WarehouseRecord;
      item = itemSnapshot.data() as InventoryItemRecord;
      if (
        sourceWarehouse.companyId !== companyId || !sourceWarehouse.active ||
        destinationWarehouse.companyId !== companyId || !destinationWarehouse.active
      ) {
        throw new Error('Ambas bodegas deben estar activas y pertenecer a la empresa.');
      }
      if (item.companyId !== companyId || !item.active) {
        throw new Error('El artículo no está activo o no pertenece a la empresa.');
      }
    }

    return await runTransaction(db, async (transaction: Transaction) => {
      // Read transaction documents sequentially. This preserves Firestore's
      // all-reads-before-writes guarantee while avoiding concurrent lock
      // acquisition in the local emulator and keeping deterministic ordering.
      const outgoingSnapshot = await transaction.get(outgoingRef);
      const incomingSnapshot = await transaction.get(incomingRef);
      const sourceBalanceSnapshot = await transaction.get(sourceBalanceRef);
      const destinationBalanceSnapshot = await transaction.get(destinationBalanceRef);

      if (outgoingSnapshot.exists() || incomingSnapshot.exists()) {
        if (!outgoingSnapshot.exists() || !incomingSnapshot.exists() ||
            !sourceBalanceSnapshot.exists() || !destinationBalanceSnapshot.exists()) {
          throw new Error('El traslado tiene registros incompletos. Se requiere revisión de inventario.');
        }
        const outgoing = outgoingSnapshot.data() as StockMovement;
        const incoming = incomingSnapshot.data() as StockMovement;
        const sourceBalance = sourceBalanceSnapshot.data() as InventoryBalanceRecord;
        const destinationBalance = destinationBalanceSnapshot.data() as InventoryBalanceRecord;
        const matches =
          outgoing.id === outgoingId &&
          incoming.id === incomingId &&
          outgoing.referenceId === transferId &&
          incoming.referenceId === transferId &&
          outgoing.kind === 'transfer_out' &&
          incoming.kind === 'transfer_in' &&
          outgoing.balanceId === sourceBalanceId &&
          incoming.balanceId === destinationBalanceId &&
          outgoing.companyId === companyId &&
          incoming.companyId === companyId &&
          outgoing.itemId === itemId &&
          incoming.itemId === itemId &&
          outgoing.warehouseId === fromWarehouseId &&
          incoming.warehouseId === toWarehouseId &&
          outgoing.quantity === quantity &&
          incoming.quantity === quantity &&
          outgoing.unitCostGTQ === incoming.unitCostGTQ &&
          outgoing.createdBy === userId &&
          incoming.createdBy === userId;
        if (!matches) throw new Error('El ID del traslado ya fue utilizado por otra operación.');
        if (
          sourceBalance.id !== sourceBalanceId ||
          sourceBalance.companyId !== companyId ||
          sourceBalance.itemId !== itemId ||
          sourceBalance.warehouseId !== fromWarehouseId ||
          destinationBalance.id !== destinationBalanceId ||
          destinationBalance.companyId !== companyId ||
          destinationBalance.itemId !== itemId ||
          destinationBalance.warehouseId !== toWarehouseId
        ) {
          throw new Error('Los saldos del traslado previo no coinciden con la empresa, artículo o bodegas. Se requiere revisión de inventario.');
        }
        assertFiniteNonNegative(sourceBalance.quantity, 'La existencia del saldo de origen');
        assertFiniteNonNegative(sourceBalance.averageUnitCostGTQ, 'El costo promedio del saldo de origen');
        assertFiniteNonNegative(destinationBalance.quantity, 'La existencia del saldo de destino');
        assertFiniteNonNegative(destinationBalance.averageUnitCostGTQ, 'El costo promedio del saldo de destino');
        return {
          outgoing,
          incoming,
          sourceBalance,
          destinationBalance,
          alreadyProcessed: true,
        };
      }

      if (!sourceWarehouse || !destinationWarehouse || !item) {
        throw new Error('No se pudieron validar las referencias del traslado.');
      }
      if (!sourceBalanceSnapshot.exists()) {
        throw new Error('No existe saldo disponible en la bodega de origen.');
      }
      const source = sourceBalanceSnapshot.data() as InventoryBalanceRecord;
      if (
        source.companyId !== companyId ||
        source.itemId !== itemId ||
        source.warehouseId !== fromWarehouseId
      ) {
        throw new Error('El saldo de origen no coincide con el artículo, bodega o empresa.');
      }
      if (quantity > source.quantity) {
        throw new Error(`Existencia insuficiente. Disponible: ${source.quantity} ${item.unit}.`);
      }

      const destination = destinationBalanceSnapshot.exists()
        ? destinationBalanceSnapshot.data() as InventoryBalanceRecord
        : null;
      if (destination && (
        destination.companyId !== companyId ||
        destination.itemId !== itemId ||
        destination.warehouseId !== toWarehouseId
      )) {
        throw new Error('El saldo de destino no coincide con el artículo, bodega o empresa.');
      }

      let projectId: string | undefined;
      if (sourceWarehouse.type === 'project') projectId = sourceWarehouse.projectId;
      if (destinationWarehouse.type === 'project') {
        if (projectId && projectId !== destinationWarehouse.projectId) {
          throw new Error('No se pueden trasladar materiales directamente entre bodegas de proyectos distintos.');
        }
        projectId = destinationWarehouse.projectId;
      }

      const transfer = applyWarehouseTransfer(
        {
          itemId,
          warehouseId: fromWarehouseId,
          quantity: source.quantity,
          averageUnitCostGTQ: source.averageUnitCostGTQ,
          reorderLevel: source.reorderLevel,
        },
        {
          itemId,
          warehouseId: toWarehouseId,
          quantity: destination?.quantity ?? 0,
          averageUnitCostGTQ: destination?.averageUnitCostGTQ ?? 0,
          reorderLevel: destination?.reorderLevel ?? item.reorderLevel,
        },
        {
          id: transferId,
          companyId,
          itemId,
          fromWarehouseId,
          toWarehouseId,
          quantity,
          occurredAt: now,
          createdBy: userId,
          notes,
        }
      );
      const outgoing = {
        ...transfer.outgoing,
        balanceId: sourceBalanceId,
        ...(projectId ? { projectId } : {}),
      };
      const incoming = {
        ...transfer.incoming,
        balanceId: destinationBalanceId,
        ...(projectId ? { projectId } : {}),
      };

      const sourceBalance: InventoryBalanceRecord = {
        ...source,
        quantity: transfer.sourceBalance.quantity,
        averageUnitCostGTQ: transfer.sourceBalance.averageUnitCostGTQ,
        updatedAt: now,
        lastMovementId: outgoingId,
      };
      const destinationBalance: InventoryBalanceRecord = {
        id: destinationBalanceId,
        companyId,
        itemId,
        warehouseId: toWarehouseId,
        quantity: transfer.destinationBalance.quantity,
        averageUnitCostGTQ: transfer.destinationBalance.averageUnitCostGTQ,
        reorderLevel: transfer.destinationBalance.reorderLevel,
        createdBy: destination?.createdBy ?? userId,
        createdAt: destination?.createdAt ?? now,
        updatedAt: now,
        lastMovementId: incomingId,
      };

      transaction.set(outgoingRef, stripUndefined(outgoing));
      transaction.set(incomingRef, stripUndefined(incoming));
      transaction.update(sourceBalanceRef, stripUndefined(sourceBalance));
      if (destination) {
        transaction.update(destinationBalanceRef, stripUndefined(destinationBalance));
      } else {
        transaction.set(destinationBalanceRef, stripUndefined(destinationBalance));
      }

      return { outgoing, incoming, sourceBalance, destinationBalance, alreadyProcessed: false };
    });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.UPDATE, `inventoryBalances/${sourceBalanceId}`);
  }
}

export async function createSubcontractToFirestore(
  input: SubcontractInput,
  companyId: string,
  userId: string
): Promise<SubcontractRecord> {
  const db = getDbOrThrow();
  const ref = doc(collection(db, 'subcontracts'));
  assertText(companyId, 'Empresa', 128);
  assertText(userId, 'Usuario creador', 128);
  const contract = validateSubcontract({
    ...input,
    id: ref.id,
    companyId,
    createdBy: userId,
  });
  if (!['draft', 'active'].includes(contract.status) || contract.paidGTQ !== 0) {
    throw new Error('Un subcontrato nuevo debe estar en borrador o activo y no puede registrar pagos iniciales.');
  }
  try {
    await runTransaction(db, async (transaction: Transaction) => {
      await assertCompanyReference(transaction, 'projects', contract.projectId, companyId, 'Proyecto');
      await assertCompanyReference(transaction, 'suppliers', contract.supplierId, companyId, 'Proveedor');
      transaction.set(ref, stripUndefined(contract));
    });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.CREATE, `subcontracts/${ref.id}`);
  }
  return contract;
}

export interface SubcontractPaymentResult {
  payment: SubcontractPaymentRecord;
  expense: ExpenseRecord;
  contract: SubcontractRecord & { lastPaymentId?: string; updatedAt?: string };
  alreadyProcessed: boolean;
}

/**
 * Append a subcontract payment and update its paid balance atomically.
 * Payment IDs are derived from the contract and reference to make safe retries
 * idempotent and prevent the same receipt/reference from being recorded twice.
 */
export async function registerSubcontractPaymentToFirestore(input: {
  contractId: string;
  amountGTQ: number;
  paymentDate: string;
  reference: string;
  paymentMethod: 'Efectivo' | 'Cheque' | 'Transferencia BI' | 'Tarjeta';
  notes?: string;
  companyId: string;
  userId: string;
}): Promise<SubcontractPaymentResult> {
  const {
    contractId, amountGTQ, paymentDate, reference, paymentMethod,
    notes, companyId, userId,
  } = input;
  assertSafeDocumentId(contractId, 'Subcontrato');
  assertText(companyId, 'Empresa', 128);
  assertText(userId, 'Usuario que registra', 128);
  assertFiniteNonNegative(amountGTQ, 'Monto del pago');
  if (amountGTQ <= 0) throw new Error('El monto del pago debe ser mayor a cero.');
  if (!isValidCalendarDate(paymentDate)) {
    throw new Error('La fecha de pago debe ser una fecha real en formato AAAA-MM-DD.');
  }
  if (!['Efectivo', 'Cheque', 'Transferencia BI', 'Tarjeta'].includes(paymentMethod)) {
    throw new Error('Selecciona un método de pago válido.');
  }
  if (!/^[a-zA-Z0-9_-]{1,60}$/.test(reference.trim())) {
    throw new Error('La referencia de pago solo puede contener letras, números, guion y guion bajo (máximo 60).');
  }
  if (notes !== undefined && (typeof notes !== 'string' || notes.length > 1000)) {
    throw new Error('Las notas del pago no pueden superar 1000 caracteres.');
  }

  const normalizedReference = reference.trim().toUpperCase();
  const paymentId = `subpay_${contractId.slice(0, 42)}_${normalizedReference.slice(0, 60)}`;
  assertSafeDocumentId(paymentId, 'ID del pago');
  const db = getDbOrThrow();
  const contractRef = doc(db, 'subcontracts', contractId);
  const paymentRef = doc(db, 'subcontractPayments', paymentId);
  // La misma clave determinística permite conciliar e impedir duplicados en
  // el libro de gastos del proyecto, sin crear un egreso por cada reintento.
  const expenseRef = doc(db, 'expenses', paymentId);
  const now = new Date().toISOString();

  try {
    return await runTransaction(db, async (transaction: Transaction) => {
      const [contractSnapshot, paymentSnapshot, expenseSnapshot] = await Promise.all([
        transaction.get(contractRef),
        transaction.get(paymentRef),
        transaction.get(expenseRef),
      ]);
      if (!contractSnapshot.exists()) throw new Error('El subcontrato no existe.');
      const contract = contractSnapshot.data() as SubcontractRecord & {
        lastPaymentId?: string;
        updatedAt?: string;
      };
      if (contract.companyId !== companyId) throw new Error('El subcontrato no pertenece a la empresa activa.');

      if (paymentSnapshot.exists()) {
        const previous = paymentSnapshot.data() as SubcontractPaymentRecord;
        if (
          previous.companyId === companyId &&
          previous.contractId === contractId &&
          previous.amountGTQ === amountGTQ &&
          previous.paymentDate === paymentDate &&
          previous.reference === normalizedReference &&
          previous.paymentMethod === paymentMethod &&
          previous.createdBy === userId
        ) {
          if (!expenseSnapshot.exists()) {
            throw new Error('El pago ya existe, pero no tiene su gasto vinculado. Se requiere regularización contable.');
          }
          const expense = expenseSnapshot.data() as ExpenseRecord;
          if (
            expense.subcontractPaymentId !== paymentId ||
            expense.companyId !== companyId ||
            expense.projectId !== contract.projectId ||
            expense.amount !== amountGTQ ||
            expense.date !== paymentDate ||
            expense.paymentMethod !== paymentMethod
          ) {
            throw new Error('El gasto vinculado al pago no coincide. Se requiere revisión contable.');
          }
          return { payment: previous, expense, contract, alreadyProcessed: true };
        }
        throw new Error('La referencia de pago ya fue utilizada.');
      }

      if (expenseSnapshot.exists()) {
        throw new Error('Ya existe un gasto con el identificador reservado para este pago. Se requiere revisión contable.');
      }
      if (contract.status !== 'active') {
        throw new Error('Solo se pueden registrar pagos de subcontratos activos.');
      }
      const paidGTQ = Math.round((contract.paidGTQ + amountGTQ + Number.EPSILON) * 100) / 100;
      if (paidGTQ > contract.amountGTQ + 0.000001) {
        throw new Error('El pago supera el saldo pendiente del subcontrato.');
      }

      const supplierSnapshot = await transaction.get(doc(db, 'suppliers', contract.supplierId));
      if (!supplierSnapshot.exists() || supplierSnapshot.data().companyId !== companyId) {
        throw new Error('El proveedor del subcontrato no existe o no pertenece a la empresa activa.');
      }
      const supplier = supplierSnapshot.data() as SupplierRecord;

      const payment: SubcontractPaymentRecord = {
        id: paymentId,
        companyId,
        contractId,
        projectId: contract.projectId,
        supplierId: contract.supplierId,
        amountGTQ,
        paymentDate,
        reference: normalizedReference,
        paymentMethod,
        notes: notes?.trim() || undefined,
        createdBy: userId,
        createdAt: now,
      };
      const expense: ExpenseRecord = {
        id: paymentId,
        subcontractPaymentId: paymentId,
        paymentReference: normalizedReference,
        companyId,
        projectId: contract.projectId,
        authorId: userId,
        date: paymentDate,
        category: 'Subcontratos',
        description: `Pago de subcontrato ${contract.contractNumber}: ${contract.description}`.slice(0, 500),
        supplier: supplier.name,
        nitSupplier: supplier.nit,
        facturaNumber: '',
        amount: amountGTQ,
        currency: 'GTQ',
        paymentMethod,
        approvalStatus: 'Aprobado',
        approvedBy: userId,
        approvedAt: now,
      };
      const updatedContract = {
        ...contract,
        paidGTQ,
        lastPaymentId: paymentId,
        updatedAt: now,
      };

      // Pago, egreso del proyecto y saldo contractual forman un único asiento
      // atómico: nunca debe existir uno de los tres sin los otros dos.
      transaction.set(paymentRef, stripUndefined(payment));
      transaction.set(expenseRef, stripUndefined(expense));
      transaction.update(contractRef, {
        paidGTQ,
        lastPaymentId: paymentId,
        updatedAt: now,
      });
      return { payment, expense, contract: updatedContract, alreadyProcessed: false };
    });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.UPDATE, `subcontracts/${contractId}`);
  }
}

function subscribeCompanyRecords<T>(
  collectionName: string,
  companyId: string,
  callback: (records: T[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const db = getDbOrThrow();
  const recordsQuery = query(collection(db, collectionName), where('companyId', '==', companyId));
  return onSnapshot(
    recordsQuery,
    (snapshot: QuerySnapshot<DocumentData>) =>
      callback(snapshot.docs.map((document: QueryDocumentSnapshot<DocumentData>) => document.data() as T)),
    (error: Error) => {
      const normalized = handleFirestoreError(error, OperationType.LIST, collectionName);
      onError?.(normalized instanceof Error ? normalized : error);
    }
  );
}

export const subscribeSuppliers = (
  companyId: string,
  callback: (records: SupplierRecord[]) => void,
  onError?: (error: Error) => void
) => subscribeCompanyRecords('suppliers', companyId, callback, onError);

export const subscribeWarehouses = (
  companyId: string,
  callback: (records: WarehouseRecord[]) => void,
  onError?: (error: Error) => void
) => subscribeCompanyRecords('warehouses', companyId, callback, onError);

export const subscribeInventoryItems = (
  companyId: string,
  callback: (records: InventoryItemRecord[]) => void,
  onError?: (error: Error) => void
) => subscribeCompanyRecords('inventoryItems', companyId, callback, onError);

export const subscribePurchaseOrders = (
  companyId: string,
  callback: (records: PurchaseOrderRecord[]) => void,
  onError?: (error: Error) => void
) => subscribeCompanyRecords('purchaseOrders', companyId, callback, onError);

export const subscribeSubcontracts = (
  companyId: string,
  callback: (records: SubcontractRecord[]) => void,
  onError?: (error: Error) => void
) => subscribeCompanyRecords('subcontracts', companyId, callback, onError);

/** Suscripción de solo lectura. Las escrituras se realizan exclusivamente
 * mediante servicios transaccionales de recepción, salida y traslado. */
export const subscribeStockMovements = (
  companyId: string,
  callback: (records: StockMovement[]) => void,
  onError?: (error: Error) => void
) => subscribeCompanyRecords('stockMovements', companyId, callback, onError);

export const subscribeInventoryBalances = (
  companyId: string,
  callback: (records: InventoryBalanceRecord[]) => void,
  onError?: (error: Error) => void
) => subscribeCompanyRecords('inventoryBalances', companyId, callback, onError);

export { getSubcontractExpiryAlerts };

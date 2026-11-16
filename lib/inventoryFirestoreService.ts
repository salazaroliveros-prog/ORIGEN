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
  validatePurchaseOrder,
  validateSubcontract,
  validateSupplier,
  type PurchaseOrderRecord,
  type SubcontractRecord,
  type SupplierRecord,
} from './domain/procurement';
import { stripUndefined } from './utils/firestorePayload';
import type { StockMovement } from './domain/inventory';

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
  if (!Array.isArray(input.lines) || input.lines.length !== 1) {
    throw new Error('Por ahora cada orden debe contener exactamente un renglón.');
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

/** Movimientos de solo lectura; las escrituras se habilitarán junto a la
 * transacción de recepción/traslado/salida y sus reglas de stock. */
export const subscribeStockMovements = (
  companyId: string,
  callback: (records: StockMovement[]) => void,
  onError?: (error: Error) => void
) => subscribeCompanyRecords('stockMovements', companyId, callback, onError);

export { getSubcontractExpiryAlerts };

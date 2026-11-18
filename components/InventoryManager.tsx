'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Project } from '@/lib/types';
import {
  calculateInventoryBalance,
  getReorderAlerts,
  type InventoryBalance,
  type StockMovement,
} from '@/lib/domain/inventory';
import {
  getSubcontractExpiryAlerts,
  type PurchaseOrderRecord,
  type SubcontractRecord,
  type SupplierRecord,
} from '@/lib/domain/procurement';
import {
  approvePurchaseOrderToFirestore,
  createInventoryItemToFirestore,
  createPurchaseOrderToFirestore,
  createSubcontractToFirestore,
  registerSubcontractPaymentToFirestore,
  receivePurchaseOrderToWarehouse,
  recordOpeningStockToFirestore,
  adjustInventoryStockToFirestore,
  recordProjectStockIssueToFirestore,
  transferInventoryBetweenWarehousesToFirestore,
  createSupplierToFirestore,
  createWarehouseToFirestore,
  subscribeInventoryItems,
  subscribePurchaseOrders,
  subscribeStockMovements,
  subscribeSubcontracts,
  subscribeSuppliers,
  subscribeWarehouses,
  type InventoryItemRecord,
  type WarehouseRecord,
} from '@/lib/inventoryFirestoreService';
import toast from 'react-hot-toast';

type Section = 'resumen' | 'articulos' | 'bodegas' | 'proveedores' | 'ordenes' | 'movimientos' | 'subcontratos';

interface InventoryManagerProps {
  companyId: string;
  userId: string;
  projects: Project[];
  activeProjectId: string;
  canManageInventory: boolean;
  canManagePurchasing: boolean;
}

const currency = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  maximumFractionDigits: 2,
});

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10 disabled:opacity-50';
const labelClass = 'mb-1.5 block text-xs font-medium text-slate-300';
const cardClass = 'rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg';

function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium' }).format(date);
}

const movementLabels: Record<StockMovement['kind'], string> = {
  opening: 'Inventario inicial',
  purchase_receipt: 'Recepción de compra',
  project_issue: 'Salida a obra',
  transfer_in: 'Traslado recibido',
  transfer_out: 'Traslado enviado',
  adjustment_in: 'Ajuste de entrada',
  adjustment_out: 'Ajuste de salida',
  return: 'Devolución',
};

type MovementKindFilter = 'all' | StockMovement['kind'];

function EmptyState({ message }: { message: string }) {
  return <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">{message}</p>;
}

export function InventoryManager({
  companyId,
  userId,
  projects,
  activeProjectId,
  canManageInventory: canWriteInventory,
  canManagePurchasing: canWritePurchasing,
}: InventoryManagerProps) {
  const [section, setSection] = useState<Section>('resumen');
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [items, setItems] = useState<InventoryItemRecord[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderRecord[]>([]);
  const [contracts, setContracts] = useState<SubcontractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movementKindFilter, setMovementKindFilter] = useState<MovementKindFilter>('all');
  const [movementSearch, setMovementSearch] = useState('');

  const [supplierName, setSupplierName] = useState('');
  const [supplierNit, setSupplierNit] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');

  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseType, setWarehouseType] = useState<'general' | 'project'>('project');
  const [warehouseProjectId, setWarehouseProjectId] = useState(activeProjectId);

  const [itemName, setItemName] = useState('');
  const [itemUnit, setItemUnit] = useState('unidad');
  const [itemReorderLevel, setItemReorderLevel] = useState('0');

  const [orderProjectId, setOrderProjectId] = useState(activeProjectId);
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderLines, setOrderLines] = useState<Array<{ itemId: string; quantity: string; unitPriceGTQ: string }>>([
    { itemId: '', quantity: '1', unitPriceGTQ: '0' },
  ]);

  const [contractProjectId, setContractProjectId] = useState(activeProjectId);
  const [contractSupplierId, setContractSupplierId] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [contractDescription, setContractDescription] = useState('');
  const [contractStartDate, setContractStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [contractEndDate, setContractEndDate] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [contractStatus, setContractStatus] = useState<'draft' | 'active'>('draft');
  const [payingContractId, setPayingContractId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Cheque' | 'Transferencia BI' | 'Tarjeta'>('Transferencia BI');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [receivingOrderId, setReceivingOrderId] = useState('');
  const [receivingLineIndex, setReceivingLineIndex] = useState<number | null>(null);
  const [receiptWarehouseId, setReceiptWarehouseId] = useState('');
  const [receiptQuantity, setReceiptQuantity] = useState('1');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [issueProjectId, setIssueProjectId] = useState(activeProjectId);
  const [issueBalanceKey, setIssueBalanceKey] = useState('');
  const [issueQuantity, setIssueQuantity] = useState('1');
  const [issueReference, setIssueReference] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [transferBalanceKey, setTransferBalanceKey] = useState('');
  const [transferDestinationId, setTransferDestinationId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState('1');
  const [transferReference, setTransferReference] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [openingBalanceKey, setOpeningBalanceKey] = useState('');
  const [openingQuantity, setOpeningQuantity] = useState('1');
  const [openingUnitCost, setOpeningUnitCost] = useState('0');
  const [openingReference, setOpeningReference] = useState(() => `INI-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
  const [openingNotes, setOpeningNotes] = useState('');
  const [openingMovementId, setOpeningMovementId] = useState('');
  const [adjustmentBalanceKey, setAdjustmentBalanceKey] = useState('');
  const [adjustmentKind, setAdjustmentKind] = useState<'adjustment_in' | 'adjustment_out'>('adjustment_in');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('1');
  const [adjustmentUnitCost, setAdjustmentUnitCost] = useState('0');
  const [adjustmentReference, setAdjustmentReference] = useState(() => `AJU-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentMovementId, setAdjustmentMovementId] = useState('');

  useEffect(() => {
    setWarehouseProjectId((current) => current || activeProjectId);
    setOrderProjectId((current) => current || activeProjectId);
    setContractProjectId((current) => current || activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribers: Array<() => void> = [];
    let readyCount = 0;
    const markReady = () => {
      readyCount += 1;
      if (readyCount === 6) setLoading(false);
    };
    const handleSubscriptionError = (cause: Error) => {
      setError(cause.message || 'No se pudo sincronizar el inventario.');
      setLoading(false);
    };
    try {
      unsubscribers.push(
        subscribeSuppliers(companyId, (records) => { setSuppliers(records); markReady(); }, handleSubscriptionError),
        subscribeWarehouses(companyId, (records) => { setWarehouses(records); markReady(); }, handleSubscriptionError),
        subscribeInventoryItems(companyId, (records) => { setItems(records); markReady(); }, handleSubscriptionError),
        subscribeStockMovements(companyId, (records) => { setMovements(records); markReady(); }, handleSubscriptionError),
        subscribePurchaseOrders(companyId, (records) => { setOrders(records); markReady(); }, handleSubscriptionError),
        subscribeSubcontracts(companyId, (records) => { setContracts(records); markReady(); }, handleSubscriptionError)
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo abrir el inventario.');
      setLoading(false);
    }
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [companyId]);

  const activeSuppliers = useMemo(() => suppliers.filter((supplier) => supplier.active), [suppliers]);
  const activeWarehouses = useMemo(() => warehouses.filter((warehouse) => warehouse.active), [warehouses]);
  const activeItems = useMemo(() => items.filter((item) => item.active), [items]);

  const balances = useMemo(() => {
    const result: InventoryBalance[] = [];
    for (const warehouse of activeWarehouses) {
      for (const item of activeItems) {
        const hasHistory = movements.some(
          (movement) => movement.warehouseId === warehouse.id && movement.itemId === item.id
        );
        if (!hasHistory) continue;
        try {
          result.push(
            calculateInventoryBalance({
              itemId: item.id,
              warehouseId: warehouse.id,
              reorderLevel: item.reorderLevel,
              movements,
            })
          );
        } catch (cause) {
          console.error('No se pudo calcular un saldo de inventario:', cause);
        }
      }
    }
    return result;
  }, [activeItems, activeWarehouses, movements]);

  const reorderAlerts = useMemo(() => getReorderAlerts(balances), [balances]);
  const expiryAlerts = useMemo(() => {
    try {
      return getSubcontractExpiryAlerts(contracts, new Date().toISOString().slice(0, 10), 30);
    } catch {
      return [];
    }
  }, [contracts]);

  const stockMovementRows = useMemo(() => {
    const query = movementSearch.trim().toLocaleLowerCase('es-GT');
    return movements
      .filter((movement) => movementKindFilter === 'all' || movement.kind === movementKindFilter)
      .filter((movement) => {
        if (!query) return true;
        const itemName = items.find((item) => item.id === movement.itemId)?.name ?? '';
        const warehouseName = warehouses.find((warehouse) => warehouse.id === movement.warehouseId)?.name ?? '';
        const projectName = projects.find((project) => project.id === movement.projectId)?.name ?? '';
        return [
          movementLabels[movement.kind], itemName, warehouseName, projectName,
          movement.referenceId, movement.receiptNumber, movement.notes, movement.createdBy,
        ].some((value) => typeof value === 'string' && value.toLocaleLowerCase('es-GT').includes(query));
      })
      .sort((left, right) => {
        const leftTime = Date.parse(left.occurredAt);
        const rightTime = Date.parse(right.occurredAt);
        return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
      });
  }, [items, movementKindFilter, movementSearch, movements, projects, warehouses]);

  const pendingOrders = orders.filter((order) =>
    ['draft', 'submitted', 'approved', 'partially_received'].includes(order.status)
  );

  // Only combinations without a balance can receive an initial opening entry.
  // Once a movement history exists, stock must be changed through an auditable adjustment.
  const adjustmentCandidates = useMemo(
    () => balances.flatMap((balance) => {
      const item = activeItems.find((entry) => entry.id === balance.itemId);
      const warehouse = activeWarehouses.find((entry) => entry.id === balance.warehouseId);
      return item && warehouse
        ? [{ item, warehouse, balance, key: `${item.id}|${warehouse.id}` }]
        : [];
    }),
    [activeItems, activeWarehouses, balances]
  );

  const openingCandidates = useMemo(
    () => activeWarehouses.flatMap((warehouse) =>
      activeItems
        .filter((item) => !balances.some((balance) =>
          balance.itemId === item.id && balance.warehouseId === warehouse.id
        ))
        .map((item) => ({ item, warehouse, key: `${item.id}|${warehouse.id}` }))
    ),
    [activeItems, activeWarehouses, balances]
  );

  const handleSupplierSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWritePurchasing || submitting) return;
    setSubmitting(true);
    try {
      await createSupplierToFirestore(
        {
          name: supplierName,
          nit: supplierNit,
          phone: supplierPhone || undefined,
          email: supplierEmail || undefined,
          active: true,
        },
        companyId,
        userId
      );
      setSupplierName('');
      setSupplierNit('');
      setSupplierPhone('');
      setSupplierEmail('');
      toast.success('Proveedor registrado.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo registrar el proveedor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWarehouseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWriteInventory || submitting) return;
    setSubmitting(true);
    try {
      await createWarehouseToFirestore(
        {
          name: warehouseName,
          type: warehouseType,
          ...(warehouseType === 'project' ? { projectId: warehouseProjectId } : {}),
          active: true,
        },
        companyId,
        userId
      );
      setWarehouseName('');
      toast.success('Bodega registrada.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo registrar la bodega.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleItemSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWriteInventory || submitting) return;
    setSubmitting(true);
    try {
      await createInventoryItemToFirestore(
        {
          name: itemName,
          unit: itemUnit,
          reorderLevel: Number(itemReorderLevel),
          active: true,
        },
        companyId,
        userId
      );
      setItemName('');
      setItemUnit('unidad');
      setItemReorderLevel('0');
      toast.success('Artículo agregado al catálogo.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo registrar el artículo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrderSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWritePurchasing || submitting) return;
    if (orderLines.length < 1 || orderLines.length > 7) {
      toast.error('Una orden debe contener entre 1 y 7 renglones.');
      return;
    }

    const selectedLines = orderLines.map((draft) => {
      const item = activeItems.find((candidate) => candidate.id === draft.itemId);
      const quantity = Number(draft.quantity);
      const unitPriceGTQ = Number(draft.unitPriceGTQ);
      return { draft, item, quantity, unitPriceGTQ };
    });
    if (selectedLines.some((line) =>
      !line.item ||
      !Number.isFinite(line.quantity) || line.quantity <= 0 ||
      !Number.isFinite(line.unitPriceGTQ) || line.unitPriceGTQ < 0
    )) {
      toast.error('Revisa los artículos, cantidades y precios de todos los renglones.');
      return;
    }
    const itemIds = selectedLines.map((line) => line.item!.id);
    if (new Set(itemIds).size !== itemIds.length) {
      toast.error('No repitas artículos en una misma orden. Consolida la cantidad en un solo renglón.');
      return;
    }

    const lines = selectedLines.map(({ item, quantity, unitPriceGTQ }) => ({
      itemId: item!.id,
      description: item!.name,
      unit: item!.unit,
      quantity,
      unitPriceGTQ,
    }));
    const subtotalGTQ = Math.round(
      lines.reduce((sum, line) => sum + line.quantity * line.unitPriceGTQ, 0) * 100
    ) / 100;
    const taxGTQ = Math.round(subtotalGTQ * 0.12 * 100) / 100;
    setSubmitting(true);
    try {
      await createPurchaseOrderToFirestore(
        {
          projectId: orderProjectId,
          supplierId: orderSupplierId,
          number: `OC-${new Date().toISOString().replace(/[-:.TZ]/g, '')}`,
          status: 'draft',
          currency: 'GTQ',
          lines,
          subtotalGTQ,
          discountGTQ: 0,
          taxPercent: 12,
          taxGTQ,
          totalGTQ: Math.round((subtotalGTQ + taxGTQ) * 100) / 100,
        },
        companyId,
        userId
      );
      setOrderLines([{ itemId: '', quantity: '1', unitPriceGTQ: '0' }]);
      toast.success('Orden de compra creada como borrador.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo crear la orden.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    if (!canWritePurchasing || submitting) return;
    setSubmitting(true);
    try {
      await approvePurchaseOrderToFirestore(orderId, companyId, userId);
      toast.success('Orden de compra aprobada.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo aprobar la orden.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiptSubmit = async (
    event: FormEvent<HTMLFormElement>,
    order: PurchaseOrderRecord,
    lineIndex: number
  ) => {
    event.preventDefault();
    if (!canWriteInventory || submitting) return;
    const line = order.lines[lineIndex];
    if (!line) {
      toast.error('El renglón seleccionado ya no existe.');
      return;
    }
    const quantity = Number(receiptQuantity);
    const remaining = Math.max(0, line.quantity - line.receivedQuantity);
    if (!receiptWarehouseId) {
      toast.error('Selecciona la bodega que recibe el material.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > remaining) {
      toast.error(`La cantidad debe ser mayor a cero y no superar lo pendiente (${remaining}).`);
      return;
    }
    if (!receiptNumber.trim()) {
      toast.error('Ingresa el número de recepción o documento de entrega.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await receivePurchaseOrderToWarehouse({
        orderId: order.id,
        lineIndex,
        warehouseId: receiptWarehouseId,
        quantity,
        receiptNumber: receiptNumber.trim(),
        companyId,
        userId,
      });
      setReceivingOrderId('');
      setReceivingLineIndex(null);
      setReceiptNumber('');
      setReceiptQuantity('1');
      toast.success(result.alreadyProcessed
        ? 'Esta recepción ya estaba registrada; no se duplicó el inventario.'
        : 'Renglón recibido y existencias actualizadas.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo registrar la recepción.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpeningStockSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWriteInventory || submitting) return;

    const candidate = openingCandidates.find((entry) => entry.key === openingBalanceKey);
    const quantity = Number(openingQuantity);
    const unitCostGTQ = Number(openingUnitCost);
    if (!candidate) {
      toast.error('Selecciona una combinación de artículo y bodega sin historial previo.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('La cantidad inicial debe ser mayor a cero.');
      return;
    }
    if (!Number.isFinite(unitCostGTQ) || unitCostGTQ < 0) {
      toast.error('El costo unitario inicial debe ser cero o mayor.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(openingReference.trim())) {
      toast.error('La referencia debe contener de 1 a 100 letras, números, guion o guion bajo.');
      return;
    }

    const movementId = openingMovementId || `open_${crypto.randomUUID()}`;
    setOpeningMovementId(movementId);
    setSubmitting(true);
    try {
      const result = await recordOpeningStockToFirestore({
        movementId,
        itemId: candidate.item.id,
        warehouseId: candidate.warehouse.id,
        quantity,
        unitCostGTQ,
        reference: openingReference.trim(),
        notes: openingNotes.trim() || undefined,
        companyId,
        userId,
      });
      setOpeningBalanceKey('');
      setOpeningQuantity('1');
      setOpeningUnitCost('0');
      setOpeningReference(`INI-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
      setOpeningNotes('');
      setOpeningMovementId('');
      toast.success(result.alreadyProcessed
        ? 'El inventario inicial ya estaba registrado; no se duplicó.'
        : 'Inventario inicial registrado y saldo creado mediante transacción.');
    } catch (cause) {
      // Keep the same movement ID after a network/unknown outcome so a retry
      // is idempotent. Editing any form field clears it for a new operation.
      toast.error(cause instanceof Error ? cause.message : 'No se pudo registrar el inventario inicial.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockAdjustmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWriteInventory || submitting) return;

    const candidate = adjustmentCandidates.find((entry) => entry.key === adjustmentBalanceKey);
    const quantity = Number(adjustmentQuantity);
    const incoming = adjustmentKind === 'adjustment_in';
    const unitCostGTQ = Number(adjustmentUnitCost);
    if (!candidate) {
      toast.error('Selecciona un artículo y bodega con saldo registrado.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('La cantidad del ajuste debe ser mayor a cero.');
      return;
    }
    if (!incoming && quantity > candidate.balance.quantity) {
      toast.error(`La salida no puede superar las existencias disponibles (${candidate.balance.quantity}).`);
      return;
    }
    if (incoming && (!Number.isFinite(unitCostGTQ) || unitCostGTQ < 0)) {
      toast.error('El costo unitario debe ser cero o mayor.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(adjustmentReference.trim())) {
      toast.error('Ingresa una referencia válida para el ajuste.');
      return;
    }
    if (!adjustmentReason.trim() || adjustmentReason.trim().length > 1000) {
      toast.error('Es obligatorio documentar el motivo del ajuste (máximo 1000 caracteres).');
      return;
    }

    const movementId = adjustmentMovementId || `adj_${crypto.randomUUID()}`;
    setAdjustmentMovementId(movementId);
    setSubmitting(true);
    try {
      const result = await adjustInventoryStockToFirestore({
        movementId,
        itemId: candidate.item.id,
        warehouseId: candidate.warehouse.id,
        kind: adjustmentKind,
        quantity,
        ...(incoming ? { unitCostGTQ } : {}),
        reference: adjustmentReference.trim(),
        reason: adjustmentReason.trim(),
        companyId,
        userId,
      });
      setAdjustmentBalanceKey('');
      setAdjustmentKind('adjustment_in');
      setAdjustmentQuantity('1');
      setAdjustmentUnitCost('0');
      setAdjustmentReference(`AJU-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
      setAdjustmentReason('');
      setAdjustmentMovementId('');
      toast.success(result.alreadyProcessed
        ? 'El ajuste ya estaba registrado; no se duplicó.'
        : 'Ajuste registrado y existencias recalculadas con costo promedio.');
    } catch (cause) {
      // Keep the same ID after uncertain network outcomes so the retry is idempotent.
      toast.error(cause instanceof Error ? cause.message : 'No se pudo registrar el ajuste de inventario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockIssueSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWriteInventory || submitting) return;
    const [itemId, warehouseId] = issueBalanceKey.split('|');
    const selectedBalance = balances.find(
      (balance) => balance.itemId === itemId && balance.warehouseId === warehouseId
    );
    const quantity = Number(issueQuantity);
    if (!selectedBalance) {
      toast.error('Selecciona una combinación de artículo y bodega con saldo disponible.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > selectedBalance.quantity) {
      toast.error(`La cantidad debe ser mayor a cero y no superar ${selectedBalance.quantity}.`);
      return;
    }
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(issueReference.trim())) {
      toast.error('Ingresa un vale de salida válido (máximo 80 caracteres).');
      return;
    }

    setSubmitting(true);
    try {
      const result = await recordProjectStockIssueToFirestore({
        movementId: `iss_${issueReference.trim()}`,
        projectId: issueProjectId,
        itemId,
        warehouseId,
        quantity,
        reference: issueReference.trim(),
        notes: issueNotes.trim() || undefined,
        companyId,
        userId,
      });
      setIssueReference('');
      setIssueNotes('');
      setIssueQuantity('1');
      toast.success(result.alreadyProcessed
        ? 'Esta salida ya estaba registrada; no se volvió a descontar inventario.'
        : 'Salida registrada y existencias descontadas.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo registrar la salida de inventario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWarehouseTransferSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWriteInventory || submitting) return;
    const [itemId, fromWarehouseId] = transferBalanceKey.split('|');
    const sourceBalance = balances.find(
      (balance) => balance.itemId === itemId && balance.warehouseId === fromWarehouseId
    );
    const sourceWarehouse = warehouses.find((warehouse) => warehouse.id === fromWarehouseId);
    const destinationWarehouse = warehouses.find((warehouse) => warehouse.id === transferDestinationId);
    const quantity = Number(transferQuantity);

    if (!sourceBalance || !sourceWarehouse || !destinationWarehouse) {
      toast.error('Selecciona un artículo y dos bodegas válidas.');
      return;
    }
    if (!destinationWarehouse.active || destinationWarehouse.id === sourceWarehouse.id) {
      toast.error('La bodega destino debe estar activa y ser diferente a la de origen.');
      return;
    }
    if (
      sourceWarehouse.type === 'project' &&
      destinationWarehouse.type === 'project' &&
      sourceWarehouse.projectId !== destinationWarehouse.projectId
    ) {
      toast.error('No se permiten traslados directos entre bodegas de proyectos diferentes.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > sourceBalance.quantity) {
      toast.error(`La cantidad debe ser mayor a cero y no superar ${sourceBalance.quantity}.`);
      return;
    }
    if (!/^[a-zA-Z0-9_-]{1,75}$/.test(transferReference.trim())) {
      toast.error('Ingresa una referencia válida para el traslado.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await transferInventoryBetweenWarehousesToFirestore({
        transferId: transferReference.trim(),
        itemId,
        fromWarehouseId,
        toWarehouseId: destinationWarehouse.id,
        quantity,
        notes: transferNotes.trim() || undefined,
        companyId,
        userId,
      });
      setTransferReference('');
      setTransferNotes('');
      setTransferQuantity('1');
      toast.success(result.alreadyProcessed
        ? 'Este traslado ya estaba registrado; no se duplicó el inventario.'
        : 'Traslado registrado: salida y entrada de existencias conciliadas.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo registrar el traslado.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContractSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canWritePurchasing || submitting) return;
    setSubmitting(true);
    try {
      await createSubcontractToFirestore(
        {
          projectId: contractProjectId,
          supplierId: contractSupplierId,
          contractNumber,
          description: contractDescription,
          startDate: contractStartDate,
          endDate: contractEndDate,
          amountGTQ: Number(contractAmount),
          paidGTQ: 0,
          status: contractStatus,
        },
        companyId,
        userId
      );
      setContractNumber('');
      setContractDescription('');
      setContractEndDate('');
      setContractAmount('');
      setContractStatus('draft');
      toast.success('Subcontrato registrado.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo registrar el subcontrato.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubcontractPayment = async (
    event: FormEvent<HTMLFormElement>,
    contract: SubcontractRecord
  ) => {
    event.preventDefault();
    if (!canWritePurchasing || submitting) return;
    const amountGTQ = Number(paymentAmount);
    const outstanding = Math.max(0, contract.amountGTQ - contract.paidGTQ);
    if (!Number.isFinite(amountGTQ) || amountGTQ <= 0 || amountGTQ > outstanding) {
      toast.error(`El pago debe ser mayor a cero y no superar el saldo pendiente (${currency.format(outstanding)}).`);
      return;
    }
    if (!/^[a-zA-Z0-9_-]{1,60}$/.test(paymentReference.trim())) {
      toast.error('Ingresa una referencia de pago válida.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await registerSubcontractPaymentToFirestore({
        contractId: contract.id,
        amountGTQ,
        paymentDate,
        reference: paymentReference.trim(),
        paymentMethod,
        notes: paymentNotes.trim() || undefined,
        companyId,
        userId,
      });
      setPayingContractId('');
      setPaymentAmount('');
      setPaymentReference('');
      setPaymentMethod('Transferencia BI');
      setPaymentNotes('');
      toast.success(result.alreadyProcessed
        ? 'Este pago ya estaba registrado; no se duplicó.'
        : 'Pago de subcontrato registrado y conciliado.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo registrar el pago.');
    } finally {
      setSubmitting(false);
    }
  };

  const sections: Array<{ id: Section; label: string }> = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'articulos', label: 'Artículos' },
    { id: 'bodegas', label: 'Bodegas' },
    { id: 'proveedores', label: 'Proveedores' },
    { id: 'ordenes', label: 'Órdenes de compra' },
    { id: 'movimientos', label: 'Movimientos' },
    { id: 'subcontratos', label: 'Subcontratos' },
  ];

  const visibleSections = sections;

  const projectOptions = projects.filter((project) => project.status !== 'Archivado');

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Abastecimiento y almacenes</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Inventario & Compras</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Catálogo, bodegas y documentos de compra por empresa y proyecto. Los saldos se calculan desde movimientos registrados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 px-3 py-1.5">{activeItems.length} artículos</span>
          <span className="rounded-full border border-white/10 px-3 py-1.5">{activeWarehouses.length} bodegas</span>
          <span className="rounded-full border border-white/10 px-3 py-1.5">{pendingOrders.length} órdenes abiertas</span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-white/10 pb-2" role="tablist" aria-label="Secciones de inventario y compras">
        {visibleSections.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={section === item.id}
            onClick={() => setSection(item.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm transition ${section === item.id ? 'bg-amber-400 text-slate-950 font-semibold' : 'text-slate-300 hover:bg-white/5'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}
      {loading ? (
        <div role="status" className={cardClass}>Cargando catálogos y movimientos de la empresa…</div>
      ) : (
        <>
          {section === 'resumen' && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className={cardClass}><p className="text-xs text-slate-400">Artículos activos</p><p className="mt-1 text-2xl font-semibold text-white">{activeItems.length}</p></div>
                <div className={cardClass}><p className="text-xs text-slate-400">Bodegas activas</p><p className="mt-1 text-2xl font-semibold text-white">{activeWarehouses.length}</p></div>
                <div className={cardClass}><p className="text-xs text-slate-400">Alertas de reposición</p><p className="mt-1 text-2xl font-semibold text-amber-300">{reorderAlerts.length}</p></div>
                <div className={cardClass}><p className="text-xs text-slate-400">Contratos por vencer / vencidos</p><p className="mt-1 text-2xl font-semibold text-white">{expiryAlerts.length}</p></div>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <section className={cardClass}>
                  <h3 className="font-semibold text-white">Existencias calculadas</h3>
                  <p className="mb-3 mt-1 text-xs text-slate-400">Solo aparecen combinaciones artículo/bodega que ya tienen movimientos registrados.</p>
                  {balances.length === 0 ? <EmptyState message="Aún no hay movimientos de inventario. Registra saldos iniciales al habilitar el flujo transaccional." /> : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[460px] text-left text-sm">
                        <thead className="text-xs text-slate-400"><tr><th className="pb-2">Artículo</th><th className="pb-2">Bodega</th><th className="pb-2 text-right">Cantidad</th><th className="pb-2 text-right">Promedio</th></tr></thead>
                        <tbody>{balances.map((balance) => {
                          const item = items.find((record) => record.id === balance.itemId);
                          const warehouse = warehouses.find((record) => record.id === balance.warehouseId);
                          return <tr key={`${balance.itemId}-${balance.warehouseId}`} className="border-t border-white/5">
                            <td className="py-2 pr-3 text-white">{item?.name ?? balance.itemId}<span className="block text-xs text-slate-500">{item?.unit}</span></td>
                            <td className="py-2 pr-3 text-slate-300">{warehouse?.name ?? balance.warehouseId}</td>
                            <td className="py-2 text-right tabular-nums text-white">{balance.quantity.toLocaleString('es-GT')}</td>
                            <td className="py-2 text-right tabular-nums text-slate-300">{currency.format(balance.averageUnitCostGTQ)}</td>
                          </tr>;
                        })}</tbody>
                      </table>
                    </div>
                  )}
                </section>
                <section className={cardClass}>
                  <h3 className="font-semibold text-white">Alertas de reposición</h3>
                  <p className="mb-3 mt-1 text-xs text-slate-400">Se generan comparando las existencias registradas con el mínimo del artículo.</p>
                  {reorderAlerts.length === 0 ? <EmptyState message="No hay alertas de reposición con los movimientos registrados." /> : (
                    <div className="space-y-2">{reorderAlerts.map((balance) => {
                      const item = items.find((record) => record.id === balance.itemId);
                      const warehouse = warehouses.find((record) => record.id === balance.warehouseId);
                      return <div key={`${balance.itemId}-${balance.warehouseId}`} className="flex items-center justify-between gap-3 rounded-xl bg-amber-500/10 px-3 py-2">
                        <div><p className="text-sm font-medium text-white">{item?.name ?? balance.itemId}</p><p className="text-xs text-slate-400">{warehouse?.name} · mínimo {balance.reorderLevel}</p></div>
                        <span className="text-sm font-semibold text-amber-300">{balance.quantity}</span>
                      </div>;
                    })}</div>
                  )}
                </section>
              </div>
              <section className={cardClass}>
                <h3 className="font-semibold text-white">Alertas de subcontratos</h3>
                {expiryAlerts.length === 0 ? <p className="mt-2 text-sm text-slate-400">No hay contratos activos vencidos o dentro de los próximos 30 días.</p> : (
                  <div className="mt-3 space-y-2">{expiryAlerts.map((alert) => {
                    const contract = contracts.find((record) => record.id === alert.subcontractId);
                    const project = projects.find((record) => record.id === alert.projectId);
                    return <div key={alert.subcontractId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 px-3 py-2">
                      <div><p className="text-sm font-medium text-white">{alert.contractNumber}</p><p className="text-xs text-slate-400">{project?.name ?? alert.projectId} · {formatDate(contract?.endDate ?? '')}</p></div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${alert.severity === 'expired' ? 'bg-red-500/15 text-red-300' : alert.severity === 'urgent' ? 'bg-amber-500/15 text-amber-300' : 'bg-sky-500/15 text-sky-300'}`}>{alert.severity === 'expired' ? 'Vencido' : alert.severity === 'urgent' ? `${alert.daysRemaining} días` : `${alert.daysRemaining} días`}</span>
                    </div>;
                  })}</div>
                )}
              </section>
            </div>
          )}

          {section === 'articulos' && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className={cardClass}>
                <h3 className="mb-3 font-semibold text-white">Catálogo de artículos</h3>
                {activeItems.length === 0 ? <EmptyState message="Aún no hay artículos registrados." /> : <div className="space-y-2">{activeItems.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 px-3 py-2"><div><p className="text-sm font-medium text-white">{item.name}</p><p className="text-xs text-slate-400">{item.unit} · mínimo {item.reorderLevel}</p></div><span className="text-xs text-slate-500">{balances.filter((balance) => balance.itemId === item.id).length} bodegas con movimientos</span></div>)}</div>}
              </section>
              {canWriteInventory && <form onSubmit={handleItemSubmit} className={`${cardClass} space-y-3`}>
                <h3 className="font-semibold text-white">Nuevo artículo</h3>
                <label className="block"><span className={labelClass}>Nombre</span><input className={fieldClass} value={itemName} onChange={(event) => setItemName(event.target.value)} required maxLength={200} /></label>
                <label className="block"><span className={labelClass}>Unidad</span><input className={fieldClass} value={itemUnit} onChange={(event) => setItemUnit(event.target.value)} required maxLength={32} /></label>
                <label className="block"><span className={labelClass}>Mínimo de reposición</span><input className={fieldClass} type="number" min="0" step="0.01" value={itemReorderLevel} onChange={(event) => setItemReorderLevel(event.target.value)} required /></label>
                <button className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={submitting}>{submitting ? 'Guardando…' : 'Guardar artículo'}</button>
              </form>}
            </div>
          )}

          {section === 'bodegas' && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className={cardClass}>
                <h3 className="mb-3 font-semibold text-white">Bodegas</h3>
                {activeWarehouses.length === 0 ? <EmptyState message="Aún no hay bodegas registradas." /> : <div className="space-y-2">{activeWarehouses.map((warehouse) => <div key={warehouse.id} className="rounded-xl border border-white/5 px-3 py-3"><p className="text-sm font-medium text-white">{warehouse.name}</p><p className="mt-1 text-xs text-slate-400">{warehouse.type === 'general' ? 'Bodega general' : `Proyecto: ${projects.find((project) => project.id === warehouse.projectId)?.name ?? warehouse.projectId}`}</p></div>)}</div>}
              </section>
              {canWriteInventory && <form onSubmit={handleWarehouseSubmit} className={`${cardClass} space-y-3`}>
                <h3 className="font-semibold text-white">Nueva bodega</h3>
                <label className="block"><span className={labelClass}>Nombre</span><input className={fieldClass} value={warehouseName} onChange={(event) => setWarehouseName(event.target.value)} required maxLength={150} /></label>
                <label className="block"><span className={labelClass}>Tipo</span><select className={fieldClass} value={warehouseType} onChange={(event) => setWarehouseType(event.target.value as 'general' | 'project')}><option value="project">Por proyecto</option><option value="general">General</option></select></label>
                {warehouseType === 'project' && <label className="block"><span className={labelClass}>Proyecto</span><select className={fieldClass} value={warehouseProjectId} onChange={(event) => setWarehouseProjectId(event.target.value)} required><option value="">Selecciona un proyecto</option>{projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
                <button className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={submitting || (warehouseType === 'project' && !warehouseProjectId)}>{submitting ? 'Guardando…' : 'Guardar bodega'}</button>
              </form>}
            </div>
          )}

          {section === 'proveedores' && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className={cardClass}>
                <h3 className="mb-3 font-semibold text-white">Proveedores</h3>
                {suppliers.length === 0 ? <EmptyState message="Aún no hay proveedores registrados." /> : <div className="space-y-2">{suppliers.map((supplier) => <div key={supplier.id} className="rounded-xl border border-white/5 px-3 py-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-white">{supplier.name}</p><span className={`rounded-full px-2 py-1 text-[10px] ${supplier.active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>{supplier.active ? 'Activo' : 'Inactivo'}</span></div><p className="mt-1 text-xs text-slate-400">NIT: {supplier.nit} {supplier.phone ? `· ${supplier.phone}` : ''}</p>{supplier.email && <p className="mt-1 text-xs text-slate-500">{supplier.email}</p>}</div>)}</div>}
              </section>
              {canWritePurchasing && <form onSubmit={handleSupplierSubmit} className={`${cardClass} space-y-3`}>
                <h3 className="font-semibold text-white">Nuevo proveedor</h3>
                <label className="block"><span className={labelClass}>Nombre / razón social</span><input className={fieldClass} value={supplierName} onChange={(event) => setSupplierName(event.target.value)} required maxLength={200} /></label>
                <label className="block"><span className={labelClass}>NIT</span><input className={fieldClass} value={supplierNit} onChange={(event) => setSupplierNit(event.target.value)} required maxLength={30} /></label>
                <label className="block"><span className={labelClass}>Teléfono (opcional)</span><input className={fieldClass} value={supplierPhone} onChange={(event) => setSupplierPhone(event.target.value)} maxLength={40} /></label>
                <label className="block"><span className={labelClass}>Correo (opcional)</span><input className={fieldClass} type="email" value={supplierEmail} onChange={(event) => setSupplierEmail(event.target.value)} maxLength={150} /></label>
                <button className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={submitting}>{submitting ? 'Guardando…' : 'Guardar proveedor'}</button>
              </form>}
            </div>
          )}

          {section === 'ordenes' && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <section className={cardClass}>
                <h3 className="mb-3 font-semibold text-white">Órdenes de compra</h3>
                {orders.length === 0 ? <EmptyState message="Aún no hay órdenes de compra." /> : (
                  <div className="space-y-3">
                    {orders.map((order) => {
                      const totalReceived = order.lines.reduce((total, line) => total + line.receivedQuantity, 0);
                      const totalOrdered = order.lines.reduce((total, line) => total + line.quantity, 0);
                      const compatibleWarehouses = activeWarehouses.filter((warehouse) =>
                        warehouse.type === 'general' || warehouse.projectId === order.projectId
                      );
                      return (
                        <div key={order.id} className="rounded-xl border border-white/5 px-3 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white">{order.number}</p>
                            <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300">{order.status}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{projects.find((project) => project.id === order.projectId)?.name ?? order.projectId} · {suppliers.find((supplier) => supplier.id === order.supplierId)?.name ?? 'Proveedor'}</p>
                          <p className="mt-2 text-sm font-semibold text-white">{currency.format(order.totalGTQ)}</p>
                          <p className="mt-1 text-xs text-slate-500">{order.lines.length} renglón(es) · IVA {order.taxPercent}% · {formatDate(order.createdAt)}</p>
                          <p className="mt-1 text-xs text-slate-400">Recibido total: {totalReceived} de {totalOrdered}</p>
                          {order.status === 'draft' && canWritePurchasing && (
                            <button type="button" disabled={submitting} onClick={() => void handleApproveOrder(order.id)} className="mt-3 rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">
                              {submitting ? 'Procesando…' : 'Aprobar orden'}
                            </button>
                          )}
                          <div className="mt-3 space-y-2">
                            {order.lines.map((line, lineIndex) => {
                              const remaining = Math.max(0, line.quantity - line.receivedQuantity);
                              const compatibleItemWarehouses = compatibleWarehouses;
                              const isReceivingThisLine = receivingOrderId === order.id && receivingLineIndex === lineIndex;
                              return (
                                <div key={line.itemId} className="rounded-xl bg-slate-950/60 p-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-medium text-white">{line.description}</p>
                                      <p className="text-xs text-slate-400">{line.quantity} {line.unit} · {currency.format(line.unitPriceGTQ)} c/u</p>
                                    </div>
                                    <span className="text-xs text-slate-300">Recibido {line.receivedQuantity} · Pendiente {remaining}</span>
                                  </div>
                                  {['approved', 'partially_received'].includes(order.status) && canWriteInventory && remaining > 0 && (
                                    <div className="mt-2">
                                      {!isReceivingThisLine ? (
                                        <button type="button" disabled={submitting || compatibleItemWarehouses.length === 0} onClick={() => {
                                          setReceivingOrderId(order.id);
                                          setReceivingLineIndex(lineIndex);
                                          setReceiptWarehouseId(compatibleItemWarehouses[0]?.id ?? '');
                                          setReceiptQuantity(String(remaining));
                                          setReceiptNumber('');
                                        }} className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-50">
                                          Recibir renglón
                                        </button>
                                      ) : (
                                        <form onSubmit={(event) => void handleReceiptSubmit(event, order, lineIndex)} className="grid gap-2 rounded-xl bg-slate-900 p-3">
                                          <label className="block"><span className={labelClass}>Bodega receptora</span>
                                            <select className={fieldClass} value={receiptWarehouseId} onChange={(event) => setReceiptWarehouseId(event.target.value)} required>
                                              <option value="">Selecciona bodega</option>
                                              {compatibleItemWarehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                                            </select>
                                          </label>
                                          <label className="block"><span className={labelClass}>Cantidad recibida (pendiente: {remaining})</span>
                                            <input className={fieldClass} type="number" min="0.0001" max={remaining} step="0.0001" value={receiptQuantity} onChange={(event) => setReceiptQuantity(event.target.value)} required />
                                          </label>
                                          <label className="block"><span className={labelClass}>Número de recepción / remisión</span>
                                            <input className={fieldClass} value={receiptNumber} onChange={(event) => setReceiptNumber(event.target.value)} pattern="[a-zA-Z0-9_-]{1,40}" maxLength={40} required />
                                          </label>
                                          <div className="flex flex-wrap gap-2">
                                            <button type="submit" disabled={submitting} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">{submitting ? 'Guardando…' : 'Confirmar recepción'}</button>
                                            <button type="button" disabled={submitting} onClick={() => { setReceivingOrderId(''); setReceivingLineIndex(null); }} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 disabled:opacity-50">Cancelar</button>
                                          </div>
                                        </form>
                                      )}
                                      {compatibleItemWarehouses.length === 0 && <p className="mt-2 text-xs text-amber-300">No existe una bodega activa compatible con este proyecto.</p>}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
              {canWritePurchasing && (
                <form onSubmit={handleOrderSubmit} className={`${cardClass} space-y-3`}>
                  <h3 className="font-semibold text-white">Nueva orden (borrador)</h3>
                  <label className="block"><span className={labelClass}>Proyecto</span>
                    <select className={fieldClass} value={orderProjectId} onChange={(event) => setOrderProjectId(event.target.value)} required>
                      <option value="">Selecciona un proyecto</option>
                      {projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                  </label>
                  <label className="block"><span className={labelClass}>Proveedor</span>
                    <select className={fieldClass} value={orderSupplierId} onChange={(event) => setOrderSupplierId(event.target.value)} required>
                      <option value="">Selecciona un proveedor</option>
                      {activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} · {supplier.nit}</option>)}
                    </select>
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-white">Renglones de la orden</h4>
                    <button type="button" disabled={submitting || orderLines.length >= 7} onClick={() => setOrderLines((current) => [...current, { itemId: '', quantity: '1', unitPriceGTQ: '0' }])} className="rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-semibold text-amber-200 disabled:opacity-50">
                      Agregar renglón ({orderLines.length}/7)
                    </button>
                  </div>
                  {orderLines.map((line, index) => (
                    <div key={index} className="grid gap-2 rounded-xl bg-slate-950/70 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">Renglón {index + 1}</span>
                        <button type="button" disabled={submitting || orderLines.length <= 1} onClick={() => setOrderLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="text-xs text-red-300 disabled:opacity-40">Quitar</button>
                      </div>
                      <label className="block"><span className={labelClass}>Artículo</span>
                        <select className={fieldClass} value={line.itemId} onChange={(event) => setOrderLines((current) => current.map((item, lineIndex) => lineIndex === index ? { ...item, itemId: event.target.value } : item))} required>
                          <option value="">Selecciona un artículo</option>
                          {activeItems.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}
                        </select>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block"><span className={labelClass}>Cantidad</span>
                          <input className={fieldClass} type="number" min="0.0001" step="0.0001" value={line.quantity} onChange={(event) => setOrderLines((current) => current.map((item, lineIndex) => lineIndex === index ? { ...item, quantity: event.target.value } : item))} required />
                        </label>
                        <label className="block"><span className={labelClass}>Precio unitario (Q)</span>
                          <input className={fieldClass} type="number" min="0" step="0.01" value={line.unitPriceGTQ} onChange={(event) => setOrderLines((current) => current.map((item, lineIndex) => lineIndex === index ? { ...item, unitPriceGTQ: event.target.value } : item))} required />
                        </label>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-xl bg-slate-950/80 p-3 text-sm">
                    <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{currency.format(orderLines.reduce((sum, line) => sum + Math.max(0, Number(line.quantity) * Number(line.unitPriceGTQ) || 0), 0))}</span></div>
                    <div className="mt-1 flex justify-between text-slate-400"><span>IVA (12%)</span><span>{currency.format(orderLines.reduce((sum, line) => sum + Math.max(0, Number(line.quantity) * Number(line.unitPriceGTQ) || 0), 0) * 0.12)}</span></div>
                    <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-semibold text-white"><span>Total</span><span>{currency.format(orderLines.reduce((sum, line) => sum + Math.max(0, Number(line.quantity) * Number(line.unitPriceGTQ) || 0), 0) * 1.12)}</span></div>
                  </div>
                  <button className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={submitting || !projectOptions.length || !activeSuppliers.length || !activeItems.length}>{submitting ? 'Guardando…' : 'Crear borrador de OC'}</button>
                  <p className="text-xs text-slate-500">Máximo 7 renglones únicos. La recepción es independiente por artículo y actualiza el saldo mediante transacción.</p>
                </form>
              )}
            </div>
          )}

          {section === 'movimientos' && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className={`${cardClass} xl:col-span-2`} aria-label="Historial de movimientos">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-white">Historial de movimientos</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Registro de recepciones, salidas, traslados y ajustes, ordenado del más reciente al más antiguo.
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{stockMovementRows.length} de {movements.length} movimientos</span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Buscar movimiento</span>
                    <input className={fieldClass} type="search" value={movementSearch} onChange={(event) => setMovementSearch(event.target.value)} maxLength={120} placeholder="Artículo, bodega, proyecto o referencia" />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Tipo de movimiento</span>
                    <select className={fieldClass} value={movementKindFilter} onChange={(event) => setMovementKindFilter(event.target.value as MovementKindFilter)}>
                      <option value="all">Todos los movimientos</option>
                      {Object.entries(movementLabels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
                    </select>
                  </label>
                </div>
                {stockMovementRows.length === 0 ? (
                  <div className="mt-3">
                    <EmptyState message={movements.length === 0 ? 'Aún no hay movimientos registrados en esta empresa.' : 'No hay movimientos que coincidan con los filtros.'} />
                  </div>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-left text-xs">
                      <thead className="text-slate-400">
                        <tr>
                          <th className="pb-2 pr-3">Fecha</th>
                          <th className="pb-2 pr-3">Movimiento</th>
                          <th className="pb-2 pr-3">Artículo</th>
                          <th className="pb-2 pr-3">Bodega</th>
                          <th className="pb-2 pr-3">Proyecto</th>
                          <th className="pb-2 pr-3 text-right">Cantidad</th>
                          <th className="pb-2 pr-3 text-right">Costo unitario</th>
                          <th className="pb-2 pr-3 text-right">Valor salida a obra</th>
                          <th className="pb-2 pr-3">Referencia</th>
                          <th className="pb-2">Registrado por</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockMovementRows.map((movement) => {
                          const item = items.find((record) => record.id === movement.itemId);
                          const warehouse = warehouses.find((record) => record.id === movement.warehouseId);
                          const project = projects.find((record) => record.id === movement.projectId);
                          const issuedValue = movement.kind === 'project_issue'
                            ? movement.quantity * movement.unitCostGTQ
                            : null;
                          return (
                            <tr key={movement.id} className="border-t border-white/5 align-top">
                              <td className="py-2 pr-3 whitespace-nowrap text-slate-300">{formatDate(movement.occurredAt)}</td>
                              <td className="py-2 pr-3 text-white">{movementLabels[movement.kind]}</td>
                              <td className="py-2 pr-3 text-white">{item?.name ?? movement.itemId}<span className="block text-slate-500">{item?.unit ?? ''}</span></td>
                              <td className="py-2 pr-3 text-slate-300">{warehouse?.name ?? movement.warehouseId}</td>
                              <td className="py-2 pr-3 text-slate-300">{project?.name ?? movement.projectId ?? '—'}</td>
                              <td className="py-2 pr-3 text-right tabular-nums text-white">{movement.quantity.toLocaleString('es-GT', { maximumFractionDigits: 4 })} {item?.unit ?? ''}</td>
                              <td className="py-2 pr-3 text-right tabular-nums text-slate-300">{currency.format(movement.unitCostGTQ)}</td>
                              <td className="py-2 pr-3 text-right tabular-nums text-amber-200">{issuedValue === null ? '—' : currency.format(issuedValue)}</td>
                              <td className="py-2 pr-3 text-slate-300">{movement.receiptNumber ?? movement.referenceId ?? '—'}{movement.notes && <span className="block max-w-[180px] truncate text-slate-500" title={movement.notes}>{movement.notes}</span>}</td>
                              <td className="py-2 text-slate-400">{movement.createdBy}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-500">
                  El valor de salida a obra es una valuación referencial (cantidad × costo promedio del inventario); no se registra como egreso de caja ni se suma automáticamente a los gastos del proyecto.
                </p>
              </section>
              <section className={cardClass}>
                <h3 className="mb-3 font-semibold text-white">Existencias disponibles</h3>
                {balances.length === 0 ? (
                  <EmptyState message="Aún no hay saldos calculados. Registra una recepción de compra para habilitar salidas." />
                ) : (
                  <div className="space-y-2">
                    {balances.map((balance) => (
                      <div key={balance.itemId + ':' + balance.warehouseId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-white">{items.find((item) => item.id === balance.itemId)?.name ?? balance.itemId}</p>
                          <p className="text-xs text-slate-400">{warehouses.find((warehouse) => warehouse.id === balance.warehouseId)?.name ?? balance.warehouseId}</p>
                        </div>
                        <span className="text-sm font-semibold text-white">{balance.quantity} · {currency.format(balance.averageUnitCostGTQ)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              {canWriteInventory && (
                <form onSubmit={(event) => void handleOpeningStockSubmit(event)} className={`${cardClass} space-y-3`}>
                  <h3 className="font-semibold text-white">Registrar inventario inicial</h3>
                  <p className="text-xs text-slate-400">
                    Carga el conteo físico de apertura por artículo y bodega. Solo se permite una apertura por combinación; correcciones posteriores deben quedar registradas como ajustes.
                  </p>
                  {openingCandidates.length === 0 ? (
                    <EmptyState message="No hay combinaciones nuevas. Todas las bodegas y artículos ya tienen historial o aún no hay catálogo activo." />
                  ) : (
                    <>
                      <label className="block">
                        <span className={labelClass}>Artículo y bodega</span>
                        <select
                          className={fieldClass}
                          value={openingBalanceKey}
                          onChange={(event) => { setOpeningBalanceKey(event.target.value); setOpeningMovementId(''); }}
                          required
                        >
                          <option value="">Selecciona artículo y bodega</option>
                          {openingCandidates.map(({ item, warehouse, key }) => (
                            <option key={key} value={key}>{item.name} · {warehouse.name} · {item.unit}</option>
                          ))}
                        </select>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className={labelClass}>Existencia física inicial</span>
                          <input className={fieldClass} type="number" min="0.0001" step="0.0001" value={openingQuantity} onChange={(event) => { setOpeningQuantity(event.target.value); setOpeningMovementId(''); }} required />
                        </label>
                        <label className="block">
                          <span className={labelClass}>Costo unitario promedio (Q)</span>
                          <input className={fieldClass} type="number" min="0" step="0.01" value={openingUnitCost} onChange={(event) => { setOpeningUnitCost(event.target.value); setOpeningMovementId(''); }} required />
                        </label>
                      </div>
                      <label className="block">
                        <span className={labelClass}>Acta / referencia de conteo</span>
                        <input className={fieldClass} value={openingReference} onChange={(event) => { setOpeningReference(event.target.value); setOpeningMovementId(''); }} maxLength={100} pattern="[a-zA-Z0-9_-]{1,100}" required />
                      </label>
                      <label className="block">
                        <span className={labelClass}>Observaciones</span>
                        <textarea className={fieldClass} rows={2} value={openingNotes} onChange={(event) => { setOpeningNotes(event.target.value); setOpeningMovementId(''); }} maxLength={1000} />
                      </label>
                      <button type="submit" className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={submitting || !openingBalanceKey}>
                        {submitting ? 'Registrando…' : 'Confirmar inventario inicial'}
                      </button>
                    </>
                  )}
                </form>
              )}
              {canWriteInventory && (
                <form onSubmit={(event) => void handleStockAdjustmentSubmit(event)} className={`${cardClass} space-y-3`}>
                  <h3 className="font-semibold text-white">Conciliación y ajustes de inventario</h3>
                  <p className="text-xs text-slate-400">
                    Registra diferencias del conteo físico. Las entradas recalculan el costo promedio; las salidas conservan el costo promedio vigente y nunca pueden dejar saldo negativo.
                  </p>
                  {adjustmentCandidates.length === 0 ? (
                    <EmptyState message="No existen saldos de inventario para conciliar. Registra una apertura o recepción primero." />
                  ) : (
                    <>
                      <label className="block">
                        <span className={labelClass}>Artículo y bodega</span>
                        <select
                          className={fieldClass}
                          value={adjustmentBalanceKey}
                          onChange={(event) => { setAdjustmentBalanceKey(event.target.value); setAdjustmentMovementId(''); }}
                          required
                        >
                          <option value="">Selecciona un saldo existente</option>
                          {adjustmentCandidates.map(({ item, warehouse, balance, key }) => (
                            <option key={key} value={key}>
                              {item.name} · {warehouse.name} · Disponible: {balance.quantity} {item.unit}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className={labelClass}>Tipo de ajuste</span>
                        <select
                          className={fieldClass}
                          value={adjustmentKind}
                          onChange={(event) => {
                            setAdjustmentKind(event.target.value as 'adjustment_in' | 'adjustment_out');
                            setAdjustmentMovementId('');
                          }}
                        >
                          <option value="adjustment_in">Ajuste de entrada (sobrante físico)</option>
                          <option value="adjustment_out">Ajuste de salida (faltante / daño)</option>
                        </select>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className={labelClass}>Cantidad del ajuste</span>
                          <input
                            className={fieldClass}
                            type="number"
                            min="0.0001"
                            step="0.0001"
                            value={adjustmentQuantity}
                            onChange={(event) => { setAdjustmentQuantity(event.target.value); setAdjustmentMovementId(''); }}
                            required
                          />
                        </label>
                        {adjustmentKind === 'adjustment_in' ? (
                          <label className="block">
                            <span className={labelClass}>Costo unitario (Q)</span>
                            <input
                              className={fieldClass}
                              type="number"
                              min="0"
                              step="0.01"
                              value={adjustmentUnitCost}
                              onChange={(event) => { setAdjustmentUnitCost(event.target.value); setAdjustmentMovementId(''); }}
                              required
                            />
                          </label>
                        ) : (
                          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-400">
                            Se utilizará el costo promedio vigente de la bodega: <strong className="text-white">{currency.format(
                              adjustmentCandidates.find((entry) => entry.key === adjustmentBalanceKey)?.balance.averageUnitCostGTQ ?? 0
                            )}</strong>
                          </div>
                        )}
                      </div>
                      <label className="block">
                        <span className={labelClass}>Referencia / acta de conciliación</span>
                        <input
                          className={fieldClass}
                          value={adjustmentReference}
                          onChange={(event) => { setAdjustmentReference(event.target.value); setAdjustmentMovementId(''); }}
                          maxLength={100}
                          pattern="[a-zA-Z0-9_-]{1,100}"
                          required
                        />
                      </label>
                      <label className="block">
                        <span className={labelClass}>Motivo documentado del ajuste</span>
                        <textarea
                          className={fieldClass}
                          rows={2}
                          value={adjustmentReason}
                          onChange={(event) => { setAdjustmentReason(event.target.value); setAdjustmentMovementId(''); }}
                          maxLength={1000}
                          required
                        />
                      </label>
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-violet-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
                        disabled={submitting || !adjustmentBalanceKey}
                      >
                        {submitting ? 'Registrando…' : 'Registrar ajuste auditado'}
                      </button>
                    </>
                  )}
                </form>
              )}
              {canWriteInventory && (
                <form onSubmit={(event) => void handleStockIssueSubmit(event)} className={`${cardClass} space-y-3`}>
                  <h3 className="font-semibold text-white">Registrar salida de material a obra</h3>
                  <label className="block">
                    <span className={labelClass}>Proyecto destino</span>
                    <select className={fieldClass} value={issueProjectId} onChange={(event) => { setIssueProjectId(event.target.value); setIssueBalanceKey(''); }} required>
                      <option value="">Selecciona un proyecto</option>
                      {projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelClass}>Artículo y bodega de origen</span>
                    <select className={fieldClass} value={issueBalanceKey} onChange={(event) => setIssueBalanceKey(event.target.value)} required>
                      <option value="">Selecciona existencias</option>
                      {balances.filter((balance) => balance.quantity > 0 && (
                        warehouses.find((warehouse) => warehouse.id === balance.warehouseId)?.type === 'general' ||
                        warehouses.find((warehouse) => warehouse.id === balance.warehouseId)?.projectId === issueProjectId
                      )).map((balance) => {
                        const item = items.find((candidate) => candidate.id === balance.itemId);
                        const warehouse = warehouses.find((candidate) => candidate.id === balance.warehouseId);
                        return <option key={balance.itemId + ':' + balance.warehouseId} value={balance.itemId + '|' + balance.warehouseId}>
                          {item?.name ?? balance.itemId} · {warehouse?.name ?? balance.warehouseId} · disponible {balance.quantity} {item?.unit ?? ''}
                        </option>;
                      })}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelClass}>Cantidad a retirar</span>
                    <input className={fieldClass} type="number" min="0.0001" step="0.0001" value={issueQuantity} onChange={(event) => setIssueQuantity(event.target.value)} required />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Vale / referencia de salida</span>
                    <input className={fieldClass} value={issueReference} onChange={(event) => setIssueReference(event.target.value)} maxLength={80} pattern="[a-zA-Z0-9_-]{1,80}" required />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Notas</span>
                    <textarea className={fieldClass} rows={3} value={issueNotes} onChange={(event) => setIssueNotes(event.target.value)} maxLength={1000} />
                  </label>
                  <button type="submit" className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={submitting || !projectOptions.length || !balances.some((balance) => balance.quantity > 0)}>
                    {submitting ? 'Registrando…' : 'Confirmar salida'}
                  </button>
                  <p className="text-xs text-slate-500">El sistema valida el saldo y guarda el movimiento y el descuento en una sola transacción. No permite existencias negativas ni duplicar el vale.</p>
                </form>
              )}
              {canWriteInventory && (
                <form onSubmit={(event) => void handleWarehouseTransferSubmit(event)} className={`${cardClass} space-y-3`}>
                  <h3 className="font-semibold text-white">Trasladar entre bodegas</h3>
                  <label className="block">
                    <span className={labelClass}>Artículo y bodega de origen</span>
                    <select className={fieldClass} value={transferBalanceKey} onChange={(event) => {
                      setTransferBalanceKey(event.target.value);
                      setTransferDestinationId('');
                    }} required>
                      <option value="">Selecciona existencias</option>
                      {balances.filter((balance) => balance.quantity > 0).map((balance) => {
                        const item = items.find((candidate) => candidate.id === balance.itemId);
                        const warehouse = warehouses.find((candidate) => candidate.id === balance.warehouseId);
                        return (
                          <option key={balance.itemId + ':' + balance.warehouseId} value={balance.itemId + '|' + balance.warehouseId}>
                            {item?.name ?? balance.itemId} · {warehouse?.name ?? balance.warehouseId} · disponible {balance.quantity} {item?.unit ?? ''}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelClass}>Bodega de destino</span>
                    <select className={fieldClass} value={transferDestinationId} onChange={(event) => setTransferDestinationId(event.target.value)} required>
                      <option value="">Selecciona destino</option>
                      {(() => {
                        const sourceId = transferBalanceKey.split('|')[1];
                        const sourceWarehouse = warehouses.find((warehouse) => warehouse.id === sourceId);
                        return warehouses.filter((warehouse) =>
                          warehouse.active &&
                          warehouse.id !== sourceId &&
                          (
                            sourceWarehouse?.type !== 'project' ||
                            warehouse.type === 'general' ||
                            warehouse.projectId === sourceWarehouse.projectId
                          )
                        ).map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                        ));
                      })()}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelClass}>Cantidad a trasladar</span>
                    <input className={fieldClass} type="number" min="0.0001" step="0.0001" value={transferQuantity} onChange={(event) => setTransferQuantity(event.target.value)} required />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Número / referencia del traslado</span>
                    <input className={fieldClass} value={transferReference} onChange={(event) => setTransferReference(event.target.value)} maxLength={75} pattern="[a-zA-Z0-9_-]{1,75}" required />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Notas</span>
                    <textarea className={fieldClass} rows={3} value={transferNotes} onChange={(event) => setTransferNotes(event.target.value)} maxLength={1000} />
                  </label>
                  <button type="submit" className="w-full rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={submitting || !transferBalanceKey || !transferDestinationId}>
                    {submitting ? 'Registrando…' : 'Confirmar traslado'}
                  </button>
                  <p className="text-xs text-slate-500">El sistema registra las dos caras del traslado y actualiza ambos saldos en una sola transacción, conservando el costo promedio ponderado.</p>
                </form>
              )}
            </div>
          )}

          {section === 'subcontratos' && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className={cardClass}>
                <h3 className="mb-3 font-semibold text-white">Subcontratos</h3>
                {contracts.length === 0 ? <EmptyState message="Aún no hay subcontratos registrados." /> : (
                  <div className="space-y-2">
                    {contracts.map((contract) => {
                      const outstanding = Math.max(0, contract.amountGTQ - contract.paidGTQ);
                      return (
                        <div key={contract.id} className="rounded-xl border border-white/5 px-3 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white">{contract.contractNumber}</p>
                            <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs text-slate-200">{contract.status}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{projects.find((project) => project.id === contract.projectId)?.name ?? contract.projectId} · {suppliers.find((supplier) => supplier.id === contract.supplierId)?.name ?? 'Proveedor'}</p>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            <div><p className="text-slate-500">Contratado</p><p className="font-semibold text-white">{currency.format(contract.amountGTQ)}</p></div>
                            <div><p className="text-slate-500">Pagado</p><p className="font-semibold text-emerald-300">{currency.format(contract.paidGTQ)}</p></div>
                            <div><p className="text-slate-500">Pendiente</p><p className="font-semibold text-amber-200">{currency.format(outstanding)}</p></div>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">Vigencia: {formatDate(contract.startDate)} – {formatDate(contract.endDate)}</p>
                          {canWritePurchasing && contract.status === 'active' && outstanding > 0 && (
                            payingContractId === contract.id ? (
                              <form onSubmit={(event) => void handleSubcontractPayment(event, contract)} className="mt-3 grid gap-2 rounded-xl bg-slate-950/70 p-3">
                                <label className="block"><span className={labelClass}>Monto del pago (saldo: {currency.format(outstanding)})</span>
                                  <input className={fieldClass} type="number" min="0.01" max={outstanding} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} required />
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                  <label className="block"><span className={labelClass}>Fecha</span><input className={fieldClass} type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required /></label>
                                  <label className="block"><span className={labelClass}>Referencia / transferencia</span><input className={fieldClass} value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} maxLength={60} pattern="[a-zA-Z0-9_-]{1,60}" required /></label>
                                </div>
                                <label className="block"><span className={labelClass}>Método de pago</span>
                                  <select className={fieldClass} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)} required>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Transferencia BI">Transferencia bancaria</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Tarjeta">Tarjeta</option>
                                  </select>
                                </label>
                                <label className="block"><span className={labelClass}>Notas</span><textarea className={fieldClass} value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} maxLength={1000} rows={2} /></label>
                                <div className="flex flex-wrap gap-2">
                                  <button type="submit" disabled={submitting} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">{submitting ? 'Registrando…' : 'Confirmar pago'}</button>
                                  <button type="button" disabled={submitting} onClick={() => setPayingContractId('')} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 disabled:opacity-50">Cancelar</button>
                                </div>
                              </form>
                            ) : (
                              <button type="button" onClick={() => {
                                setPayingContractId(contract.id);
                                setPaymentAmount(outstanding.toFixed(2));
                                setPaymentDate(new Date().toISOString().slice(0, 10));
                                setPaymentReference('');
                                setPaymentNotes('');
                              }} className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200">
                                Registrar pago
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
              {canWritePurchasing && <form onSubmit={handleContractSubmit} className={`${cardClass} space-y-3`}>
                <h3 className="font-semibold text-white">Nuevo subcontrato</h3>
                <label className="block"><span className={labelClass}>Proyecto</span><select className={fieldClass} value={contractProjectId} onChange={(event) => setContractProjectId(event.target.value)} required><option value="">Selecciona un proyecto</option>{projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
                <label className="block"><span className={labelClass}>Proveedor / subcontratista</span><select className={fieldClass} value={contractSupplierId} onChange={(event) => setContractSupplierId(event.target.value)} required><option value="">Selecciona un proveedor</option>{activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
                <label className="block"><span className={labelClass}>Número de contrato</span><input className={fieldClass} value={contractNumber} onChange={(event) => setContractNumber(event.target.value)} required maxLength={80} /></label>
                <label className="block"><span className={labelClass}>Descripción / alcance</span><textarea className={fieldClass} value={contractDescription} onChange={(event) => setContractDescription(event.target.value)} required rows={3} maxLength={1000} /></label>
                <div className="grid grid-cols-2 gap-2"><label className="block"><span className={labelClass}>Inicio</span><input className={fieldClass} type="date" value={contractStartDate} onChange={(event) => setContractStartDate(event.target.value)} required /></label><label className="block"><span className={labelClass}>Fin</span><input className={fieldClass} type="date" value={contractEndDate} onChange={(event) => setContractEndDate(event.target.value)} min={contractStartDate} required /></label></div>
                <label className="block"><span className={labelClass}>Monto contratado (Q)</span><input className={fieldClass} type="number" min="0.01" step="0.01" value={contractAmount} onChange={(event) => setContractAmount(event.target.value)} required /></label>
                <label className="block"><span className={labelClass}>Estado inicial</span><select className={fieldClass} value={contractStatus} onChange={(event) => setContractStatus(event.target.value as 'draft' | 'active')}><option value="draft">Borrador</option><option value="active">Activo / firmado</option></select></label>
                <button className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={submitting || !projectOptions.length || !activeSuppliers.length}>{submitting ? 'Guardando…' : 'Guardar subcontrato'}</button>
              </form>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

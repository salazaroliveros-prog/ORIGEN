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
  createInventoryItemToFirestore,
  createPurchaseOrderToFirestore,
  createSubcontractToFirestore,
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

type Section = 'resumen' | 'articulos' | 'bodegas' | 'proveedores' | 'ordenes' | 'subcontratos';

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
  const [orderItemId, setOrderItemId] = useState('');
  const [orderQuantity, setOrderQuantity] = useState('1');
  const [orderUnitPrice, setOrderUnitPrice] = useState('0');

  const [contractProjectId, setContractProjectId] = useState(activeProjectId);
  const [contractSupplierId, setContractSupplierId] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [contractDescription, setContractDescription] = useState('');
  const [contractStartDate, setContractStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [contractEndDate, setContractEndDate] = useState('');
  const [contractAmount, setContractAmount] = useState('');

  useEffect(() => {
    setWarehouseProjectId((current) => current || activeProjectId);
    setOrderProjectId((current) => current || activeProjectId);
    setContractProjectId((current) => current || activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribers: Array<() => void> = [];
    try {
      unsubscribers.push(
        subscribeSuppliers(companyId, setSuppliers),
        subscribeWarehouses(companyId, setWarehouses),
        subscribeInventoryItems(companyId, setItems),
        subscribeStockMovements(companyId, setMovements),
        subscribePurchaseOrders(companyId, setOrders),
        subscribeSubcontracts(companyId, setContracts)
      );
      setLoading(false);
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

  const pendingOrders = orders.filter((order) =>
    ['draft', 'submitted', 'approved', 'partially_received'].includes(order.status)
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
    const selectedItem = activeItems.find((item) => item.id === orderItemId);
    const quantity = Number(orderQuantity);
    const unitPriceGTQ = Number(orderUnitPrice);
    if (!selectedItem) {
      toast.error('Selecciona un artículo válido.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPriceGTQ) || unitPriceGTQ < 0) {
      toast.error('Revisa la cantidad y el precio unitario de la orden.');
      return;
    }
    const subtotalGTQ = Math.round(quantity * unitPriceGTQ * 100) / 100;
    const taxGTQ = Math.round(subtotalGTQ * 0.12 * 100) / 100;
    setSubmitting(true);
    try {
      await createPurchaseOrderToFirestore(
        {
          projectId: orderProjectId,
          supplierId: orderSupplierId,
          number: `OC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Date.now() % 10000).toString().padStart(4, '0')}`,
          status: 'draft',
          currency: 'GTQ',
          lines: [
            {
              itemId: selectedItem.id,
              description: selectedItem.name,
              unit: selectedItem.unit,
              quantity,
              unitPriceGTQ,
            },
          ],
          subtotalGTQ,
          discountGTQ: 0,
          taxPercent: 12,
          taxGTQ,
          totalGTQ: Math.round((subtotalGTQ + taxGTQ) * 100) / 100,
        },
        companyId,
        userId
      );
      setOrderQuantity('1');
      setOrderUnitPrice('0');
      toast.success('Orden de compra creada como borrador.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo crear la orden.');
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
          status: 'draft',
        },
        companyId,
        userId
      );
      setContractNumber('');
      setContractDescription('');
      setContractEndDate('');
      setContractAmount('');
      toast.success('Subcontrato registrado.');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo registrar el subcontrato.');
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
    { id: 'subcontratos', label: 'Subcontratos' },
  ];

  const visibleSections = sections.filter((item) => {
    if (item.id === 'proveedores' || item.id === 'ordenes' || item.id === 'subcontratos') {
      return canWritePurchasing || canWriteInventory || item.id !== 'proveedores';
    }
    return true;
  });

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
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className={cardClass}>
                <h3 className="mb-3 font-semibold text-white">Órdenes de compra</h3>
                {orders.length === 0 ? <EmptyState message="Aún no hay órdenes de compra." /> : <div className="space-y-2">{orders.map((order) => <div key={order.id} className="rounded-xl border border-white/5 px-3 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-white">{order.number}</p><span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs text-sky-300">{order.status}</span></div><p className="mt-1 text-xs text-slate-400">{projects.find((project) => project.id === order.projectId)?.name ?? order.projectId} · {suppliers.find((supplier) => supplier.id === order.supplierId)?.name ?? 'Proveedor'}</p><p className="mt-2 text-sm font-semibold text-white">{currency.format(order.totalGTQ)}</p><p className="mt-1 text-xs text-slate-500">{order.lines.length} renglón(es) · IVA {order.taxPercent}% · {formatDate(order.createdAt)}</p></div>)}</div>}
              </section>
              {canWritePurchasing && <form onSubmit={handleOrderSubmit} className={`${cardClass} space-y-3`}>
                <h3 className="font-semibold text-white">Nueva orden (borrador)</h3>
                <label className="block"><span className={labelClass}>Proyecto</span><select className={fieldClass} value={orderProjectId} onChange={(event) => setOrderProjectId(event.target.value)} required><option value="">Selecciona un proyecto</option>{projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
                <label className="block"><span className={labelClass}>Proveedor</span><select className={fieldClass} value={orderSupplierId} onChange={(event) => setOrderSupplierId(event.target.value)} required><option value="">Selecciona un proveedor</option>{activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} · {supplier.nit}</option>)}</select></label>
                <label className="block"><span className={labelClass}>Artículo</span><select className={fieldClass} value={orderItemId} onChange={(event) => setOrderItemId(event.target.value)} required><option value="">Selecciona un artículo</option>{activeItems.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></label>
                <div className="grid grid-cols-2 gap-2"><label className="block"><span className={labelClass}>Cantidad</span><input className={fieldClass} type="number" min="0.0001" step="0.0001" value={orderQuantity} onChange={(event) => setOrderQuantity(event.target.value)} required /></label><label className="block"><span className={labelClass}>Precio unitario (Q)</span><input className={fieldClass} type="number" min="0" step="0.01" value={orderUnitPrice} onChange={(event) => setOrderUnitPrice(event.target.value)} required /></label></div>
                <div className="rounded-xl bg-slate-950/80 p-3 text-sm"><div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{currency.format(Math.max(0, Number(orderQuantity) * Number(orderUnitPrice) || 0))}</span></div><div className="mt-1 flex justify-between text-slate-400"><span>IVA (12%)</span><span>{currency.format(Math.max(0, Number(orderQuantity) * Number(orderUnitPrice) * 0.12 || 0))}</span></div><div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-semibold text-white"><span>Total</span><span>{currency.format(Math.max(0, Number(orderQuantity) * Number(orderUnitPrice) * 1.12 || 0))}</span></div></div>
                <button className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={submitting || !projectOptions.length || !activeSuppliers.length || !activeItems.length}>{submitting ? 'Guardando…' : 'Crear borrador de OC'}</button>
                <p className="text-xs text-slate-500">La orden queda como borrador. La aprobación y recepción de materiales aún no están habilitadas.</p>
              </form>}
            </div>
          )}

          {section === 'subcontratos' && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className={cardClass}>
                <h3 className="mb-3 font-semibold text-white">Subcontratos</h3>
                {contracts.length === 0 ? <EmptyState message="Aún no hay subcontratos registrados." /> : <div className="space-y-2">{contracts.map((contract) => <div key={contract.id} className="rounded-xl border border-white/5 px-3 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-white">{contract.contractNumber}</p><span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs text-slate-200">{contract.status}</span></div><p className="mt-1 text-xs text-slate-400">{projects.find((project) => project.id === contract.projectId)?.name ?? contract.projectId} · {suppliers.find((supplier) => supplier.id === contract.supplierId)?.name ?? 'Proveedor'}</p><p className="mt-2 text-sm font-semibold text-white">{currency.format(contract.amountGTQ)}</p><p className="mt-1 text-xs text-slate-500">Vigencia: {formatDate(contract.startDate)} – {formatDate(contract.endDate)} · Pagado {currency.format(contract.paidGTQ)}</p></div>)}</div>}
              </section>
              {canWritePurchasing && <form onSubmit={handleContractSubmit} className={`${cardClass} space-y-3`}>
                <h3 className="font-semibold text-white">Nuevo subcontrato</h3>
                <label className="block"><span className={labelClass}>Proyecto</span><select className={fieldClass} value={contractProjectId} onChange={(event) => setContractProjectId(event.target.value)} required><option value="">Selecciona un proyecto</option>{projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
                <label className="block"><span className={labelClass}>Proveedor / subcontratista</span><select className={fieldClass} value={contractSupplierId} onChange={(event) => setContractSupplierId(event.target.value)} required><option value="">Selecciona un proveedor</option>{activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
                <label className="block"><span className={labelClass}>Número de contrato</span><input className={fieldClass} value={contractNumber} onChange={(event) => setContractNumber(event.target.value)} required maxLength={80} /></label>
                <label className="block"><span className={labelClass}>Descripción / alcance</span><textarea className={fieldClass} value={contractDescription} onChange={(event) => setContractDescription(event.target.value)} required rows={3} maxLength={1000} /></label>
                <div className="grid grid-cols-2 gap-2"><label className="block"><span className={labelClass}>Inicio</span><input className={fieldClass} type="date" value={contractStartDate} onChange={(event) => setContractStartDate(event.target.value)} required /></label><label className="block"><span className={labelClass}>Fin</span><input className={fieldClass} type="date" value={contractEndDate} onChange={(event) => setContractEndDate(event.target.value)} min={contractStartDate} required /></label></div>
                <label className="block"><span className={labelClass}>Monto contratado (Q)</span><input className={fieldClass} type="number" min="0.01" step="0.01" value={contractAmount} onChange={(event) => setContractAmount(event.target.value)} required /></label>
                <button className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={submitting || !projectOptions.length || !activeSuppliers.length}>{submitting ? 'Guardando…' : 'Guardar subcontrato'}</button>
              </form>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

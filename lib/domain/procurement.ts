/**
 * Reglas puras de compras, proveedores y subcontratos para ORIGEN.
 * Los importes monetarios se expresan en GTQ; fechas ISO 8601.
 */

export type PurchaseOrderStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'partially_received'
  | 'received'
  | 'cancelled';

export interface SupplierRecord {
  id: string;
  companyId: string;
  name: string;
  nit: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
  createdBy: string;
}

export interface PurchaseOrderRecord {
  id: string;
  companyId: string;
  projectId: string;
  supplierId: string;
  number: string;
  status: PurchaseOrderStatus;
  currency: 'GTQ';
  lines: Array<{
    itemId: string;
    description: string;
    unit: string;
    quantity: number;
    receivedQuantity: number;
    unitPriceGTQ: number;
  }>;
  subtotalGTQ: number;
  discountGTQ: number;
  taxPercent: number;
  taxGTQ: number;
  totalGTQ: number;
  requestedBy: string;
  approvedBy?: string;
  lastReceiptMovementId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubcontractRecord {
  id: string;
  companyId: string;
  projectId: string;
  supplierId: string;
  contractNumber: string;
  description: string;
  startDate: string;
  endDate: string;
  amountGTQ: number;
  paidGTQ: number;
  status: 'draft' | 'active' | 'completed' | 'terminated';
  createdBy: string;
}

export interface SubcontractPaymentRecord {
  id: string;
  companyId: string;
  contractId: string;
  projectId: string;
  supplierId: string;
  amountGTQ: number;
  paymentDate: string;
  reference: string;
  paymentMethod: 'Efectivo' | 'Cheque' | 'Transferencia BI' | 'Tarjeta';
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface ContractExpiryAlert {
  subcontractId: string;
  contractNumber: string;
  projectId: string;
  daysRemaining: number;
  severity: 'expired' | 'urgent' | 'upcoming';
}

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const roundQuantity = (value: number) => Math.round((value + Number.EPSILON) * 10_000) / 10_000;

function requireText(value: string, label: string): void {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} es obligatorio.`);
}

function requireNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} debe ser cero o mayor.`);
}

function requirePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} debe ser mayor a cero.`);
}


/** Validates a real calendar date in YYYY-MM-DD form. */
export function isValidCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateSupplier(supplier: SupplierRecord): SupplierRecord {
  requireText(supplier.id, 'ID del proveedor');
  requireText(supplier.companyId, 'Empresa');
  requireText(supplier.name, 'Nombre del proveedor');
  requireText(supplier.nit, 'NIT');
  requireText(supplier.createdBy, 'Usuario creador');
  if (supplier.name.trim().length < 2 || supplier.name.trim().length > 200 || supplier.nit.trim().length > 30) {
    throw new Error('El nombre o NIT del proveedor supera la longitud permitida.');
  }
  if (typeof supplier.active !== 'boolean') throw new Error('El estado del proveedor no es válido.');
  if (supplier.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplier.email)) {
    throw new Error('Correo del proveedor inválido.');
  }
  return { ...supplier, name: supplier.name.trim(), nit: supplier.nit.trim() };
}

export function validatePurchaseOrder(order: PurchaseOrderRecord): PurchaseOrderRecord {
  requireText(order.id, 'ID de orden');
  requireText(order.companyId, 'Empresa');
  requireText(order.projectId, 'Proyecto');
  requireText(order.supplierId, 'Proveedor');
  requireText(order.number, 'Número de orden');
  if (order.number.length > 80) throw new Error('El número de orden supera 80 caracteres.');
  requireText(order.requestedBy, 'Usuario solicitante');
  requireText(order.createdAt, 'Fecha de creación');
  requireText(order.updatedAt, 'Fecha de actualización');
  if (order.currency !== 'GTQ') throw new Error('La orden debe estar expresada en GTQ.');
  if (!['draft', 'submitted', 'approved', 'partially_received', 'received', 'cancelled'].includes(order.status)) {
    throw new Error('El estado de la orden de compra no es válido.');
  }
  if (!Array.isArray(order.lines) || order.lines.length < 1 || order.lines.length > 4) {
    throw new Error('La orden debe incluir entre 1 y 4 renglones.');
  }
  if (new Set(order.lines.map((line) => line.itemId)).size !== order.lines.length) {
    throw new Error('No repitas artículos en una misma orden; consolida sus cantidades en un solo renglón.');
  }

  for (const line of order.lines) {
    requireText(line.itemId, 'Artículo');
    requireText(line.description, 'Descripción');
    requireText(line.unit, 'Unidad');
    requirePositive(line.quantity, 'Cantidad');
    requireNonNegative(line.receivedQuantity, 'Cantidad recibida');
    requireNonNegative(line.unitPriceGTQ, 'Precio unitario');
    if (line.receivedQuantity > line.quantity) {
      throw new Error('La cantidad recibida no puede superar la cantidad solicitada.');
    }
  }

  const expectedSubtotal = money(order.lines.reduce((sum, line) => sum + line.quantity * line.unitPriceGTQ, 0));
  requireNonNegative(order.subtotalGTQ, 'Subtotal');
  requireNonNegative(order.discountGTQ, 'Descuento');
  requireNonNegative(order.taxPercent, 'Porcentaje de IVA');
  if (order.taxPercent > 100) throw new Error('El porcentaje de IVA no puede superar 100%.');
  requireNonNegative(order.taxGTQ, 'IVA');
  requireNonNegative(order.totalGTQ, 'Total');
  if (order.discountGTQ > expectedSubtotal) throw new Error('El descuento supera el subtotal.');
  const taxable = money(expectedSubtotal - order.discountGTQ);
  const expectedTax = money(taxable * order.taxPercent / 100);
  const expectedTotal = money(taxable + expectedTax);
  if (Math.abs(order.subtotalGTQ - expectedSubtotal) > 0.01 ||
      Math.abs(order.taxGTQ - expectedTax) > 0.01 ||
      Math.abs(order.totalGTQ - expectedTotal) > 0.01) {
    throw new Error('Los totales de la orden no coinciden con sus renglones, descuento e IVA.');
  }

  const received = order.lines.every(line => line.receivedQuantity === line.quantity);
  const partiallyReceived = order.lines.some(line => line.receivedQuantity > 0);
  if (order.status === 'received' && !received) {
    throw new Error('No se puede cerrar como recibida una orden con cantidades pendientes.');
  }
  if (order.status === 'partially_received' && (!partiallyReceived || received)) {
    throw new Error('El estado de recepción parcial no coincide con las cantidades recibidas.');
  }
  if (order.status === 'approved' && !order.approvedBy) {
    throw new Error('Una orden aprobada debe registrar quién la autorizó.');
  }
  return order;
}

export function recordPurchaseReceipt(
  order: PurchaseOrderRecord,
  receivedQuantities: number[],
  now: string
): PurchaseOrderRecord {
  if (!['approved', 'partially_received'].includes(order.status)) {
    throw new Error('Solo se pueden recibir órdenes aprobadas.');
  }
  if (receivedQuantities.length !== order.lines.length) {
    throw new Error('La recepción debe especificar la cantidad de cada renglón.');
  }
  const lines = order.lines.map((line, index) => {
    const receivedNow = receivedQuantities[index];
    requireNonNegative(receivedNow, 'Cantidad recibida');
    if (line.receivedQuantity + receivedNow > line.quantity) {
      throw new Error(`La recepción supera lo pendiente del artículo ${line.itemId}.`);
    }
    return { ...line, receivedQuantity: roundQuantity(line.receivedQuantity + receivedNow) };
  });
  const allReceived = lines.every(line => line.receivedQuantity === line.quantity);
  const anyReceived = lines.some(line => line.receivedQuantity > 0);
  const updated: PurchaseOrderRecord = {
    ...order,
    lines,
    status: allReceived ? 'received' : anyReceived ? 'partially_received' : order.status,
    updatedAt: now,
  };
  return validatePurchaseOrder(updated);
}

export function validateSubcontract(contract: SubcontractRecord): SubcontractRecord {
  requireText(contract.id, 'ID de subcontrato');
  requireText(contract.companyId, 'Empresa');
  requireText(contract.projectId, 'Proyecto');
  requireText(contract.supplierId, 'Proveedor');
  requireText(contract.contractNumber, 'Número de contrato');
  if (contract.contractNumber.length > 80) throw new Error('El número de contrato supera 80 caracteres.');
  requireText(contract.description, 'Descripción');
  if (contract.description.length > 1000) throw new Error('La descripción del subcontrato supera 1000 caracteres.');
  requireText(contract.createdBy, 'Usuario creador');
  if (!['draft', 'active', 'completed', 'terminated'].includes(contract.status)) {
    throw new Error('El estado del subcontrato no es válido.');
  }
  if (!isValidCalendarDate(contract.startDate) || !isValidCalendarDate(contract.endDate)) {
    throw new Error('Las fechas del subcontrato deben ser fechas reales en formato AAAA-MM-DD.');
  }
  const start = Date.parse(`${contract.startDate}T00:00:00.000Z`);
  const end = Date.parse(`${contract.endDate}T00:00:00.000Z`);
  if (end < start) {
    throw new Error('El período del subcontrato no es válido.');
  }
  requirePositive(contract.amountGTQ, 'Monto contratado');
  requireNonNegative(contract.paidGTQ, 'Monto pagado');
  if (contract.paidGTQ > contract.amountGTQ) {
    throw new Error('El monto pagado no puede superar el monto contratado.');
  }
  return contract;
}

export function getSubcontractExpiryAlerts(
  contracts: SubcontractRecord[],
  asOfDate: string,
  warningDays = 30
): ContractExpiryAlert[] {
  const asOf = Date.parse(asOfDate);
  if (!Number.isFinite(asOf)) throw new Error('La fecha de consulta no es válida.');
  requireNonNegative(warningDays, 'Días de anticipación');

  return contracts
    .filter(contract => contract.status === 'active')
    .map(contract => {
      const end = Date.parse(contract.endDate);
      if (!Number.isFinite(end)) throw new Error(`Fecha de vencimiento inválida: ${contract.id}`);
      const daysRemaining = Math.ceil((end - asOf) / 86_400_000);
      return {
        subcontractId: contract.id,
        contractNumber: contract.contractNumber,
        projectId: contract.projectId,
        daysRemaining,
        severity: daysRemaining < 0 ? 'expired' : daysRemaining <= 7 ? 'urgent' : 'upcoming',
      } as ContractExpiryAlert;
    })
    .filter(alert => alert.daysRemaining <= warningDays)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Schemas de validación Zod para todas las entidades del sistema.
 * Los schemas están alineados con las interfaces de lib/types.ts.
 * Los campos companyId, authorId, createdBy son requeridos en los schemas
 * porque se agregan obligatoriamente al guardar en Firestore.
 */

import { z } from 'zod';

// ============================================================================
// Expense Record Schema - Alineado con lib/types.ts ExpenseRecord
// Nota: companyId y authorId son requeridos en el schema porque se agregan
// al guardar en Firestore, pero son opcionales en la interfaz TypeScript
// porque se agregan en el momento de la operación de escritura.
// ============================================================================
export const ExpenseRecordSchema = z.object({
  id: z.string().min(1, 'ID requerido').max(128, 'ID muy largo'),
  projectId: z.string().min(1, 'Proyecto requerido').max(128, 'ID de proyecto muy largo'),
  companyId: z.string().min(1, 'Company ID requerido'),
  authorId: z.string().min(1, 'Author ID requerido'),
  machineryLogId: z.string().max(128, 'ID de bitácora muy largo').optional(),
  subcontractPaymentId: z.string().max(128, 'ID de pago de subcontrato muy largo').optional(),
  date: z.string().date('Fecha inválida').max(30, 'Fecha muy larga'),
  category: z.string().max(100, 'Categoría muy larga'),
  description: z.string().min(1, 'Descripción requerida').max(500, 'Descripción muy larga'),
  supplier: z.string().max(200, 'Nombre de proveedor muy largo').optional(),
  nitSupplier: z.string().max(30, 'NIT muy largo').optional(),
  facturaNumber: z.string().max(50, 'Número de factura muy largo').optional(),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0').max(999999999, 'Monto excede límite'),
  currency: z.enum(['GTQ', 'USD']),
  paymentMethod: z.enum(['Pendiente', 'Efectivo', 'Cheque', 'Transferencia BI', 'Tarjeta']),
  receiptPhotoUrl: z.string().optional(),
  receiptPhotoDate: z.string().optional(),
  receiptCoords: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  assignedApuId: z.string().optional(),
  assignedApuDescription: z.string().optional(),
  approvalStatus: z.enum(['Pendiente', 'Aprobado', 'Rechazado']).optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  auditTrail: z
    .array(
      z.object({
        id: z.string(),
        action: z.string(),
        userId: z.string().optional(),
        user: z.string(),
        role: z.string(),
        timestamp: z.string(),
        note: z.string().optional(),
      })
    )
    .optional(),
});

export type ExpenseRecordValues = z.infer<typeof ExpenseRecordSchema>;

// ============================================================================
// Attendance Record Schema - Alineado con lib/types.ts AttendanceRecord
// companyId y authorId son requeridos en el schema
// ============================================================================
export const AttendanceRecordSchema = z.object({
  id: z.string().min(1, 'ID requerido').max(128, 'ID muy largo'),
  projectId: z.string().min(1, 'Proyecto requerido').max(128, 'ID de proyecto muy largo'),
  companyId: z.string().min(1, 'Company ID requerido'),
  authorId: z.string().min(1, 'Author ID requerido'),
  projectName: z.string().max(200, 'Nombre de proyecto muy largo').optional(),
  employeeId: z.string().min(1, 'Empleado requerido').max(128, 'ID de empleado muy largo'),
  employeeName: z.string().min(1, 'Nombre de empleado requerido').max(150, 'Nombre muy largo'),
  date: z.string().date('Fecha inválida').max(30, 'Fecha muy larga'),
  role: z.string().optional(),
  status: z.enum(['Presente', 'Ausente', 'Permiso', 'Incapacidad IGSS']),
  overtimeHours: z
    .number()
    .min(0, 'Horas extras no pueden ser negativas')
    .max(4, 'Máximo 4 horas extras por día según Art. 121 Código de Trabajo Guatemala'),
  gpsCoords: z
    .object({
      lat: z.number().min(-90, 'Latitud inválida').max(90, 'Latitud inválida'),
      lng: z.number().min(-180, 'Longitud inválida').max(180, 'Longitud inválida'),
    })
    .optional(),
  gpsVerified: z.boolean().optional(),
  distanceMeters: z.number().nonnegative().optional(),
  gpsTimestamp: z.string().optional(),
  overrideReason: z.string().optional(),
  checkInTime: z.string().optional(),
  checkInLat: z.number().min(-90).max(90).optional(),
  checkInLng: z.number().min(-180).max(180).optional(),
  gpsAccuracy: z.number().nonnegative().optional(),
  isGeofenceViolation: z.boolean().optional(),
  distanceFromSiteMeters: z.number().nonnegative().optional(),
  geofenceOverrideReason: z.string().optional(),
});

export type AttendanceRecordValues = z.infer<typeof AttendanceRecordSchema>;

// ============================================================================
// Employee Schema - Alineado con lib/types.ts Employee
// companyId es opcional en el schema (test verifica que NO es requerido)
// ============================================================================
export const EmployeeSchema = z.object({
  id: z.string().min(1, 'ID requerido').max(128, 'ID muy largo'),
  name: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(100, 'Nombre muy largo'),
  role: z.enum([
    'Capataz',
    'Albañil',
    'Ayudante',
    'Arquitecto Residente',
    'Bodeguero',
    'Electricista',
  ]),
  dailyRateGTQ: z
    .number()
    .min(0, 'Tarifa diaria no puede ser negativa')
    .max(99999, 'Tarifa diaria excede límite'),
  igssAffiliated: z.boolean(),
  phone: z
    .string()
    .max(40, 'Teléfono muy largo')
    .regex(/^\+?[0-9\s-]*$/, 'Teléfono inválido'),
  dpi: z.string().max(30).optional(),
  igssNumber: z.string().max(30).optional(),
  hireDate: z.string().date('Fecha de contratación inválida').optional(),
  customBonoIncentivo: z.number().nonnegative().optional(),
  overriddenIgssLaboral: z.number().nonnegative().optional(),
  overriddenBono14: z.number().nonnegative().optional(),
  overriddenAguinaldo: z.number().nonnegative().optional(),
});

export type EmployeeValues = z.infer<typeof EmployeeSchema>;

// ============================================================================
// APU Item Schema - Alineado con lib/types.ts APUItem
// companyId, projectId, createdBy son requeridos en el schema
// ============================================================================
export const APUItemSchema = z
  .object({
    id: z.string().min(1, 'ID requerido').max(128, 'ID muy largo'),
    companyId: z.string().min(1, 'Company ID requerido'),
    projectId: z.string().min(1, 'Proyecto requerido').max(128, 'ID de proyecto muy largo'),
    createdBy: z.string().min(1, 'Creator ID requerido'),
    code: z.string().min(1, 'Código requerido').max(64, 'Código muy largo'),
    description: z
      .string()
      .min(5, 'Descripción debe tener al menos 5 caracteres')
      .max(500, 'Descripción muy larga'),
    unit: z.string().min(1, 'Unidad requerido').max(32, 'Unidad muy larga'),
    quantity: z
      .number()
      .min(0.01, 'Cantidad debe ser mayor a 0')
      .max(9999999, 'Cantidad excede límite'),
    materialUnitCostGTQ: z
      .number()
      .min(0, 'Costo de material no puede ser negativo')
      .max(9999999, 'Costo excede límite'),
    laborUnitCostGTQ: z
      .number()
      .min(0, 'Costo de mano de obra no puede ser negativo')
      .max(9999999, 'Costo excede límite'),
    equipmentUnitCostGTQ: z
      .number()
      .min(0, 'Costo de equipo no puede ser negativo')
      .max(9999999, 'Costo excede límite'),
    totalUnitCostGTQ: z
      .number()
      .min(0, 'Costo total no puede ser negativo')
      .max(9999999, 'Costo excede límite'),
    totalPriceGTQ: z
      .number()
      .min(0, 'Precio total no puede ser negativo')
      .max(999999999, 'Precio excede límite'),
    department: z.string().optional(),
  })
  .refine(
    (item) => {
      const calculatedTotal =
        item.materialUnitCostGTQ + item.laborUnitCostGTQ + item.equipmentUnitCostGTQ;
      const tolerance = Math.abs(calculatedTotal - item.totalUnitCostGTQ);
      return tolerance <= item.totalUnitCostGTQ * 0.02; // Permitir 2% de tolerancia (estándar construcción)
    },
    {
      message: 'La suma de componentes (material + mano de obra + equipo) debe coincidir con el costo total unitario (±2% tolerancia)',
      path: ['totalUnitCostGTQ'],
    }
  );

export type APUItemValues = z.infer<typeof APUItemSchema>;

// ============================================================================
// Quote Record Schema - Alineado con lib/types.ts QuoteRecord
// companyId y createdBy son requeridos en el schema
// ============================================================================
export const QuoteRecordSchema = z.object({
  id: z.string().min(1, 'ID requerido').max(128, 'ID muy largo'),
  companyId: z.string().min(1, 'Company ID requerido'),
  projectId: z.string().min(1, 'Proyecto requerido').max(128, 'ID de proyecto muy largo'),
  clientName: z.string().min(3, 'Nombre de cliente requerido').max(200, 'Nombre muy largo'),
  clientNit: z.string().max(30, 'NIT muy largo'),
  clientPhone: z.string().optional(),
  clientEmail: z.string().optional(),
  clientAddress: z.string().optional(),
  date: z.string().date('Fecha inválida'),
  validUntil: z.string().date('Fecha de vigencia inválida'),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        qty: z.number().positive(),
        unit: z.string().min(1),
        unitPriceGTQ: z.number().nonnegative(),
      })
    )
    .max(500, 'Máximo 500 items por cotización'),
  totalGTQ: z
    .number()
    .min(0, 'Monto total no puede ser negativo')
    .max(999999999, 'Monto excede límite'),
  status: z.enum(['Aceptada', 'Enviada', 'Borrador', 'Rechazada']),
  notes: z.string().max(1000, 'Notas muy largas').optional(),
  estimatedDuration: z.string().optional(),
  createdBy: z.string().min(1, 'Creator ID requerido'),
  updatedBy: z.string().optional(),
  subtotalGTQ: z.number().min(0, 'Subtotal no puede ser negativo').optional(),
  discountPercent: z
    .number()
    .min(0, 'Descuento no puede ser negativo')
    .max(100, 'Descuento no puede exceder 100')
    .optional(),
  taxPercent: z
    .number()
    .min(0, 'Impuesto no puede ser negativo')
    .max(100, 'Impuesto no puede exceder 100')
    .optional(),
  taxGTQ: z.number().min(0, 'Impuesto no puede ser negativo').optional(),
});

export type QuoteRecordValues = z.infer<typeof QuoteRecordSchema>;

// ============================================================================
// Machinery Schema - Alineado con lib/types.ts Machinery
// companyId y createdBy son opcionales en el schema (types.ts los tiene como opcionales)
// ============================================================================
export const MachinerySchema = z.object({
  id: z.string().min(1, 'ID requerido').max(128, 'ID muy largo'),
  companyId: z.string().min(1, 'Company ID requerido'),
  name: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(150, 'Nombre muy largo'),
  model: z.string().max(80, 'Modelo muy largo'),
  plateOrCode: z.string().max(80, 'Placa o código muy largo'),
  status: z.enum(['Disponible', 'En Obra', 'Mantenimiento']),
  hourlyRateGTQ: z
    .number()
    .min(0, 'Tarifa por hora no puede ser negativa')
    .max(999999, 'Tarifa excede límite'),
  currentHorometer: z.number().min(0, 'El horómetro no puede ser negativo'),
  currentProjectId: z.string().optional(),
});

export type MachineryValues = z.infer<typeof MachinerySchema>;

/**
 * Borrador que produce el formulario de maquinaria.
 *
 * `companyId` no lo escribe el usuario: lo aporta la sesión al persistir. Si el
 * formulario valida contra `MachinerySchema` completo, **toda** alta falla con
 * "Company ID requerido" y el usuario solo ve un mensaje genérico.
 */
export const MachineryDraftSchema = MachinerySchema.omit({ companyId: true });

export type MachineryDraftValues = z.infer<typeof MachineryDraftSchema>;

// ============================================================================
// Supplier, Purchase Order and Subcontract schemas
// Ownership fields are required because they are added by the authenticated
// persistence layer, not by user-controlled form fields.
// ============================================================================
export const SupplierSchema = z.object({
  id: z.string().min(1).max(128),
  companyId: z.string().min(1).max(128),
  name: z.string().trim().min(2).max(200),
  nit: z.string().trim().min(1).max(30),
  phone: z.string().max(40).optional(),
  email: z.string().email().max(254).optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  active: z.boolean(),
  createdBy: z.string().min(1).max(128),
});

export const PurchaseOrderLineSchema = z.object({
  itemId: z.string().min(1).max(128),
  description: z.string().trim().min(1).max(300),
  unit: z.string().trim().min(1).max(32),
  quantity: z.number().positive().max(999999999),
  receivedQuantity: z.number().min(0).max(999999999),
  unitPriceGTQ: z.number().min(0).max(999999999),
}).refine(line => line.receivedQuantity <= line.quantity, {
  message: 'La cantidad recibida no puede superar la solicitada.',
  path: ['receivedQuantity'],
});

export const PurchaseOrderSchema = z.object({
  id: z.string().min(1).max(128),
  companyId: z.string().min(1).max(128),
  projectId: z.string().min(1).max(128),
  supplierId: z.string().min(1).max(128),
  number: z.string().trim().min(1).max(64),
  status: z.enum(['draft', 'submitted', 'approved', 'partially_received', 'received', 'cancelled']),
  currency: z.literal('GTQ'),
  lines: z.array(PurchaseOrderLineSchema).min(1).max(500),
  subtotalGTQ: z.number().min(0).max(999999999),
  discountGTQ: z.number().min(0).max(999999999),
  taxPercent: z.number().min(0).max(100),
  taxGTQ: z.number().min(0).max(999999999),
  totalGTQ: z.number().min(0).max(999999999),
  requestedBy: z.string().min(1).max(128),
  approvedBy: z.string().min(1).max(128).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).superRefine((order, context) => {
  const subtotal = Math.round(order.lines.reduce((sum, line) => sum + line.quantity * line.unitPriceGTQ, 0) * 100) / 100;
  const taxable = Math.round((subtotal - order.discountGTQ) * 100) / 100;
  const tax = Math.round(taxable * order.taxPercent) / 100;
  const total = Math.round((taxable + tax) * 100) / 100;
  if (order.discountGTQ > subtotal) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'El descuento supera el subtotal.', path: ['discountGTQ'] });
  }
  if (Math.abs(order.subtotalGTQ - subtotal) > 0.01 || Math.abs(order.taxGTQ - tax) > 0.01 || Math.abs(order.totalGTQ - total) > 0.01) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Los totales no coinciden con los renglones, descuento e IVA.', path: ['totalGTQ'] });
  }
  const allReceived = order.lines.every(line => line.receivedQuantity === line.quantity);
  const anyReceived = order.lines.some(line => line.receivedQuantity > 0);
  if (order.status === 'received' && !allReceived) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'La orden aún tiene cantidades pendientes.', path: ['status'] });
  }
  if (order.status === 'partially_received' && (!anyReceived || allReceived)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'La recepción parcial no coincide con las cantidades.', path: ['status'] });
  }
  if (order.status === 'approved' && !order.approvedBy) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'La orden aprobada requiere autorizador.', path: ['approvedBy'] });
  }
});

export const SubcontractSchema = z.object({
  id: z.string().min(1).max(128),
  companyId: z.string().min(1).max(128),
  projectId: z.string().min(1).max(128),
  supplierId: z.string().min(1).max(128),
  contractNumber: z.string().trim().min(1).max(64),
  description: z.string().trim().min(1).max(1000),
  startDate: z.string().date(),
  endDate: z.string().date(),
  amountGTQ: z.number().positive().max(999999999),
  paidGTQ: z.number().min(0).max(999999999),
  status: z.enum(['draft', 'active', 'completed', 'terminated']),
  createdBy: z.string().min(1).max(128),
}).refine(contract => contract.endDate >= contract.startDate, {
  message: 'La fecha final debe ser igual o posterior a la fecha inicial.',
  path: ['endDate'],
}).refine(contract => contract.paidGTQ <= contract.amountGTQ, {
  message: 'El monto pagado no puede superar el monto contratado.',
  path: ['paidGTQ'],
});

export type SupplierValues = z.infer<typeof SupplierSchema>;
export type PurchaseOrderValues = z.infer<typeof PurchaseOrderSchema>;
export type SubcontractValues = z.infer<typeof SubcontractSchema>;

// ============================================================================
// Validation functions
// ============================================================================
export function validateExpenseRecord(data: unknown) {
  return ExpenseRecordSchema.safeParse(data);
}

export function validateAttendanceRecord(data: unknown) {
  return AttendanceRecordSchema.safeParse(data);
}

export function validateEmployee(data: unknown) {
  return EmployeeSchema.safeParse(data);
}

export function validateAPUItem(data: unknown) {
  return APUItemSchema.safeParse(data);
}

export function validateQuoteRecord(data: unknown) {
  return QuoteRecordSchema.safeParse(data);
}

export function validateMachinery(data: unknown) {
  return MachinerySchema.safeParse(data);
}

/** Valida lo que captura la persona en el formulario (sin companyId). */
export function validateMachineryDraft(data: unknown) {
  return MachineryDraftSchema.safeParse(data);
}

export function validateSupplier(data: unknown) {
  return SupplierSchema.safeParse(data);
}

export function validatePurchaseOrder(data: unknown) {
  return PurchaseOrderSchema.safeParse(data);
}

export function validateSubcontract(data: unknown) {
  return SubcontractSchema.safeParse(data);
}

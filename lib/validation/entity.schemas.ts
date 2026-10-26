/**
 * Schemas de validación Zod para todas las entidades del sistema
 * Valida datos antes de guardar en Firestore
 */

import { z } from 'zod';

// Expense Record Schema
export const ExpenseRecordSchema = z.object({
  id: z.string().min(1, 'ID requerido'),
  projectId: z.string().min(1, 'Proyecto requerido'),
  date: z.string().date('Fecha inválida'),
  category: z.string().min(1, 'Categoría requerida'),
  description: z.string().min(1, 'Descripción requerida').max(500, 'Descripción muy larga'),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0').max(999999999, 'Monto excede límite'),
  invoiceNumber: z.string().optional(),
  vendor: z.string().optional(),
  receiptUrl: z.string().url('URL de recibo inválida').optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
});

export type ExpenseRecordValues = z.infer<typeof ExpenseRecordSchema>;

// Attendance Record Schema
export const AttendanceRecordSchema = z.object({
  id: z.string().min(1, 'ID requerido'),
  projectId: z.string().min(1, 'Proyecto requerido'),
  employeeId: z.string().min(1, 'Empleado requerido'),
  date: z.string().date('Fecha inválida'),
  hoursWorked: z
    .number()
    .min(0, 'Horas trabajadas no pueden ser negativas')
    .max(24, 'Máximo 24 horas por día'),
  status: z.enum(['present', 'absent', 'late', 'half_day']),
  notes: z.string().max(500, 'Notas muy largas').optional(),
  clockIn: z.string().optional(),
  clockOut: z.string().optional(),
  geolocation: z
    .object({
      lat: z.number().min(-90, 'Latitud inválida').max(90, 'Latitud inválida'),
      lng: z.number().min(-180, 'Longitud inválida').max(180, 'Longitud inválida'),
    })
    .optional(),
});

export type AttendanceRecordValues = z.infer<typeof AttendanceRecordSchema>;

// Employee Schema
export const EmployeeSchema = z.object({
  id: z.string().min(1, 'ID requerido'),
  name: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(100, 'Nombre muy largo'),
  role: z.string().min(1, 'Rol requerido'),
  dailyRateGTQ: z
    .number()
    .min(0, 'Tarifa diaria no puede ser negativa')
    .max(99999, 'Tarifa diaria excede límite'),
  phone: z
    .string()
    .regex(/^\+?[0-9\s-]+$/, 'Teléfono inválido')
    .optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  startDate: z.string().date('Fecha de inicio inválida').optional(),
  isActive: z.boolean(),
  skills: z.array(z.string()).optional(),
  emergencyContact: z
    .object({
      name: z.string().min(1, 'Nombre de contacto requerido'),
      phone: z.string().regex(/^\+?[0-9\s-]+$/, 'Teléfono de contacto inválido'),
      relationship: z.string().min(1, 'Relación requerida'),
    })
    .optional(),
});

export type EmployeeValues = z.infer<typeof EmployeeSchema>;

// APU Item Schema
export const APUItemSchema = z
  .object({
    id: z.string().min(1, 'ID requerido'),
    code: z.string().min(1, 'Código requerido').max(20, 'Código muy largo'),
    description: z
      .string()
      .min(5, 'Descripción debe tener al menos 5 caracteres')
      .max(500, 'Descripción muy larga'),
    unit: z.string().min(1, 'Unidad requerido'),
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
      return tolerance <= item.totalUnitCostGTQ * 0.1; // Permitir 10% de tolerancia
    },
    {
      message: 'La suma de componentes debe ser consistente con el costo total (±10% tolerancia)',
      path: ['totalUnitCostGTQ'],
    }
  );

export type APUItemValues = z.infer<typeof APUItemSchema>;

// Quote Record Schema
export const QuoteRecordSchema = z.object({
  id: z.string().min(1, 'ID requerido'),
  projectId: z.string().min(1, 'Proyecto requerido'),
  clientName: z.string().min(3, 'Nombre de cliente requerido').max(100, 'Nombre muy largo'),
  totalAmount: z
    .number()
    .min(0, 'Monto total no puede ser negativo')
    .max(999999999, 'Monto excede límite'),
  status: z.enum(['Aceptada', 'Enviada', 'Borrador', 'Rechazada']),
  notes: z.string().max(1000, 'Notas muy largas').optional(),
  estimatedDuration: z.string().optional(),
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

// Machinery Schema
export const MachinerySchema = z.object({
  id: z.string().min(1, 'ID requerido'),
  name: z.string().min(3, 'Nombre debe tener al menos 3 caracteres').max(100, 'Nombre muy largo'),
  type: z.string().min(1, 'Tipo requerido'),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'inactive', 'retired']),
  dailyRateGTQ: z
    .number()
    .min(0, 'Tarifa diaria no puede ser negativa')
    .max(99999, 'Tarifa excede límite'),
  fuelConsumptionPerHour: z
    .number()
    .min(0, 'Consumo no puede ser negativo')
    .max(100, 'Consumo excede límite')
    .optional(),
  purchaseDate: z.string().date('Fecha de compra inválida').optional(),
  lastMaintenanceDate: z.string().date('Fecha de mantenimiento inválida').optional(),
  currentMileage: z.number().min(0, 'Kilometraje no puede ser negativo').optional(),
  location: z
    .object({
      lat: z.number().min(-90, 'Latitud inválida').max(90, 'Latitud inválida'),
      lng: z.number().min(-180, 'Longitud inválida').max(180, 'Longitud inválida'),
    })
    .optional(),
});

export type MachineryValues = z.infer<typeof MachinerySchema>;

// Validation functions
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

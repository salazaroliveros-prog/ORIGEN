import { z } from 'zod';

/**
 * Esquema de validación para formularios de proyectos
 *
 * Requiere TODOS los campos para datos nuevos
 * Pero tolera parciales para datos legacyexistentes
 */

// ============ ESQUEMAS NUEVOS (Strict) ============

export const ProjectFormSchema = z
  .object({
    code: z
      .string()
      .min(3, 'El código debe tener al menos 3 caracteres')
      .max(20, 'El código no puede exceder 20 caracteres')
      .regex(/^[A-Z0-9-]+$/, 'Use solo mayúsculas, números y guiones'),
    name: z
      .string()
      .min(5, 'El nombre del proyecto debe tener al menos 5 caracteres')
      .max(100, 'El nombre no puede exceder 100 caracteres'),
    client: z
      .string()
      .min(3, 'El cliente es requerido')
      .max(100, 'El nombre del cliente no puede exceder 100 caracteres'),
    location: z.string().min(5, 'La dirección es requerida').max(200, 'La dirección es muy larga'),
    municipality: z
      .string()
      .min(2, 'El municipio es requerido')
      .max(50, 'El municipio es muy largo'),
    department: z
      .string()
      .min(2, 'El departamento es requerido')
      .max(50, 'El departamento es muy largo'),
    budgetTotal: z
      .number()
      .min(0, 'El presupuesto debe ser mayor o igual a 0')
      .max(999999999, 'El presupuesto excede el límite permitido'),
    spentTotal: z.number().min(0, 'El gasto ejecutado no puede ser negativo').default(0),
    progressPercent: z
      .number()
      .min(0, 'El avance debe estar entre 0 y 100')
      .max(100, 'El avance debe estar entre 0 y 100')
      .default(0),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}/, 'La fecha de inicio debe ser válida (YYYY-MM-DD)'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}/, 'La fecha de finalización debe ser válida (YYYY-MM-DD)'),
    status: z.enum(['En Ejecución', 'Planificación', 'Finalizado', 'Suspendido', 'Archivado'], {
      errorMap: () => ({
        message:
          'Estado inválido. Debe ser: En Ejecución, Planificación, Finalizado, Suspendido o Archivado',
      }),
    }),
    lat: z
      .number()
      .min(-90, 'Latitud inválida (debe estar entre -90 y 90)')
      .max(90, 'Latitud inválida (debe estar entre -90 y 90)'),
    lng: z
      .number()
      .min(-180, 'Longitud inválida (debe estar entre -180 y 180)')
      .max(180, 'Longitud inválida (debe estar entre -180 y 180)'),
    expectedProfitMarginPercent: z
      .number()
      .min(0, 'El margen no puede ser negativo')
      .max(100, 'El margen no puede exceder 100')
      .nullable()
      .optional(),
  })
  .refine((project) => new Date(project.endDate) >= new Date(project.startDate), {
    message: 'La fecha de finalización debe ser igual o posterior a la fecha de inicio',
    path: ['endDate'],
  });

export type ProjectFormValues = z.infer<typeof ProjectFormSchema>;

// ============ ESQUEMA TOLERANTE (Legacy) ============

/**
 * Esquema tolerante para validar datos existentes
 * Permite campos undefined y aplica defaults
 */
export const ProjectLegacySchema = z
  .object({
    code: z.string().default('LEGACY'),
    name: z.string().default('Proyecto sin nombre'),
    client: z.string().default('Cliente desconocido'),
    location: z.string().default('Ubicación no especificada'),
    municipality: z.string().default('Municipio no especificado'),
    department: z.string().default('Departamento no especificado'),
    budgetTotal: z.number().default(0),
    spentTotal: z.number().default(0),
    progressPercent: z.number().default(0),
    startDate: z.string().default(new Date().toISOString().split('T')[0]),
    endDate: z.string().default(new Date().toISOString().split('T')[0]),
    status: z
      .enum(['En Ejecución', 'Planificación', 'Finalizado', 'Suspendido', 'Archivado'])
      .default('Planificación'),
    lat: z.number().default(14.6133),
    lng: z.number().default(-90.4875),
    expectedProfitMarginPercent: z.number().nullable().optional(),
  })
  .strict({ message: 'Campo no reconocido' });

export interface ProjectFormProject {
  id: string;
  code: string;
  name: string;
  client: string;
  location: string;
  municipality: string;
  department: string;
  budgetTotal: number;
  spentTotal: number;
  progressPercent: number;
  startDate: string;
  endDate: string;
  status: 'En Ejecución' | 'Planificación' | 'Finalizado' | 'Suspendido' | 'Archivado';
  lat: number;
  lng: number;
  expectedProfitMarginPercent?: number | null;
}

/**
 * Valida datos nuevos (requiere todos los campos)
 */
export function validateProjectForm(data: unknown) {
  return ProjectFormSchema.safeParse(data);
}

/**
 * Valida y corrige datos existentes en Firebase
 * Aplica defaults a campos faltantes
 */
export function validateAndFixProjectData(data: unknown): ProjectFormProject {
  try {
    // Intentar primero con esquema estricto
    const result = ProjectFormSchema.safeParse(data);
    if (result.success) {
      return result.data;
    }

    // Si falla, aplicar esquema tolerante con defaults
    console.warn('⚠️ Datos de proyecto con campos faltantes, aplicando defaults');
    const fixed = ProjectLegacySchema.parse(data || {});

    return {
      id: (data as any)?.id || `proj-${Date.now()}`,
      ...fixed,
    };
  } catch (error) {
    console.error('❌ Error validando proyecto:', error);
    throw new Error(
      `Datos de proyecto inválidos: ${
        error instanceof z.ZodError
          ? error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
          : String(error)
      }`
    );
  }
}

export function getDefaultProjectValues(): ProjectFormProject {
  return {
    id: `proj-${Date.now()}`,
    code: '',
    name: '',
    client: '',
    location: '',
    municipality: '',
    department: '',
    budgetTotal: 0,
    spentTotal: 0,
    progressPercent: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 2592000000).toISOString().split('T')[0], // +30 días
    status: 'Planificación',
    lat: 14.6133,
    lng: -90.4875,
  };
}

// ============ VALIDACIONES ADICIONALES ============

export const ExpenseRecordSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  date: z.string(),
  category: z.string(),
  description: z.string(),
  supplier: z.string().optional(),
  nitSupplier: z.string().optional(),
  facturaNumber: z.string().optional(),
  amount: z.number().min(0),
  currency: z.enum(['GTQ', 'USD']),
  paymentMethod: z.string().optional(),
  approvalStatus: z.string().optional(),
});

export type ExpenseRecord = z.infer<typeof ExpenseRecordSchema>;

export function validateExpenseRecord(data: unknown) {
  return ExpenseRecordSchema.safeParse(data);
}

export const AttendanceRecordSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  date: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  status: z.enum(['Presente', 'Ausente', 'Permiso', 'Incapacidad IGSS']),
  overtimeHours: z.number().default(0),
});

export type AttendanceRecord = z.infer<typeof AttendanceRecordSchema>;

export function validateAttendanceRecord(data: unknown) {
  return AttendanceRecordSchema.safeParse(data);
}

export const EmployeeSchema = z.object({
  id: z.string(),
  name: z.string().min(3),
  role: z.enum([
    'Capataz',
    'Albañil',
    'Ayudante',
    'Arquitecto Residente',
    'Bodeguero',
    'Electricista',
  ]),
  dailyRateGTQ: z.number().min(0),
  igssAffiliated: z.boolean().optional(),
});

export type Employee = z.infer<typeof EmployeeSchema>;

export function validateEmployee(data: unknown) {
  return EmployeeSchema.safeParse(data);
}

export const MachinerySchema = z.object({
  id: z.string(),
  name: z.string().min(3),
  model: z.string(),
  plateOrCode: z.string(),
  hourlyRateGTQ: z.number().min(0),
  currentHorometer: z.number().default(0),
  status: z.enum(['Disponible', 'En Obra', 'Mantenimiento']).default('Disponible'),
});

export type Machinery = z.infer<typeof MachinerySchema>;

export function validateMachinery(data: unknown) {
  return MachinerySchema.safeParse(data);
}

export const APUItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  unit: z.string(),
  quantity: z.number().positive(),
  materialUnitCostGTQ: z.number().default(0),
  laborUnitCostGTQ: z.number().default(0),
  equipmentUnitCostGTQ: z.number().default(0),
  totalUnitCostGTQ: z.number().default(0),
  totalPriceGTQ: z.number().default(0),
});

export type APUItem = z.infer<typeof APUItemSchema>;

export function validateAPUItem(data: unknown) {
  return APUItemSchema.safeParse(data);
}

export const QuoteRecordSchema = z.object({
  id: z.string(),
  clientName: z.string(),
  date: z.string(),
  items: z.array(
    z.object({
      description: z.string(),
      qty: z.number(),
      unitPriceGTQ: z.number(),
    })
  ),
  totalGTQ: z.number(),
  status: z.enum(['Aceptada', 'Enviada', 'Borrador', 'Rechazada']).default('Borrador'),
});

export type QuoteRecord = z.infer<typeof QuoteRecordSchema>;

export function validateQuoteRecord(data: unknown) {
  return QuoteRecordSchema.safeParse(data);
}

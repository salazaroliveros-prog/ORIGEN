import { z } from 'zod';
import type {
  ExpenseRecordValues,
  AttendanceRecordValues,
  EmployeeValues,
  MachineryValues,
  APUItemValues,
  QuoteRecordValues,
} from './entity.schemas';
import {
  validateExpenseRecord,
  validateAttendanceRecord,
  validateEmployee,
  validateMachinery,
  validateAPUItem,
  validateQuoteRecord,
} from './entity.schemas';

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
// Schemas de entidad importados desde entity.schemas.ts para evitar duplicación
// Estos están mejor alineados con las reglas de Firestore

export type ExpenseRecord = ExpenseRecordValues;
export type AttendanceRecord = AttendanceRecordValues;
export type Employee = EmployeeValues;
export type Machinery = MachineryValues;
export type APUItem = APUItemValues;
export type QuoteRecord = QuoteRecordValues;

// Re-exportar funciones de validación para compatibilidad
export {
  validateExpenseRecord,
  validateAttendanceRecord,
  validateEmployee,
  validateMachinery,
  validateAPUItem,
  validateQuoteRecord,
} from './entity.schemas';

import { z } from 'zod';

export const ProjectFormSchema = z.object({
  code: z.string()
    .min(3, 'El código debe tener al menos 3 caracteres')
    .max(20, 'El código no puede exceder 20 caracteres')
    .regex(/^[A-Z0-9-]+$/, 'Use solo mayúsculas, números y guiones'),
  name: z.string()
    .min(5, 'El nombre del proyecto debe tener al menos 5 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  client: z.string()
    .min(3, 'El cliente es requerido')
    .max(100, 'El nombre del cliente no puede exceder 100 caracteres'),
  location: z.string()
    .min(5, 'La dirección es requerida')
    .max(200, 'La dirección es muy larga'),
  municipality: z.string()
    .min(2, 'El municipio es requerido')
    .max(50, 'El municipio es muy largo'),
  department: z.string()
    .min(2, 'El departamento es requerido')
    .max(50, 'El departamento es muy largo'),
  budgetTotal: z.number()
    .min(1, 'El presupuesto debe ser mayor a 0')
    .max(999999999, 'El presupuesto excede el límite permitido'),
  spentTotal: z.number()
    .min(0, 'El gasto ejecutado no puede ser negativo'),
  progressPercent: z.number()
    .min(0, 'El avance debe estar entre 0 y 100')
    .max(100, 'El avance debe estar entre 0 y 100'),
  startDate: z.string()
    .min(1, 'La fecha de inicio es requerida'),
  endDate: z.string()
    .min(1, 'La fecha de finalización es requerida'),
  status: z.enum(['En Ejecución', 'Planificación', 'Finalizado', 'Suspendido']),
  lat: z.number()
    .min(-90, 'Latitud inválida')
    .max(90, 'Latitud inválida'),
  lng: z.number()
    .min(-180, 'Longitud inválida')
    .max(180, 'Longitud inválida'),
  expectedProfitMarginPercent: z.number()
    .min(0, 'El margen no puede ser negativo')
    .max(100, 'El margen no puede exceder 100')
    .optional(),
});

export type ProjectFormValues = z.infer<typeof ProjectFormSchema>;

export interface ProjectFormProject {
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
  status: 'En Ejecución' | 'Planificación' | 'Finalizado' | 'Suspendido';
  lat: number;
  lng: number;
  expectedProfitMarginPercent?: number;
}

export function validateProjectForm(data: unknown) {
  return ProjectFormSchema.safeParse(data);
}

export function getDefaultProjectValues(): ProjectFormProject {
  return {
    code: '',
    name: '',
    client: '',
    location: '',
    municipality: '',
    department: '',
    budgetTotal: 0,
    spentTotal: 0,
    progressPercent: 0,
    startDate: '',
    endDate: '',
    status: 'Planificación',
    lat: 14.6133,
    lng: -90.4875,
    expectedProfitMarginPercent: 15,
  };
}

import type { ExpenseRecord, Machinery, MachineryLog } from '@/lib/types';

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const MACHINERY_EXPENSE_CATEGORY = 'Maquinaria y Combustible';
export const MACHINERY_EXPENSE_PAYMENT_METHOD = 'Pendiente' as const;
export const MACHINERY_EXPENSE_APPROVAL_STATUS = 'Pendiente' as const;

export function calculateMachineryHoursWorked(
  currentHorometer: number,
  nextHorometer: number
): number {
  if (!Number.isFinite(currentHorometer) || currentHorometer < 0) {
    throw new Error('El horómetro actual debe ser un número no negativo');
  }
  if (!Number.isFinite(nextHorometer) || nextHorometer < 0) {
    throw new Error('El horómetro final debe ser un número no negativo');
  }
  const hours = round2(nextHorometer - currentHorometer);
  if (hours <= 0) {
    throw new Error('El horómetro final debe ser mayor al actual');
  }
  return hours;
}

export function calculateMachineryOperationCost(
  hoursWorked: number,
  hourlyRateGTQ: number
): number {
  if (!Number.isFinite(hoursWorked) || hoursWorked <= 0) {
    throw new Error('Las horas trabajadas deben ser mayores a 0');
  }
  if (!Number.isFinite(hourlyRateGTQ) || hourlyRateGTQ < 0) {
    throw new Error('La tarifa por hora debe ser un número no negativo');
  }
  return round2(hoursWorked * hourlyRateGTQ);
}

export interface MachineryUseInput {
  machineryId: string;
  machineryName?: string;
  projectId: string;
  date: string;
  nextHorometer: number;
  operatorName: string;
  fuelGallons: number;
}

export interface NormalizedMachineryUse {
  log: MachineryLog;
  expense: ExpenseRecord;
  nextHorometer: number;
  machineryUpdate: Pick<Machinery, 'currentHorometer' | 'currentProjectId' | 'status'>;
}

export function buildMachineryUseRecord(
  input: MachineryUseInput,
  machinery: Machinery,
  logId: string
): NormalizedMachineryUse {
  if (!input.projectId) throw new Error('El proyecto de la operación es requerido');
  if (!input.date) throw new Error('La fecha de la operación es requerida');
  if (!input.operatorName?.trim()) throw new Error('El operador es requerido');
  if (!Number.isFinite(input.fuelGallons) || input.fuelGallons < 0) {
    throw new Error('El combustible debe ser un número no negativo');
  }

  const hoursWorked = calculateMachineryHoursWorked(
    machinery.currentHorometer,
    input.nextHorometer
  );
  const costGTQ = calculateMachineryOperationCost(hoursWorked, machinery.hourlyRateGTQ);
  const expenseId = `machine-${logId}`;
  const machineryName = machinery.name || input.machineryName || input.machineryId;

  const log: MachineryLog = {
    id: logId,
    machineryId: machinery.id || input.machineryId,
    machineryName,
    projectId: input.projectId,
    date: input.date,
    hoursWorked,
    operatorName: input.operatorName.trim(),
    fuelGallons: input.fuelGallons,
    costGTQ,
    expenseId,
  };

  const expense: ExpenseRecord = {
    id: expenseId,
    projectId: log.projectId,
    date: log.date,
    category: MACHINERY_EXPENSE_CATEGORY,
    description: `${machineryName}: ${hoursWorked} horas de operación`,
    // Es un costo interno de la obra, no una compra a un tercero: no existe
    // factura ni NIT. Inventar `FAC-<log>` metía un correlativo falso en el
    // libro de compras; el vínculo real es `machineryLogId`.
    supplier: machineryName,
    nitSupplier: '',
    facturaNumber: '',
    amount: costGTQ,
    currency: 'GTQ',
    paymentMethod: MACHINERY_EXPENSE_PAYMENT_METHOD,
    approvalStatus: MACHINERY_EXPENSE_APPROVAL_STATUS,
    machineryLogId: logId,
  };

  return {
    log,
    expense,
    nextHorometer: input.nextHorometer,
    machineryUpdate: {
      currentHorometer: input.nextHorometer,
      currentProjectId: log.projectId,
      status: 'En Obra',
    },
  };
}

/**
 * Construye el documento que realmente se persiste en `machinery`.
 *
 * `companyId` y `createdBy` los aporta la sesión, nunca el formulario, y deben
 * estar presentes **antes** de validar: el esquema persistido los exige.
 */
export function buildMachineryRecord(
  machinery: Machinery,
  companyId: string,
  userId: string
): Machinery {
  if (!companyId) throw new Error('La empresa es requerida para registrar maquinaria');
  if (!userId) throw new Error('El usuario es requerido para registrar maquinaria');
  return {
    ...machinery,
    companyId,
    createdBy: machinery.createdBy ?? userId,
  };
}

/**
 * Normaliza lo que envía la UI contra el estado real del equipo.
 *
 * Horas y costo se recalculan en el dominio: el navegador puede tener una tarifa
 * vieja o haber sido manipulado, y el gasto que se carga al proyecto no puede
 * depender de eso.
 */
export function resolveMachineryUse(
  submitted: MachineryLog,
  machinery: Machinery
): NormalizedMachineryUse {
  const nextHorometer = round2(machinery.currentHorometer + submitted.hoursWorked);
  return buildMachineryUseRecord(
    {
      machineryId: submitted.machineryId,
      machineryName: submitted.machineryName || machinery.name,
      projectId: submitted.projectId,
      date: submitted.date,
      nextHorometer,
      operatorName: submitted.operatorName,
      fuelGallons: submitted.fuelGallons,
    },
    machinery,
    submitted.id
  );
}

// ============================================================================
// Baja de equipos
// ============================================================================

export const MACHINERY_DELETION_BLOCKED_MESSAGE =
  'No se puede eliminar un equipo con operaciones registradas: sus costos quedarían huérfanos. Cámbialo a "Mantenimiento" si ya no está en obra.';

/**
 * Un equipo con bitácoras de uso no se borra.
 *
 * Borrar solo el documento `machinery` deja sus `machineryLogs` y los gastos
 * vinculados apuntando a un equipo inexistente, y esos costos siguen sumando al
 * proyecto sin trazabilidad. La baja operativa se hace con `status`.
 */
export function canDeleteMachinery(
  machineryId: string,
  logs: Array<Pick<MachineryLog, 'machineryId'>>
): boolean {
  return !logs.some((log) => log.machineryId === machineryId);
}

// ============================================================================
// Mantenimiento preventivo
// ============================================================================

export const MACHINERY_MAINTENANCE_INTERVAL_HOURS = 250;
export const MACHINERY_MAINTENANCE_WARNING_HOURS = 200;

export type MachineryMaintenanceUrgency = 'critical' | 'warning' | 'ok' | 'invalid';

export interface MachineryMaintenanceStatus {
  horometer: number;
  /** Horas acumuladas desde el último servicio conocido. */
  hoursSinceService: number;
  hoursUntilService: number;
  urgency: MachineryMaintenanceUrgency;
  message: string;
}

/**
 * Estado de mantenimiento a partir del horómetro **absoluto** del equipo.
 *
 * Sumar solo las horas de las bitácoras desde el alta hacía que una excavadora
 * registrada con 8,000 h apareciera como "OK" y nunca alertara. El horómetro es
 * la fuente real de desgaste; si existe `lastServiceHorometer`, se descuenta para
 * medir desde el último servicio.
 */
export function evaluateMachineryMaintenance(input: {
  currentHorometer: number;
  lastServiceHorometer?: number;
}): MachineryMaintenanceStatus {
  const validCurrentHorometer =
    Number.isFinite(input.currentHorometer) && input.currentHorometer >= 0;
  const serviceValueProvided = input.lastServiceHorometer !== undefined;
  const validLastServiceHorometer =
    !serviceValueProvided ||
    (Number.isFinite(input.lastServiceHorometer) &&
      (input.lastServiceHorometer as number) >= 0 &&
      (input.lastServiceHorometer as number) <= input.currentHorometer);

  // Never turn corrupt or impossible readings into zero: that could incorrectly
  // clear a maintenance warning and allow an unverified machine to keep working.
  if (!validCurrentHorometer || !validLastServiceHorometer) {
    return {
      horometer: validCurrentHorometer ? input.currentHorometer : 0,
      hoursSinceService: 0,
      hoursUntilService: 0,
      urgency: 'invalid',
      message: 'Lectura de horómetro inválida o inconsistente. No registrar uso hasta revisar el equipo y corregir la lectura.',
    };
  }

  const horometer = input.currentHorometer;
  const baseline = input.lastServiceHorometer ?? 0;
  const hoursSinceService = round2(Math.max(0, horometer - baseline));
  const hoursUntilService = round2(
    Math.max(0, MACHINERY_MAINTENANCE_INTERVAL_HOURS - hoursSinceService)
  );

  if (hoursSinceService >= MACHINERY_MAINTENANCE_INTERVAL_HOURS) {
    return {
      horometer,
      hoursSinceService,
      hoursUntilService: 0,
      urgency: 'critical',
      message: `Mantenimiento requerido: ${hoursSinceService}h acumuladas (intervalo de ${MACHINERY_MAINTENANCE_INTERVAL_HOURS}h).`,
    };
  }

  if (hoursSinceService >= MACHINERY_MAINTENANCE_WARNING_HOURS) {
    return {
      horometer,
      hoursSinceService,
      hoursUntilService,
      urgency: 'warning',
      message: `Mantenimiento recomendado pronto: ${hoursSinceService}h acumuladas, faltan ${hoursUntilService}h para el servicio.`,
    };
  }

  return {
    horometer,
    hoursSinceService,
    hoursUntilService,
    urgency: 'ok',
    message: `Próximo servicio en ${hoursUntilService}h.`,
  };
}

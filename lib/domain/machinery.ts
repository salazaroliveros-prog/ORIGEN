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
    supplier: machineryName,
    nitSupplier: 'CF',
    facturaNumber: `FAC-${logId}`,
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

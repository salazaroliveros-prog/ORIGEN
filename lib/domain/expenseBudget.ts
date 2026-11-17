/**
 * Reglas de negocio de gastos contra el presupuesto APU.
 *
 * Extraídas de `ExpensesManager` para poder probarlas sin UI y para que el
 * control de sobregasto use exactamente las mismas reglas en todos los flujos
 * (registro, edición y aprobación).
 */

import type { APUItem, ExpenseRecord } from '@/lib/types';
import { isCountableExpense } from '@/lib/projectCalculations';

export interface ApuOverrun {
  isOver: true;
  /** Monto que excede el presupuesto del renglón (GTQ). */
  diff: number;
  apuCode: string;
  apuDesc: string;
  /** totalPriceGTQ del renglón APU. */
  budgetTotal: number;
  /** Gasto previo del proyecto en ese renglón (excluye rechazados). */
  currentSpent: number;
  /** currentSpent + monto del gasto que se intenta registrar. */
  projectedTotal: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Suma los gastos no rechazados que comprometen un renglón APU.
 * Incluye pendientes de aprobación y excluye los rechazados.
 */
export function sumApuSpent(params: {
  expenses: ExpenseRecord[];
  projectId: string;
  apuId: string;
  excludeExpenseId?: string;
}): number {
  const { expenses, projectId, apuId, excludeExpenseId } = params;
  return round2(
    expenses
      .filter(
        (expense) =>
          expense.projectId === projectId &&
          expense.assignedApuId === apuId &&
          expense.id !== excludeExpenseId &&
          isCountableExpense(expense)
      )
      .reduce((sum, expense) => sum + expense.amount, 0)
  );
}

/**
 * Determina si registrar/editar un gasto excede el presupuesto de su renglón.
 *
 * - Sin `apuId` (gasto general) no hay control por renglón: retorna `null`.
 * - Solo considera renglones del mismo proyecto (o sin proyecto asignado).
 * - El proyecto se deriva del propio gasto, nunca de otro proyecto activo.
 */
export function detectApuOverrun(params: {
  apuItems: APUItem[];
  expenses: ExpenseRecord[];
  projectId: string;
  apuId?: string | null;
  additionalAmount: number;
  excludeExpenseId?: string;
}): ApuOverrun | null {
  const { apuItems, expenses, projectId, apuId, additionalAmount, excludeExpenseId } = params;
  if (!apuId) return null;
  if (!Number.isFinite(additionalAmount) || additionalAmount <= 0) return null;

  const apu = apuItems.find(
    (item) => item.id === apuId && (!item.projectId || item.projectId === projectId)
  );
  if (!apu) return null;

  const budgetTotal = apu.totalPriceGTQ || 0;
  if (budgetTotal <= 0) return null;

  const currentSpent = sumApuSpent({ expenses, projectId, apuId, excludeExpenseId });
  const projectedTotal = round2(currentSpent + additionalAmount);
  if (projectedTotal <= budgetTotal) return null;

  return {
    isOver: true,
    diff: round2(projectedTotal - budgetTotal),
    apuCode: apu.code,
    apuDesc: apu.description,
    budgetTotal,
    currentSpent,
    projectedTotal,
  };
}

/**
 * Convierte un monto capturado en la moneda de la UI a GTQ, que es la moneda
 * en la que se persiste `ExpenseRecord.amount`.
 *
 * Lanza error si se pide USD sin tipo de cambio configurado: es preferible
 * bloquear el registro antes que guardar un monto sin convertir.
 */
export function toGTQAmount(amount: number, currency: 'GTQ' | 'USD', exchangeRate: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('El monto debe ser mayor a cero.');
  }
  if (currency === 'GTQ') return round2(amount);
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error('Configura el tipo de cambio (GTQ por USD) antes de registrar gastos en USD.');
  }
  return round2(amount * exchangeRate);
}

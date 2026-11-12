import type { APUItem } from '@/lib/types';
import {
  calculateLineTotal,
  calculateTotalUnitCost,
  validateAPUItem as validateAndNormalizeAPUItem,
} from '@/lib/utils/calculations';

const round2 = (value: number): number => Math.round(value * 100) / 100;
const TOTAL_TOLERANCE_GTQ = 0.01;

export function assertAPUTotalsConsistent(item: Pick<
  APUItem,
  'quantity' | 'materialUnitCostGTQ' | 'laborUnitCostGTQ' | 'equipmentUnitCostGTQ' | 'totalUnitCostGTQ' | 'totalPriceGTQ'
>): void {
  const expectedUnit = calculateTotalUnitCost(
    item.materialUnitCostGTQ,
    item.laborUnitCostGTQ,
    item.equipmentUnitCostGTQ
  );
  const expectedTotal = calculateLineTotal(expectedUnit, item.quantity);

  if (Math.abs(expectedUnit - item.totalUnitCostGTQ) > TOTAL_TOLERANCE_GTQ) {
    throw new Error(
      `APU total unit cost inconsistente: esperado ${expectedUnit}, recibido ${item.totalUnitCostGTQ}`
    );
  }
  if (Math.abs(expectedTotal - item.totalPriceGTQ) > TOTAL_TOLERANCE_GTQ) {
    throw new Error(
      `APU total price inconsistente: esperado ${expectedTotal}, recibido ${item.totalPriceGTQ}`
    );
  }
}

export function normalizeAPUItem(item: Partial<APUItem>): APUItem {
  const normalized = validateAndNormalizeAPUItem(item);
  assertAPUTotalsConsistent(normalized);
  return {
    ...normalized,
    totalUnitCostGTQ: round2(normalized.totalUnitCostGTQ),
    totalPriceGTQ: round2(normalized.totalPriceGTQ),
  };
}

export function normalizeAPUItems(items: Partial<APUItem>[]): APUItem[] {
  return items.map((item) => normalizeAPUItem(item));
}

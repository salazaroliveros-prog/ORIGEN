import type { APUItem, Project } from '@/lib/types';

export type BudgetCoverageStatus =
  'sin-presupuesto' | 'bajo-presupuesto' | 'ajustado' | 'sobre-presupuesto';

export interface ConstructionCosts {
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  directCost: number;
  saleTotal: number;
  marginGTQ: number;
  marginPercent: number;
  itemCount: number;
}

export interface MaterialRequirement {
  name: string;
  unit: string;
  quantity: number;
  unitPriceGTQ: number;
  subtotalGTQ: number;
}

export interface LaborRequirement {
  role: string;
  estimatedHours: number;
  unitPriceGTQ: number;
  subtotalGTQ: number;
}

export interface LaborPlan {
  requirements: LaborRequirement[];
  totalCostGTQ: number;
  totalHours: number;
  crewDays: number;
}

export interface BudgetCoverage {
  plannedBudgetGTQ: number;
  apuTotalGTQ: number;
  spentTotalGTQ: number;
  remainingBudgetGTQ: number;
  varianceGTQ: number;
  variancePercent: number;
  budgetUsagePercent: number;
  apuCoveragePercent: number;
  status: BudgetCoverageStatus;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

function safeNumber(value: number | undefined | null): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function sumMaterialsFromBreakdown(item: APUItem): number {
  return (item.breakdown?.materials ?? []).reduce(
    (total, material) => total + safeNumber(material.subtotalGTQ),
    0
  );
}

function sumLaborFromBreakdown(item: APUItem): number {
  return (item.breakdown?.labor ?? []).reduce(
    (total, labor) => total + safeNumber(labor.subtotalGTQ),
    0
  );
}

function sumEquipmentFromBreakdown(item: APUItem): number {
  return (item.breakdown?.equipment ?? []).reduce(
    (total, equipment) => total + safeNumber(equipment.subtotalGTQ),
    0
  );
}

/**
 * Calcula el costo de construcción de una partida APU.
 * Usa el desglose cuando existe (más fiable) y cae a costo unitario × cantidad.
 */
export function calculateItemCosts(item: APUItem): {
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  directCost: number;
} {
  const quantity = safeNumber(item.quantity);
  const breakdownMaterial = sumMaterialsFromBreakdown(item);
  const breakdownLabor = sumLaborFromBreakdown(item);
  const breakdownEquipment = sumEquipmentFromBreakdown(item);

  const materialCost =
    breakdownMaterial > 0
      ? breakdownMaterial
      : round2(safeNumber(item.materialUnitCostGTQ) * quantity);
  const laborCost =
    breakdownLabor > 0 ? breakdownLabor : round2(safeNumber(item.laborUnitCostGTQ) * quantity);
  const equipmentCost =
    breakdownEquipment > 0
      ? breakdownEquipment
      : round2(safeNumber(item.equipmentUnitCostGTQ) * quantity);

  const directCost = round2(materialCost + laborCost + equipmentCost);

  return { materialCost, laborCost, equipmentCost, directCost };
}

/**
 * Costos totales de construcción de un conjunto de partidas APU.
 */
export function calculateConstructionCosts(items: APUItem[]): ConstructionCosts {
  const totals = items.reduce(
    (acc, item) => {
      const costs = calculateItemCosts(item);
      acc.materialCost += costs.materialCost;
      acc.laborCost += costs.laborCost;
      acc.equipmentCost += costs.equipmentCost;
      acc.directCost += costs.directCost;
      acc.saleTotal += safeNumber(item.totalPriceGTQ);
      return acc;
    },
    { materialCost: 0, laborCost: 0, equipmentCost: 0, directCost: 0, saleTotal: 0 }
  );

  const materialCost = round2(totals.materialCost);
  const laborCost = round2(totals.laborCost);
  const equipmentCost = round2(totals.equipmentCost);
  const directCost = round2(totals.directCost);
  const saleTotal = round2(totals.saleTotal);
  const marginGTQ = round2(saleTotal - directCost);
  const marginPercent = saleTotal > 0 ? round2((marginGTQ / saleTotal) * 100) : 0;

  return {
    materialCost,
    laborCost,
    equipmentCost,
    directCost,
    saleTotal,
    marginGTQ,
    marginPercent,
    itemCount: items.length,
  };
}

/**
 * Cantidades y costos de materiales requeridos, agregados por nombre y unidad.
 */
export function calculateMaterialRequirements(items: APUItem[]): MaterialRequirement[] {
  const registry = new Map<string, MaterialRequirement>();

  for (const item of items) {
    const breakdown = item.breakdown?.materials ?? [];

    if (breakdown.length > 0) {
      for (const material of breakdown) {
        const name = material.name?.trim() || 'Material sin nombre';
        const unit = material.unit?.trim() || item.unit || 'unidad';
        const key = `${name.toLowerCase()}::${unit.toLowerCase()}`;
        const quantity = safeNumber(material.quantity);
        const subtotal = safeNumber(material.subtotalGTQ);
        const unitPrice =
          safeNumber(material.unitPriceGTQ) || (quantity > 0 ? round2(subtotal / quantity) : 0);

        const current = registry.get(key);
        if (current) {
          current.quantity = round2(current.quantity + quantity);
          current.subtotalGTQ = round2(current.subtotalGTQ + subtotal);
        } else {
          registry.set(key, {
            name,
            unit,
            quantity: round2(quantity),
            unitPriceGTQ: unitPrice,
            subtotalGTQ: round2(subtotal),
          });
        }
      }
      continue;
    }

    const quantity = safeNumber(item.quantity);
    const subtotal = round2(safeNumber(item.materialUnitCostGTQ) * quantity);
    if (subtotal <= 0) continue;

    const name = item.description?.trim() || `Materiales ${item.code}`;
    const unit = item.unit || 'unidad';
    const key = `${name.toLowerCase()}::${unit.toLowerCase()}`;
    const current = registry.get(key);
    if (current) {
      current.quantity = round2(current.quantity + quantity);
      current.subtotalGTQ = round2(current.subtotalGTQ + subtotal);
    } else {
      registry.set(key, {
        name,
        unit,
        quantity: round2(quantity),
        unitPriceGTQ: safeNumber(item.materialUnitCostGTQ),
        subtotalGTQ: subtotal,
      });
    }
  }

  return Array.from(registry.values()).sort((a, b) => b.subtotalGTQ - a.subtotalGTQ);
}

/**
 * Requerimientos de mano de obra agregados por rol, con horas y jornadas de cuadrilla.
 */
export function calculateLaborRequirements(items: APUItem[], hoursPerShift = 8): LaborPlan {
  const registry = new Map<string, LaborRequirement>();
  const safeShift = hoursPerShift > 0 ? hoursPerShift : 8;

  for (const item of items) {
    const breakdown = item.breakdown?.labor ?? [];

    if (breakdown.length > 0) {
      for (const labor of breakdown) {
        const role = labor.role?.trim() || 'Mano de obra general';
        const key = role.toLowerCase();
        const hours = safeNumber(labor.yieldHours);
        const subtotal = safeNumber(labor.subtotalGTQ);
        const unitPrice =
          safeNumber(labor.unitPriceGTQ) || (hours > 0 ? round2(subtotal / hours) : 0);

        const current = registry.get(key);
        if (current) {
          current.estimatedHours = round2(current.estimatedHours + hours);
          current.subtotalGTQ = round2(current.subtotalGTQ + subtotal);
        } else {
          registry.set(key, {
            role,
            estimatedHours: round2(hours),
            unitPriceGTQ: unitPrice,
            subtotalGTQ: round2(subtotal),
          });
        }
      }
      continue;
    }

    const quantity = safeNumber(item.quantity);
    const subtotal = round2(safeNumber(item.laborUnitCostGTQ) * quantity);
    if (subtotal <= 0) continue;

    const key = 'mano de obra general';
    const current = registry.get(key);
    if (current) {
      current.subtotalGTQ = round2(current.subtotalGTQ + subtotal);
    } else {
      registry.set(key, {
        role: 'Mano de obra general',
        estimatedHours: 0,
        unitPriceGTQ: safeNumber(item.laborUnitCostGTQ),
        subtotalGTQ: subtotal,
      });
    }
  }

  const requirements = Array.from(registry.values()).sort((a, b) => b.subtotalGTQ - a.subtotalGTQ);
  const totalCostGTQ = round2(
    requirements.reduce((total, requirement) => total + requirement.subtotalGTQ, 0)
  );
  const totalHours = round2(
    requirements.reduce((total, requirement) => total + requirement.estimatedHours, 0)
  );

  return {
    requirements,
    totalCostGTQ,
    totalHours,
    crewDays: totalHours > 0 ? round2(totalHours / safeShift) : 0,
  };
}

/**
 * Cobertura del presupuesto: planificado vs APU vs gasto ejecutado.
 */
export function calculateBudgetCoverage(
  project: Pick<Project, 'budgetTotal' | 'spentTotal'>,
  items: APUItem[]
): BudgetCoverage {
  const plannedBudgetGTQ = round2(safeNumber(project.budgetTotal));
  const spentTotalGTQ = round2(safeNumber(project.spentTotal));
  const apuTotalGTQ = round2(
    items.reduce((total, item) => total + safeNumber(item.totalPriceGTQ), 0)
  );

  const remainingBudgetGTQ = round2(plannedBudgetGTQ - spentTotalGTQ);
  const varianceGTQ = round2(plannedBudgetGTQ - apuTotalGTQ);
  const variancePercent = plannedBudgetGTQ > 0 ? round2((varianceGTQ / plannedBudgetGTQ) * 100) : 0;
  const budgetUsagePercent =
    plannedBudgetGTQ > 0 ? round2((spentTotalGTQ / plannedBudgetGTQ) * 100) : 0;
  const apuCoveragePercent =
    plannedBudgetGTQ > 0 ? round2((apuTotalGTQ / plannedBudgetGTQ) * 100) : 0;

  let status: BudgetCoverageStatus;
  if (plannedBudgetGTQ <= 0 && apuTotalGTQ <= 0) {
    status = 'sin-presupuesto';
  } else if (plannedBudgetGTQ <= 0) {
    status = 'sobre-presupuesto';
  } else if (apuTotalGTQ > plannedBudgetGTQ) {
    status = 'sobre-presupuesto';
  } else if (apuCoveragePercent >= 95) {
    status = 'ajustado';
  } else {
    status = 'bajo-presupuesto';
  }

  return {
    plannedBudgetGTQ,
    apuTotalGTQ,
    spentTotalGTQ,
    remainingBudgetGTQ,
    varianceGTQ,
    variancePercent,
    budgetUsagePercent,
    apuCoveragePercent,
    status,
  };
}

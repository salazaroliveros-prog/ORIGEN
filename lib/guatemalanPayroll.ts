/**
 * Motor de Cálculo Laboral y Planillas de Guatemala (ConstructERP Guatemala)
 * Conforme al Código de Trabajo (Decreto 1441), Ley Orgánica del IGSS (Decreto 295),
 * Decreto 42-92 (Ley de Bonificación Anual para Trabajadores del Sector Privado y Público - Bono 14),
 * Decreto 76-78 (Ley Reguladora de la Prestación del Aguinaldo para los Trabajadores del Sector Privado)
 * y Decreto 37-2001 (Bonificación Incentivo para los Trabajadores del Sector Privado).
 */

export const STATUTORY_RATES = {
  // Cuota Laboral IGSS (deducible al trabajador)
  IGSS_LABORAL: 0.0483, // 4.83% sobre salario ordinario devengado
  // Cuotas Patronales (costo empleador)
  IGSS_PATRONAL: 0.1067, // 10.67%
  IRTRA: 0.01, // 1.0% Instituto de Recreación de los Trabajadores
  INTECAP: 0.01, // 1.0% Instituto Técnico de Capacitación y Productividad
  IGSS_PATRONAL_TOTAL: 0.1267, // 12.67% total patronal
  // Bonificación Incentivo legal (Dto. 37-2001)
  BONO_INCENTIVO_MENSUAL: 250.0, // Q250.00 fijos mensuales no afectos a IGSS
  BONO_INCENTIVO_QUINCENAL: 125.0, // Q125.00 quincenales
  // Tasas de provisión mensual de prestaciones
  PROVISION_BONO_14: 1 / 12, // 8.3333% (1 salario ordinario al año)
  PROVISION_AGUINALDO: 1 / 12, // 8.3333% (1 salario ordinario al año)
  PROVISION_VACACIONES: 15 / 365, // ~4.1096% (15 días hábiles al año)
  PROVISION_INDEMNIZACION: 1 / 12, // 8.3333% (1 salario por año según Art. 82)
  // Factor con Bono 14 y Aguinaldo proporcionales para liquidaciones (Art. 9 Dto 42-92 y Art. 9 Dto 76-78)
  FACTOR_INDEMNIZACION_COMPLETA: 14 / 12 / 365, // Salario * (14/12) / 365 días
  // Salario Mínimo de referencia Guatemala 2026 (No Agrícola CE1: ~Q3,628.80)
  SALARIO_MINIMO_MENSUAL_CE1: 3628.8,
  SALARIO_MINIMO_DIARIO_CE1: 3628.8 / 30, // Q120.96
};

export type PayrollFrequency = 'quincenal' | 'mensual';

export interface EmployeePayrollInput {
  id: string;
  name: string;
  role: string;
  dailyRateGTQ: number;
  igssAffiliated: boolean;
  dpi?: string;
  igssNumber?: string;
  hireDate?: string;
  assignedProject?: string;
  // Parámetros variables del período
  frequency?: PayrollFrequency;
  daysWorked?: number; // 15 o 30
  overtimeHours?: number; // Horas extras ordinarias (factor 1.5)
  extraBonusGTQ?: number; // Bonos adicionales voluntarios
  deductionsGTQ?: number; // Anticipos, descuentos judiciales o préstamos
  customBonoIncentivo?: number; // Para permitir valores mayores a Q250
}

export interface EmployeePayrollCalculation {
  employeeId: string;
  employeeName: string;
  role: string;
  dpi: string;
  igssNumber: string;
  hireDate: string;
  frequency: PayrollFrequency;
  daysWorked: number;
  dailyRateGTQ: number;
  hourlyRateGTQ: number;

  // Ingresos Devengados
  baseSalary: number; // Salario base por días trabajados
  overtimeHours: number;
  overtimeHourlyRate: number; // Tasa hora extra (1.5x)
  overtimeAmount: number; // Total horas extras
  salarioAfectoIGSS: number; // Base + Horas Extras (materia imponible IGSS)
  bonoIncentivo: number; // Dto. 37-2001 (exento de IGSS)
  extraBonus: number;
  totalDevengado: number; // Salario Afecto + Bono Incentivo + Bonos Extra

  // Deducciones
  igssLaboral: number; // 4.83% sobre salarioAfectoIGSS
  otherDeductions: number; // Anticipos / judiciales
  totalDeducciones: number;

  // Líquido a Pagar
  salarioLiquido: number; // totalDevengado - totalDeducciones

  // Aportes Patronales (Costo Empleador)
  igssPatronal: number; // 10.67%
  irtra: number; // 1.0%
  intecap: number; // 1.0%
  igssPatronalTotal: number; // 12.67% sobre salarioAfectoIGSS

  // Provisiones Mensuales de Prestaciones (Pasivo Laboral Constructora)
  provisionBono14: number; // 8.333% sobre salarioAfectoIGSS
  provisionAguinaldo: number; // 8.333% sobre salarioAfectoIGSS
  provisionVacaciones: number; // 4.11% sobre salario base
  provisionIndemnizacion: number; // 8.333% sobre salarioAfectoIGSS
  totalProvisionesPrestaciones: number;

  // Costo Total Empresa para el Colaborador
  costoTotalPatrono: number;
}

export interface BenefitCalculationResult {
  employeeId: string;
  employeeName: string;
  role: string;
  dpi: string;
  benefitType: 'bono_14' | 'aguinaldo';
  benefitName: string;
  legalDecree: string;
  periodStart: string;
  periodEnd: string;
  calculationDate: string;
  hireDate: string;
  averageMonthlySalary: number;
  daysInStatutoryPeriod: number;
  daysWorkedInPeriod: number;
  isFullYear: boolean;
  proportionalFactor: number;
  amountToPayGTQ: number;
  isExemptIGSS: boolean;
  notes: string;
}

/**
 * Calcula la planilla periódica (quincenal o mensual) de un empleado con retenciones IGSS automáticas.
 */
export function calculateEmployeePayroll(input: EmployeePayrollInput): EmployeePayrollCalculation {
  const frequency: PayrollFrequency = input.frequency || 'mensual';
  const defaultDays = frequency === 'quincenal' ? 15 : 30;
  const daysWorked = input.daysWorked !== undefined ? input.daysWorked : defaultDays;

  // Salario base por los días trabajados en el período
  const baseSalary = Math.round(input.dailyRateGTQ * daysWorked * 100) / 100;

  // Horas extras: jornada diurna ordinaria legal = 8 horas. Hora ordinaria = diaria / 8
  const hourlyRateGTQ = Math.round((input.dailyRateGTQ / 8) * 100) / 100;
  const overtimeHours = input.overtimeHours || 0;
  const overtimeHourlyRate = Math.round(hourlyRateGTQ * 1.5 * 100) / 100;
  const overtimeAmount = Math.round(overtimeHours * overtimeHourlyRate * 100) / 100;

  // Salario afecto al IGSS según Art. 1 literal c del Reglamento de Afiliación del IGSS
  // (incluye salarios ordinarios y extraordinarios devengados en el período)
  const salarioAfectoIGSS = baseSalary + overtimeAmount;

  // Bonificación Incentivo Decreto 37-2001
  const defaultBono =
    frequency === 'quincenal'
      ? STATUTORY_RATES.BONO_INCENTIVO_QUINCENAL
      : STATUTORY_RATES.BONO_INCENTIVO_MENSUAL;
  const bonoIncentivo = input.customBonoIncentivo ?? defaultBono;
  const extraBonus = input.extraBonusGTQ || 0;

  const totalDevengado = Math.round((salarioAfectoIGSS + bonoIncentivo + extraBonus) * 100) / 100;

  // Retención IGSS Laboral: 4.83% sobre la base afecta si el empleado está afiliado
  const igssLaboral = input.igssAffiliated
    ? Math.round(salarioAfectoIGSS * STATUTORY_RATES.IGSS_LABORAL * 100) / 100
    : 0;

  const otherDeductions = Math.round((input.deductionsGTQ || 0) * 100) / 100;
  const totalDeducciones = Math.round((igssLaboral + otherDeductions) * 100) / 100;

  const salarioLiquido = Math.round((totalDevengado - totalDeducciones) * 100) / 100;

  // Cargas Patronales (12.67%)
  const igssPatronal = Math.round(salarioAfectoIGSS * STATUTORY_RATES.IGSS_PATRONAL * 100) / 100;
  const irtra = Math.round(salarioAfectoIGSS * STATUTORY_RATES.IRTRA * 100) / 100;
  const intecap = Math.round(salarioAfectoIGSS * STATUTORY_RATES.INTECAP * 100) / 100;
  const igssPatronalTotal =
    Math.round(salarioAfectoIGSS * STATUTORY_RATES.IGSS_PATRONAL_TOTAL * 100) / 100;

  // Provisiones para pasivo laboral
  const multiplier = frequency === 'quincenal' ? 0.5 : 1.0;
  const provisionBono14 =
    Math.round(salarioAfectoIGSS * STATUTORY_RATES.PROVISION_BONO_14 * multiplier * 100) / 100;
  const provisionAguinaldo =
    Math.round(salarioAfectoIGSS * STATUTORY_RATES.PROVISION_AGUINALDO * multiplier * 100) / 100;
  const provisionVacaciones = Math.round(baseSalary * (15 / 365) * (daysWorked / 30) * 100) / 100;
  const provisionIndemnizacion =
    Math.round(salarioAfectoIGSS * STATUTORY_RATES.PROVISION_INDEMNIZACION * multiplier * 100) /
    100;

  const totalProvisionesPrestaciones =
    Math.round(
      (provisionBono14 + provisionAguinaldo + provisionVacaciones + provisionIndemnizacion) * 100
    ) / 100;

  const costoTotalPatrono =
    Math.round((totalDevengado + igssPatronalTotal + totalProvisionesPrestaciones) * 100) / 100;

  return {
    employeeId: input.id,
    employeeName: input.name,
    role: input.role,
    dpi: input.dpi || 'N/A',
    igssNumber: input.igssNumber || 'Pendiente de Afiliación',
    hireDate: input.hireDate || '2024-01-01',
    frequency,
    daysWorked,
    dailyRateGTQ: input.dailyRateGTQ,
    hourlyRateGTQ,
    baseSalary,
    overtimeHours,
    overtimeHourlyRate,
    overtimeAmount,
    salarioAfectoIGSS,
    bonoIncentivo,
    extraBonus,
    totalDevengado,
    igssLaboral,
    otherDeductions,
    totalDeducciones,
    salarioLiquido,
    igssPatronal,
    irtra,
    intecap,
    igssPatronalTotal,
    provisionBono14,
    provisionAguinaldo,
    provisionVacaciones,
    provisionIndemnizacion,
    totalProvisionesPrestaciones,
    costoTotalPatrono,
  };
}

/**
 * Calcula automáticamente la prestación de Bono 14 (Decreto 42-92).
 * Período legal: 1 de julio del año anterior al 30 de junio del año en curso (365 días).
 * Se paga en la primera quincena de julio de cada año.
 */
export function calculateBono14(
  employee: EmployeePayrollInput,
  calculationYear: number = 2026,
  asOfDateStr?: string
): BenefitCalculationResult {
  const periodStart = `${calculationYear - 1}-07-01`;
  const periodEnd = `${calculationYear}-06-30`;
  const calcDate = asOfDateStr || periodEnd;

  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);
  const currentCalc = new Date(calcDate);
  const effectiveEnd = currentCalc < pEnd ? currentCalc : pEnd;

  const hireDate = employee.hireDate
    ? new Date(employee.hireDate)
    : new Date(`${calculationYear - 1}-01-01`);

  // Fecha de inicio computable (la posterior entre inicio de período y fecha de contratación)
  const computationStart = hireDate > pStart ? hireDate : pStart;

  let daysWorked = 0;
  if (computationStart <= effectiveEnd) {
    const diffTime = effectiveEnd.getTime() - computationStart.getTime();
    daysWorked = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  if (daysWorked > 365) daysWorked = 365;
  if (daysWorked < 0) daysWorked = 0;

  const averageMonthlySalary = Math.round(employee.dailyRateGTQ * 30 * 100) / 100;
  const isFullYear = daysWorked >= 365;
  const proportionalFactor = daysWorked / 365;
  const amountToPayGTQ = Math.round((averageMonthlySalary / 365) * daysWorked * 100) / 100;

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    role: employee.role,
    dpi: employee.dpi || 'N/A',
    benefitType: 'bono_14',
    benefitName: 'Bonificación Anual para Trabajadores (Bono 14)',
    legalDecree: 'Decreto No. 42-92 del Congreso de la República de Guatemala',
    periodStart,
    periodEnd,
    calculationDate: calcDate,
    hireDate: employee.hireDate || 'N/A',
    averageMonthlySalary,
    daysInStatutoryPeriod: 365,
    daysWorkedInPeriod: daysWorked,
    isFullYear,
    proportionalFactor: Math.round(proportionalFactor * 10000) / 10000,
    amountToPayGTQ,
    isExemptIGSS: true,
    notes: isFullYear
      ? 'Año completo laborado (365 días). Equivale al 100% de un salario ordinario mensual.'
      : `Pago proporcional por ${daysWorked} días laborados de conformidad con el Artículo 2 del Decreto 42-92.`,
  };
}

/**
 * Calcula automáticamente la prestación de Aguinaldo (Decreto 76-78).
 * Período legal: 1 de diciembre del año anterior al 30 de noviembre del año en curso (365 días).
 * Se paga 50% en la primera quincena de diciembre y 50% en la segunda quincena de enero (o 100% en dic).
 */
export function calculateAguinaldo(
  employee: EmployeePayrollInput,
  calculationYear: number = 2026,
  asOfDateStr?: string
): BenefitCalculationResult {
  const periodStart = `${calculationYear - 1}-12-01`;
  const periodEnd = `${calculationYear}-11-30`;
  const calcDate = asOfDateStr || periodEnd;

  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);
  const currentCalc = new Date(calcDate);
  const effectiveEnd = currentCalc < pEnd ? currentCalc : pEnd;

  const hireDate = employee.hireDate
    ? new Date(employee.hireDate)
    : new Date(`${calculationYear - 1}-01-01`);

  const computationStart = hireDate > pStart ? hireDate : pStart;

  let daysWorked = 0;
  if (computationStart <= effectiveEnd) {
    const diffTime = effectiveEnd.getTime() - computationStart.getTime();
    daysWorked = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  if (daysWorked > 365) daysWorked = 365;
  if (daysWorked < 0) daysWorked = 0;

  const averageMonthlySalary = Math.round(employee.dailyRateGTQ * 30 * 100) / 100;
  const isFullYear = daysWorked >= 365;
  const proportionalFactor = daysWorked / 365;
  const amountToPayGTQ = Math.round((averageMonthlySalary / 365) * daysWorked * 100) / 100;

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    role: employee.role,
    dpi: employee.dpi || 'N/A',
    benefitType: 'aguinaldo',
    benefitName: 'Aguinaldo Navideño Regulado',
    legalDecree: 'Decreto No. 76-78 del Congreso de la República de Guatemala',
    periodStart,
    periodEnd,
    calculationDate: calcDate,
    hireDate: employee.hireDate || 'N/A',
    averageMonthlySalary,
    daysInStatutoryPeriod: 365,
    daysWorkedInPeriod: daysWorked,
    isFullYear,
    proportionalFactor: Math.round(proportionalFactor * 10000) / 10000,
    amountToPayGTQ,
    isExemptIGSS: true,
    notes: isFullYear
      ? 'Año completo laborado (365 días). Equivale al 100% de un salario ordinario mensual.'
      : `Pago proporcional por ${daysWorked} días computados según Artículo 2 del Decreto 76-78.`,
  };
}

/**
 * Calcula la indemnización por despido injustificado y finiquito laboral guatemalteco (Art. 82 Código de Trabajo).
 */
export function calculateLaborSettlement(
  employee: EmployeePayrollInput,
  terminationDateStr: string = '2026-10-31'
) {
  const hireDateStr = employee.hireDate || '2024-01-01';
  const hireDate = new Date(hireDateStr);
  const termDate = new Date(terminationDateStr);

  const diffTime = Math.max(0, termDate.getTime() - hireDate.getTime());
  const totalDaysWorked = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const yearsWorked = totalDaysWorked / 365;

  const averageMonthlySalary = Math.round(employee.dailyRateGTQ * 30 * 100) / 100;

  // Fórmula legal con factor 14/12 (salario ordinario devengado con Bono 14 y Aguinaldo incorporados)
  // Base diaria para indemnización = Salario Mensual * 14 / 12 / 365
  const indemnizacionDailyRate = (averageMonthlySalary * 14) / 12 / 365;
  const totalIndemnizacion = Math.round(indemnizacionDailyRate * totalDaysWorked * 100) / 100;

  // Prestaciones proporcionales a la fecha de despido
  const bono14Result = calculateBono14(employee, termDate.getFullYear(), terminationDateStr);
  const aguinaldoResult = calculateAguinaldo(employee, termDate.getFullYear(), terminationDateStr);

  // Vacaciones proporcionales no gozadas (15 días por cada 365 días)
  const vacationDays = Math.round(((totalDaysWorked % 365) / 365) * 15 * 10) / 10;
  const vacationAmount = Math.round(vacationDays * employee.dailyRateGTQ * 100) / 100;

  const totalFiniquito =
    Math.round(
      (totalIndemnizacion +
        bono14Result.amountToPayGTQ +
        aguinaldoResult.amountToPayGTQ +
        vacationAmount) *
        100
    ) / 100;

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    hireDate: hireDateStr,
    terminationDate: terminationDateStr,
    totalDaysWorked,
    yearsWorked: Math.round(yearsWorked * 100) / 100,
    averageMonthlySalary,
    totalIndemnizacion,
    bono14Proportional: bono14Result.amountToPayGTQ,
    bono14Days: bono14Result.daysWorkedInPeriod,
    aguinaldoProportional: aguinaldoResult.amountToPayGTQ,
    aguinaldoDays: aguinaldoResult.daysWorkedInPeriod,
    vacationDays,
    vacationAmount,
    totalFiniquito,
  };
}

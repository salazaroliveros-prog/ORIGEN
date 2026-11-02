/**
 * ORIGEN ERP - Payroll Management Component
 * Features:
 * - Sticky net pay column in payroll table (always visible on desktop/mobile)
 * - Bono 14 preview calculation (December calculation preview)
 * - Income tax (ISR 2024) calculation
 * - IGSS export validation
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Loader,
  DollarSign,
  AlertCircle,
  Download,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { COLORS } from '@/lib/design/constants';

interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  baseSalary: number;
  overtime: number;
  bonuses: number;
  grossSalary: number;
  igss: number;
  isr: number;
  netPay: number;
  month: string;
  year: number;
}

interface Employee {
  id: string;
  name: string;
  position: string;
  baseSalary: number;
}

export function PayrollView({ projectId }: { projectId: string }) {
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // FEATURE 3.2: Bono 14 preview state
  const [showBono14Preview, setShowBono14Preview] = useState(false);
  const [bono14Data, setBono14Data] = useState<PayrollRecord[]>([]);

  // Simulate data load
  useEffect(() => {
    const timer = setTimeout(() => {
      const mockEmployees: Employee[] = [
        {
          id: 'emp-1',
          name: 'Juan Pérez',
          position: 'Maestro Carpintero',
          baseSalary: 8000,
        },
        {
          id: 'emp-2',
          name: 'María García',
          position: 'Capataz',
          baseSalary: 10000,
        },
        {
          id: 'emp-3',
          name: 'Carlos López',
          position: 'Peón',
          baseSalary: 5500,
        },
      ];

      setEmployees(mockEmployees);

      // Generate payroll records for current month
      const records: PayrollRecord[] = mockEmployees.map(emp => {
        const grossSalary = emp.baseSalary + 1200; // Includes overtime/bonuses
        const igss = grossSalary * 0.0483; // 4.83% IGSS
        const isr = calculateISR2024(grossSalary - igss); // ISR on net
        const netPay = grossSalary - igss - isr;

        return {
          id: `payroll-${emp.id}-${currentMonth}-${currentYear}`,
          employeeId: emp.id,
          employeeName: emp.name,
          position: emp.position,
          baseSalary: emp.baseSalary,
          overtime: 800,
          bonuses: 400,
          grossSalary,
          igss,
          isr,
          netPay,
          month: new Date(2024, currentMonth - 1).toLocaleString('es-ES', { month: 'long' }),
          year: currentYear,
        };
      });

      setPayrollRecords(records);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentMonth, currentYear]);

  // FEATURE 3.1: ISR 2024 Calculation for Guatemala
  const calculateISR2024 = (taxableIncome: number): number => {
    // ISR 2024 Rates for Guatemala
    const ranges = [
      { min: 0, max: 6750, rate: 0, fixed: 0 },
      { min: 6750, max: 33750, rate: 0.15, fixed: 0 },
      { min: 33750, max: 65000, rate: 0.2, fixed: 4050 },
      { min: 65000, max: 120000, rate: 0.25, fixed: 10050 },
      { min: 120000, max: Infinity, rate: 0.27, fixed: 25050 },
    ];

    for (const range of ranges) {
      if (taxableIncome >= range.min && taxableIncome <= range.max) {
        if (taxableIncome <= 6750) return 0;
        return Math.round(((taxableIncome - range.min) * range.rate + range.fixed) * 100) / 100;
      }
    }

    return 0;
  };

  // FEATURE 3.2: Bono 14 Calculation (December preview)
  const calculateBono14Preview = () => {
    const bono14Records: PayrollRecord[] = employees.map(emp => {
      // Bono 14 = (salario base * meses trabajados) / 12
      // Para preview, asumimos 12 meses trabajados
      const bono14Amount = emp.baseSalary; // One month salary
      const igss = bono14Amount * 0.0483;
      const isr = calculateISR2024(bono14Amount - igss);
      const netPay = bono14Amount - igss - isr;

      return {
        id: `bono14-${emp.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        position: emp.position,
        baseSalary: emp.baseSalary,
        overtime: 0,
        bonuses: bono14Amount,
        grossSalary: bono14Amount,
        igss,
        isr,
        netPay,
        month: 'Bono 14 (Diciembre)',
        year: currentYear,
      };
    });

    setBono14Data(bono14Records);
    setShowBono14Preview(true);
  };

  // FEATURE 3.1: IGSS Export Validation
  const validateIGSSExport = (records: PayrollRecord[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    records.forEach(record => {
      if (!record.employeeId) errors.push(`${record.employeeName}: Falta ID empleado`);
      if (record.igss <= 0) errors.push(`${record.employeeName}: IGSS inválido`);
      if (record.grossSalary <= 0) errors.push(`${record.employeeName}: Salario bruto inválido`);
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  // Export IGSS
  const handleExportIGSS = () => {
    const validation = validateIGSSExport(payrollRecords);

    if (!validation.valid) {
      toast.error(`Errores en validación: ${validation.errors.length}`);
      return;
    }

    const csv = [
      ['ID Empleado', 'Nombre', 'Salario Bruto', 'IGSS (4.83%)', 'ISR', 'Neto', 'Mes', 'Año'],
      ...payrollRecords.map(record => [
        record.employeeId,
        record.employeeName,
        record.grossSalary.toFixed(2),
        record.igss.toFixed(2),
        record.isr.toFixed(2),
        record.netPay.toFixed(2),
        record.month,
        record.year,
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `IGSS_${currentYear}_${String(currentMonth).padStart(2, '0')}.csv`;
    link.click();

    toast.success('Archivo IGSS exportado');
  };

  const monthlyRecords = useMemo(
    () => payrollRecords.filter(p => p.month === new Date(2024, currentMonth - 1).toLocaleString('es-ES', { month: 'long' })),
    [payrollRecords, currentMonth]
  );

  const totalGross = useMemo(() => monthlyRecords.reduce((sum, r) => sum + r.grossSalary, 0), [monthlyRecords]);
  const totalIGSS = useMemo(() => monthlyRecords.reduce((sum, r) => sum + r.igss, 0), [monthlyRecords]);
  const totalISR = useMemo(() => monthlyRecords.reduce((sum, r) => sum + r.isr, 0), [monthlyRecords]);
  const totalNet = useMemo(() => monthlyRecords.reduce((sum, r) => sum + r.netPay, 0), [monthlyRecords]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center gap-2 text-slate-600">
          <Loader className="h-5 w-5 animate-spin" />
          <span>Cargando nómina...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-slate-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Nómina</h1>
          <p className="text-sm text-slate-600 mt-1">Total empleados: {employees.length}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={calculateBono14Preview}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <DollarSign className="h-5 w-5" />
            <span className="hidden sm:inline">Bono 14</span>
          </button>
          <button
            onClick={handleExportIGSS}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Download className="h-5 w-5" />
            <span className="hidden sm:inline">Exportar IGSS</span>
          </button>
        </div>
      </div>

      {/* Month/Year Selector */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div>
            <label className="text-sm font-medium text-slate-700">Mes/Año:</label>
            <div className="flex gap-2 mt-2">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i).toLocaleString('es-ES', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={currentYear - 1}>{currentYear - 1}</option>
                <option value={currentYear}>{currentYear}</option>
                <option value={currentYear + 1}>{currentYear + 1}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bono 14 Preview Modal - FEATURE 3.2 */}
      {showBono14Preview && bono14Data.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg overflow-hidden max-w-4xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-purple-50 border-b border-slate-200 p-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Vista Previa - Bono 14 Diciembre {currentYear}</h3>
              <button
                onClick={() => setShowBono14Preview(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Empleado</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700">Bono 14</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700">IGSS</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700">ISR</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700 bg-blue-100">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {bono14Data.map(record => (
                    <tr key={record.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3">{record.employeeName}</td>
                      <td className="px-4 py-3 text-right">Q{record.grossSalary.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">Q{record.igss.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">Q{record.isr.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold bg-blue-50">
                        Q{record.netPay.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td className="px-4 py-3">TOTAL</td>
                    <td className="px-4 py-3 text-right">Q{bono14Data.reduce((s, r) => s + r.grossSalary, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">Q{bono14Data.reduce((s, r) => s + r.igss, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">Q{bono14Data.reduce((s, r) => s + r.isr, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right bg-blue-100">
                      Q{bono14Data.reduce((s, r) => s + r.netPay, 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards - FIXED: Improved spacing gap-6 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-600 font-semibold">Salario Bruto</p>
          <p className="text-2xl font-bold text-slate-900">Q{totalGross.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-600 font-semibold">IGSS (4.83%)</p>
          <p className="text-2xl font-bold text-orange-600">Q{totalIGSS.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-600 font-semibold">ISR 2024</p>
          <p className="text-2xl font-bold text-red-600">Q{totalISR.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 shadow-sm">
          <p className="text-xs text-blue-700 font-semibold">Total Neto</p>
          <p className="text-2xl font-bold text-blue-900">Q{totalNet.toLocaleString()}</p>
        </div>
      </div>

      {/* Payroll Table - FEATURE 3.1: Sticky Net Pay Column */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Empleado</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Base</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Overtime</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Bonos</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Bruto</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">IGSS</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">ISR</th>
                {/* FEATURE 3.1: Sticky Net Pay */}
                <th className="sticky right-0 text-right px-4 py-3 font-semibold text-slate-700 bg-blue-100 z-10">
                  Neto
                </th>
              </tr>
            </thead>
            <tbody>
              {monthlyRecords.map(record => (
                <tr key={record.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{record.employeeName}</td>
                  <td className="px-4 py-3 text-right">Q{record.baseSalary.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-600">Q{record.overtime.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-600">Q{record.bonuses.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold">Q{record.grossSalary.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-orange-600">-Q{record.igss.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-600">-Q{record.isr.toLocaleString()}</td>
                  {/* FEATURE 3.1: Sticky Net Pay Column */}
                  <td className="sticky right-0 px-4 py-3 text-right font-bold text-blue-900 bg-blue-50">
                    Q{record.netPay.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold">
                <td className="px-4 py-3">TOTAL</td>
                <td className="px-4 py-3 text-right">Q{monthlyRecords.reduce((s, r) => s + r.baseSalary, 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-green-600">Q{monthlyRecords.reduce((s, r) => s + r.overtime, 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-green-600">Q{monthlyRecords.reduce((s, r) => s + r.bonuses, 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">Q{totalGross.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-orange-600">-Q{totalIGSS.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-red-600">-Q{totalISR.toLocaleString()}</td>
                {/* FEATURE 3.1: Sticky Total Net Pay */}
                <td className="sticky right-0 px-4 py-3 text-right bg-blue-100">
                  Q{totalNet.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ISR 2024 Info */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">ISR 2024 - Guatemala</p>
            <p className="text-sm text-blue-800 mt-1">
              Cálculos aplicados según tasas vigentes. Q0-Q6,750 exento | Q6,750-Q33,750: 15% | Q33,750-Q65,000: 20% | Q65,000-Q120,000: 25% | Arriba de Q120,000: 27%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PayrollView;

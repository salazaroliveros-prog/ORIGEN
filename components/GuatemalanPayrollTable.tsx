'use client';

import React, { useState, useMemo } from 'react';
import {
  Banknote,
  Search,
  Filter,
  Download,
  Printer,
  FileText,
  Clock,
  ShieldCheck,
  Award,
  ChevronDown,
  DollarSign,
  Users,
  Building,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpDown,
  FileSpreadsheet,
  X,
  FileCheck,
  Info,
} from 'lucide-react';
import { Employee, CompanySettings, AttendanceRecord } from '@/lib/types';
import { formatGTQ, initialCompanySettings } from '@/lib/data';
import {
  calculateEmployeePayroll,
  EmployeePayrollCalculation,
  EmployeePayrollInput,
  PayrollFrequency,
  STATUTORY_RATES,
} from '@/lib/guatemalanPayroll';
import { exportPayrollAccountingPdf } from '@/lib/payrollPdfService';

export interface GuatemalanPayrollTableProps {
  employees: Employee[];
  company?: CompanySettings;
  attendance?: AttendanceRecord[];
  initialFrequency?: PayrollFrequency;
  onSelectEmployeeVoucher?: (employeeId: string) => void;
  onEditEmployee?: (employee: EmployeePayrollCalculation) => void;
}

export const GuatemalanPayrollTable: React.FC<GuatemalanPayrollTableProps> = ({
  employees,
  company = initialCompanySettings,
  attendance = [],
  initialFrequency = 'quincenal',
  onSelectEmployeeVoucher,
  onEditEmployee,
}) => {
  // Frequency & Period state
  const [frequency, setFrequency] = useState<PayrollFrequency>(initialFrequency);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1ra Quincena Octubre 2026 (01 al 15 Oct)');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<'name' | 'liquido' | 'igss'>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState<boolean>(false);

  // Available specific payment date ranges based on frequency
  const periodOptions = useMemo(() => {
    if (frequency === 'quincenal') {
      return [
        { label: '1ra Quincena Octubre 2026 (01 al 15 Oct)', range: '01/10/2026 - 15/10/2026' },
        { label: '2da Quincena Octubre 2026 (16 al 31 Oct)', range: '16/10/2026 - 31/10/2026' },
        { label: '1ra Quincena Noviembre 2026 (01 al 15 Nov)', range: '01/11/2026 - 15/11/2026' },
        { label: '2da Quincena Noviembre 2026 (16 al 30 Nov)', range: '16/11/2026 - 30/11/2026' },
        { label: '1ra Quincena Diciembre 2026 (01 al 15 Dic - 50% Aguinaldo)', range: '01/12/2026 - 15/12/2026' },
        { label: '2da Quincena Diciembre 2026 (16 al 31 Dic)', range: '16/12/2026 - 31/12/2026' },
        { label: '1ra Quincena Enero 2027 (01 al 15 Ene - 50% Aguinaldo Restante)', range: '01/01/2027 - 15/01/2027' },
      ];
    }
    return [
      { label: 'Mes Completo Octubre 2026 (01 al 31 Oct)', range: '01/10/2026 - 31/10/2026' },
      { label: 'Mes Completo Noviembre 2026 (01 al 30 Nov)', range: '01/11/2026 - 30/11/2026' },
      { label: 'Mes Completo Diciembre 2026 (01 al 31 Dic)', range: '01/12/2026 - 31/12/2026' },
      { label: 'Mes Completo Julio 2026 (Pago Bono 14 Dto. 42-92)', range: '01/07/2026 - 31/07/2026' },
      { label: 'Mes Completo Enero 2027 (01 al 31 Ene)', range: '01/01/2027 - 31/01/2027' },
    ];
  }, [frequency]);

  // Current active date range string
  const currentDateRange = useMemo(() => {
    const found = periodOptions.find((p) => p.label === selectedPeriod);
    return found ? found.range : '01/10/2026 - 15/10/2026';
  }, [periodOptions, selectedPeriod]);

  // Handle frequency toggle
  const handleFrequencyChange = (newFreq: PayrollFrequency) => {
    setFrequency(newFreq);
    if (newFreq === 'quincenal') {
      setSelectedPeriod('1ra Quincena Octubre 2026 (01 al 15 Oct)');
    } else {
      setSelectedPeriod('Mes Completo Octubre 2026 (01 al 31 Oct)');
    }
  };

  // Compute calculations for all employees
  const calculations = useMemo<EmployeePayrollCalculation[]>(() => {
    const defaultDays = frequency === 'quincenal' ? 15 : 30;

    return employees.map((emp) => {
      // Sum any overtime from attendance records
      const empAttendance = attendance.filter((a) => a.employeeId === emp.id);
      const overtimeHours = empAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

      const input: EmployeePayrollInput = {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        dailyRateGTQ: emp.dailyRateGTQ,
        igssAffiliated: emp.igssAffiliated,
        dpi: emp.dpi,
        igssNumber: emp.igssNumber,
        hireDate: emp.hireDate,
        frequency,
        daysWorked: defaultDays,
        overtimeHours,
        customBonoIncentivo: emp.customBonoIncentivo,
      };

      return calculateEmployeePayroll(input);
    });
  }, [employees, frequency, attendance]);

  // Unique roles for filter dropdown
  const uniqueRoles = useMemo(() => {
    const roles = Array.from(new Set(employees.map((e) => e.role)));
    return roles.sort();
  }, [employees]);

  // Filtered and sorted calculations
  const filteredCalculations = useMemo(() => {
    let list = [...calculations];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.employeeName.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q) ||
          c.dpi.includes(q) ||
          c.igssNumber.toLowerCase().includes(q)
      );
    }

    if (roleFilter !== 'todos') {
      list = list.filter((c) => c.role === roleFilter);
    }

    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.employeeName.localeCompare(b.employeeName);
      } else if (sortBy === 'liquido') {
        comparison = a.salarioLiquido - b.salarioLiquido;
      } else if (sortBy === 'igss') {
        comparison = a.igssLaboral - b.igssLaboral;
      }
      return sortAsc ? comparison : -comparison;
    });

    return list;
  }, [calculations, searchQuery, roleFilter, sortBy, sortAsc]);

  // Summary row totals for the current period
  const totals = useMemo(() => {
    return filteredCalculations.reduce(
      (acc, c) => {
        acc.baseSalary += c.baseSalary;
        acc.overtimeAmount += c.overtimeAmount;
        acc.salarioAfectoIGSS += c.salarioAfectoIGSS;
        acc.bonoIncentivo += c.bonoIncentivo;
        acc.totalDevengado += c.totalDevengado;
        acc.igssLaboral += c.igssLaboral;
        acc.otherDeductions += c.otherDeductions;
        acc.totalDeducciones += c.totalDeducciones;
        acc.salarioLiquido += c.salarioLiquido;
        acc.provisionBono14 += c.provisionBono14;
        acc.provisionAguinaldo += c.provisionAguinaldo;
        acc.igssPatronalTotal += c.igssPatronalTotal;
        acc.costoTotalPatrono += c.costoTotalPatrono;
        return acc;
      },
      {
        baseSalary: 0,
        overtimeAmount: 0,
        salarioAfectoIGSS: 0,
        bonoIncentivo: 0,
        totalDevengado: 0,
        igssLaboral: 0,
        otherDeductions: 0,
        totalDeducciones: 0,
        salarioLiquido: 0,
        provisionBono14: 0,
        provisionAguinaldo: 0,
        igssPatronalTotal: 0,
        costoTotalPatrono: 0,
      }
    );
  }, [filteredCalculations]);

  // Toggle sorting
  const handleSort = (field: 'name' | 'liquido' | 'igss') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  // Export PDF function for the accountant
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportPayrollAccountingPdf({
        company,
        periodLabel: selectedPeriod,
        frequencyLabel: frequency === 'quincenal' ? 'Quincenal (15 Días)' : 'Mensual (30 Días)',
        dateRangeLabel: currentDateRange,
        calculations: filteredCalculations,
        totals,
      });
    } catch (err) {
      console.error('Error al exportar PDF contable:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export current table view as CSV
  const handleExportCSV = () => {
    const headers = [
      'Colaborador',
      'Puesto',
      'DPI',
      'No. Afiliación IGSS',
      'Frecuencia',
      'Días',
      'Salario Diario (GTQ)',
      'Salario Base (GTQ)',
      'Horas Extra',
      'Monto Horas Extra (GTQ)',
      'Materia Afecta IGSS (GTQ)',
      'Bono Incentivo Dto. 37-2001 (GTQ)',
      'Total Devengado (GTQ)',
      'IGSS Laboral 4.83% (GTQ)',
      'Provisión Bono 14 Dto 42-92 (GTQ)',
      'Provisión Aguinaldo Dto 76-78 (GTQ)',
      'Líquido a Pagar (GTQ)',
      'IGSS Patronal 12.67% (GTQ)',
      'Costo Total Empleador (GTQ)',
    ];

    const rows = filteredCalculations.map((c) => [
      `"${c.employeeName}"`,
      `"${c.role}"`,
      `"${c.dpi}"`,
      `"${c.igssNumber}"`,
      c.frequency,
      c.daysWorked,
      c.dailyRateGTQ.toFixed(2),
      c.baseSalary.toFixed(2),
      c.overtimeHours,
      c.overtimeAmount.toFixed(2),
      c.salarioAfectoIGSS.toFixed(2),
      c.bonoIncentivo.toFixed(2),
      c.totalDevengado.toFixed(2),
      c.igssLaboral.toFixed(2),
      c.provisionBono14.toFixed(2),
      c.provisionAguinaldo.toFixed(2),
      c.salarioLiquido.toFixed(2),
      c.igssPatronalTotal.toFixed(2),
      c.costoTotalPatrono.toFixed(2),
    ]);

    // Append totals row
    rows.push([
      `"TOTAL PLANILLA (${filteredCalculations.length} EMPLEADOS)"`,
      '""',
      '""',
      '""',
      frequency,
      '""',
      '""',
      totals.baseSalary.toFixed(2),
      '""',
      totals.overtimeAmount.toFixed(2),
      totals.salarioAfectoIGSS.toFixed(2),
      totals.bonoIncentivo.toFixed(2),
      totals.totalDevengado.toFixed(2),
      totals.igssLaboral.toFixed(2),
      totals.provisionBono14.toFixed(2),
      totals.provisionAguinaldo.toFixed(2),
      totals.salarioLiquido.toFixed(2),
      totals.igssPatronalTotal.toFixed(2),
      totals.costoTotalPatrono.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Planilla_Empleados_Calculos_${frequency}_${selectedPeriod.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Control bar: Period, Frequency, Search & Filter tools */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Frequency & Period Selectors */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center flex-wrap gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleFrequencyChange('quincenal')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  frequency === 'quincenal'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Quincenal (15 días)
              </button>
              <button
                type="button"
                onClick={() => handleFrequencyChange('mensual')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  frequency === 'mensual'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Mensual (30 días)
              </button>
            </div>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {/* Period Selector Dropdown */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Período de Pago:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full sm:w-auto text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                {periodOptions.map((opt) => (
                  <option key={opt.label} value={opt.label}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Export Controls for Accountant */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition shadow-xs cursor-pointer disabled:opacity-50"
              title="Descargar reporte en formato PDF listo para auditoría y firma de contador"
            >
              <FileText className="w-3.5 h-3.5" />
              {isExportingPdf ? 'Generando PDF...' : 'Exportar PDF Contable'}
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              title="Descargar tabla y totales a Excel/CSV"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>

            <button
              type="button"
              onClick={() => setShowPdfPreviewModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Vista Previa
            </button>
          </div>
        </div>

        {/* Search Bar & Role Filter */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nombre de empleado, DPI, puesto o IGSS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-7 py-1.5 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
              Filtrar Puesto:
            </span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-medium text-slate-700 cursor-pointer"
            >
              <option value="todos">Todos los puestos ({employees.length})</option>
              {uniqueRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full font-mono">
              {filteredCalculations.length} de {employees.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Table Header Banner */}
        <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-blue-600" />
              Planilla de Sueldos y Retenciones Estatutarias — Guatemala
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Período Seleccionado: <strong className="text-slate-800">{selectedPeriod}</strong> (Rango: <span className="font-mono">{currentDateRange}</span>)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 px-3 py-1 rounded-full font-mono">
              Líquido Total: {formatGTQ(totals.salarioLiquido)}
            </span>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200 text-[11px]">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="p-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200 transition select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Nombre de Empleado / Cargo</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3 text-center border-r border-slate-200">Días</th>
                <th className="p-3 text-right border-r border-slate-200">Salario Diario</th>
                <th className="p-3 text-right border-r border-slate-200">Sueldo Base</th>
                <th className="p-3 text-right border-r border-slate-200 text-sky-700">Horas Extra (1.5x)</th>
                <th className="p-3 text-right border-r border-slate-200 text-blue-800 bg-blue-50/40 font-extrabold">
                  Afecto IGSS
                </th>
                <th className="p-3 text-right border-r border-slate-200 text-emerald-700">
                  <div>Bono Dto. 37-2001</div>
                  <div className="text-[9px] font-normal normal-case text-emerald-600">Q250m / Q125q</div>
                </th>
                <th
                  onClick={() => handleSort('igss')}
                  className="p-3 text-right border-r border-slate-200 text-rose-700 font-black bg-rose-50/50 cursor-pointer hover:bg-rose-100/50 transition select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>IGSS Lab. (4.83%)</span>
                    <ArrowUpDown className="w-3 h-3 text-rose-400" />
                  </div>
                </th>
                <th className="p-3 text-right border-r border-slate-200 text-amber-800">
                  <div>Provisión Bono 14</div>
                  <div className="text-[9px] font-normal normal-case text-amber-600">Dto. 42-92 (8.33%)</div>
                </th>
                <th className="p-3 text-right border-r border-slate-200 text-amber-800">
                  <div>Provisión Aguinaldo</div>
                  <div className="text-[9px] font-normal normal-case text-amber-600">Dto. 76-78 (8.33%)</div>
                </th>
                <th
                  onClick={() => handleSort('liquido')}
                  className="p-3 text-right border-r border-slate-200 text-emerald-900 font-black bg-emerald-100/60 cursor-pointer hover:bg-emerald-200/60 transition select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Líquido a Recibir</span>
                    <ArrowUpDown className="w-3 h-3 text-emerald-700" />
                  </div>
                </th>
                <th className="p-3 text-right border-r border-slate-200 text-blue-700">
                  <div>IGSS Pat. (12.67%)</div>
                  <div className="text-[9px] font-normal normal-case text-blue-500">IGSS+IRTRA+INTECAP</div>
                </th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCalculations.map((c) => (
                <tr key={c.employeeId} className="hover:bg-slate-50/90 transition group">
                  {/* Colaborador info */}
                  <td className="p-3 border-r border-slate-200">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{c.employeeName}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                        {c.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono">DPI: {c.dpi}</span>
                      <span>•</span>
                      <span className="font-mono text-blue-600">IGSS: {c.igssNumber}</span>
                    </div>
                  </td>

                  {/* Días */}
                  <td className="p-3 text-center border-r border-slate-200 font-mono font-medium">
                    {c.daysWorked}d
                  </td>

                  {/* Salario Diario */}
                  <td className="p-3 text-right border-r border-slate-200 font-mono text-slate-600">
                    {formatGTQ(c.dailyRateGTQ)}
                  </td>

                  {/* Sueldo Base */}
                  <td className="p-3 text-right border-r border-slate-200 font-mono font-semibold text-slate-800">
                    {formatGTQ(c.baseSalary)}
                  </td>

                  {/* Horas Extra */}
                  <td className="p-3 text-right border-r border-slate-200 font-mono">
                    {c.overtimeHours > 0 ? (
                      <div>
                        <span className="font-bold text-sky-700">{c.overtimeHours}h</span>
                        <div className="text-[10px] text-slate-400">{formatGTQ(c.overtimeAmount)}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400">0h (Q0.00)</span>
                    )}
                  </td>

                  {/* Materia imponible IGSS */}
                  <td className="p-3 text-right border-r border-slate-200 font-mono font-bold text-blue-900 bg-blue-50/20">
                    {formatGTQ(c.salarioAfectoIGSS)}
                  </td>

                  {/* Bonificación Dto. 37-2001 */}
                  <td className="p-3 text-right border-r border-slate-200 font-mono font-medium text-emerald-700">
                    {formatGTQ(c.bonoIncentivo)}
                  </td>

                  {/* IGSS Laboral 4.83% */}
                  <td className="p-3 text-right border-r border-slate-200 font-mono font-black text-rose-600 bg-rose-50/40">
                    -{formatGTQ(c.igssLaboral)}
                  </td>

                  {/* Provisión Bono 14 */}
                  <td className="p-3 text-right border-r border-slate-200 font-mono text-amber-700 bg-amber-50/20">
                    {formatGTQ(c.provisionBono14)}
                  </td>

                  {/* Provisión Aguinaldo */}
                  <td className="p-3 text-right border-r border-slate-200 font-mono text-amber-700 bg-amber-50/20">
                    {formatGTQ(c.provisionAguinaldo)}
                  </td>

                  {/* Líquido a Pagar */}
                  <td className="p-3 text-right border-r border-slate-200 font-mono font-black text-emerald-800 bg-emerald-100/50 text-[13px]">
                    {formatGTQ(c.salarioLiquido)}
                  </td>

                  {/* Cuota Patronal IGSS */}
                  <td className="p-3 text-right border-r border-slate-200 font-mono text-blue-700">
                    {formatGTQ(c.igssPatronalTotal)}
                  </td>

                  {/* Acciones */}
                  <td className="p-3 text-center whitespace-nowrap space-x-1">
                    <button
                      type="button"
                      onClick={() => onSelectEmployeeVoucher && onSelectEmployeeVoucher(c.employeeId)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition cursor-pointer"
                      title="Ver boleta oficial de pago"
                    >
                      <FileText className="w-3 h-3" /> Boleta
                    </button>
                    {onEditEmployee && (
                      <button
                        type="button"
                        onClick={() => onEditEmployee(c)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition cursor-pointer"
                        title="Ajustar valores de la quincena"
                      >
                        Ajustar
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {filteredCalculations.length === 0 && (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    No se encontraron colaboradores que coincidan con la búsqueda &quot;{searchQuery}&quot;.
                  </td>
                </tr>
              )}
            </tbody>

            {/* ======================================================== */}
            {/* FILA DE RESUMEN TOTAL PARA LA QUINCENA O MES ACTUAL */}
            {/* ======================================================== */}
            <tfoot className="bg-slate-100 text-slate-900 border-t-2 border-slate-300">
              <tr className="border-b border-slate-300 bg-slate-200/90 font-black text-[12px]">
                <td className="p-3.5 border-r border-slate-300 uppercase tracking-wider text-slate-900" colSpan={3}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span>TOTAL GENERAL ({filteredCalculations.length} COLABORADORES)</span>
                  </div>
                  <div className="text-[10px] font-normal normal-case text-slate-600 mt-0.5">
                    Resumen acumulado para: <strong>{selectedPeriod}</strong>
                  </div>
                </td>

                {/* Total Sueldo Base */}
                <td className="p-3 text-right border-r border-slate-300 font-mono font-black text-slate-900">
                  {formatGTQ(totals.baseSalary)}
                </td>

                {/* Total Horas Extra */}
                <td className="p-3 text-right border-r border-slate-300 font-mono font-black text-sky-800">
                  {formatGTQ(totals.overtimeAmount)}
                </td>

                {/* Total Base Afecta IGSS */}
                <td className="p-3 text-right border-r border-slate-300 font-mono font-black text-blue-900 bg-blue-100/50">
                  {formatGTQ(totals.salarioAfectoIGSS)}
                </td>

                {/* Total Bonificación Incentivo */}
                <td className="p-3 text-right border-r border-slate-300 font-mono font-black text-emerald-800">
                  {formatGTQ(totals.bonoIncentivo)}
                </td>

                {/* Total Retención IGSS Laboral 4.83% */}
                <td className="p-3 text-right border-r border-slate-300 font-mono font-black text-rose-700 bg-rose-100/60">
                  -{formatGTQ(totals.igssLaboral)}
                </td>

                {/* Total Provisión Bono 14 */}
                <td className="p-3 text-right border-r border-slate-300 font-mono font-bold text-amber-900 bg-amber-100/40">
                  {formatGTQ(totals.provisionBono14)}
                </td>

                {/* Total Provisión Aguinaldo */}
                <td className="p-3 text-right border-r border-slate-300 font-mono font-bold text-amber-900 bg-amber-100/40">
                  {formatGTQ(totals.provisionAguinaldo)}
                </td>

                {/* TOTAL LÍQUIDO A PAGAR (DESTACADO) */}
                <td className="p-3 text-right border-r border-slate-300 font-mono font-black text-emerald-950 bg-emerald-200/70 text-sm">
                  <div className="text-[9px] uppercase tracking-wider text-emerald-800 font-sans font-bold">
                    Líquido Total
                  </div>
                  {formatGTQ(totals.salarioLiquido)}
                </td>

                {/* Total Cuota Patronal IGSS 12.67% */}
                <td className="p-3 text-right border-r border-slate-300 font-mono font-bold text-blue-900">
                  {formatGTQ(totals.igssPatronalTotal)}
                </td>

                {/* Acciones spacer */}
                <td className="p-3 text-center font-sans text-[10px] text-slate-500 font-bold">
                  {frequency.toUpperCase()}
                </td>
              </tr>

              {/* Sub-row with summary breakdown */}
              <tr className="bg-slate-100 text-slate-600 text-[11px]">
                <td colSpan={13} className="p-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span>
                        <strong>Deducción IGSS 4.83%:</strong>{' '}
                        <span className="font-mono text-rose-700 font-bold">
                          {formatGTQ(totals.igssLaboral)}
                        </span>
                      </span>
                      <span>•</span>
                      <span>
                        <strong>Bono Decreto 37-2001:</strong>{' '}
                        <span className="font-mono text-emerald-700 font-bold">
                          {formatGTQ(totals.bonoIncentivo)}
                        </span>
                      </span>
                      <span>•</span>
                      <span>
                        <strong>Provisiones Mensuales (Bono 14 + Aguinaldo):</strong>{' '}
                        <span className="font-mono text-amber-800 font-bold">
                          {formatGTQ(totals.provisionBono14 + totals.provisionAguinaldo)}
                        </span>
                      </span>
                      <span>•</span>
                      <span>
                        <strong>Aporte Patronal IGSS (12.67%):</strong>{' '}
                        <span className="font-mono text-blue-700 font-bold">
                          {formatGTQ(totals.igssPatronalTotal)}
                        </span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-800">
                        Costo Total Patronal del Período:{' '}
                      </span>
                      <strong className="text-slate-900 font-mono font-black text-xs">
                        {formatGTQ(totals.costoTotalPatrono)}
                      </strong>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: VISTA PREVIA CONTABLE PDF / IMPRESIÓN */}
      {/* ======================================================== */}
      {showPdfPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-8">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Vista Previa de Informe Contable PDF — Planilla & Prestaciones
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Período: {selectedPeriod} ({currentDateRange})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfPreviewModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-sans">
              {/* Document Printable Header */}
              <div className="border border-slate-300 p-4 bg-slate-50 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">{company.commercialName}</h4>
                    <p className="text-xs text-slate-600">
                      NIT: {company.nit} • No. Patronal IGSS: 08-94102-3 • {company.address}
                    </p>
                    <p className="text-xs font-bold text-amber-700 mt-1">
                      INFORME OFICIAL PARA AUDITORÍA CONTABLE / SAT / IGSS
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-md inline-block">
                      FRECUENCIA: {frequency.toUpperCase()}
                    </span>
                    <p className="text-xs text-slate-600 mt-1 font-bold">{selectedPeriod}</p>
                    <p className="text-[11px] text-slate-500 font-mono">Fechas: {currentDateRange}</p>
                  </div>
                </div>
              </div>

              {/* Legal Reference Table */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <p className="font-bold text-slate-900 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-blue-600" /> Marco Legal y Tasas Aplicadas:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div>• IGSS Laboral: <strong>4.83%</strong> (Acuerdo 1118 JD IGSS)</div>
                  <div>• IGSS Patronal: <strong>12.67%</strong> (10.67% IGSS + 1% IRTRA + 1% INTECAP)</div>
                  <div>• Bonificación Incentivo: <strong>Q250.00 mensual / Q125.00 quincenal</strong> (Dto. 37-2001)</div>
                  <div>• Provisiones Mensuales: <strong>Bono 14 (8.33%)</strong> y <strong>Aguinaldo (8.33%)</strong></div>
                </div>
              </div>

              {/* Summary Totals Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-800 text-white font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Materia Imponible</th>
                      <th className="p-2.5 text-right">Sueldo Base Total</th>
                      <th className="p-2.5 text-right">Horas Extra (1.5x)</th>
                      <th className="p-2.5 text-right text-emerald-300">Bono Dto. 37-2001</th>
                      <th className="p-2.5 text-right text-rose-300">Retención IGSS 4.83%</th>
                      <th className="p-2.5 text-right text-amber-300">Prov. Bono 14 & Aguin.</th>
                      <th className="p-2.5 text-right font-black text-emerald-400">Total Líquido Pagar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-slate-50 font-mono text-slate-800 font-bold">
                    <tr>
                      <td className="p-2.5 font-sans font-extrabold text-slate-900">
                        Sumatoria ({filteredCalculations.length} Colaboradores)
                      </td>
                      <td className="p-2.5 text-right">{formatGTQ(totals.baseSalary)}</td>
                      <td className="p-2.5 text-right text-sky-700">{formatGTQ(totals.overtimeAmount)}</td>
                      <td className="p-2.5 text-right text-emerald-700">{formatGTQ(totals.bonoIncentivo)}</td>
                      <td className="p-2.5 text-right text-rose-600">-{formatGTQ(totals.igssLaboral)}</td>
                      <td className="p-2.5 text-right text-amber-800">
                        {formatGTQ(totals.provisionBono14 + totals.provisionAguinaldo)}
                      </td>
                      <td className="p-2.5 text-right text-emerald-800 font-black text-sm bg-emerald-100/80">
                        {formatGTQ(totals.salarioLiquido)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signature Blocks */}
              <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-900">Contador General / Nóminas</p>
                  <p className="text-[10px] text-slate-500">Reg. SAT / Colegiado Activo</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-900">Gerente de Recursos Humanos</p>
                  <p className="text-[10px] text-slate-500">Conformidad de Asistencia</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-900">Representante Legal / Dirección</p>
                  <p className="text-[10px] text-slate-500">{company.commercialName}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPdfPreviewModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPdfPreviewModal(false);
                  handleExportPdf();
                }}
                disabled={isExportingPdf}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                {isExportingPdf ? 'Descargando...' : 'Descargar Archivo PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuatemalanPayrollTable;

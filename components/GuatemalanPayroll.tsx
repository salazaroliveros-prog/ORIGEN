'use client';

import { formatGTQ } from '@/lib/data';
import { AttendanceRecord, CompanySettings, Employee } from '@/lib/types';
import {
  Award,
  Banknote,
  Building,
  CheckCircle2,
  Download,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import React, { useState } from 'react';
import { GuatemalanPayrollValidator } from './GuatemalanPayrollValidator';

interface GuatemalanPayrollProps {
  employees: Employee[];
  company: CompanySettings;
  attendance?: AttendanceRecord[];
  onUpdateEmployees?: (updated: Employee[]) => void;
}

export function GuatemalanPayroll({
  employees,
  company,
  attendance = [],
  onUpdateEmployees,
}: GuatemalanPayrollProps) {
  const [viewMode, setViewMode] = useState<'validador' | 'summary_prestaciones' | 'regular'>(
    'validador'
  );
  const [selectedMonth, setSelectedMonth] = useState<string>('Septiembre 2026');

  // Statutory calculation helpers for Guatemalan Labor Code
  const getPayrollBreakdown = (emp: Employee) => {
    const baseMonthly = emp.dailyRateGTQ * 30;
    const bonoIncentivo = 250.0; // Dto. 37-2001 (Q250 fijos exentos de IGSS)
    const igssLaboral = baseMonthly * 0.0483; // 4.83% deducible del colaborador
    const igssPatronal = baseMonthly * 0.1067; // 10.67% IGSS empleador
    const irtraIntecap = baseMonthly * 0.02; // 1% IRTRA + 1% INTECAP
    const igssPatronalTotal = igssPatronal + irtraIntecap; // 12.67% cuota patronal total

    // Provisión mensual de prestaciones (8.33% cada una = 1 salario ordinario al año)
    const provisionBono14 = baseMonthly * 0.08333; // Dto. 42-92 (Julio)
    const provisionAguinaldo = baseMonthly * 0.08333; // Dto. 76-78 (Diciembre)
    const provisionIndemnizacion = baseMonthly * 0.08333; // Art. 82 Código de Trabajo
    const provisionVacaciones = baseMonthly * 0.04167; // 15 días hábiles

    const liquidoPagar = baseMonthly + bonoIncentivo - igssLaboral;
    const costoTotalPatron =
      baseMonthly + bonoIncentivo + igssPatronalTotal + provisionBono14 + provisionAguinaldo;

    return {
      baseMonthly,
      bonoIncentivo,
      igssLaboral,
      igssPatronal,
      irtraIntecap,
      igssPatronalTotal,
      provisionBono14,
      provisionAguinaldo,
      provisionIndemnizacion,
      provisionVacaciones,
      liquidoPagar,
      costoTotalPatron,
      anualBono14: baseMonthly,
      anualAguinaldo: baseMonthly,
    };
  };

  // Totals calculations
  const totals = employees.reduce(
    (acc, emp) => {
      const b = getPayrollBreakdown(emp);
      acc.base += b.baseMonthly;
      acc.bono += b.bonoIncentivo;
      acc.igssLab += b.igssLaboral;
      acc.igssPat += b.igssPatronalTotal;
      acc.bono14 += b.provisionBono14;
      acc.aguinaldo += b.provisionAguinaldo;
      acc.liquido += b.liquidoPagar;
      acc.costoPatronal += b.costoTotalPatron;
      return acc;
    },
    {
      base: 0,
      bono: 0,
      igssLab: 0,
      igssPat: 0,
      bono14: 0,
      aguinaldo: 0,
      liquido: 0,
      costoPatronal: 0,
    }
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'Colaborador',
      'Puesto',
      'Salario Base Mensual (GTQ)',
      'Bono Incentivo Dto. 37-2001 (GTQ)',
      'IGSS Laboral 4.83% (GTQ)',
      'Líquido a Recibir (GTQ)',
      'IGSS Patronal 12.67% (GTQ)',
      'Provisión Mensual Bono 14 Dto. 42-92 (GTQ)',
      'Provisión Mensual Aguinaldo Dto. 76-78 (GTQ)',
      'Bono 14 Anual Proyectado (GTQ)',
      'Aguinaldo Anual Proyectado (GTQ)',
      'Costo Total Empleador (GTQ)',
    ];

    const rows = employees.map((emp) => {
      const b = getPayrollBreakdown(emp);
      return [
        `"${emp.name}"`,
        `"${emp.role}"`,
        b.baseMonthly.toFixed(2),
        b.bonoIncentivo.toFixed(2),
        b.igssLaboral.toFixed(2),
        b.liquidoPagar.toFixed(2),
        b.igssPatronalTotal.toFixed(2),
        b.provisionBono14.toFixed(2),
        b.provisionAguinaldo.toFixed(2),
        b.anualBono14.toFixed(2),
        b.anualAguinaldo.toFixed(2),
        b.costoTotalPatron.toFixed(2),
      ].join(',');
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Planilla_IGSS_Bono14_Aguinaldo_${selectedMonth.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header with Print & Export Controls */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-blue-50 p-1.5 text-blue-700">
              <Banknote className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Planilla & Prestaciones Laborales de Guatemala
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Cálculo formal de retenciones IGSS Laboral (4.83%), cuotas patronales (12.67%), Bono 14
            (Decreto 42-92) y Aguinaldo (Decreto 76-78).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              onClick={() => setViewMode('validador')}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                viewMode === 'validador'
                  ? 'bg-blue-600 font-bold text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Validador Legal IGSS / Prestaciones</span>
              <span className="py-0.2 rounded-full bg-white/20 px-1.5 font-mono text-[9px] text-white">
                Auto
              </span>
            </button>
            <button
              onClick={() => setViewMode('summary_prestaciones')}
              className={`cursor-pointer rounded-lg px-3 py-1.5 transition ${
                viewMode === 'summary_prestaciones'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resumen Prestaciones (PDF)
            </button>
            <button
              onClick={() => setViewMode('regular')}
              className={`cursor-pointer rounded-lg px-3 py-1.5 transition ${
                viewMode === 'regular'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Planilla Líquida
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
            title="Descargar tabla en formato CSV"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Conditionally Render Validator View */}
      {viewMode === 'validador' ? (
        <GuatemalanPayrollValidator
          employees={employees}
          company={company}
          attendance={attendance}
          onUpdateEmployees={onUpdateEmployees}
        />
      ) : (
        <>
          {/* Validation Status Banner when in table view */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/70 p-3.5 text-xs text-blue-950">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                <strong>Cálculos Supervisados por Ley Guatemalteca:</strong> IGSS Laboral 4.83%
                (Acuerdo 1118), IGSS Patronal 12.67%, Bono 14 (Decreto 42-92), Aguinaldo (Decreto
                76-78) y Bonificación Q250 (Decreto 37-2001).
              </span>
            </div>
            <button
              onClick={() => setViewMode('validador')}
              className="shrink-0 cursor-pointer rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-bold text-white transition hover:bg-blue-700"
            >
              Abrir Validador Legal
            </button>
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                Masa Salarial Base
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">{formatGTQ(totals.base)}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {employees.length} colaboradores activos
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-[11px] font-bold tracking-wider text-rose-600 uppercase">
                IGSS Laboral (4.83%)
              </p>
              <p className="mt-1 text-lg font-extrabold text-rose-600">
                -{formatGTQ(totals.igssLab)}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">Deducción de planilla</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-[11px] font-bold tracking-wider text-blue-600 uppercase">
                IGSS Patronal (12.67%)
              </p>
              <p className="mt-1 text-lg font-extrabold text-blue-600">
                {formatGTQ(totals.igssPat)}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">Incluye 1% IRTRA + 1% INTECAP</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-[11px] font-bold tracking-wider text-amber-600 uppercase">
                Provisión Bono 14 & Aguinaldo
              </p>
              <p className="mt-1 text-lg font-extrabold text-amber-600">
                {formatGTQ(totals.bono14 + totals.aguinaldo)}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                Q{formatGTQ(totals.bono14)} c/u por mes
              </p>
            </div>
          </div>

          {/* Printable Document Container (PDF Style) */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs print:border-none print:shadow-none">
            {/* Printable Official Header */}
            <div className="border-b border-slate-200 bg-slate-50/70 p-6 print:border-b-2 print:border-black print:bg-white print:p-0">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-600 print:text-black" />
                    <h3 className="text-base font-extrabold text-slate-900 print:text-lg">
                      {company.commercialName || 'ConstructERP Guatemala, S.A.'}
                    </h3>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    NIT: {company.nit || '1049281-2'} • No. Patronal IGSS: 08-94102-3 •{' '}
                    {company.address || 'Guatemala, C.A.'}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="inline-block rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 print:border print:border-black print:bg-transparent print:text-black">
                    RESUMEN OFICIAL DE PRESTACIONES DE LEY
                  </span>
                  <p className="mt-1 text-xs text-slate-600">
                    Período de Nómina: <span className="font-bold">{selectedMonth}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* View Mode 1: Summary View with IGSS, Bono 14 and Aguinaldo */}
            {viewMode === 'summary_prestaciones' ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700 uppercase print:bg-slate-200 print:text-black">
                    <tr>
                      <th className="border-r border-slate-200 p-3">Colaborador / Puesto</th>
                      <th className="border-r border-slate-200 p-3 text-right">
                        Sueldo Base (GTQ)
                      </th>
                      <th className="border-r border-slate-200 p-3 text-right text-rose-700">
                        IGSS Lab. (4.83%)
                      </th>
                      <th className="border-r border-slate-200 p-3 text-right text-blue-700">
                        IGSS Pat. (12.67%)
                      </th>
                      <th className="border-r border-slate-200 p-3 text-right text-amber-800">
                        <div>Provisión Bono 14</div>
                        <div className="text-[10px] font-normal text-slate-500 normal-case">
                          Decreto 42-92 (8.33%)
                        </div>
                      </th>
                      <th className="border-r border-slate-200 p-3 text-right text-amber-800">
                        <div>Provisión Aguinaldo</div>
                        <div className="text-[10px] font-normal text-slate-500 normal-case">
                          Decreto 76-78 (8.33%)
                        </div>
                      </th>
                      <th className="border-r border-slate-200 p-3 text-right font-bold">
                        Líquido a Recibir
                      </th>
                      <th className="p-3 text-right font-bold text-slate-900">
                        Costo Total Empleador
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 print:divide-slate-300">
                    {employees.map((emp) => {
                      const b = getPayrollBreakdown(emp);
                      return (
                        <tr key={emp.id} className="transition hover:bg-slate-50/80">
                          <td className="border-r border-slate-200 p-3">
                            <div className="font-bold text-slate-900">{emp.name}</div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <span>{emp.role}</span>
                              {emp.igssAffiliated && (
                                <span className="py-0.2 rounded bg-emerald-100 px-1.5 text-[9px] font-semibold text-emerald-800">
                                  Afiliado
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="border-r border-slate-200 p-3 text-right font-mono font-medium">
                            {formatGTQ(b.baseMonthly)}
                          </td>
                          <td className="border-r border-slate-200 p-3 text-right font-mono font-medium text-rose-600">
                            -{formatGTQ(b.igssLaboral)}
                          </td>
                          <td className="border-r border-slate-200 p-3 text-right font-mono font-medium text-blue-600">
                            {formatGTQ(b.igssPatronalTotal)}
                          </td>
                          <td className="border-r border-slate-200 bg-amber-50/40 p-3 text-right font-mono font-medium text-amber-700">
                            {formatGTQ(b.provisionBono14)}
                          </td>
                          <td className="border-r border-slate-200 bg-amber-50/40 p-3 text-right font-mono font-medium text-amber-700">
                            {formatGTQ(b.provisionAguinaldo)}
                          </td>
                          <td className="border-r border-slate-200 p-3 text-right font-mono font-bold text-emerald-700">
                            {formatGTQ(b.liquidoPagar)}
                          </td>
                          <td className="bg-slate-50/50 p-3 text-right font-mono font-extrabold text-slate-900">
                            {formatGTQ(b.costoTotalPatron)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900 print:bg-slate-200">
                    <tr>
                      <td className="border-r border-slate-200 p-3 text-xs font-extrabold uppercase">
                        Totales Planilla ({employees.length})
                      </td>
                      <td className="border-r border-slate-200 p-3 text-right font-mono font-extrabold">
                        {formatGTQ(totals.base)}
                      </td>
                      <td className="border-r border-slate-200 p-3 text-right font-mono font-extrabold text-rose-700">
                        -{formatGTQ(totals.igssLab)}
                      </td>
                      <td className="border-r border-slate-200 p-3 text-right font-mono font-extrabold text-blue-700">
                        {formatGTQ(totals.igssPat)}
                      </td>
                      <td className="border-r border-slate-200 p-3 text-right font-mono font-extrabold text-amber-800">
                        {formatGTQ(totals.bono14)}
                      </td>
                      <td className="border-r border-slate-200 p-3 text-right font-mono font-extrabold text-amber-800">
                        {formatGTQ(totals.aguinaldo)}
                      </td>
                      <td className="border-r border-slate-200 p-3 text-right font-mono font-extrabold text-emerald-800">
                        {formatGTQ(totals.liquido)}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">
                        {formatGTQ(totals.costoPatronal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              /* View Mode 2: Regular Liquid Pay Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700 uppercase">
                    <tr>
                      <th className="p-3.5">Colaborador</th>
                      <th className="p-3.5">Puesto</th>
                      <th className="p-3.5 text-right">Sueldo Base (Q)</th>
                      <th className="p-3.5 text-right">Bono Dto. 37-2001</th>
                      <th className="p-3.5 text-right">IGSS Laboral (4.83%)</th>
                      <th className="p-3.5 text-right">IGSS Patronal (12.67%)</th>
                      <th className="p-3.5 text-right">Líquido a Recibir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {employees.map((emp) => {
                      const b = getPayrollBreakdown(emp);
                      return (
                        <tr key={emp.id} className="transition hover:bg-slate-50/80">
                          <td className="p-3.5 font-bold text-slate-900">{emp.name}</td>
                          <td className="p-3.5">{emp.role}</td>
                          <td className="p-3.5 text-right font-mono">{formatGTQ(b.baseMonthly)}</td>
                          <td className="p-3.5 text-right font-mono">
                            {formatGTQ(b.bonoIncentivo)}
                          </td>
                          <td className="p-3.5 text-right font-mono text-rose-600">
                            -{formatGTQ(b.igssLaboral)}
                          </td>
                          <td className="p-3.5 text-right font-mono text-blue-600">
                            {formatGTQ(b.igssPatronalTotal)}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                            {formatGTQ(b.liquidoPagar)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Legal Footnotes & Signatures */}
            <div className="space-y-3 border-t border-slate-200 bg-slate-50/50 p-5 text-[11px] text-slate-600">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="flex items-center gap-1 font-bold text-slate-800">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Base Legal de Retenciones
                    y Prestaciones:
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-500">
                    <li>
                      <strong>IGSS Laboral:</strong> 4.83% sobre salario ordinario devengado.
                    </li>
                    <li>
                      <strong>IGSS Patronal:</strong> 10.67% IGSS + 1.0% IRTRA + 1.0% INTECAP =
                      12.67% total.
                    </li>
                    <li>
                      <strong>Bono 14 (Decreto 42-92):</strong> 100% de salario mensual computable
                      del 1 julio al 30 junio.
                    </li>
                    <li>
                      <strong>Aguinaldo (Decreto 76-78):</strong> 100% de salario mensual computable
                      del 1 dic al 30 nov.
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="flex items-center gap-1 font-bold text-slate-800">
                    <Award className="h-3.5 w-3.5 text-amber-600" /> Bonificación Incentivo:
                  </p>
                  <p className="mt-1 leading-relaxed text-slate-500">
                    De conformidad con el Decreto 37-2001 del Congreso de la República de Guatemala,
                    se otorga a cada trabajador la bonificación mensual fija de Q250.00, la cual no
                    está afecta al cálculo de IGSS, Bono 14 ni Aguinaldo.
                  </p>
                </div>
              </div>

              {/* Signature Lines for Print */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center print:block">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-800">
                    Elaborado por: Recursos Humanos / Nóminas
                  </p>
                  <p className="text-[10px] text-slate-500">{company.commercialName}</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-800">
                    Autorizado por: Gerente General / Representante Legal
                  </p>
                  <p className="text-[10px] text-slate-500">Firma y Sello</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

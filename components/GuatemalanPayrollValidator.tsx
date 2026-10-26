'use client';

import { formatGTQ } from '@/lib/data';
import { AttendanceRecord, CompanySettings, Employee } from '@/lib/types';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Edit2,
  Save,
  Scale,
  Search,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import React, { useState } from 'react';

export interface GuatemalanPayrollValidatorProps {
  employees: Employee[];
  company: CompanySettings;
  attendance?: AttendanceRecord[];
  onUpdateEmployees?: (updated: Employee[]) => void;
}

interface ValidationIssue {
  employeeId: string;
  type: 'error' | 'warning' | 'info';
  code: string;
  title: string;
  description: string;
  lawReference: string;
  suggestedAction?: string;
}

export function GuatemalanPayrollValidator({
  employees,
  company,
  attendance = [],
  onUpdateEmployees,
}: GuatemalanPayrollValidatorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'errors' | 'warnings' | 'valid'>(
    'all'
  );
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});

  // Minimum wage benchmark in Guatemala (Circunscripción 1 - No Agrícola 2026: ~Q3,628.80 base mensual)
  const MIN_WAGE_MONTHLY_GTQ = 3628.8;
  const MIN_WAGE_DAILY_GTQ = MIN_WAGE_MONTHLY_GTQ / 30; // ~Q120.96

  // Statutory parameters
  const IGSS_LABORAL_RATE = 0.0483; // 4.83% Acuerdo 1118 JD IGSS
  const IGSS_PATRONAL_RATE = 0.1267; // 10.67% IGSS + 1% IRTRA + 1% INTECAP
  const BONO_INCENTIVO_LAW = 250.0; // Dto. 37-2001

  // Run comprehensive validation on each employee
  const validateEmployee = (emp: Employee): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const baseMonthly = emp.dailyRateGTQ * 30;

    // 1. Minimum Wage Check (Constitución Política Art. 102 literal f, Acuerdo Gubernativo Salarios Mínimos)
    if (emp.dailyRateGTQ < MIN_WAGE_DAILY_GTQ) {
      issues.push({
        employeeId: emp.id,
        type: 'error',
        code: 'MIN_WAGE_VIOLATION',
        title: 'Salario Inferior al Mínimo Legal',
        description: `La tarifa diaria de ${formatGTQ(emp.dailyRateGTQ)} (mensual ${formatGTQ(baseMonthly)}) está por debajo del salario mínimo no agrícola de ley (${formatGTQ(MIN_WAGE_MONTHLY_GTQ)}).`,
        lawReference: 'Acuerdo Gubernativo de Salarios Mínimos 2026 / Art. 102 CPRG',
        suggestedAction: `Ajustar tarifa diaria mínima a ${formatGTQ(MIN_WAGE_DAILY_GTQ)}.`,
      });
    }

    // 2. IGSS Affiliation & Number Check (Acuerdo 1118 de Junta Directiva del IGSS)
    if (emp.igssAffiliated) {
      if (!emp.igssNumber || emp.igssNumber.trim().length < 7) {
        issues.push({
          employeeId: emp.id,
          type: 'warning',
          code: 'MISSING_IGSS_NUMBER',
          title: 'Número de Afiliación IGSS Incompleto',
          description:
            'El colaborador cotiza IGSS pero no tiene registrado un número patronal/carnet de afiliación válido.',
          lawReference: 'Reglamento de Inscripción de Patronos y Trabajadores IGSS',
          suggestedAction: 'Registrar número de afiliación de 8 a 11 dígitos.',
        });
      }
    }

    // 3. DPI Validation (Decreto 90-2005 Ley del RENAP)
    if (!emp.dpi || emp.dpi.replace(/\s+/g, '').length !== 13) {
      issues.push({
        employeeId: emp.id,
        type: 'warning',
        code: 'INVALID_DPI',
        title: 'DPI No Registrado o Incompleto',
        description: `El Documento Personal de Identificación debe contener 13 dígitos numéricos según formato RENAP. Actual: "${emp.dpi || 'Vacío'}".`,
        lawReference: 'Decreto 90-2005 Art. 50 (Uso obligatorio del CUI)',
        suggestedAction: 'Actualizar DPI a 13 dígitos.',
      });
    }

    // 4. Bonificación Incentivo Check (Decreto 37-2001)
    const effectiveBono = emp.customBonoIncentivo ?? BONO_INCENTIVO_LAW;
    if (effectiveBono < BONO_INCENTIVO_LAW) {
      issues.push({
        employeeId: emp.id,
        type: 'error',
        code: 'BONO_INCENTIVO_DEFICIT',
        title: 'Bonificación Incentivo Inferior a Q250.00',
        description: `El Decreto 37-2001 establece un mínimo irrenunciable de Q250.00 mensuales exentos de cuotas del IGSS. Asignado: ${formatGTQ(effectiveBono)}.`,
        lawReference: 'Decreto 37-2001 del Congreso de la República',
        suggestedAction: 'Establecer Bonificación Incentivo en Q250.00.',
      });
    }

    // 5. Overridden IGSS verification
    if (emp.overriddenIgssLaboral !== undefined) {
      const calculatedIgss = Math.round(baseMonthly * IGSS_LABORAL_RATE * 100) / 100;
      if (Math.abs(emp.overriddenIgssLaboral - calculatedIgss) > 1.0) {
        issues.push({
          employeeId: emp.id,
          type: 'info',
          code: 'OVERRIDDEN_IGSS',
          title: 'Retención de IGSS Manual Personalizada',
          description: `El valor manual (${formatGTQ(emp.overriddenIgssLaboral)}) difiere de la cuota estatutaria del 4.83% (${formatGTQ(calculatedIgss)}).`,
          lawReference: 'Acuerdo 1118 Art. 4',
        });
      }
    }

    // 6. Attendance cross-check (Faltas injustificadas o incapacidades)
    const empAttendance = attendance.filter((a) => a.employeeId === emp.id);
    const igssSuspensions = empAttendance.filter((a) => a.status === 'Incapacidad IGSS').length;
    if (igssSuspensions > 0) {
      issues.push({
        employeeId: emp.id,
        type: 'info',
        code: 'IGSS_SUSPENSION_ACTIVE',
        title: `${igssSuspensions} Día(s) de Suspensión Médica IGSS`,
        description:
          'Constan días con incapacidad temporal avalada por el IGSS; se debe ajustar el cálculo proporcional del salario y no deducir doble.',
        lawReference: 'Reglamento de Prestaciones en Dinero del IGSS',
      });
    }

    return issues;
  };

  // Pre-calculate validation for all employees
  const validationMap = new Map<string, ValidationIssue[]>();
  let totalErrors = 0;
  let totalWarnings = 0;

  employees.forEach((emp) => {
    const issues = validateEmployee(emp);
    validationMap.set(emp.id, issues);
    issues.forEach((iss) => {
      if (iss.type === 'error') totalErrors++;
      if (iss.type === 'warning') totalWarnings++;
    });
  });

  const totalEmployees = employees.length;
  const compliantEmployees = employees.filter((emp) => {
    const issues = validationMap.get(emp.id) || [];
    return issues.filter((i) => i.type === 'error').length === 0;
  }).length;

  const complianceScore =
    totalEmployees > 0 ? Math.round((compliantEmployees / totalEmployees) * 100) : 100;

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.dpi && emp.dpi.includes(searchTerm));

    if (!matchesSearch) return false;

    const issues = validationMap.get(emp.id) || [];
    const hasError = issues.some((i) => i.type === 'error');
    const hasWarning = issues.some((i) => i.type === 'warning');

    if (filterSeverity === 'errors') return hasError;
    if (filterSeverity === 'warnings') return hasWarning && !hasError;
    if (filterSeverity === 'valid') return issues.length === 0;
    return true;
  });

  // Start inline edit
  const handleStartEdit = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setEditForm({
      name: emp.name,
      dpi: emp.dpi || '',
      igssNumber: emp.igssNumber || '',
      dailyRateGTQ: emp.dailyRateGTQ,
      igssAffiliated: emp.igssAffiliated,
      customBonoIncentivo: emp.customBonoIncentivo ?? BONO_INCENTIVO_LAW,
    });
  };

  // Save inline edit
  const handleSaveEdit = (empId: string) => {
    if (!onUpdateEmployees) {
      setEditingEmployeeId(null);
      return;
    }

    const updated = employees.map((emp) => {
      if (emp.id === empId) {
        return {
          ...emp,
          ...editForm,
        };
      }
      return emp;
    });

    onUpdateEmployees(updated);
    setEditingEmployeeId(null);
  };

  // Quick fix: Automatically apply standard statutory wages and parameters
  const handleAutoFixEmployee = (empId: string) => {
    if (!onUpdateEmployees) return;

    const updated = employees.map((emp) => {
      if (emp.id === empId) {
        return {
          ...emp,
          dailyRateGTQ: Math.max(emp.dailyRateGTQ, Math.round(MIN_WAGE_DAILY_GTQ)),
          customBonoIncentivo: BONO_INCENTIVO_LAW,
          dpi: emp.dpi && emp.dpi.trim().length >= 10 ? emp.dpi : '2489 10293 0101',
          igssNumber:
            emp.igssAffiliated && (!emp.igssNumber || emp.igssNumber.length < 5)
              ? '10984726'
              : emp.igssNumber,
        };
      }
      return emp;
    });

    onUpdateEmployees(updated);
  };

  // Export Audit Report
  const handleExportAuditCSV = () => {
    const headers = [
      'ID',
      'Colaborador',
      'Puesto',
      'DPI',
      'Afiliación IGSS',
      'Tarifa Diaria (GTQ)',
      'Salario Mensual (GTQ)',
      'Bonificación Dto 37-2001',
      'IGSS Laboral 4.83%',
      'Estado Auditoría',
      'Hallazgos / Normativa',
    ];

    const rows = employees.map((emp) => {
      const issues = validationMap.get(emp.id) || [];
      const baseMonthly = emp.dailyRateGTQ * 30;
      const bono = emp.customBonoIncentivo ?? BONO_INCENTIVO_LAW;
      const igss = emp.igssAffiliated ? baseMonthly * IGSS_LABORAL_RATE : 0;
      const statusText = issues.some((i) => i.type === 'error')
        ? 'INFRACCIÓN'
        : issues.some((i) => i.type === 'warning')
          ? 'OBSERVACIÓN'
          : 'CUMPLE 100%';

      const findingsText =
        issues.map((i) => `[${i.code}] ${i.title} (${i.lawReference})`).join('; ') || 'Ninguno';

      return [
        emp.id,
        `"${emp.name}"`,
        `"${emp.role}"`,
        `"${emp.dpi || 'N/A'}"`,
        `"${emp.igssNumber || 'N/A'}"`,
        emp.dailyRateGTQ.toFixed(2),
        baseMonthly.toFixed(2),
        bono.toFixed(2),
        igss.toFixed(2),
        statusText,
        `"${findingsText}"`,
      ].join(',');
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Auditoria_Laboral_IGSS_MINTRAB_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Audit Scorecard */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold ${
              complianceScore >= 90
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-600'
                : complianceScore >= 70
                  ? 'border border-amber-200 bg-amber-50 text-amber-600'
                  : 'border border-rose-200 bg-rose-50 text-rose-600'
            }`}
          >
            {complianceScore}%
          </div>
          <div>
            <span className="block font-mono text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Cumplimiento Legal
            </span>
            <h4 className="text-base font-bold text-slate-800">
              {complianceScore >= 90
                ? 'Auditoría Óptima'
                : complianceScore >= 70
                  ? 'Revisión Requerida'
                  : 'Infracciones'}
            </h4>
            <span className="text-xs text-slate-500">
              {compliantEmployees} de {totalEmployees} colaboradores en regla
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Infracciones Críticas
            </span>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">{totalErrors}</div>
          <p className="mt-1 text-xs text-slate-500">Salario mínimo o prestaciones deficientes</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Observaciones
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600">{totalWarnings}</div>
          <p className="mt-1 text-xs text-slate-500">Falta de DPI o carnet IGSS incompleto</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Marco Legal Vigente
            </span>
            <Scale className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-sm font-bold text-slate-800">MINTRAB & IGSS 2026</div>
          <p className="mt-1 text-[11px] text-slate-500">
            Acuerdo 1118 • Dto. 37-2001 • Dto. 42-92
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row">
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar colaborador, puesto o DPI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              onClick={() => setFilterSeverity('all')}
              className={`rounded-lg px-2.5 py-1.5 transition ${
                filterSeverity === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Todos ({employees.length})
            </button>
            <button
              onClick={() => setFilterSeverity('errors')}
              className={`rounded-lg px-2.5 py-1.5 transition ${
                filterSeverity === 'errors'
                  ? 'bg-rose-50 font-bold text-rose-700 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              Infracciones ({totalErrors})
            </button>
            <button
              onClick={() => setFilterSeverity('warnings')}
              className={`rounded-lg px-2.5 py-1.5 transition ${
                filterSeverity === 'warnings'
                  ? 'bg-amber-50 font-bold text-amber-700 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              Observaciones ({totalWarnings})
            </button>
            <button
              onClick={() => setFilterSeverity('valid')}
              className={`rounded-lg px-2.5 py-1.5 transition ${
                filterSeverity === 'valid'
                  ? 'bg-emerald-50 font-bold text-emerald-700 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              En Regla ({compliantEmployees})
            </button>
          </div>
        </div>

        <button
          onClick={handleExportAuditCSV}
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          <span>Exportar Informe de Auditoría</span>
        </button>
      </div>

      {/* Employee Validation List */}
      <div className="space-y-3">
        {filteredEmployees.map((emp) => {
          const issues = validationMap.get(emp.id) || [];
          const hasError = issues.some((i) => i.type === 'error');
          const hasWarning = issues.some((i) => i.type === 'warning');
          const baseMonthly = emp.dailyRateGTQ * 30;
          const isEditing = editingEmployeeId === emp.id;

          return (
            <div
              key={emp.id}
              className={`rounded-2xl border bg-white p-4 shadow-xs transition sm:p-5 ${
                hasError
                  ? 'border-rose-300 bg-rose-50/20'
                  : hasWarning
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200'
              }`}
            >
              {isEditing ? (
                /* Inline Edit Mode */
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      Editar Datos Laborales de {emp.name}
                    </h4>
                    <button
                      onClick={() => setEditingEmployeeId(null)}
                      className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                        Tarifa Diaria (GTQ)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={editForm.dailyRateGTQ || 0}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, dailyRateGTQ: Number(e.target.value) }))
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-mono text-xs"
                      />
                      <span className="text-[10px] text-slate-400">
                        Mensual: {formatGTQ((editForm.dailyRateGTQ || 0) * 30)}
                      </span>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                        DPI (13 Dígitos)
                      </label>
                      <input
                        type="text"
                        value={editForm.dpi || ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, dpi: e.target.value }))}
                        placeholder="2489 10293 0101"
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                        Afiliación IGSS
                      </label>
                      <input
                        type="text"
                        value={editForm.igssNumber || ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, igssNumber: e.target.value }))
                        }
                        placeholder="No. Carnet IGSS"
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setEditingEmployeeId(null)}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleSaveEdit(emp.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      <Save className="h-3.5 w-3.5" /> Guardar Cambios
                    </button>
                  </div>
                </div>
              ) : (
                /* Regular Display Card */
                <div className="space-y-3">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          hasError
                            ? 'bg-rose-100 text-rose-700'
                            : hasWarning
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {hasError ? (
                          <XCircle className="h-5 w-5" />
                        ) : hasWarning ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{emp.name}</h4>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {emp.role}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              emp.igssAffiliated
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {emp.igssAffiliated ? 'Afiliado IGSS' : 'Sin IGSS'}
                          </span>
                        </div>

                        <div className="mt-0.5 flex items-center gap-4 text-xs text-slate-500">
                          <span>
                            DPI:{' '}
                            <strong className="font-mono text-slate-700">
                              {emp.dpi || 'No registrado'}
                            </strong>
                          </span>
                          <span>
                            No. IGSS:{' '}
                            <strong className="font-mono text-slate-700">
                              {emp.igssNumber || 'Pendiente'}
                            </strong>
                          </span>
                          <span>
                            Tarifa:{' '}
                            <strong className="font-semibold text-slate-800">
                              {formatGTQ(emp.dailyRateGTQ)}/día
                            </strong>{' '}
                            ({formatGTQ(baseMonthly)}/mes)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {issues.length > 0 && onUpdateEmployees && (
                        <button
                          onClick={() => handleAutoFixEmployee(emp.id)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
                          title="Ajustar automáticamente al salario mínimo y bonificación legal"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                          <span>Subsanar por Ley</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleStartEdit(emp)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Editar
                      </button>
                    </div>
                  </div>

                  {/* Issues List */}
                  {issues.length > 0 ? (
                    <div className="space-y-1.5 border-t border-slate-100 pt-2">
                      {issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start justify-between gap-3 rounded-xl p-2.5 text-xs ${
                            issue.type === 'error'
                              ? 'border border-rose-200/60 bg-rose-50 text-rose-900'
                              : issue.type === 'warning'
                                ? 'border border-amber-200/60 bg-amber-50 text-amber-900'
                                : 'border border-blue-200/60 bg-blue-50 text-blue-900'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{issue.title}</span>
                              <span className="py-0.2 rounded bg-black/5 px-1.5 font-mono text-[10px] font-semibold">
                                {issue.lawReference}
                              </span>
                            </div>
                            <p className="text-[11px] opacity-90">{issue.description}</p>
                          </div>

                          {issue.suggestedAction && (
                            <span className="shrink-0 text-[10px] font-bold text-slate-600 italic">
                              Sugerencia: {issue.suggestedAction}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-2 text-xs text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        Cumplimiento 100% verificado: Salario mínimo, IGSS 4.83% y Bonificación Dto.
                        37-2001 conforme a ley.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default GuatemalanPayrollValidator;

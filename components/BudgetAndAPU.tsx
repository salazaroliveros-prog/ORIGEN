'use client';

import { formatGTQ, formatUSD } from '@/lib/data';
import {
  adjustApuDirectCostsForDepartment,
  calculateRegionalPrice,
  GUATEMALA_BASE_MARKET_CATALOGUE,
  GUATEMALA_DEPARTMENTS_INDEX,
} from '@/lib/guatemalaMarketData';
import {
  APUItem,
  CompanySettings,
  ExpenseRecord,
  Project,
  QuoteRecord,
  ScheduleTask,
  AIGeneratedAPUItem,
  AIGeneratedMaterial,
  AIGeneratedLabor,
  AIGeneratedEquipment,
  AuditData,
  AuditAlert,
} from '@/lib/types';
import {
  AlertTriangle,
  Calculator,
  Check,
  Eye,
  Info,
  Layers,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface BudgetAndAPUProps {
  budgetItems: APUItem[];
  activeProjectId: string;
  projects: Project[];
  canWrite?: boolean;
  onAddBudgetItem: (item: APUItem) => Promise<boolean>;
  onUpdateBudgetItems?: (items: APUItem[]) => Promise<boolean>;
  onDeleteBudgetItem?: (id: string) => Promise<boolean>;
  currency: 'GTQ' | 'USD';
  company: CompanySettings;
  expenses: ExpenseRecord[];
  quotes: QuoteRecord[];
  tasks: ScheduleTask[];
}

export function BudgetAndAPU({
  budgetItems,
  activeProjectId,
  projects,
  canWrite = false,
  onAddBudgetItem,
  onUpdateBudgetItems,
  onDeleteBudgetItem,
  currency,
  company,
}: BudgetAndAPUProps) {
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  // Regional Department State
  const [selectedDept, setSelectedDept] = useState<string>(
    activeProject?.department || 'Guatemala'
  );
  const [appliedDept, setAppliedDept] = useState<string>(activeProject?.department || 'Guatemala');

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isAiStudioOpen, setIsAiStudioOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isMarketCatalogueOpen, setIsMarketCatalogueOpen] = useState(false);
  const [inspectingItem, setInspectingItem] = useState<APUItem | null>(null);
  const [recalcToast, setRecalcToast] = useState<string | null>(null);

  // Manual Form State
  const [code, setCode] = useState('03.01');
  const [desc, setDesc] = useState('');
  const [unit, setUnit] = useState('m²');
  const [qty, setQty] = useState('100');
  const [matCost, setMatCost] = useState('240');
  const [labCost, setLabCost] = useState('110');
  const [eqCost, setEqCost] = useState('25');

  // AI APU Studio State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiUnit, setAiUnit] = useState('m²');
  const [aiQty, setAiQty] = useState('100');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiResult, setAiResult] = useState<AIGeneratedAPUItem | null>(null);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // AI Audit State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditData | null>(null);

  // Market Catalogue Filter State
  const [marketCategoryFilter, setMarketCategoryFilter] = useState<string>('todos');
  const [marketSearchQuery, setMarketSearchQuery] = useState('');

  const currentDeptInfo =
    GUATEMALA_DEPARTMENTS_INDEX[selectedDept] || GUATEMALA_DEPARTMENTS_INDEX['Guatemala'];
  const appliedDeptInfo =
    GUATEMALA_DEPARTMENTS_INDEX[appliedDept] || GUATEMALA_DEPARTMENTS_INDEX['Guatemala'];

  if (!activeProject) return null;

  const formatMoney = (amount: number) => {
    return currency === 'GTQ' ? formatGTQ(amount) : formatUSD(amount, company.exchangeRate);
  };

  // Recalculate all APU items direct costs for target department
  const handleRecalculateBudgetForDepartment = async () => {
    if (!onUpdateBudgetItems) return;
    const updated = budgetItems.map((item) => {
      const adjusted = adjustApuDirectCostsForDepartment(
        item.materialUnitCostGTQ,
        item.laborUnitCostGTQ,
        item.equipmentUnitCostGTQ,
        selectedDept,
        appliedDept
      );
      return {
        ...item,
        materialUnitCostGTQ: adjusted.materialUnitCostGTQ,
        laborUnitCostGTQ: adjusted.laborUnitCostGTQ,
        equipmentUnitCostGTQ: adjusted.equipmentUnitCostGTQ,
        totalUnitCostGTQ: adjusted.totalUnitCostGTQ,
        totalPriceGTQ: Math.round(adjusted.totalUnitCostGTQ * item.quantity * 100) / 100,
        department: selectedDept,
      };
    });

    if (!(await onUpdateBudgetItems(updated))) return;
    setAppliedDept(selectedDept);
    setRecalcToast(
      `Presupuesto recalculado para ${selectedDept}. Factor de flete: ${currentDeptInfo.freightFactor}x, mano de obra: ${currentDeptInfo.laborFactor}x.`
    );
    setTimeout(() => setRecalcToast(null), 5000);
  };

  // Manual APU creation
  const handleCreateManualAPU = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;

    const m = Number(matCost) || 0;
    const l = Number(labCost) || 0;
    const eq = Number(eqCost) || 0;
    const totalUnit = m + l + eq;
    const q = Number(qty) || 1;

    const newItem: APUItem = {
      id: `apu-${globalThis.crypto.randomUUID()}`,
      code,
      description: desc,
      unit,
      quantity: q,
      materialUnitCostGTQ: m,
      laborUnitCostGTQ: l,
      equipmentUnitCostGTQ: eq,
      totalUnitCostGTQ: totalUnit,
      totalPriceGTQ: totalUnit * q,
      department: appliedDept,
    };

    if (!(await onAddBudgetItem(newItem))) return;
    setIsManualModalOpen(false);
    setDesc('');
  };

  // AI APU Generation
  const handleGenerateAiApu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsGeneratingAi(true);
    setAiError(null);
    setAiResult(null);
    setAiSource(null);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_apu',
          description: aiPrompt,
          department: selectedDept,
          unit: aiUnit,
          quantity: Number(aiQty) || 100,
          projectName: activeProject.name,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al generar APU con IA');
      }

      setAiResult(data.data);
      setAiSource(typeof data.source === 'string' ? data.source : null);
    } catch (err: unknown) {
      console.error('Error generating AI APU:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'No se pudo conectar con el motor de IA.';
      setAiError(errorMessage);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Add AI Result to Project Budget
  const handleAddAiApuToBudget = async () => {
    if (!aiResult) return;

    // Validar datos generados por IA
    const quantity = Number(aiResult.quantity) || Number(aiQty) || 100;
    const materialCost = Number(aiResult.materialUnitCostGTQ) || 0;
    const laborCost = Number(aiResult.laborUnitCostGTQ) || 0;
    const equipmentCost = Number(aiResult.equipmentUnitCostGTQ) || 0;
    const totalUnitCost = Number(aiResult.totalUnitCostGTQ) || 0;

    // Validar que no haya valores negativos
    if (
      quantity < 0 ||
      materialCost < 0 ||
      laborCost < 0 ||
      equipmentCost < 0 ||
      totalUnitCost < 0
    ) {
      toast.error('La IA generó valores negativos. Por favor revisa y corrige los datos.');
      return;
    }

    // Validar que la suma de componentes sea consistente con el total
    const calculatedTotal = materialCost + laborCost + equipmentCost;
    const totalTolerance = Math.abs(calculatedTotal - totalUnitCost);
    const tolerancePercent = totalUnitCost > 0 ? (totalTolerance / totalUnitCost) * 100 : 0;

    // Si la diferencia es mayor al 10%, mostrar advertencia
    if (tolerancePercent > 10) {
      toast.error(
        `Discrepancia detectada: suma de componentes (${formatMoney(calculatedTotal)}) difiere del total (${formatMoney(totalUnitCost)}). Verifica antes de aprobar.`
      );
    }

    // Validar rangos razonables para Guatemala
    const MAX_REASONABLE_UNIT_COST = 100000; // Q100,000 por unidad máximo razonable
    const MAX_REASONABLE_QUANTITY = 1000000; // 1M unidades máximo razonable

    if (totalUnitCost > MAX_REASONABLE_UNIT_COST) {
      toast.error(
        `El costo unitario (${formatMoney(totalUnitCost)}) parece fuera de rango para Guatemala. Verifica antes de aprobar.`
      );
    }

    if (quantity > MAX_REASONABLE_QUANTITY) {
      toast.error(`La cantidad (${quantity}) parece excesiva. Verifica antes de aprobar.`);
    }

    const newItem: APUItem = {
      id: `apu-${globalThis.crypto.randomUUID()}`,
      code: aiResult.code || '03.99',
      description: aiResult.title || aiPrompt,
      unit: aiResult.unit || aiUnit,
      quantity,
      materialUnitCostGTQ: materialCost,
      laborUnitCostGTQ: laborCost,
      equipmentUnitCostGTQ: equipmentCost,
      totalUnitCostGTQ: totalUnitCost,
      totalPriceGTQ: Number(aiResult.totalPriceGTQ) || 0,
      department: selectedDept,
      breakdown: {
        materials: aiResult.materialsBreakdown,
        labor: aiResult.laborBreakdown,
        equipment: aiResult.equipmentBreakdown,
        notes: aiResult.regionalAdjustmentNote,
        technicalNorm: aiResult.technicalNorm,
      },
      metadata: {
        source: aiSource || 'ai-studio',
        validated: tolerancePercent <= 10, // Marcar como validado si la discrepancia es <= 10%
      },
    };

    if (!(await onAddBudgetItem(newItem))) return;
    setIsAiStudioOpen(false);
    setAiPrompt('');
    setAiResult(null);
  };

  // AI Budget Audit
  const handleRunAiAudit = async () => {
    setIsAuditModalOpen(true);
    setIsAuditing(true);
    setAuditResult(null);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'audit_budget',
          department: appliedDept,
          budgetItems,
          projectName: activeProject.name,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setAuditResult(data.data);
      }
    } catch (err) {
      console.error('Error running budget audit:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  const totalBudgetGTQ = budgetItems.reduce((acc, item) => acc + item.totalPriceGTQ, 0);

  // Quick prompt suggestions
  const promptSuggestions = [
    'Zapata Z-1 1.20x1.20x0.35m con parrilla No. 4 @ 0.15m y pedestal',
    'Muro de block 14x19x39 50kg/cm² con solera intermedia y pines',
    'Fundición de losa tradicional de 10cm con concreto 3000 PSI',
    'Columna C-1 0.30x0.30m con 4 varillas No. 5 y estribos No. 3',
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Regional Market Bar */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-blue-50 p-2 text-blue-600">
                <Calculator className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Presupuesto & Análisis de Precios Unitarios (APU) Inteligente
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Desglose de costos directos (materiales, mano de obra y equipo) calibrados con precios
              de plaza de Guatemala y normas AGIES / COGUANOR.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAiStudioOpen(true)}
              disabled={!canWrite}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              Generar APU con IA
            </button>

            <button
              onClick={handleRunAiAudit}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Auditar con IA
            </button>

            <button
              onClick={() => setIsMarketCatalogueOpen(true)}
              disabled={!canWrite}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Precios Mercado GT
            </button>

            <button
              onClick={() => setIsManualModalOpen(true)}
              disabled={!canWrite}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Renglón Manual
            </button>
          </div>
        </div>

        {/* REGIONAL MARKET SELECTOR & LIVE LOGISTICS INDEX */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
              Área o Departamento de la Obra:
            </span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {Object.keys(GUATEMALA_DEPARTMENTS_INDEX).map((dept) => (
                <option key={dept} value={dept}>
                  {dept} ({GUATEMALA_DEPARTMENTS_INDEX[dept].region}) — Factor{' '}
                  {GUATEMALA_DEPARTMENTS_INDEX[dept].overallFactor}x
                </option>
              ))}
            </select>

            <span className="rounded bg-blue-100 px-2 py-1 font-mono text-[11px] font-bold text-blue-800">
              Flete:{' '}
              {currentDeptInfo.freightFactor >= 1
                ? `+${Math.round((currentDeptInfo.freightFactor - 1) * 100)}%`
                : `-${Math.round((1 - currentDeptInfo.freightFactor) * 100)}%`}
            </span>
            <span className="rounded bg-slate-200 px-2 py-1 font-mono text-[11px] font-bold text-slate-800">
              Distancia: {currentDeptInfo.distanceKmFromCapital} km
            </span>
          </div>

          <div className="flex items-center gap-2">
            {appliedDept !== selectedDept ? (
              <button
                onClick={handleRecalculateBudgetForDepartment}
                disabled={!canWrite}
                className="inline-flex animate-pulse cursor-pointer items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-amber-600"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Actualizar Costos a {selectedDept}
              </button>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <Check className="h-3.5 w-3.5" /> Costos sincronizados con {appliedDept}
              </span>
            )}
          </div>
        </div>

        {/* Logistics Note Bar */}
        <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-2.5 text-[11px] text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <p>
            <strong>Condiciones de Plaza ({currentDeptInfo.name}):</strong>{' '}
            {currentDeptInfo.logisticsNotes}
          </p>
        </div>
      </div>

      {/* RECALCULATION SUCCESS TOAST */}
      {recalcToast && (
        <div className="animate-in fade-in flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Check className="h-5 w-5 text-emerald-600" />
            <p className="text-xs font-bold">{recalcToast}</p>
          </div>
          <button
            onClick={() => setRecalcToast(null)}
            className="text-xs font-bold text-emerald-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            Costo Total Presupuestado
          </p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(totalBudgetGTQ)}</h3>
          <p className="mt-0.5 text-[11px] text-slate-400">Suma de costos directos de obra</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Renglones Activos</p>
          <h3 className="mt-1 text-2xl font-bold text-blue-600">{budgetItems.length} Partidas</h3>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Promedio:{' '}
            {budgetItems.length > 0 ? formatMoney(totalBudgetGTQ / budgetItems.length) : 'Q0.00'} /
            partida
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            Ubicación y Factor Activo
          </p>
          <h3 className="mt-1 text-2xl font-bold text-slate-900">{appliedDept}</h3>
          <p className="mt-0.5 text-[11px] font-semibold text-emerald-600">
            Índice Ponderado: {appliedDeptInfo.overallFactor}x sobre Plaza Central
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase">Normativa Técnica</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">AGIES / COGUANOR</h3>
          <p className="mt-0.5 text-[11px] font-medium text-blue-600">
            Sismo-resistencia NSE 2 y 3
          </p>
        </div>
      </div>

      {/* APU ITEMS TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Listado de Renglones de Obra (Presupuesto)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Región: <strong className="text-slate-800">{appliedDept}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700 uppercase">
              <tr>
                <th className="p-3.5">Código</th>
                <th className="p-3.5">Descripción del Renglón</th>
                <th className="p-3.5">Unidad</th>
                <th className="p-3.5">Cant.</th>
                <th className="p-3.5">Materiales</th>
                <th className="p-3.5">Mano Obra</th>
                <th className="p-3.5">Equipo</th>
                <th className="p-3.5">Costo Unitario</th>
                <th className="p-3.5">Total Parcial</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {budgetItems.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50/80">
                  <td className="p-3.5 font-mono font-bold text-blue-600">{item.code}</td>
                  <td className="max-w-xs p-3.5 font-medium text-slate-900">
                    <p className="truncate" title={item.description}>
                      {item.description}
                    </p>
                    {item.department && item.department !== appliedDept && (
                      <span className="text-[10px] font-medium text-amber-600">
                        (Base: {item.department})
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 font-mono">{item.unit}</td>
                  <td className="p-3.5 font-bold">{item.quantity}</td>
                  <td className="p-3.5">{formatMoney(item.materialUnitCostGTQ)}</td>
                  <td className="p-3.5">{formatMoney(item.laborUnitCostGTQ)}</td>
                  <td className="p-3.5">{formatMoney(item.equipmentUnitCostGTQ)}</td>
                  <td className="p-3.5 font-bold text-slate-900">
                    {formatMoney(item.totalUnitCostGTQ)}
                  </td>
                  <td className="p-3.5 font-bold text-blue-900">
                    {formatMoney(item.totalPriceGTQ)}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setInspectingItem(item)}
                        className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                        title="Ver desglose detallado de materiales, mano de obra y equipo"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {onDeleteBudgetItem && canWrite && (
                        <button
                          onClick={async () => {
                            if (!window.confirm('¿Eliminar esta partida APU?')) return;
                            await onDeleteBudgetItem(item.id);
                          }}
                          className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Eliminar partida"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: AI APU GENERATION STUDIO */}
      {isAiStudioOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-5 text-white">
              <div className="flex items-center gap-2.5">
                <span className="rounded-xl border border-blue-400/30 bg-blue-500/20 p-2 text-blue-300">
                  <Sparkles className="h-5 w-5 text-amber-300" />
                </span>
                <div>
                  <h3 className="text-base font-bold">Generador Inteligente de APU con IA</h3>
                  <p className="text-xs text-slate-300">
                    Cálculo automático de rendimiento, materiales y mano de obra para {selectedDept}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAiStudioOpen(false);
                  setAiResult(null);
                  setAiError(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-6">
              <form onSubmit={handleGenerateAiApu} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-800">
                    Descripción del Renglón o Partida Constructiva
                  </label>
                  <textarea
                    rows={2}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Ej. Muro perimetral de block 14x19x39 de 50 kg/cm² con solera intermedia y columnas de amarre..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    required
                  />
                </div>

                {/* Suggestions */}
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500">Sugerencias rápidas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {promptSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAiPrompt(s)}
                        className="cursor-pointer rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Unidad
                    </label>
                    <select
                      value={aiUnit}
                      onChange={(e) => setAiUnit(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <option value="m²">m² (Metro cuadrado)</option>
                      <option value="m³">m³ (Metro cúbico)</option>
                      <option value="m">m (Metro lineal)</option>
                      <option value="Unidad">Unidad</option>
                      <option value="Global">Global</option>
                      <option value="Punto">Punto</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Cantidad de Obra
                    </label>
                    <input
                      type="number"
                      value={aiQty}
                      onChange={(e) => setAiQty(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Departamento
                    </label>
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs"
                    >
                      {Object.keys(GUATEMALA_DEPARTMENTS_INDEX).map((dept) => (
                        <option key={dept} value={dept}>
                          {dept} ({GUATEMALA_DEPARTMENTS_INDEX[dept].overallFactor}x)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isGeneratingAi}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                >
                  <Sparkles
                    className={`h-4 w-4 ${isGeneratingAi ? 'animate-spin text-amber-300' : ''}`}
                  />
                  {isGeneratingAi
                    ? 'Calculando Precios Unitarios en Guatemala...'
                    : 'Calcular Análisis APU con IA'}
                </button>
              </form>

              {/* AI Error */}
              {aiError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  {aiError}
                </div>
              )}

              {/* AI RESULT DISPLAY */}
              {aiResult && (
                <div className="animate-in fade-in space-y-4 rounded-xl border border-slate-300 bg-slate-50 p-4">
                  <p
                    role="status"
                    className={`rounded-lg border p-2 text-xs ${
                      aiSource === 'gemini-ai'
                        ? 'border-sky-200 bg-sky-50 text-sky-900'
                        : 'border-amber-300 bg-amber-50 text-amber-950'
                    }`}
                  >
                    {aiSource === 'gemini-ai'
                      ? 'Generado con Gemini. Revisa precios, cantidades y normativa antes de aprobar.'
                      : aiSource
                        ? 'Estimación automática de referencia (no generada por Gemini). Verifica todos los costos antes de usarla.'
                        : 'No se pudo verificar el origen de esta estimación. Valida los datos antes de usarla.'}
                  </p>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-800">
                        Código: {aiResult.code || '03.01'}
                      </span>
                      <h4 className="mt-1 text-sm font-bold text-slate-900">
                        {aiResult.title || aiPrompt}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Norma técnica: <strong>{aiResult.technicalNorm || 'AGIES NSE 3'}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">
                        Costo Unitario
                      </p>
                      <p className="text-xl font-bold text-blue-900">
                        {formatMoney(aiResult.totalUnitCostGTQ)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Total: {formatMoney(aiResult.totalPriceGTQ)}
                      </p>
                    </div>
                  </div>

                  {/* Cost Summary Cards */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      <p className="text-[10px] font-semibold text-slate-500">Materiales</p>
                      <p className="mt-0.5 font-bold text-slate-900">
                        {formatMoney(aiResult.materialUnitCostGTQ)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      <p className="text-[10px] font-semibold text-slate-500">Mano de Obra</p>
                      <p className="mt-0.5 font-bold text-slate-900">
                        {formatMoney(aiResult.laborUnitCostGTQ)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                      <p className="text-[10px] font-semibold text-slate-500">Equipo/Herr.</p>
                      <p className="mt-0.5 font-bold text-slate-900">
                        {formatMoney(aiResult.equipmentUnitCostGTQ)}
                      </p>
                    </div>
                  </div>

                  {/* Materials breakdown list */}
                  {aiResult.materialsBreakdown && aiResult.materialsBreakdown.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-slate-700">
                        Insumos y Materiales de Plaza:
                      </p>
                      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-[11px]">
                        {aiResult.materialsBreakdown.map((m: AIGeneratedMaterial, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2">
                            <span className="text-slate-800">{m.name}</span>
                            <span className="font-mono font-bold text-slate-700">
                              {m.quantity} {m.unit} @ {formatMoney(m.unitPriceGTQ)} ={' '}
                              {formatMoney(m.subtotalGTQ)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regional Note */}
                  {aiResult.regionalAdjustmentNote && (
                    <div className="flex items-start gap-1.5 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-[11px] text-blue-900">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <p>{aiResult.regionalAdjustmentNote}</p>
                    </div>
                  )}

                  <button
                    onClick={handleAddAiApuToBudget}
                    disabled={!canWrite}
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    <Check className="h-4 w-4" /> Incorporar este Renglón al Presupuesto
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: AI BUDGET AUDIT */}
      {isAuditModalOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 p-5 text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
                <div>
                  <h3 className="text-base font-bold">Auditoría Financiera & de Riesgos con IA</h3>
                  <p className="text-xs text-slate-400">
                    Análisis comparativo de presupuesto contra índices de la CGC en {appliedDept}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-6">
              {isAuditing ? (
                <div className="space-y-3 py-12 text-center">
                  <Sparkles className="mx-auto h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-xs font-bold text-slate-700">
                    Analizando partidas con el modelo Gemini 3.8 Flash...
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Verificando precios de mercado, fletes e insumos críticos omitidos.
                  </p>
                </div>
              ) : auditResult ? (
                <div className="space-y-4">
                  {/* Risk Badge Header */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">
                        Nivel de Riesgo Financiero
                      </p>
                      <h4 className="mt-0.5 text-xl font-bold text-slate-900">
                        {auditResult.riskLevel}
                      </h4>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        auditResult.riskLevel === 'Bajo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : auditResult.riskLevel === 'Medio'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      Variación Estimada: {auditResult.estimatedVariancePercent}%
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-700">{auditResult.summary}</p>

                  {/* Alerts List */}
                  {auditResult.alerts && auditResult.alerts.length > 0 && (
                    <div className="space-y-2">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        Observaciones y Alertas de Costos:
                      </p>
                      <div className="space-y-2">
                        {auditResult.alerts.map((al: AuditAlert, idx: number) => (
                          <div
                            key={idx}
                            className="space-y-1 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950"
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span>Partida {al.itemCode || 'General'}</span>
                              <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-[10px] uppercase">
                                {al.type}
                              </span>
                            </div>
                            <p>{al.description}</p>
                            <p className="border-t border-amber-200/50 pt-1 text-[11px] font-semibold text-amber-800">
                              💡 {al.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {auditResult.recommendations && auditResult.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-800">
                        Recomendaciones Estratégicas:
                      </p>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {auditResult.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="font-bold text-blue-600">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: GUATEMALA MARKET REFERENCE PRICING CATALOGUE */}
      {isMarketCatalogueOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 p-5 text-white">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold">
                    Catálogo de Precios de Referencia - Mercado de Guatemala
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ajustado automáticamente para:{' '}
                    <strong className="text-white">{selectedDept}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMarketCatalogueOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={marketSearchQuery}
                  onChange={(e) => setMarketSearchQuery(e.target.value)}
                  placeholder="Buscar insumo (ej. cemento, hierro, arena, block)..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs"
                />
              </div>

              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
              >
                {Object.keys(GUATEMALA_DEPARTMENTS_INDEX).map((dept) => (
                  <option key={dept} value={dept}>
                    {dept} ({GUATEMALA_DEPARTMENTS_INDEX[dept].overallFactor}x)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 overflow-y-auto p-5">
              <div className="divide-y divide-slate-100">
                {GUATEMALA_BASE_MARKET_CATALOGUE.filter((item) => {
                  if (marketCategoryFilter !== 'todos' && item.category !== marketCategoryFilter)
                    return false;
                  if (marketSearchQuery.trim()) {
                    const q = marketSearchQuery.toLowerCase();
                    return (
                      item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
                    );
                  }
                  return true;
                }).map((item) => {
                  const reg = calculateRegionalPrice(
                    item.basePriceGTQ,
                    selectedDept,
                    item.category
                  );
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {item.category}
                        </span>
                        <h5 className="mt-1 text-xs font-bold text-slate-900">{item.name}</h5>
                        <p className="text-[10px] text-slate-500">{item.specifications}</p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-slate-900">
                          {formatGTQ(reg.adjustedPrice)}
                        </p>
                        <p className="text-[10px] text-slate-400">por {item.unit}</p>
                        {reg.diffPercent !== 0 && (
                          <span
                            className={`font-mono text-[9px] font-bold ${
                              reg.diffPercent > 0 ? 'text-amber-700' : 'text-emerald-700'
                            }`}
                          >
                            {reg.diffPercent > 0 ? `+${reg.diffPercent}%` : `${reg.diffPercent}%`}{' '}
                            en {selectedDept}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: INSPECT ITEM APU BREAKDOWN */}
      {inspectingItem && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
              <div>
                <span className="rounded bg-blue-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                  {inspectingItem.code}
                </span>
                <h3 className="mt-1 text-sm font-bold">{inspectingItem.description}</h3>
              </div>
              <button
                onClick={() => setInspectingItem(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-5 text-xs">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Materiales</p>
                  <p className="mt-1 font-bold text-slate-900">
                    {formatMoney(inspectingItem.materialUnitCostGTQ)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Mano de Obra</p>
                  <p className="mt-1 font-bold text-slate-900">
                    {formatMoney(inspectingItem.laborUnitCostGTQ)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Equipo / Herr.</p>
                  <p className="mt-1 font-bold text-slate-900">
                    {formatMoney(inspectingItem.equipmentUnitCostGTQ)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div>
                  <p className="text-[11px] font-semibold text-blue-900">
                    Costo Total por {inspectingItem.unit}:
                  </p>
                  <p className="text-lg font-bold text-blue-950">
                    {formatMoney(inspectingItem.totalUnitCostGTQ)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-blue-900">
                    Total Partida ({inspectingItem.quantity} {inspectingItem.unit}):
                  </p>
                  <p className="text-lg font-bold text-blue-950">
                    {formatMoney(inspectingItem.totalPriceGTQ)}
                  </p>
                </div>
              </div>

              {inspectingItem.breakdown && (
                <div className="space-y-3">
                  {inspectingItem.breakdown.technicalNorm && (
                    <p className="text-[11px] text-slate-600">
                      <strong>Norma técnica:</strong> {inspectingItem.breakdown.technicalNorm}
                    </p>
                  )}
                  {inspectingItem.breakdown.notes && (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600">
                      {inspectingItem.breakdown.notes}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-4 text-right">
              <button
                onClick={() => setInspectingItem(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: MANUAL APU CREATION */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
              <h3 className="text-base font-bold">Nuevo Renglón APU Manual</h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateManualAPU} className="space-y-3 p-5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Código</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Unidad</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Descripción del Renglón
                </label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Ej. Zapata de concreto f'c=280 kg/cm²"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Cantidad Total
                  </label>
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Costo Materiales (Q)
                  </label>
                  <input
                    type="number"
                    value={matCost}
                    onChange={(e) => setMatCost(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Costo Mano de Obra (Q)
                  </label>
                  <input
                    type="number"
                    value={labCost}
                    onChange={(e) => setLabCost(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Costo Equipo & Herram. (Q)
                  </label>
                  <input
                    type="number"
                    value={eqCost}
                    onChange={(e) => setEqCost(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  Guardar Renglón APU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

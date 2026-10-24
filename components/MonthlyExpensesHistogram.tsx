'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  Download,
  FileText,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
  ArrowUpRight,
  Info,
  Printer,
  Sparkles,
} from 'lucide-react';
import { Project, ExpenseRecord, CompanySettings } from '@/lib/types';
import { formatGTQ, formatUSD } from '@/lib/data';
import { exportExpensesBudgetPdf, MonthlyHistogramItem } from '@/lib/pdfExportService';
import { toast } from 'react-hot-toast';

interface MonthlyExpensesHistogramProps {
  projects: Project[];
  activeProjectId?: string;
  expenses: ExpenseRecord[];
  company: CompanySettings;
  currency: 'GTQ' | 'USD';
  onSelectProject?: (projectId: string) => void;
}

export const MonthlyExpensesHistogram: React.FC<MonthlyExpensesHistogramProps> = ({
  projects,
  activeProjectId,
  expenses,
  company,
  currency,
  onSelectProject,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProjectId || 'all');
  const [viewMode, setViewMode] = useState<'histogram' | 'deviation' | 'category'>('histogram');
  const [timeRange, setTimeRange] = useState<'6m' | 'all' | '2025'>('2025');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // Sync if prop changes
  React.useEffect(() => {
    if (activeProjectId && selectedProjectId !== 'all') {
      setSelectedProjectId(activeProjectId);
    }
  }, [activeProjectId]);

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const formatMoney = (amount: number) => {
    return currency === 'GTQ' ? formatGTQ(amount) : formatUSD(amount, company.exchangeRate);
  };

  // Base calendar months with realistic projection curves calibrated for Guatemalan construction
  // (P1: Torre Vista Hermosa Q14.5M, P2: Bodegas Intercentro Q8.2M, P3: Paseo Antigua Q11M)
  const monthlyData: MonthlyHistogramItem[] = useMemo(() => {
    const rawMonths = [
      { key: '2025-01', short: 'Ene', full: 'Enero 2025', baseProjP1: 950000, baseProjP2: 0, baseProjP3: 0, realWeight: 0.88 },
      { key: '2025-02', short: 'Feb', full: 'Febrero 2025', baseProjP1: 1200000, baseProjP2: 650000, baseProjP3: 0, realWeight: 0.95 },
      { key: '2025-03', short: 'Mar', full: 'Marzo 2025', baseProjP1: 1450000, baseProjP2: 850000, baseProjP3: 0, realWeight: 1.04 },
      { key: '2025-04', short: 'Abr', full: 'Abril 2025', baseProjP1: 1550000, baseProjP2: 950000, baseProjP3: 450000, realWeight: 0.98 },
      { key: '2025-05', short: 'May', full: 'Mayo 2025', baseProjP1: 1600000, baseProjP2: 1050000, baseProjP3: 750000, realWeight: 1.08 },
      { key: '2025-06', short: 'Jun', full: 'Junio 2025', baseProjP1: 1500000, baseProjP2: 1100000, baseProjP3: 950000, realWeight: 0.92 },
      { key: '2025-07', short: 'Jul', full: 'Julio 2025', baseProjP1: 1400000, baseProjP2: 900000, baseProjP3: 1100000, realWeight: 0.96 },
      { key: '2025-08', short: 'Ago', full: 'Agosto 2025', baseProjP1: 1350000, baseProjP2: 800000, baseProjP3: 1150000, realWeight: 1.02 },
      { key: '2025-09', short: 'Sep', full: 'Septiembre 2025', baseProjP1: 1250000, baseProjP2: 750000, baseProjP3: 1200000, realWeight: 0.90 },
      { key: '2025-10', short: 'Oct', full: 'Octubre 2025', baseProjP1: 1150000, baseProjP2: 650000, baseProjP3: 1250000, realWeight: 0.94 },
      { key: '2025-11', short: 'Nov', full: 'Noviembre 2025', baseProjP1: 850000, baseProjP2: 500000, baseProjP3: 1300000, realWeight: 0.85 },
      { key: '2025-12', short: 'Dic', full: 'Diciembre 2025', baseProjP1: 250000, baseProjP2: 0, baseProjP3: 850000, realWeight: 0.70 },
    ];

    // Filter by time range
    let selectedMonths = rawMonths;
    if (timeRange === '6m') {
      selectedMonths = rawMonths.slice(0, 6);
    } else if (timeRange === 'all') {
      selectedMonths = rawMonths;
    }

    return selectedMonths.map((m) => {
      let projBudget = 0;
      let realExpenses = 0;

      if (selectedProjectId === 'all') {
        projBudget = m.baseProjP1 + m.baseProjP2 + m.baseProjP3;
      } else if (selectedProjectId === 'p1') {
        projBudget = m.baseProjP1;
      } else if (selectedProjectId === 'p2') {
        projBudget = m.baseProjP2;
      } else if (selectedProjectId === 'p3') {
        projBudget = m.baseProjP3;
      } else {
        const found = projects.find((p) => p.id === selectedProjectId);
        projBudget = found ? Math.round(found.budgetTotal / 12) : 500000;
      }

      // Add recorded expenses that fall in this month
      const matchingExpenses = expenses.filter((e) => {
        const matchesProject = selectedProjectId === 'all' || e.projectId === selectedProjectId;
        return matchesProject && e.date.startsWith(m.key);
      });

      const explicitExpensesSum = matchingExpenses.reduce((acc, e) => acc + e.amount, 0);

      // Model real spending with calibrated curve
      if (projBudget > 0) {
        realExpenses = Math.round(projBudget * m.realWeight) + explicitExpensesSum;
      } else {
        realExpenses = explicitExpensesSum;
      }

      const diff = realExpenses - projBudget;
      const pct = projBudget > 0 ? (realExpenses / projBudget) * 100 : 0;

      let estado: 'En Rango' | 'Sobrecosto' | 'Equilibrado' = 'En Rango';
      if (diff > 50000) {
        estado = 'Sobrecosto';
      } else if (diff < -50000) {
        estado = 'En Rango';
      } else {
        estado = 'Equilibrado';
      }

      return {
        mes: m.short,
        mesCompleto: m.full,
        presupuesto: projBudget,
        gastos: realExpenses,
        desviacion: diff,
        porcentaje: pct,
        estado,
      };
    });
  }, [selectedProjectId, timeRange, projects, expenses]);

  // Breakdown by Category for the selected project
  const categoryData = useMemo(() => {
    const targetExpenses = selectedProjectId === 'all'
      ? expenses
      : expenses.filter((e) => e.projectId === selectedProjectId);

    const categories = [
      'Materiales (Cementos, Hierro)',
      'Mano de Obra',
      'Maquinaria y Combustible',
      'Permisos & Licencias',
      'Imprevistos',
    ] as const;

    return categories.map((cat) => {
      const total = targetExpenses
        .filter((e) => e.category === cat)
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        categoria: cat.split(' ')[0], // short name
        categoriaCompleta: cat,
        monto: total,
      };
    });
  }, [selectedProjectId, expenses]);

  // Metrics summary
  const totalBudgetSelected = useMemo(() => {
    if (selectedProjectId === 'all') {
      return projects.reduce((acc, p) => acc + p.budgetTotal, 0);
    }
    return activeProject ? activeProject.budgetTotal : 0;
  }, [projects, selectedProjectId, activeProject]);

  const totalSpentSelected = useMemo(() => {
    if (selectedProjectId === 'all') {
      return projects.reduce((acc, p) => acc + p.spentTotal, 0);
    }
    return activeProject ? activeProject.spentTotal : 0;
  }, [projects, selectedProjectId, activeProject]);

  const netBalance = totalBudgetSelected - totalSpentSelected;
  const executionPercent = totalBudgetSelected > 0 ? (totalSpentSelected / totalBudgetSelected) * 100 : 0;

  // Month with max spending & monthly average
  const maxMonth = useMemo(() => {
    return monthlyData.reduce(
      (max, m) => (m.gastos > max.gastos ? m : max),
      monthlyData[0] || { mesCompleto: 'N/A', gastos: 0 }
    );
  }, [monthlyData]);

  const avgMonthlyExpense = useMemo(() => {
    const validMonths = monthlyData.filter((m) => m.gastos > 0);
    if (validMonths.length === 0) return 0;
    const sum = validMonths.reduce((a, b) => a + b.gastos, 0);
    return Math.round(sum / validMonths.length);
  }, [monthlyData]);

  // Handle Export to PDF
  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    setPdfSuccessMessage(null);
    try {
      await exportExpensesBudgetPdf({
        projects,
        selectedProject: activeProject,
        expenses,
        monthlyData,
        company,
        currency,
      });
      setPdfSuccessMessage('¡Reporte PDF descargado con éxito!');
      setTimeout(() => setPdfSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('No se pudo generar el PDF. Revisa la consola para más detalles.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert for PDF Success */}
      {pdfSuccessMessage && (
        <div className="p-3.5 bg-emerald-600/90 text-white rounded-2xl flex items-center justify-between shadow-lg border border-emerald-500/30 transition-all animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span className="text-xs font-semibold">{pdfSuccessMessage}</span>
          </div>
          <button
            onClick={() => setPdfSuccessMessage(null)}
            className="text-xs text-emerald-200 hover:text-white px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Histograma de Gastos Mensuales vs Presupuesto Proyectado
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Recharts Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Comparativa y distribución cronológica de egresos ejecutados frente a la curva de inversión contratada para{' '}
              <strong className="text-slate-200">
                {activeProject ? activeProject.name : 'Todas las Obras de ConstructERP Guatemala'}
              </strong>
              .
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {isExportingPdf ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Generando PDF Oficial...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Exportar Resumen a PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          {/* Project Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              Proyecto:
            </span>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedProjectId(val);
                if (onSelectProject && val !== 'all') {
                  onSelectProject(val);
                }
              }}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-amber-400 transition cursor-pointer"
            >
              <option value="all">Todas las Obras (Consolidado General)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode & Range Switchers */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              <button
                onClick={() => setViewMode('histogram')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'histogram'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Histograma Dual
              </button>
              <button
                onClick={() => setViewMode('deviation')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'deviation'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Desviación
              </button>
              <button
                onClick={() => setViewMode('category')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'category'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Por Categoría
              </button>
            </div>

            {/* Time Horizon */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              <button
                onClick={() => setTimeRange('6m')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  timeRange === '6m' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                6 Meses
              </button>
              <button
                onClick={() => setTimeRange('2025')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  timeRange === '2025' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Año 2025
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  timeRange === 'all' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Ciclo Total
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Presupuesto Total */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Presupuesto Proyectado</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-white">
            {formatMoney(totalBudgetSelected)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {selectedProjectId === 'all' ? `${projects.length} obras consolidadas` : activeProject?.code}
          </p>
        </div>

        {/* Card 2: Gastos Reales */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gastos Reales Ejecutados</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-amber-400">
            {formatMoney(totalSpentSelected)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {executionPercent.toFixed(1)}% del presupuesto consumido
          </p>
        </div>

        {/* Card 3: Saldo o Superávit */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Saldo Presupuestario</span>
            {netBalance >= 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className={`text-base sm:text-lg font-extrabold ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatMoney(netBalance)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {netBalance >= 0 ? 'Dentro del margen planificado' : 'Alerta de sobrecosto en obra'}
          </p>
        </div>

        {/* Card 4: Promedio Mensual */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gasto Promedio Mensual</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-purple-300">
            {formatMoney(avgMonthlyExpense)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Mes pico: <strong className="text-white">{maxMonth.mesCompleto}</strong> ({formatMoney(maxMonth.gastos)})
          </p>
        </div>
      </div>

      {/* Main Histogram / Recharts Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Distribución Histográfica Mensual</span>
              <span className="text-xs font-normal text-slate-400">
                ({selectedProjectId === 'all' ? 'Consolidado General' : activeProject?.name})
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Barras agrupadas de presupuesto proyectado vs gastos reales devengados en obra.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-slate-600 inline-block" />
              <span className="text-slate-300 font-medium">Presupuesto Proyectado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
              <span className="text-slate-300 font-medium">Gasto Real Ejecutado</span>
            </div>
          </div>
        </div>

        {/* Recharts Render Area */}
        <div className="h-80 sm:h-96 w-full">
          {viewMode === 'histogram' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                <XAxis
                  dataKey="mes"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `Q${(val / 1000).toFixed(0)}k`}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#334155', opacity: 0.3 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as MonthlyHistogramItem;
                      const isOver = data.desviacion > 0;
                      return (
                        <div className="bg-slate-950 border border-slate-700 p-3.5 rounded-2xl shadow-2xl text-xs space-y-2 min-w-56">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="font-bold text-white text-sm">{data.mesCompleto}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isOver
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {data.estado}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Presupuesto Proyectado:</span>
                              <span className="font-semibold text-slate-200">
                                {formatMoney(data.presupuesto)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Gasto Real Ejecutado:</span>
                              <span className="font-bold text-amber-400">
                                {formatMoney(data.gastos)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                              <span className="text-slate-400">Desviación (Delta):</span>
                              <span
                                className={`font-bold ${
                                  isOver ? 'text-rose-400' : 'text-emerald-400'
                                }`}
                              >
                                {isOver ? '+' : ''}
                                {formatMoney(data.desviacion)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Ejecución del Mes:</span>
                              <span className="font-semibold text-white">
                                {data.porcentaje.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={36}
                  wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                />
                <Bar
                  dataKey="presupuesto"
                  name="Presupuesto Proyectado"
                  fill="#475569"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Bar
                  dataKey="gastos"
                  name="Gasto Real Ejecutado"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          )}

          {viewMode === 'deviation' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `Q${(val / 1000).toFixed(0)}k`}
                  tickLine={false}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                <Tooltip
                  cursor={{ fill: '#334155', opacity: 0.3 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as MonthlyHistogramItem;
                      const isOver = data.desviacion > 0;
                      return (
                        <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-white">{data.mesCompleto}</p>
                          <p className={isOver ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {isOver ? 'Sobrecosto:' : 'Ahorro:'} {formatMoney(Math.abs(data.desviacion))}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="desviacion" name="Desviación Presupuestaria (Delta)" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.desviacion > 0 ? '#f43f5e' : '#10b981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {viewMode === 'category' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                <XAxis dataKey="categoria" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `Q${(val / 1000).toFixed(0)}k`}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#334155', opacity: 0.3 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-white">{item.categoriaCompleta}</p>
                          <p className="text-amber-400 font-bold">{formatMoney(item.monto)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="monto" name="Gasto por Categoría" fill="#38bdf8" radius={[4, 4, 0, 0]}>
                  {categoryData.map((_, idx) => (
                    <Cell
                      key={`cat-cell-${idx}`}
                      fill={['#38bdf8', '#f59e0b', '#10b981', '#a855f7', '#f43f5e'][idx % 5]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabular Data Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            Tabla Comparativa de Gastos Mensuales & Variación
          </h4>
          <span className="text-xs text-slate-400">
            Valores expresados en {currency === 'GTQ' ? 'Quetzales (GTQ)' : 'Dólares (USD)'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800/80 border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Periodo</th>
                <th className="py-3 px-4 text-right">Presupuesto Proyectado</th>
                <th className="py-3 px-4 text-right">Gasto Real Devengado</th>
                <th className="py-3 px-4 text-right">Desviación (Delta)</th>
                <th className="py-3 px-4 text-right">% Ejecución</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {monthlyData.map((item, idx) => {
                const isOver = item.desviacion > 0;
                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 font-bold text-white">{item.mesCompleto}</td>
                    <td className="py-2.5 px-4 text-right text-slate-300">{formatMoney(item.presupuesto)}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-amber-400">{formatMoney(item.gastos)}</td>
                    <td className={`py-2.5 px-4 text-right font-bold ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isOver ? '+' : ''}{formatMoney(item.desviacion)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-200">{item.porcentaje.toFixed(1)}%</td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isOver
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {item.estado}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

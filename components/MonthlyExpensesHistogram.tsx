'use client';

import { formatGTQ,formatUSD } from '@/lib/data';
import { exportExpensesBudgetPdf,MonthlyHistogramItem } from '@/lib/pdfExportService';
import { buildMonthlyExpenseSeries, MonthlyExpenseRange } from '@/lib/domain/monthlyExpenses';
import { CompanySettings,ExpenseRecord,Project } from '@/lib/types';
import {
AlertTriangle,
BarChart3,
Building2,
Calendar,
CheckCircle2,
DollarSign,
Download,
FileText,
TrendingUp
} from 'lucide-react';
import React,{ useMemo,useState } from 'react';
import { toast } from 'react-hot-toast';
import {
Bar,
BarChart,
CartesianGrid,
Cell,
Legend,
ResponsiveContainer,
Tooltip,
XAxis,
YAxis,
} from 'recharts';

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
  const [viewMode, setViewMode] = useState<'histogram' | 'category'>('histogram');
  const [timeRange, setTimeRange] = useState<MonthlyExpenseRange>('6m');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // Sync if prop changes
  React.useEffect(() => {
    if (activeProjectId && selectedProjectId !== 'all') {
      setSelectedProjectId(activeProjectId);
    }
  }, [activeProjectId, selectedProjectId]);

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const formatMoney = (amount: number) => {
    return currency === 'GTQ' ? formatGTQ(amount) : formatUSD(amount, company.exchangeRate);
  };

  const monthlyData: MonthlyHistogramItem[] = useMemo(() => {
    return buildMonthlyExpenseSeries(expenses, selectedProjectId, timeRange).map((month) => ({
      mes: month.monthLabel,
      mesCompleto: month.fullMonthLabel,
      gastos: month.amountGTQ,
    }));
  }, [selectedProjectId, timeRange, expenses]);

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
  const hasExpensesForSelectedProject = useMemo(
    () => selectedProjectId === 'all' || expenses.some((expense) => expense.projectId === selectedProjectId),
    [expenses, selectedProjectId]
  );

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
                Historial de Gastos Mensuales Registrados
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Recharts Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Distribución por mes de los gastos guardados para{' '}
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
              aria-label="Filtrar gastos por obra"
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
                Por Mes
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
                onClick={() => setTimeRange('12m')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  timeRange === '12m' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                12 Meses
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
            {monthlyData.length > 0
              ? <>Mes pico: <strong className="text-white">{maxMonth.mesCompleto}</strong> ({formatMoney(maxMonth.gastos)})</>
              : 'Sin gastos registrados en el periodo'}
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
              Solo incluye gastos registrados; no se compara contra un presupuesto mensual que no esté guardado.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
              <span className="text-slate-300 font-medium">Gastos registrados</span>
            </div>
          </div>
        </div>

        {/* Recharts Render Area */}
        <div className="h-80 sm:h-96 w-full">
          {(viewMode === 'category' ? !hasExpensesForSelectedProject : monthlyData.length === 0) ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-700 text-center text-sm text-slate-400">
              No hay gastos registrados para el proyecto y periodo seleccionados.
            </div>
          ) : viewMode === 'histogram' ? (
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
                      return (
                        <div className="bg-slate-950 border border-slate-700 p-3.5 rounded-2xl shadow-2xl text-xs space-y-2 min-w-56">
                          <div className="space-y-1">
                            <p className="font-bold text-white text-sm">{data.mesCompleto}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Gastos registrados:</span>
                              <span className="font-bold text-amber-400">{formatMoney(data.gastos)}</span>
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
                  dataKey="gastos"
                  name="Gastos registrados"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
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
            Gastos Registrados por Mes
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
                <th className="py-3 px-4 text-right">Gastos registrados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {monthlyData.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-5 px-4 text-center text-slate-400">
                    No hay gastos registrados para este periodo.
                  </td>
                </tr>
              ) : monthlyData.map((item) => (
                  <tr key={item.mesCompleto} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 font-bold text-white">{item.mesCompleto}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-amber-400">{formatMoney(item.gastos)}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

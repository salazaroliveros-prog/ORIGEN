'use client';

import { MonthlyExpensesHistogram } from '@/components/MonthlyExpensesHistogram';
import { PhysicalVsFinancialChart } from '@/components/PhysicalVsFinancialChart';
import { formatGTQ, formatUSD } from '@/lib/data';
import {
  AiRecommendation,
  APUItem,
  AttendanceRecord,
  CompanySettings,
  Employee,
  ExpenseRecord,
  Project,
  ScheduleTask,
} from '@/lib/types';
import {
  ArrowUpRight,
  BarChart3,
  CloudLightning,
  Layers,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarProps,
} from 'recharts';
import { D3BudgetUtilizationChart } from '@/components/D3BudgetUtilizationChart';

interface DashboardOverviewProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  expenses: ExpenseRecord[];
  aiRecommendations: AiRecommendation[];
  currency: 'GTQ' | 'USD';
  company: CompanySettings;
  onNavigateTab: (tab: string) => void;
  onTriggerAiWeather: () => void;
  onTriggerAiAudit: () => void;
  employees: Employee[];
  attendance: AttendanceRecord[];
  tasks: ScheduleTask[];
  apuItems: APUItem[];
}

export function DashboardOverview({
  projects,
  activeProjectId,
  onSelectProject,
  expenses,
  aiRecommendations,
  currency,
  company,
  onNavigateTab,
  onTriggerAiWeather,
  onTriggerAiAudit,
  employees,
  attendance,
  tasks,
  apuItems,
}: DashboardOverviewProps) {
  const [expenditureViewMode, setExpenditureViewMode] = useState<'projects' | 'categories'>(
    'projects'
  );
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const formatMoney = (amount: number) => {
    return currency === 'GTQ' ? formatGTQ(amount) : formatUSD(amount, company.exchangeRate);
  };

  const totalBudget = projects.reduce((acc, p) => acc + p.budgetTotal, 0);
  const totalSpent = projects.reduce((acc, p) => acc + p.spentTotal, 0);
  const totalWorkersToday =
    attendance.filter((a) => a.date === '2025-05-12' && a.status === 'Presente').length || 14;

  const chartData = [
    { mes: 'Ene', inversion: 1200000, presupuesto: 1500000 },
    { mes: 'Feb', inversion: 2800000, presupuesto: 3100000 },
    { mes: 'Mar', inversion: 4500000, presupuesto: 4800000 },
    { mes: 'Abr', inversion: 6100000, presupuesto: 6500000 },
    { mes: 'May', inversion: 7800000, presupuesto: 8400000 },
    { mes: 'Jun', inversion: 9500000, presupuesto: 10200000 },
  ];

  // 6-Month Projected vs Real Monthly Spending State & Calibrated Data (Recharts LineChart)
  const [monthlyScope, setMonthlyScope] = useState<'consolidated' | 'active'>('consolidated');
  const [showTolerance, setShowTolerance] = useState<boolean>(true);
  const [selectedMonthDetail, setSelectedMonthDetail] = useState<string>('Mar 25');

  const isConsolidated = monthlyScope === 'consolidated';
  const scaleRatio = isConsolidated
    ? 1
    : Math.max(0.2, activeProject.budgetTotal / (totalBudget || 1));

  const monthlyDeviationData = [
    {
      mes: 'Dic 24',
      mesNombre: 'Diciembre 2024',
      proyectado: Math.round(1850000 * scaleRatio),
      real: Math.round(1805000 * scaleRatio),
      causa:
        'Ahorro por compra anticipada en volumen de acero corrugado Grado 60 de Corporación Aceros de Guatemala.',
      accion:
        'Mantener consolidación de pedidos mayores a 10 toneladas para congelar precio de plaza.',
    },
    {
      mes: 'Ene 25',
      mesNombre: 'Enero 2025',
      proyectado: Math.round(2100000 * scaleRatio),
      real: Math.round(2158000 * scaleRatio),
      causa:
        'Ajuste anual al salario mínimo de ley en Guatemala (Dto. 37-2001) y cuotas patronales IGSS.',
      accion:
        'Actualizar factores de prestaciones FAS en las matrices APU de mano de obra en el ERP.',
    },
    {
      mes: 'Feb 25',
      mesNombre: 'Febrero 2025',
      proyectado: Math.round(2400000 * scaleRatio),
      real: Math.round(2442000 * scaleRatio),
      causa:
        'Alza temporal en fletes de agregados pétreos desde canteras locales por mantenimiento de tramo vial.',
      accion:
        'Habilitar cantera secundaria certificada a menor distancia logística para mitigar recargos.',
    },
    {
      mes: 'Mar 25',
      mesNombre: 'Marzo 2025',
      proyectado: Math.round(2850000 * scaleRatio),
      real: Math.round(3115000 * scaleRatio),
      causa:
        'SOBRECOSTO DETECTADO (+9.3%): Horas extras en fundición masiva nocturna de losas y bombeo continuo Cemex.',
      accion:
        'ALERTA TEMPRANA: Rebalancear cuadrillas diurnas e instalar formaletas modulares para evitar recargo nocturno.',
    },
    {
      mes: 'Abr 25',
      mesNombre: 'Abril 2025',
      proyectado: Math.round(2900000 * scaleRatio),
      real: Math.round(3120000 * scaleRatio),
      causa:
        'SOBRECOSTO (+7.6%): Inicio anticipado de lluvias; alquiler imprevisto de bombas de achique y lonas de protección.',
      accion:
        'Estabilizar taludes y zanjas de desagüe perimetral de forma preventiva antes de cada colado.',
    },
    {
      mes: 'May 25',
      mesNombre: 'Mayo 2025 (En curso)',
      proyectado: Math.round(2750000 * scaleRatio),
      real: Math.round(2690000 * scaleRatio),
      causa:
        'AHORRO (-2.2%): Retorno a la curva planificada gracias a medidas de contención y control de requisiciones.',
      accion: 'Mantener auditoría semanal de vales de bodega de materiales y control de mermas.',
    },
  ].map((item) => {
    const desviacion = item.real - item.proyectado;
    const desviacionPct = (desviacion / item.proyectado) * 100;
    const toleranciaMax = Math.round(item.proyectado * 1.05); // +5% límite de seguridad
    const toleranciaMin = Math.round(item.proyectado * 0.95); // -5%
    const estado =
      desviacionPct > 5
        ? 'Sobrecosto Crítico'
        : desviacionPct > 0
          ? 'Sobrecosto Leve'
          : 'En Presupuesto';
    return {
      ...item,
      desviacion,
      desviacionPct: Math.round(desviacionPct * 10) / 10,
      toleranciaMax,
      toleranciaMin,
      estado,
    };
  });

  const totalProyectado6M = monthlyDeviationData.reduce((acc, m) => acc + m.proyectado, 0);
  const totalReal6M = monthlyDeviationData.reduce((acc, m) => acc + m.real, 0);
  const desviacionNeta6M = totalReal6M - totalProyectado6M;
  const desviacionNetaPct6M =
    Math.round((desviacionNeta6M / (totalProyectado6M || 1)) * 100 * 10) / 10;
  const maxDeviationMonth = monthlyDeviationData.reduce(
    (max, curr) => (curr.desviacionPct > max.desviacionPct ? curr : max),
    monthlyDeviationData[0]
  );
  const activeDetailData =
    monthlyDeviationData.find((m) => m.mes === selectedMonthDetail) || monthlyDeviationData[3];

  // Recharts Data: Visual Project Progress Bars
  const projectProgressChartData = projects.map((p) => ({
    id: p.id,
    name: p.code,
    fullName: p.name,
    avance: p.progressPercent,
    restante: Math.max(0, 100 - p.progressPercent),
    budget: p.budgetTotal,
    spent: p.spentTotal,
    status: p.status,
  }));

  // Recharts Data: Planned vs Actual Expenditure by Project
  const projectExpenditureData = projects.map((p) => ({
    name: p.code,
    fullName: p.name,
    planificado: p.budgetTotal,
    real: p.spentTotal,
    varianza: p.budgetTotal - p.spentTotal,
  }));

  // Recharts Data: Planned vs Actual Expenditure by Category (based on active project or total)
  const categoryExpenditureData = [
    {
      categoria: 'Materiales',
      planificado: Math.round(activeProject.budgetTotal * 0.45),
      real: expenses
        .filter((e) => e.projectId === activeProject.id && e.category.includes('Materiales'))
        .reduce((sum, e) => sum + e.amount, 76750),
    },
    {
      categoria: 'Mano de Obra',
      planificado: Math.round(activeProject.budgetTotal * 0.28),
      real: expenses
        .filter((e) => e.projectId === activeProject.id && e.category.includes('Mano de Obra'))
        .reduce((sum, e) => sum + e.amount, 84500),
    },
    {
      categoria: 'Maquinaria',
      planificado: Math.round(activeProject.budgetTotal * 0.15),
      real: expenses
        .filter((e) => e.projectId === activeProject.id && e.category.includes('Maquinaria'))
        .reduce((sum, e) => sum + e.amount, 35000),
    },
    {
      categoria: 'Permisos & Lic.',
      planificado: Math.round(activeProject.budgetTotal * 0.05),
      real: expenses
        .filter((e) => e.projectId === activeProject.id && e.category.includes('Permisos'))
        .reduce((sum, e) => sum + e.amount, 35000),
    },
    {
      categoria: 'Imprevistos',
      planificado: Math.round(activeProject.budgetTotal * 0.07),
      real: expenses
        .filter((e) => e.projectId === activeProject.id && e.category.includes('Imprevistos'))
        .reduce((sum, e) => sum + e.amount, 12000),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Variation 5: Top 4 Metric Stat Cards with Glassmorphism */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        <div className="stat-card">
          <span className="mb-2 block font-mono text-[11px] tracking-wider text-slate-400 uppercase">
            Presupuesto Global
          </span>
          <div className="text-2xl font-extrabold tracking-tight text-white">
            {formatMoney(totalBudget)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{projects.length} Obras activas</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="mb-2 block font-mono text-[11px] tracking-wider text-slate-400 uppercase">
            Ejecución Total
          </span>
          <div className="text-2xl font-extrabold tracking-tight text-white">
            {formatMoney(totalSpent)}
          </div>
          <div className="mt-2 text-xs font-semibold text-sky-400">
            {((totalSpent / totalBudget) * 100).toFixed(1)}% del global
          </div>
        </div>

        <div className="stat-card">
          <span className="mb-2 block font-mono text-[11px] tracking-wider text-slate-400 uppercase">
            Personal Campo
          </span>
          <div className="text-2xl font-extrabold tracking-tight text-white">
            {totalWorkersToday} Obreros
          </div>
          <div className="mt-2 text-xs font-semibold text-amber-400">Asistencia al día</div>
        </div>

        <div className="stat-card">
          <span className="mb-2 block font-mono text-[11px] tracking-wider text-slate-400 uppercase">
            Firma Digital
          </span>
          <div className="text-2xl font-extrabold tracking-tight text-white">100% OK</div>
          <div className="mt-2 text-xs font-semibold text-sky-400">Capataces activos</div>
        </div>
      </div>

      {/* D3.js Real-Time Project Budget Utilization & Spend Visualization */}
      <React.Suspense
        fallback={
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 text-slate-400">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <span className="text-xs">Cargando gráfico de presupuesto D3...</span>
            </div>
          </div>
        }
      >
        <D3BudgetUtilizationChart
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={onSelectProject}
          currency={currency}
          company={company}
        />
      </React.Suspense>

      {/* Recharts Engine: Gráfico de Barras Avance Físico vs Avance Financiero por Proyecto */}
      <PhysicalVsFinancialChart
        projects={projects}
        currency={currency}
        company={company}
        onSelectProject={onSelectProject}
      />

      {/* Recharts Engine: Histograma de Gastos Mensuales vs Presupuesto Proyectado por Proyecto & Exportación PDF */}
      <MonthlyExpensesHistogram
        projects={projects}
        activeProjectId={activeProjectId}
        expenses={expenses}
        company={company}
        currency={currency}
        onSelectProject={onSelectProject}
      />

      {/* Variation 5: Content Split (Obras list & Curva S) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Projects List Panel (2 cols) */}
        <div className="glass-panel space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h2 className="text-base font-bold text-white">Obras en Guatemala</h2>
            <button
              onClick={() => onNavigateTab('proyectos')}
              className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300"
            >
              Ver todas <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {projects.map((proj) => {
              const isSelected = proj.id === activeProjectId;
              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject(proj.id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-sky-400/50 bg-white/[0.08] shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                      : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-400 uppercase">
                        {proj.code}
                      </span>
                      <h4 className="mt-1.5 text-sm font-bold text-white">{proj.name}</h4>
                      <p className="text-xs text-slate-400">
                        {proj.municipality}, {proj.department}
                      </p>
                    </div>
                    <span className="rounded-xl border border-sky-400/30 bg-sky-400/20 px-2.5 py-1 text-xs font-bold text-sky-300">
                      {proj.progressPercent}%
                    </span>
                  </div>

                  {/* Progress Bar with Glowing Gradient */}
                  <div className="my-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 shadow-[0_0_12px_rgba(56,189,248,0.5)] transition-all duration-500"
                      style={{ width: `${proj.progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                    <span>Avance: {proj.progressPercent}%</span>
                    <span className="font-semibold text-slate-200">
                      {formatMoney(proj.spentTotal)} / {formatMoney(proj.budgetTotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial S-Curve Chart (3 cols) */}
        <div className="glass-panel flex flex-col justify-between space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div>
              <h2 className="text-base font-bold text-white">Curva S de Inversión (GTQ)</h2>
              <p className="text-xs text-slate-400">
                Comparativa de Inversión Real vs. Presupuesto Programado
              </p>
            </div>
            <button
              onClick={onTriggerAiAudit}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-sky-500/30"
            >
              <TrendingUp className="h-3.5 w-3.5" /> Auditoría IA Activa
            </button>
          </div>

          <div className="h-72 min-h-[280px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPres" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) => `Q${(val / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="space-y-1 rounded-2xl border border-white/20 bg-slate-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-xl">
                          <p className="font-bold text-sky-400">{payload[0]?.payload?.mes}</p>
                          <p className="text-slate-200">
                            Inversión:{' '}
                            <span className="font-bold text-sky-300">
                              {formatMoney(Number(payload[0]?.value))}
                            </span>
                          </p>
                          <p className="text-slate-200">
                            Presupuesto:{' '}
                            <span className="font-bold text-amber-300">
                              {formatMoney(Number(payload[1]?.value))}
                            </span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="inversion"
                  name="Inversión Real"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorInv)"
                />
                <Area
                  type="monotone"
                  dataKey="presupuesto"
                  name="Presupuesto Base"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorPres)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Variation 5: Firma Digital & Autorización Móvil Glass Panel */}
      <div className="glass-panel space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl border border-sky-400/30 bg-sky-400/20 p-2 text-sky-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-white">Firma Digital & Autorización Móvil</h2>
          </div>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-emerald-400 uppercase shadow-[0_0_8px_rgba(74,222,128,0.2)]">
            READY
          </span>
        </div>
        <p className="max-w-3xl text-xs leading-relaxed text-slate-300">
          Capataces autorizados con firma táctil sobre lienzo canvas HTML5, GPS y sello de tiempo
          digital para reportes diarios y bitácoras de obra.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={() => onNavigateTab('proyectos')}
            className="cursor-pointer rounded-xl border border-white/15 bg-white/[0.08] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-white/[0.14]"
          >
            Bitácora de Campo
          </button>
          <button
            onClick={() => onNavigateTab('proyectos')}
            className="cursor-pointer rounded-xl bg-sky-400 px-5 py-2.5 text-xs font-extrabold tracking-wide text-slate-950 uppercase shadow-[0_0_16px_rgba(56,189,248,0.3)] transition hover:scale-[1.02] hover:bg-sky-300"
          >
            Validar Firmas Pendientes
          </button>
        </div>
      </div>

      {/* RECHARTS SECTION: Visual Project Progress Bar & Planned vs Actual Expenditure Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. Visual Project Progress Bar Chart (Recharts) */}
        <div className="glass-panel flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-sky-400/20 p-2 text-sky-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Barra Visual de Avance Físico de Proyectos
                </h3>
                <p className="text-xs text-slate-400">
                  Porcentaje de ejecución física real vs. meta de entrega (100%)
                </p>
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 font-mono text-xs font-semibold text-slate-300">
              {projects.length} Obras
            </span>
          </div>

          <div className="h-72 min-h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projectProgressChartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="rgba(255, 255, 255, 0.08)"
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `${val}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#cbd5e1"
                  fontSize={12}
                  fontWeight={600}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="space-y-1 rounded-2xl border border-white/20 bg-slate-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-xl">
                          <p className="text-sm font-bold text-sky-400">{data.fullName}</p>
                          <p className="text-slate-300">
                            Código: <span className="font-mono text-white">{data.name}</span>
                          </p>
                          <p className="text-slate-300">
                            Avance Físico:{' '}
                            <span className="font-bold text-emerald-400">{data.avance}%</span>
                          </p>
                          <p className="text-slate-300">Presupuesto: {formatMoney(data.budget)}</p>
                          <p className="text-slate-300">Ejecutado: {formatMoney(data.spent)}</p>
                          <p className="text-[10px] text-slate-400">Estado: {data.status}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  x={100}
                  stroke="#4ade80"
                  strokeDasharray="4 4"
                  label={{ value: '100% Meta', position: 'top', fill: '#4ade80', fontSize: 10 }}
                />
                <Bar
                  dataKey="avance"
                  name="Avance Físico (%)"
                  radius={[0, 8, 8, 0]}
                  barSize={24}
                  onClick={(data) => onSelectProject((data as any).id)}
                  className="cursor-pointer"
                >
                  {projectProgressChartData.map((entry, index) => {
                    const isSelected = entry.id === activeProjectId;
                    const fillColor = isSelected
                      ? '#38bdf8'
                      : entry.avance >= 70
                        ? '#4ade80'
                        : entry.avance >= 30
                          ? '#60a5fa'
                          : '#fbbf24';
                    return <Cell key={`cell-${index}`} fill={fillColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-2 text-[11px] text-slate-300">
            {projectProgressChartData.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className={`cursor-pointer rounded-xl border p-2.5 text-center transition ${
                  p.id === activeProjectId
                    ? 'border-sky-400/50 bg-sky-500/20 font-bold text-sky-300'
                    : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
                }`}
              >
                <div className="truncate font-semibold">{p.name}</div>
                <div className="mt-0.5 font-bold text-sky-400">{p.avance}% completado</div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Planned vs Actual Expenditure Chart (Recharts) */}
        <div className="glass-panel flex flex-col justify-between space-y-4">
          <div className="flex flex-col justify-between gap-2 border-b border-white/10 pb-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-emerald-400/20 p-2 text-emerald-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Gasto Planificado vs. Real</h3>
                <p className="text-xs text-slate-400">
                  Monitoreo de desvíos presupuestarios en obras y rubros
                </p>
              </div>
            </div>

            <div className="flex items-center self-start rounded-xl border border-white/10 bg-white/[0.06] p-0.5 text-xs sm:self-auto">
              <button
                onClick={() => setExpenditureViewMode('projects')}
                className={`cursor-pointer rounded-lg px-3 py-1 font-semibold transition ${
                  expenditureViewMode === 'projects'
                    ? 'bg-sky-400 font-bold text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Por Obra
              </button>
              <button
                onClick={() => setExpenditureViewMode('categories')}
                className={`cursor-pointer rounded-lg px-3 py-1 font-semibold transition ${
                  expenditureViewMode === 'categories'
                    ? 'bg-sky-400 font-bold text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Por Rubro
              </button>
            </div>
          </div>

          <div className="h-72 min-h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {expenditureViewMode === 'projects' ? (
                <BarChart
                  data={projectExpenditureData}
                  margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => `Q${(val / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length >= 2) {
                        const plan = Number(payload[0].value);
                        const real = Number(payload[1].value);
                        const data = payload[0].payload;
                        const diff = plan - real;
                        return (
                          <div className="space-y-1 rounded-2xl border border-white/20 bg-slate-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-xl">
                            <p className="text-sm font-bold text-slate-100">{data.fullName}</p>
                            <p className="text-amber-400">Presupuesto Base: {formatMoney(plan)}</p>
                            <p className="text-sky-400">Gasto Ejecutado: {formatMoney(real)}</p>
                            <p className={diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {diff >= 0 ? 'Saldo a Favor: ' : 'Sobrecosto: '}
                              {formatMoney(Math.abs(diff))}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Ejecución: {((real / plan) * 100).toFixed(1)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: 11, paddingBottom: 8, color: '#cbd5e1' }}
                  />
                  <Bar
                    dataKey="planificado"
                    name="Presupuesto Planificado"
                    fill="#64748b"
                    radius={[6, 6, 0, 0]}
                    barSize={20}
                  />
                  <Bar
                    dataKey="real"
                    name="Gasto Real Ejecutado"
                    fill="#38bdf8"
                    radius={[6, 6, 0, 0]}
                    barSize={20}
                  />
                </BarChart>
              ) : (
                <BarChart
                  data={categoryExpenditureData}
                  margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                  <XAxis dataKey="categoria" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => `Q${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length >= 2) {
                        const plan = Number(payload[0].value);
                        const real = Number(payload[1].value);
                        const diff = plan - real;
                        return (
                          <div className="space-y-1 rounded-2xl border border-white/20 bg-slate-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-xl">
                            <p className="text-sm font-bold text-slate-100">
                              {payload[0].payload.categoria}
                            </p>
                            <p className="text-amber-400">Planificado: {formatMoney(plan)}</p>
                            <p className="text-sky-400">Real Pagado: {formatMoney(real)}</p>
                            <p className={diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {diff >= 0 ? 'Remanente: ' : 'Excedente: '}
                              {formatMoney(Math.abs(diff))}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: 11, paddingBottom: 8, color: '#cbd5e1' }}
                  />
                  <Bar
                    dataKey="planificado"
                    name="Planificado"
                    fill="#fbbf24"
                    radius={[6, 6, 0, 0]}
                    barSize={18}
                  />
                  <Bar
                    dataKey="real"
                    name="Real Ejecutado"
                    fill="#4ade80"
                    radius={[6, 6, 0, 0]}
                    barSize={18}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs">
            <span className="text-slate-400">
              Total Invertido en <strong className="text-white">{activeProject.name}</strong>:
            </span>
            <span className="font-bold text-sky-400">{formatMoney(activeProject.spentTotal)}</span>
          </div>
        </div>
      </div>

      {/* AI Recommendations & Quick Access */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="glass-panel space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <CloudLightning className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">
                Asistente Climático & Ruta Crítica (IA)
              </h3>
            </div>
            <span className="rounded border border-amber-400/30 bg-amber-400/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-400">
              Gemini 3.8
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-300">
            Monitoreo en tiempo real de condiciones meteorológicas en Guatemala y simulación de
            impacto en el cronograma CPM y ruta crítica de la obra.
          </p>
          <button
            onClick={onTriggerAiWeather}
            className="w-full cursor-pointer rounded-xl bg-amber-400 py-2.5 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-amber-300"
          >
            Simular Reprogramación por Lluvia
          </button>
        </div>

        <div className="glass-panel space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 text-white">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base font-bold">Firma Digital & Autorización de Capataces</h3>
            </div>
            <span className="rounded border border-emerald-400/30 bg-emerald-400/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
              Móvil Ready
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-300">
            Los capataces pueden autorizar reportes de campo, bitácoras e ingresos de materiales
            directamente desde sus teléfonos móviles con firma táctil sobre lienzo, GPS y sello de
            tiempo.
          </p>
          <button
            onClick={() => onNavigateTab('proyectos')}
            className="w-full cursor-pointer rounded-xl bg-sky-400 py-2.5 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-sky-300"
          >
            Ir a Módulo de Visitas & Firmas Digitales
          </button>
        </div>
      </div>
    </div>
  );
}

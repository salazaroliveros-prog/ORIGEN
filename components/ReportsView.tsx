/**
 * ORIGEN ERP - Advanced Reports Component
 * Features:
 * - Simplified date picker UI
 * - Save filter state to localStorage
 * - Format Excel export with styling
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Loader,
  Calendar,
  Filter,
  BarChart3,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { COLORS } from '@/lib/design/constants';

interface ReportData {
  date: string;
  category: string;
  amount: number;
  description: string;
  type: 'income' | 'expense';
}

interface FilterState {
  startDate: string;
  endDate: string;
  category: string;
  type: 'all' | 'income' | 'expense';
}

export function ReportsView({ projectId }: { projectId: string }) {
  // State
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);

  // FEATURE 3.2: Filter state persistence
  const [filters, setFilters] = useState<FilterState>(() => {
    // Load from localStorage
    try {
      const saved = localStorage.getItem(`origen_reports_filters_${projectId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading filters:', e);
    }

    return {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      category: 'all',
      type: 'all',
    };
  });

  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'comparison'>('summary');

  // Simulate data load
  useEffect(() => {
    const timer = setTimeout(() => {
      const mockData: ReportData[] = [
        {
          date: new Date().toISOString().split('T')[0],
          category: 'Materiales',
          amount: 25000,
          description: 'Compra de cemento',
          type: 'expense',
        },
        {
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          category: 'Mano de Obra',
          amount: 15000,
          description: 'Pago de jornales',
          type: 'expense',
        },
        {
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          category: 'Proyecto A',
          amount: 100000,
          description: 'Pago cliente',
          type: 'income',
        },
      ];

      setReportData(mockData);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // FEATURE 3.2: Save filter state to localStorage
  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);

    try {
      localStorage.setItem(`origen_reports_filters_${projectId}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving filters:', e);
    }
  };

  // Apply filters
  const filteredData = useMemo(() => {
    return reportData.filter((item) => {
      const dateMatch = item.date >= filters.startDate && item.date <= filters.endDate;
      const categoryMatch = filters.category === 'all' || item.category === filters.category;
      const typeMatch = filters.type === 'all' || item.type === filters.type;

      return dateMatch && categoryMatch && typeMatch;
    });
  }, [reportData, filters]);

  // Calculate summary metrics
  const summary = useMemo(() => {
    const income = filteredData
      .filter((d) => d.type === 'income')
      .reduce((sum, d) => sum + d.amount, 0);
    const expenses = filteredData
      .filter((d) => d.type === 'expense')
      .reduce((sum, d) => sum + d.amount, 0);
    const net = income - expenses;

    return { income, expenses, net };
  }, [filteredData]);

  // Categories for filter
  const categories = useMemo(() => {
    return ['all', ...new Set(reportData.map((d) => d.category))];
  }, [reportData]);

  // FEATURE 3.3: Export to Excel with formatting
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    // Create CSV with formatting headers
    const headers = [
      'ORIGEN ERP - REPORTE',
      `Periodo: ${filters.startDate} a ${filters.endDate}`,
      '',
      'Fecha,Categoría,Tipo,Monto,Descripción',
    ];

    const rows = filteredData.map((item) =>
      [
        item.date,
        item.category,
        item.type === 'income' ? 'Ingreso' : 'Gasto',
        item.amount,
        `"${item.description}"`,
      ].join(',')
    );

    const summary_section = [
      '',
      'RESUMEN',
      `Ingresos,${summary.income}`,
      `Gastos,${summary.expenses}`,
      `Neto,${summary.net}`,
    ];

    const csv = [...headers, ...rows, ...summary_section].join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Reporte exportado');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center gap-2 text-slate-600">
          <Loader className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Cargando reportes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reportes</h1>
          <p className="mt-1 text-sm text-slate-600">
            Análisis financiero y operativo del proyecto
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-green-700"
        >
          <Download className="h-5 w-5" aria-hidden="true" />
          Exportar
        </button>
      </div>

      {/* FEATURE 3.1: Simplified Date Picker UI - FIXED: Improved spacing p-6 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-slate-600" aria-hidden="true" />
          <h3 className="font-semibold text-slate-900">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Start Date */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Desde</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => updateFilters({ startDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Hasta</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilters({ endDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Categoría</label>
            <select
              value={filters.category}
              onChange={(e) => updateFilters({ category: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Todas' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Tipo</label>
            <select
              value={filters.type}
              onChange={(e) =>
                updateFilters({ type: e.target.value as 'all' | 'income' | 'expense' })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>
          </div>

          {/* Report Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Tipo de Reporte</label>
            <div className="flex gap-2">
              <Button
                key="summary"
                variant={reportType === 'summary' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setReportType('summary')}
                className="flex-1"
              >
                Resumen
              </Button>
              <Button
                key="detailed"
                variant={reportType === 'detailed' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setReportType('detailed')}
                className="flex-1"
              >
                Detallado
              </Button>
              <Button
                key="comparison"
                variant={reportType === 'comparison' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setReportType('comparison')}
                className="flex-1"
              >
                Comparación
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards - FIXED: Improved spacing gap-6 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Ingresos</p>
              <p className="mt-2 text-3xl font-bold text-green-900">
                Q{summary.income.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" aria-hidden="true" />
          </div>
        </div>

        <div className="rounded-lg border border-red-200 bg-gradient-to-br from-red-50 to-red-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Gastos</p>
              <p className="mt-2 text-3xl font-bold text-red-900">
                Q{summary.expenses.toLocaleString()}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div
          className={`rounded-lg border bg-gradient-to-br p-6 ${
            summary.net >= 0
              ? 'border-blue-200 from-blue-50 to-blue-100'
              : 'border-orange-200 from-orange-50 to-orange-100'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p
                className={`text-sm font-medium ${
                  summary.net >= 0 ? 'text-blue-700' : 'text-orange-700'
                }`}
              >
                Neto
              </p>
              <p
                className={`mt-2 text-3xl font-bold ${
                  summary.net >= 0 ? 'text-blue-900' : 'text-orange-900'
                }`}
              >
                Q{summary.net.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Report */}
      {reportType === 'detailed' && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Categoría</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Descripción</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Tipo</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Monto</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{item.date}</td>
                    <td className="px-4 py-3 text-slate-600">{item.category}</td>
                    <td className="px-4 py-3 text-slate-600">{item.description}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          item.type === 'income' ? COLORS.badge.green : COLORS.badge.red
                        }`}
                      >
                        {item.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        item.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {item.type === 'income' ? '+' : '-'}Q{item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals row */}
          <div className="flex justify-end gap-8 border-t border-slate-200 bg-slate-100 p-4">
            <div>
              <p className="text-sm text-slate-600">Ingresos:</p>
              <p className="text-lg font-bold text-green-600">Q{summary.income.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Gastos:</p>
              <p className="text-lg font-bold text-red-600">Q{summary.expenses.toLocaleString()}</p>
            </div>
            <div className="border-l border-slate-300 pl-8">
              <p className="text-sm text-slate-600">Neto:</p>
              <p
                className={`text-lg font-bold ${
                  summary.net >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}
              >
                Q{summary.net.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Report */}
      {reportType === 'summary' && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Resumen del Período</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <p className="text-slate-700">Total de Ingresos:</p>
              <p className="text-2xl font-bold text-green-600">
                Q{summary.income.toLocaleString()}
              </p>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <p className="text-slate-700">Total de Gastos:</p>
              <p className="text-2xl font-bold text-red-600">
                Q{summary.expenses.toLocaleString()}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="font-semibold text-blue-900">Resultado Neto:</p>
              <p
                className={`text-3xl font-bold ${
                  summary.net >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}
              >
                Q{summary.net.toLocaleString()}
              </p>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm text-slate-600">Desglose por Categoría:</p>
              <div className="space-y-2">
                {categories
                  .filter((c) => c !== 'all')
                  .map((cat) => {
                    const catAmount = filteredData
                      .filter((d) => d.category === cat)
                      .reduce((sum, d) => sum + d.amount, 0);
                    return (
                      <div key={cat} className="flex justify-between text-sm">
                        <span className="text-slate-600">{cat}:</span>
                        <span className="font-semibold">Q{catAmount.toLocaleString()}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info message */}
      {filteredData.length === 0 && (
        <Alert
          variant="warning"
          title="Sin datos"
          message="No hay datos para los filtros seleccionados"
          dismissible={false}
        />
      )}
    </div>
  );
}

export default ReportsView;

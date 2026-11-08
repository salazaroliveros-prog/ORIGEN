/**
 * ORIGEN ERP - Budget & APU Items List Component
 * Enhanced with responsive table, real-time updates, validation, and currency support
 *
 * Features:
 * - Responsive table (desktop) / card layout (mobile)
 * - Real-time budget calculations with useMemo
 * - Quantity validation (must be > 0)
 * - Currency selector (GTQ/USD with exchange rate)
 * - Add/Edit/Delete APU items
 * - Budget utilization visualization
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePagination } from '@/lib/hooks/usePagination';
import {
  calculateBudgetSummary,
  calculateTotalUnitCost,
  validateAPUItem,
  convertUSDtoGTQ,
} from '@/lib/utils/calculations';
import { Plus, Pencil, Trash2, AlertCircle, Loader, DollarSign, TrendingUp } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import Link from 'next/link';
import type { APUItem } from '@/lib/types';

interface FormData {
  code: string;
  description: string;
  unit: string;
  quantity: string;
  materialUnitCostGTQ: string;
  laborUnitCostGTQ: string;
  equipmentUnitCostGTQ: string;
}

interface FormErrors {
  [key: string]: string;
}

export function APUItemsList({
  projectId,
  onUpdateBudget,
}: {
  projectId: string;
  onUpdateBudget?: (summary: any) => void;
}) {
  // State
  const [items, setItems] = useState<APUItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [totalExpenses, setTotalExpenses] = useState(0);

  // Currency state - FEATURE 3.4: Currency Selector
  const [currency, setCurrency] = useState<'GTQ' | 'USD'>('GTQ');
  const [exchangeRate, setExchangeRate] = useState(7.85);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    code: '',
    description: '',
    unit: 'gbl',
    quantity: '',
    materialUnitCostGTQ: '',
    laborUnitCostGTQ: '',
    equipmentUnitCostGTQ: '',
  });

  // Pagination
  const { currentPage, totalPages, paginatedItems, goToPage } = usePagination(items, {
    itemsPerPage: 10,
  });

  // Simulate data load
  useEffect(() => {
    const timer = setTimeout(() => {
      setItems([
        {
          id: '1',
          code: 'CONC-001',
          description: 'Fundaciones de Concreto',
          unit: 'm³',
          quantity: 50,
          materialUnitCostGTQ: 500,
          laborUnitCostGTQ: 300,
          equipmentUnitCostGTQ: 100,
          totalUnitCostGTQ: 900,
          totalPriceGTQ: 45000,
          projectId,
          companyId: 'test-company',
          createdBy: 'user-test',
        },
      ]);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [projectId]);

  // FEATURE 3.2: Real-time budget updates with useEffect
  useEffect(() => {
    const calculateBudget = () => {
      if (items.length === 0) {
        const emptySummary = {
          budgetTotal: 0,
          spentTotal: 0,
          remaining: 0,
          utilization: 0,
          variance: 0,
        };
        onUpdateBudget?.(emptySummary);
        return;
      }

      const summary = calculateBudgetSummary(items, totalExpenses);
      onUpdateBudget?.(summary);
    };

    calculateBudget();
  }, [items, totalExpenses, onUpdateBudget]); // ← CRITICAL: all dependencies

  // FEATURE 3.1: Memoized budget summary
  const budgetSummary = useMemo(() => {
    if (items.length === 0) {
      return {
        budgetTotal: 0,
        spentTotal: totalExpenses,
        remaining: -totalExpenses,
        utilization: 0,
        variance: totalExpenses,
      };
    }

    return calculateBudgetSummary(items, totalExpenses);
  }, [items, totalExpenses]);

  // Validate quantity - FEATURE 3.3: Quantity Validation
  const validateQuantity = (value: string): boolean => {
    if (!value) {
      setFormErrors((prev) => ({
        ...prev,
        quantity: 'La cantidad es requerida',
      }));
      return false;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setFormErrors((prev) => ({
        ...prev,
        quantity: 'La cantidad debe ser mayor a 0',
      }));
      return false;
    }

    if (numValue > 10000) {
      setFormErrors((prev) => ({
        ...prev,
        quantity: 'Cantidad muy grande (máx 10,000)',
      }));
      return false;
    }

    setFormErrors((prev) => ({
      ...prev,
      quantity: '',
    }));
    return true;
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.code.trim()) errors.code = 'El código es requerido';
    if (!formData.description.trim()) errors.description = 'La descripción es requerida';
    if (!formData.unit.trim()) errors.unit = 'La unidad es requerida';

    if (!validateQuantity(formData.quantity)) {
      return false;
    }

    if (!formData.materialUnitCostGTQ || parseFloat(formData.materialUnitCostGTQ) < 0) {
      errors.materialUnitCostGTQ = 'Costo de material debe ser ≥ 0';
    }
    if (!formData.laborUnitCostGTQ || parseFloat(formData.laborUnitCostGTQ) < 0) {
      errors.laborUnitCostGTQ = 'Costo de mano de obra debe ser ≥ 0';
    }
    if (!formData.equipmentUnitCostGTQ || parseFloat(formData.equipmentUnitCostGTQ) < 0) {
      errors.equipmentUnitCostGTQ = 'Costo de equipo debe ser ≥ 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle add/edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor completa todos los campos correctamente');
      return;
    }

    try {
      const newItem: APUItem = {
        id: editingId || `apu-${Date.now()}`,
        code: formData.code,
        description: formData.description,
        unit: formData.unit,
        quantity: parseFloat(formData.quantity),
        materialUnitCostGTQ: parseFloat(formData.materialUnitCostGTQ),
        laborUnitCostGTQ: parseFloat(formData.laborUnitCostGTQ),
        equipmentUnitCostGTQ: parseFloat(formData.equipmentUnitCostGTQ),
        totalUnitCostGTQ: calculateTotalUnitCost(
          parseFloat(formData.materialUnitCostGTQ),
          parseFloat(formData.laborUnitCostGTQ),
          parseFloat(formData.equipmentUnitCostGTQ)
        ),
        totalPriceGTQ: 0, // Will be calculated
        projectId,
        companyId: 'test-company',
        createdBy: 'user-test',
      };

      // Validate
      const validated = validateAPUItem(newItem);

      if (editingId) {
        setItems((prev) => prev.map((item) => (item.id === editingId ? validated : item)));
        toast.success('Línea de APU actualizada');
      } else {
        setItems((prev) => [...prev, validated]);
        toast.success('Línea de APU agregada');
      }

      // Reset form
      setFormData({
        code: '',
        description: '',
        unit: 'gbl',
        quantity: '',
        materialUnitCostGTQ: '',
        laborUnitCostGTQ: '',
        equipmentUnitCostGTQ: '',
      });
      setFormErrors({});
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar';
      toast.error(message);
    }
  };

  // Handle delete
  const handleDelete = (itemId: string) => {
    const confirmed = window.confirm('¿Eliminar esta línea de APU?');
    if (!confirmed) return;

    setItems((prev) => prev.filter((item) => item.id !== itemId));
    toast.success('Línea eliminada');
  };

  // Handle edit
  const handleEdit = (item: APUItem) => {
    setFormData({
      code: item.code,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity.toString(),
      materialUnitCostGTQ: item.materialUnitCostGTQ.toString(),
      laborUnitCostGTQ: item.laborUnitCostGTQ.toString(),
      equipmentUnitCostGTQ: item.equipmentUnitCostGTQ.toString(),
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  // FEATURE 3.4: Convert amount to GTQ if USD
  const convertToGTQ = (amount: number): number => {
    if (currency === 'GTQ') return amount;
    return convertUSDtoGTQ(amount, exchangeRate);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center gap-2 text-slate-600">
          <Loader className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Cargando APU...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 p-6">
      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Budget */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Presupuesto Total</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            Q{budgetSummary.budgetTotal.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">{items.length} líneas</p>
        </div>

        {/* Spent */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Gastado</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            Q{budgetSummary.spentTotal.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">Gastos registrados</p>
        </div>

        {/* Remaining */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Disponible</p>
          <p
            className={`mt-2 text-2xl font-bold ${
              budgetSummary.remaining < 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            Q{budgetSummary.remaining.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">Restante</p>
        </div>

        {/* Utilization */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Utilización</p>
          <p
            className={`mt-2 text-2xl font-bold ${
              budgetSummary.utilization > 80
                ? 'text-red-600'
                : budgetSummary.utilization > 50
                  ? 'text-yellow-600'
                  : 'text-green-600'
            }`}
          >
            {budgetSummary.utilization.toFixed(2)}%
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full ${
                budgetSummary.utilization > 80
                  ? 'bg-red-500'
                  : budgetSummary.utilization > 50
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(budgetSummary.utilization, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Currency Selector - FEATURE 3.4 */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Moneda</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'GTQ' | 'USD')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="GTQ">Q (Quetzal)</option>
              <option value="USD">$ (Dólar)</option>
            </select>
          </div>

          {currency === 'USD' && (
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Tipo de Cambio
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
                  step="0.01"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="7.85"
                />
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-sm text-slate-600">Q por USD</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            {editingId ? 'Editar Línea' : 'Nueva Línea de APU'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Code */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Código *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => {
                    setFormData({ ...formData, code: e.target.value });
                    if (formErrors.code) setFormErrors({ ...formErrors, code: '' });
                  }}
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.code ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="CONC-001"
                />
                {formErrors.code && <p className="mt-1 text-xs text-red-600">{formErrors.code}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Descripción *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (formErrors.description) setFormErrors({ ...formErrors, description: '' });
                  }}
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.description ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Fundaciones de Concreto"
                />
                {formErrors.description && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.description}</p>
                )}
              </div>

              {/* Unit */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Unidad *</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gbl">Globally</option>
                  <option value="m³">Metros cúbicos</option>
                  <option value="m²">Metros cuadrados</option>
                  <option value="ml">Metros lineales</option>
                  <option value="kg">Kilogramos</option>
                  <option value="ton">Toneladas</option>
                  <option value="hrs">Horas</option>
                  <option value="unid">Unidades</option>
                </select>
              </div>

              {/* Quantity - FEATURE 3.3 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Cantidad *</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => {
                    setFormData({ ...formData, quantity: e.target.value });
                    validateQuantity(e.target.value);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.quantity ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="50"
                />
                {formErrors.quantity && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.quantity}</p>
                )}
              </div>

              {/* Material Cost */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Costo Material {currency === 'USD' ? '($)' : '(Q)'}
                </label>
                <input
                  type="number"
                  value={formData.materialUnitCostGTQ}
                  onChange={(e) =>
                    setFormData({ ...formData, materialUnitCostGTQ: e.target.value })
                  }
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.materialUnitCostGTQ ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="500"
                />
                {formErrors.materialUnitCostGTQ && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.materialUnitCostGTQ}</p>
                )}
              </div>

              {/* Labor Cost */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Costo Mano de Obra {currency === 'USD' ? '($)' : '(Q)'}
                </label>
                <input
                  type="number"
                  value={formData.laborUnitCostGTQ}
                  onChange={(e) => setFormData({ ...formData, laborUnitCostGTQ: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.laborUnitCostGTQ ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="300"
                />
                {formErrors.laborUnitCostGTQ && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.laborUnitCostGTQ}</p>
                )}
              </div>

              {/* Equipment Cost */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Costo Equipo {currency === 'USD' ? '($)' : '(Q)'}
                </label>
                <input
                  type="number"
                  value={formData.equipmentUnitCostGTQ}
                  onChange={(e) =>
                    setFormData({ ...formData, equipmentUnitCostGTQ: e.target.value })
                  }
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.equipmentUnitCostGTQ ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="100"
                />
                {formErrors.equipmentUnitCostGTQ && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.equipmentUnitCostGTQ}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    code: '',
                    description: '',
                    unit: 'gbl',
                    quantity: '',
                    materialUnitCostGTQ: '',
                    laborUnitCostGTQ: '',
                    equipmentUnitCostGTQ: '',
                  });
                  setFormErrors({});
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                {editingId ? 'Actualizar' : 'Agregar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Items Table - FEATURE 3.1: Responsive Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {/* Desktop Table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="p-3 text-left font-semibold text-slate-900">Código</th>
                <th className="p-3 text-left font-semibold text-slate-900">Descripción</th>
                <th className="hidden p-3 text-right font-semibold text-slate-900 md:table-cell">
                  Cantidad
                </th>
                <th className="hidden p-3 text-right font-semibold text-slate-900 lg:table-cell">
                  Precio Unit.
                </th>
                <th className="p-3 text-right font-semibold text-slate-900">Total</th>
                <th className="p-3 text-center font-semibold text-slate-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => (
                <tr key={item.id} className="border-b transition-colors hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-900">{item.code}</td>
                  <td className="p-3 text-slate-700">{item.description}</td>
                  <td className="hidden p-3 text-right text-slate-700 md:table-cell">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="hidden p-3 text-right text-slate-700 lg:table-cell">
                    Q{item.totalUnitCostGTQ.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900">
                    Q{item.totalPriceGTQ.toLocaleString()}
                  </td>
                  <td className="flex justify-center gap-2 p-3">
                    <button
                      onClick={() => handleEdit(item)}
                      className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-100"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-100"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 p-3 sm:hidden">
          {paginatedItems.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{item.description}</p>
                  <p className="text-xs text-slate-500">{item.code}</p>
                </div>
                <p className="font-bold text-slate-900">Q{item.totalPriceGTQ.toLocaleString()}</p>
              </div>
              <p className="mb-3 text-xs text-slate-600">
                {item.quantity} {item.unit} × Q{item.totalUnitCostGTQ.toLocaleString()}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="rounded-lg p-2 text-blue-600 hover:bg-blue-100"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-100"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i + 1}
              onClick={() => goToPage(i + 1)}
              className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
                currentPage === i + 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Add Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Agregar Línea
        </button>
      )}
    </div>
  );
}

export default APUItemsList;

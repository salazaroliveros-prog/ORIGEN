/**
 * ORIGEN ERP - Expenses View Component
 * Enhanced with category colors, photo preview, filtered export, amount formatting, and duplicate detection
 *
 * Features:
 * - Standardize category colors with visual consistency
 * - Receipt photo preview modal
 * - Export filtered data to CSV
 * - Amount formatting on input
 * - Duplicate detection with warnings
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { usePagination } from '@/lib/hooks/usePagination';
import {
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Loader,
  Camera,
  Download,
  Filter,
  X,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import type { ExpenseRecord } from '@/lib/types';
import { COLORS } from '@/lib/design/constants';

interface FormData {
  projectId: string;
  date: string;
  category: string;
  description: string;
  supplier: string;
  nitSupplier: string;
  facturaNumber: string;
  amount: string;
  currency: 'GTQ' | 'USD';
  paymentMethod: string;
}

interface FormErrors {
  [key: string]: string;
}

interface PhotoPreview {
  show: boolean;
  url: string;
  fileName: string;
}

interface DuplicateWarning {
  show: boolean;
  message: string;
}

export function ExpensesView({ projectId }: { projectId: string }) {
  // State
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // FEATURE 3.2: Photo preview state
  const [photoPreview, setPhotoPreview] = useState<PhotoPreview>({
    show: false,
    url: '',
    fileName: '',
  });

  // FEATURE 3.5: Duplicate detection warning
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarning>({
    show: false,
    message: '',
  });

  // Form state
  const [formData, setFormData] = useState<FormData>({
    projectId,
    date: new Date().toISOString().split('T')[0],
    category: 'Materiales (Cementos, Hierro)',
    description: '',
    supplier: '',
    nitSupplier: '',
    facturaNumber: '',
    amount: '',
    currency: 'GTQ',
    paymentMethod: 'Transferencia BI',
  });

  // Pagination
  const { currentPage, pageSize, totalPages, paginatedItems, goToPage } = usePagination(
    expenses,
    15
  );

  // Simulate data load
  useEffect(() => {
    const timer = setTimeout(() => {
      setExpenses([
        {
          id: '1',
          projectId,
          date: new Date().toISOString().split('T')[0],
          category: 'Materiales (Cementos, Hierro)',
          description: 'Cemento y Arena',
          supplier: 'Cementos Progreso',
          nitSupplier: '123456',
          facturaNumber: 'FAC-001',
          amount: 25000,
          currency: 'GTQ',
          paymentMethod: 'Transferencia BI',
        },
      ]);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [projectId]);

  // FEATURE 3.5: Duplicate detection
  useEffect(() => {
    if (!formData.amount || !formData.supplier || !formData.date) {
      setDuplicateWarning({ show: false, message: '' });
      return;
    }

    const sameDay = new Date(formData.date).toDateString();

    const similar = expenses.filter((exp) => {
      const expDay = new Date(exp.date).toDateString();
      return (
        expDay === sameDay &&
        exp.amount === parseFloat(formData.amount) &&
        exp.supplier.toLowerCase() === formData.supplier.toLowerCase()
      );
    });

    if (similar.length > 0) {
      setDuplicateWarning({
        show: true,
        message: `Existe ${similar.length} gasto(s) similar(es) registrado(s) hoy: ${similar[0].description}`,
      });
    } else {
      setDuplicateWarning({ show: false, message: '' });
    }
  }, [formData.amount, formData.supplier, formData.date, expenses]);

  // FEATURE 3.4: Amount formatting on input
  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));

    if (!isNaN(numValue)) {
      setFormData({
        ...formData,
        amount: numValue.toString(),
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.date) errors.date = 'La fecha es requerida';
    if (!formData.category) errors.category = 'La categoría es requerida';
    if (!formData.description.trim()) errors.description = 'La descripción es requerida';
    if (!formData.supplier.trim()) errors.supplier = 'El proveedor es requerido';
    if (!formData.amount) errors.amount = 'El monto es requerido';
    else if (parseFloat(formData.amount) <= 0) errors.amount = 'El monto debe ser mayor a 0';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    try {
      const newExpense: ExpenseRecord = {
        id: editingId || `exp-${Date.now()}`,
        projectId,
        date: formData.date,
        category: formData.category,
        description: formData.description,
        supplier: formData.supplier,
        nitSupplier: formData.nitSupplier,
        facturaNumber: formData.facturaNumber,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        paymentMethod: formData.paymentMethod,
      };

      if (editingId) {
        setExpenses((prev) => prev.map((exp) => (exp.id === editingId ? newExpense : exp)));
        toast.success('Gasto actualizado');
      } else {
        setExpenses((prev) => [...prev, newExpense]);
        toast.success('Gasto registrado');
      }

      // Reset form
      setFormData({
        projectId,
        date: new Date().toISOString().split('T')[0],
        category: 'Materiales (Cementos, Hierro)',
        description: '',
        supplier: '',
        nitSupplier: '',
        facturaNumber: '',
        amount: '',
        currency: 'GTQ',
        paymentMethod: 'Transferencia BI',
      });
      setFormErrors({});
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error');
    }
  };

  // FEATURE 3.3: Export filtered data
  const handleExportCSV = () => {
    let filtered = [...expenses];

    if (selectedCategory) {
      filtered = filtered.filter((exp) => exp.category === selectedCategory);
    }
    if (dateFrom) {
      filtered = filtered.filter((exp) => new Date(exp.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter((exp) => new Date(exp.date) <= new Date(dateTo));
    }

    if (filtered.length === 0) {
      toast.error('No hay gastos para exportar con los filtros seleccionados');
      return;
    }

    const csv = [
      [
        'Fecha',
        'Proyecto',
        'Categoría',
        'Descripción',
        'Proveedor',
        'Monto',
        'Moneda',
        'Método Pago',
      ],
      ...filtered.map((exp) => [
        exp.date,
        projectId,
        exp.category,
        exp.description,
        exp.supplier,
        exp.amount.toLocaleString(),
        exp.currency,
        exp.paymentMethod,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gastos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Archivo exportado correctamente');
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    if (selectedCategory) {
      filtered = filtered.filter((exp) => exp.category === selectedCategory);
    }
    if (dateFrom) {
      filtered = filtered.filter((exp) => new Date(exp.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter((exp) => new Date(exp.date) <= new Date(dateTo));
    }

    return filtered;
  }, [expenses, selectedCategory, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center gap-2 text-slate-600">
          <Loader className="h-5 w-5 animate-spin" />
          <span>Cargando gastos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gastos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Total: Q{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-green-700"
        >
          <Download className="h-5 w-5" />
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Categoría</label>
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {Object.keys(COLORS.expenseCategories).map((catKey) => {
                const categoryNameMap = {
                  materials: 'Materiales (Cementos, Hierro)',
                  labor: 'Mano de Obra',
                  machinery: 'Maquinaria y Combustible',
                  permits: 'Permisos & Licencias',
                  contingency: 'Imprevistos',
                  other: 'Otros',
                };
                return (
                  <option
                    key={catKey}
                    value={categoryNameMap[catKey as keyof typeof categoryNameMap]}
                  >
                    {categoryNameMap[catKey as keyof typeof categoryNameMap]}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            {editingId ? 'Editar Gasto' : 'Nuevo Gasto'}
          </h3>

          {/* Duplicate Warning - FEATURE 3.5 */}
          {duplicateWarning.show && (
            <div className="mb-4 flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
              <p className="text-sm text-yellow-700">{duplicateWarning.message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Date */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Fecha *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    formErrors.date ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
              </div>

              {/* Category - FEATURE 3.1: Category Colors */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Categoría *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    formErrors.category ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  {Object.keys(CATEGORY_COLORS).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
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
                  className={`w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    formErrors.description ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Cemento y Arena"
                />
              </div>

              {/* Supplier */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Proveedor *</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => {
                    setFormData({ ...formData, supplier: e.target.value });
                    if (formErrors.supplier) setFormErrors({ ...formErrors, supplier: '' });
                  }}
                  className={`w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    formErrors.supplier ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Cementos Progreso"
                />
              </div>

              {/* Amount - FEATURE 3.4: Amount Formatting */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Monto *</label>
                <input
                  type="text"
                  value={
                    formData.amount
                      ? `Q ${parseFloat(formData.amount).toLocaleString('es-GT', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : ''
                  }
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    formErrors.amount ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Q 0.00"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Método de Pago
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  <option>Transferencia BI</option>
                  <option>Efectivo</option>
                  <option>Cheque</option>
                  <option>Tarjeta Crédito</option>
                  <option>Otro</option>
                </select>
              </div>

              {/* Factura */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Factura</label>
                <input
                  type="text"
                  value={formData.facturaNumber}
                  onChange={(e) => setFormData({ ...formData, facturaNumber: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="FAC-001"
                />
              </div>
            </div>

            {/* Photo Upload - FEATURE 3.2 */}
            <div className="rounded-lg border-2 border-dashed border-slate-300 p-4 text-center transition-colors hover:border-slate-400">
              <Camera className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm text-slate-600">Haz clic o arrastra una foto de recibo</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setPhotoPreview({
                        show: true,
                        url: event.target?.result as string,
                        fileName: e.target.files![0].name,
                      });
                    };
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="photo-upload"
              />
              <button
                type="button"
                onClick={() => document.getElementById('photo-upload')?.click()}
                className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Seleccionar archivo
              </button>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                {editingId ? 'Actualizar' : 'Registrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expenses List */}
      <div className="space-y-3">
        {filteredExpenses.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white py-12 text-center">
            <p className="text-slate-600">No hay gastos registrados</p>
          </div>
        ) : (
          filteredExpenses.map((expense) => {
            const colors =
              CATEGORY_COLORS[expense.category as keyof typeof CATEGORY_COLORS] ||
              CATEGORY_COLORS['Otros'];

            return (
              <div
                key={expense.id}
                className={`rounded-lg border bg-white ${colors.border} p-4 shadow-sm transition-shadow hover:shadow-md`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{expense.description}</h3>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${colors.badge}`}
                      >
                        {expense.category}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
                      <p>Fecha: {expense.date}</p>
                      <p>Proveedor: {expense.supplier}</p>
                      <p>Factura: {expense.facturaNumber || 'N/A'}</p>
                      <p>Pago: {expense.paymentMethod}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">
                      {expense.currency} {expense.amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-2 border-t border-slate-200 pt-3">
                  <button
                    onClick={() => {
                      setPhotoPreview({
                        show: true,
                        url: 'https://via.placeholder.com/400x300?text=Receipt',
                        fileName: 'receipt.jpg',
                      });
                    }}
                    className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-100"
                    title="Ver foto"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-100"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Button - Sticky position styling standardized */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          Nuevo Gasto
        </button>
      )}

      {/* Photo Preview Modal - FEATURE 3.2 - FIXED: Consistent modal backdrop */}
      {photoPreview.show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="photo-modal-title"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 id="photo-modal-title" className="font-semibold text-slate-900">
                Foto de Recibo
              </h3>
              <button
                onClick={() => setPhotoPreview({ show: false, url: '', fileName: '' })}
                className="rounded-lg p-1 transition-colors hover:bg-slate-100"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-96 overflow-auto p-4">
              <Image
                src={photoPreview.url}
                alt="Receipt"
                width={600}
                height={400}
                className="mx-auto h-auto max-w-full"
              />
              <p className="mt-2 text-xs text-slate-600">{photoPreview.fileName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpensesView;

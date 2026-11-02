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
  const { currentPage, pageSize, totalPages, paginatedItems, goToPage } = usePagination(expenses, 15);

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

    const similar = expenses.filter(exp => {
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
        setExpenses(prev => prev.map(exp => exp.id === editingId ? newExpense : exp));
        toast.success('Gasto actualizado');
      } else {
        setExpenses(prev => [...prev, newExpense]);
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
      filtered = filtered.filter(exp => exp.category === selectedCategory);
    }
    if (dateFrom) {
      filtered = filtered.filter(exp => new Date(exp.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(exp => new Date(exp.date) <= new Date(dateTo));
    }

    if (filtered.length === 0) {
      toast.error('No hay gastos para exportar con los filtros seleccionados');
      return;
    }

    const csv = [
      ['Fecha', 'Proyecto', 'Categoría', 'Descripción', 'Proveedor', 'Monto', 'Moneda', 'Método Pago'],
      ...filtered.map(exp => [
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
      .map(row => row.map(cell => `"${cell}"`).join(','))
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
      filtered = filtered.filter(exp => exp.category === selectedCategory);
    }
    if (dateFrom) {
      filtered = filtered.filter(exp => new Date(exp.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(exp => new Date(exp.date) <= new Date(dateTo));
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
    <div className="space-y-6 p-6 bg-slate-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gastos</h1>
          <p className="text-sm text-slate-600 mt-1">Total: Q{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
        >
          <Download className="h-5 w-5" />
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Categoría
            </label>
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              {Object.keys(COLORS.expenseCategories).map((catKey) => {
                const categoryNameMap = {
                  'materials': 'Materiales (Cementos, Hierro)',
                  'labor': 'Mano de Obra',
                  'machinery': 'Maquinaria y Combustible',
                  'permits': 'Permisos & Licencias',
                  'contingency': 'Imprevistos',
                  'other': 'Otros',
                };
                return (
                  <option key={catKey} value={categoryNameMap[catKey as keyof typeof categoryNameMap]}>
                    {categoryNameMap[catKey as keyof typeof categoryNameMap]}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingId ? 'Editar Gasto' : 'Nuevo Gasto'}
          </h3>

          {/* Duplicate Warning - FEATURE 3.5 */}
          {duplicateWarning.show && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-700">{duplicateWarning.message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.date ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
              </div>

              {/* Category - FEATURE 3.1: Category Colors */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.category ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  {Object.keys(CATEGORY_COLORS).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (formErrors.description) setFormErrors({ ...formErrors, description: '' });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.description ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Cemento y Arena"
                />
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor *</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => {
                    setFormData({ ...formData, supplier: e.target.value });
                    if (formErrors.supplier) setFormErrors({ ...formErrors, supplier: '' });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.supplier ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Cementos Progreso"
                />
              </div>

              {/* Amount - FEATURE 3.4: Amount Formatting */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Monto *</label>
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
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.amount ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Q 0.00"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Factura</label>
                <input
                  type="text"
                  value={formData.facturaNumber}
                  onChange={(e) => setFormData({ ...formData, facturaNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="FAC-001"
                />
              </div>
            </div>

            {/* Photo Upload - FEATURE 3.2 */}
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-slate-400 transition-colors">
              <Camera className="h-8 w-8 mx-auto text-slate-400 mb-2" />
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
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-semibold"
              >
                Seleccionar archivo
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
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
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <p className="text-slate-600">No hay gastos registrados</p>
          </div>
        ) : (
          filteredExpenses.map((expense) => {
            const colors = CATEGORY_COLORS[expense.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS['Otros'];
            
            return (
              <div
                key={expense.id}
                className={`bg-white rounded-lg border ${colors.border} p-4 shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{expense.description}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
                        {expense.category}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600">
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

                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setPhotoPreview({
                        show: true,
                        url: 'https://via.placeholder.com/400x300?text=Receipt',
                        fileName: 'receipt.jpg',
                      });
                    }}
                    className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                    title="Ver foto"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <button
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
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
          className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Nuevo Gasto
        </button>
      )}

      {/* Photo Preview Modal - FEATURE 3.2 - FIXED: Consistent modal backdrop */}
      {photoPreview.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="photo-modal-title">
          <div className="bg-white rounded-lg overflow-hidden max-w-2xl w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 id="photo-modal-title" className="font-semibold text-slate-900">Foto de Recibo</h3>
              <button
                onClick={() => setPhotoPreview({ show: false, url: '', fileName: '' })}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-auto">
              <img
                src={photoPreview.url}
                alt="Receipt"
                className="max-w-full h-auto mx-auto"
              />
              <p className="text-xs text-slate-600 mt-2">{photoPreview.fileName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpensesView;

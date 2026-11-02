/**
 * ORIGEN ERP - Quotations Management Component
 * Features:
 * - Show line items count in list
 * - Add logo to PDF export
 * - Expiration warning (days until expiry)
 * - Discount validation (max 50%)
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  Download,
  AlertCircle,
  Loader,
  X,
  Eye,
  Clock,
} from 'lucide-react';
import { toast } from '@/components/ui/toast';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuotationRecord {
  id: string;
  projectId: string;
  clientName: string;
  date: string;
  expiryDate: string;
  lineItems: LineItem[];
  subtotal: number;
  discount: number; // percentage
  discountAmount: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  notes: string;
  logoUrl: string;
}

interface FormData {
  clientName: string;
  expiryDate: string;
  lineItems: LineItem[];
  discount: string; // percentage
  notes: string;
  logoUrl: string;
}

interface FormErrors {
  [key: string]: string;
}

export function QuotationsView({ projectId }: { projectId: string }) {
  // State
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Form state
  const [formData, setFormData] = useState<FormData>({
    clientName: '',
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lineItems: [
      { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 },
    ],
    discount: '0',
    notes: '',
    logoUrl: 'https://via.placeholder.com/150x50?text=ORIGEN+ERP',
  });

  const [previewQuotation, setPreviewQuotation] = useState<QuotationRecord | null>(null);

  // Simulate data load
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuotations([
        {
          id: 'quote-1',
          projectId,
          clientName: 'Cliente A',
          date: new Date().toISOString().split('T')[0],
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          lineItems: [
            {
              id: 'item-1',
              description: 'Servicios de Construcción - Fase 1',
              quantity: 1,
              unitPrice: 50000,
              total: 50000,
            },
            {
              id: 'item-2',
              description: 'Materiales de Construcción',
              quantity: 100,
              unitPrice: 500,
              total: 50000,
            },
          ],
          subtotal: 100000,
          discount: 10,
          discountAmount: 10000,
          tax: 13000,
          total: 103000,
          status: 'sent',
          notes: 'Cotización válida por 30 días',
          logoUrl: 'https://via.placeholder.com/150x50?text=ORIGEN+ERP',
        },
      ]);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [projectId]);

  // FEATURE 3.4: Discount validation (max 50%)
  const validateDiscount = (value: string): boolean => {
    const discount = parseFloat(value);
    if (discount < 0 || discount > 50) {
      return false;
    }
    return true;
  };

  // Calculate totals
  const calculateTotals = (items: LineItem[], discount: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = (subtotal * discount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const tax = taxableAmount * 0.13; // 13% IVA Guatemala
    const total = taxableAmount + tax;

    return {
      subtotal,
      discountAmount,
      tax,
      total,
    };
  };

  // Handle line item change
  const handleLineItemChange = (
    index: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    const newItems = [...formData.lineItems];
    const item = newItems[index];

    if (field === 'quantity' || field === 'unitPrice') {
      const num = parseFloat(value.toString());
      if (!isNaN(num)) {
        item[field] = num;
        item.total = newItems[index].quantity * newItems[index].unitPrice;
      }
    } else {
      (item[field] as any) = value;
    }

    setFormData({ ...formData, lineItems: newItems });
  };

  // Add line item
  const addLineItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, newItem],
    });
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    if (formData.lineItems.length === 1) {
      toast.error('Debe haber al menos un artículo');
      return;
    }
    setFormData({
      ...formData,
      lineItems: formData.lineItems.filter((_, i) => i !== index),
    });
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.clientName.trim()) errors.clientName = 'El cliente es requerido';
    if (!formData.expiryDate) errors.expiryDate = 'Fecha de vencimiento requerida';
    if (formData.lineItems.length === 0) errors.lineItems = 'Debe haber al menos un artículo';

    formData.lineItems.forEach((item, idx) => {
      if (!item.description.trim())
        errors[`item-${idx}-desc`] = 'Descripción requerida';
      if (item.quantity <= 0) errors[`item-${idx}-qty`] = 'Cantidad debe ser > 0';
      if (item.unitPrice <= 0) errors[`item-${idx}-price`] = 'Precio debe ser > 0';
    });

    if (!validateDiscount(formData.discount)) {
      errors.discount = 'Descuento debe estar entre 0% y 50%';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor completa todos los campos correctamente');
      return;
    }

    try {
      const discount = parseFloat(formData.discount);
      const { subtotal, discountAmount, tax, total } = calculateTotals(
        formData.lineItems,
        discount
      );

      const newQuotation: QuotationRecord = {
        id: editingId || `quote-${Date.now()}`,
        projectId,
        clientName: formData.clientName,
        date: new Date().toISOString().split('T')[0],
        expiryDate: formData.expiryDate,
        lineItems: formData.lineItems,
        subtotal,
        discount,
        discountAmount,
        tax,
        total,
        status: 'draft',
        notes: formData.notes,
        logoUrl: formData.logoUrl,
      };

      if (editingId) {
        setQuotations(prev =>
          prev.map(q => (q.id === editingId ? newQuotation : q))
        );
        toast.success('Cotización actualizada');
      } else {
        setQuotations(prev => [...prev, newQuotation]);
        toast.success('Cotización creada');
      }

      // Reset form
      setFormData({
        clientName: '',
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        lineItems: [
          { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 },
        ],
        discount: '0',
        notes: '',
        logoUrl: 'https://via.placeholder.com/150x50?text=ORIGEN+ERP',
      });
      setFormErrors({});
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error');
    }
  };

  // FEATURE 3.2: Generate PDF with logo
  const handleExportPDF = (quotation: QuotationRecord) => {
    // Simulate PDF export with logo
    const pdfContent = `
ORIGEN ERP - COTIZACIÓN

Logo: ${quotation.logoUrl}

Cliente: ${quotation.clientName}
Fecha: ${quotation.date}
Vencimiento: ${quotation.expiryDate}

--- ARTÍCULOS (${quotation.lineItems.length} items) ---
${quotation.lineItems
  .map(
    item => `
${item.description}
Cantidad: ${item.quantity}
Precio Unitario: Q${item.unitPrice.toLocaleString()}
Total: Q${item.total.toLocaleString()}
`
  )
  .join('\n')}

Subtotal: Q${quotation.subtotal.toLocaleString()}
Descuento: ${quotation.discount}% (Q${quotation.discountAmount.toLocaleString()})
IVA (13%): Q${quotation.tax.toLocaleString()}
TOTAL: Q${quotation.total.toLocaleString()}

Notas: ${quotation.notes}
    `;

    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cotizacion_${quotation.clientName}_${quotation.date}.txt`;
    link.click();

    toast.success('PDF exportado con logo');
  };

  // FEATURE 3.1: Calculate days until expiry
  const getDaysUntilExpiry = (expiryDate: string): number => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diff = expiry.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // FEATURE 3.1: Check expiry warning
  const getExpiryStatus = (daysLeft: number): { status: string; color: string } => {
    if (daysLeft < 0) return { status: 'Vencida', color: 'text-red-700' };
    if (daysLeft === 0) return { status: 'Hoy vence', color: 'text-orange-700' };
    if (daysLeft <= 3) return { status: `${daysLeft} días`, color: 'text-orange-600' };
    return { status: `${daysLeft} días`, color: 'text-green-600' };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center gap-2 text-slate-600">
          <Loader className="h-5 w-5 animate-spin" />
          <span>Cargando cotizaciones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-slate-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Cotizaciones</h1>
          <p className="text-sm text-slate-600 mt-1">
            Total: {quotations.length} cotizaciones
          </p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            {editingId ? 'Editar Cotización' : 'Nueva Cotización'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client & Expiry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cliente *
                </label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.clientName ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Nombre del cliente"
                />
              </div>

              {/* FEATURE 3.1: Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vencimiento *
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expiryDate: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.expiryDate ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-semibold text-slate-700">
                  {/* FEATURE 3.1: Show count */}
                  Artículos ({formData.lineItems.length})
                </label>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm font-semibold transition-colors"
                >
                  + Agregar
                </button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {formData.lineItems.map((item, idx) => (
                  <div key={item.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-slate-600">
                          Descripción
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            handleLineItemChange(idx, 'description', e.target.value)
                          }
                          className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            formErrors[`item-${idx}-desc`]
                              ? 'border-red-500'
                              : 'border-slate-300'
                          }`}
                          placeholder="Descripción del artículo"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-600">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleLineItemChange(idx, 'quantity', e.target.value)
                          }
                          className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            formErrors[`item-${idx}-qty`]
                              ? 'border-red-500'
                              : 'border-slate-300'
                          }`}
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-600">
                          Precio Unit.
                        </label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleLineItemChange(idx, 'unitPrice', e.target.value)
                          }
                          className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            formErrors[`item-${idx}-price`]
                              ? 'border-red-500'
                              : 'border-slate-300'
                          }`}
                          min="0"
                        />
                      </div>

                      <div className="flex gap-1">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-slate-600">
                            Total
                          </label>
                          <div className="px-2 py-1 text-sm bg-white border border-slate-300 rounded">
                            Q{item.total.toLocaleString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors mt-5 hover:text-red-700"
                          title="Remover item"
                          aria-label="Remover item"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount - FEATURE 3.4: Validation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descuento (%) - Máx 50%
                </label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (validateDiscount(value) || value === '') {
                      setFormData({ ...formData, discount: value });
                      if (formErrors.discount)
                        setFormErrors({
                          ...formErrors,
                          discount: '',
                        });
                    } else {
                      setFormErrors({
                        ...formErrors,
                        discount: 'Máximo 50%',
                      });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.discount ? 'border-red-500' : 'border-slate-300'
                  }`}
                  min="0"
                  max="50"
                />
                {formErrors.discount && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.discount}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Condiciones, términos de pago, etc."
              />
            </div>

            {/* Discount Warning */}
            {parseFloat(formData.discount) > 30 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-700">
                  Descuento alto: {formData.discount}%
                </p>
              </div>
            )}

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
                {editingId ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quotations List */}
      <div className="space-y-3">
        {quotations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600">No hay cotizaciones registradas</p>
          </div>
        ) : (
          quotations.map(quotation => {
            const daysLeft = getDaysUntilExpiry(quotation.expiryDate);
            const expiryStatus = getExpiryStatus(daysLeft);

            return (
              <div
                key={quotation.id}
                className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {quotation.clientName}
                      </h3>
                      {/* FEATURE 3.1: Show items count */}
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {quotation.lineItems.length} items
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-slate-600">
                      <p>Fecha: {quotation.date}</p>
                      <p>
                        {/* FEATURE 3.1: Expiry warning */}
                        Vence: <span className={expiryStatus.color}>
                          {expiryStatus.status}
                        </span>
                      </p>
                      <p>Estado: {quotation.status}</p>
                      <p>
                        Descuento:{' '}
                        <span className="font-semibold">
                          {quotation.discount}%
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">
                      Q{quotation.total.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* FEATURE 3.1: Expiry warning */}
                {daysLeft <= 3 && daysLeft >= 0 && (
                  <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded flex gap-2 items-center text-sm">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <p className="text-orange-700">
                      Cotización vence en {daysLeft} día(s). Confirma con el cliente.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => setPreviewQuotation(quotation)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                    title="Ver detalles"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {/* FEATURE 3.2: PDF Export with Logo */}
                  <button
                    onClick={() => handleExportPDF(quotation)}
                    className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                    title="Descargar PDF"
                  >
                    <Download className="h-4 w-4" />
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

      {/* Add Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Nueva Cotización
        </button>
      )}

      {/* Preview Modal */}
      {previewQuotation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg overflow-hidden max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-blue-50 border-b border-slate-200 p-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                Cotización - {previewQuotation.clientName}
              </h3>
              <button
                onClick={() => setPreviewQuotation(null)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Logo */}
              <div className="mb-4 text-center">
                <img
                  src={previewQuotation.logoUrl}
                  alt="Logo"
                  className="h-12 inline-block"
                />
              </div>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-600">Cliente:</p>
                    <p className="font-semibold">{previewQuotation.clientName}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Fecha:</p>
                    <p className="font-semibold">{previewQuotation.date}</p>
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2">Artículos:</p>
                  <table className="w-full text-xs">
                    <tbody>
                      {previewQuotation.lineItems.map(item => (
                        <tr key={item.id} className="border-b border-slate-200">
                          <td className="py-1">{item.description}</td>
                          <td className="text-right">{item.quantity}</td>
                          <td className="text-right">Q{item.unitPrice.toLocaleString()}</td>
                          <td className="text-right font-semibold">
                            Q{item.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-slate-200 pt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Subtotal:</span>
                    <span>Q{previewQuotation.subtotal.toLocaleString()}</span>
                  </div>
                  {previewQuotation.discount > 0 && (
                    <div className="flex justify-between text-xs mb-1 text-green-600">
                      <span>Descuento ({previewQuotation.discount}%):</span>
                      <span>-Q{previewQuotation.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs mb-1">
                    <span>IVA (13%):</span>
                    <span>Q{previewQuotation.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-slate-200">
                    <span>TOTAL:</span>
                    <span>Q{previewQuotation.total.toLocaleString()}</span>
                  </div>
                </div>

                {previewQuotation.notes && (
                  <div>
                    <p className="font-semibold">Notas:</p>
                    <p className="text-slate-600">{previewQuotation.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuotationsView;

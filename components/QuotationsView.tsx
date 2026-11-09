/**
 * ORIGEN ERP - Quotations Management Component
 * Features:
 * - Show line items count in list
 * - Add logo to PDF export
 * - Expiration warning (days until expiry)
 * - Discount validation (max 50%)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import Image from 'next/image';
import { Plus, Pencil, Trash2, FileText, Download, Loader, Eye, Clock } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import {
  calculateTotals,
  getDaysUntilExpiry,
  getExpiryStatus,
  validateDiscountValue,
} from '@/lib/quotationUtils';

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
    lineItems: [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }],
    discount: '0',
    notes: '',
    logoUrl: '/assets/branding/web-banner-logo.png',
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
          logoUrl: '/assets/branding/web-banner-logo.png',
        },
      ]);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [projectId]);

  const validateDiscount = (value: string): boolean => validateDiscountValue(value);

  const buildEmptyLineItem = (): LineItem => ({
    id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    description: '',
    quantity: 1,
    unitPrice: 0,
    total: 0,
  });

  const resetForm = () => {
    setFormData({
      clientName: '',
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lineItems: [buildEmptyLineItem()],
      discount: '0',
      notes: '',
      logoUrl: '/assets/branding/web-banner-logo.png',
    });
    setFormErrors({});
    setEditingId(null);
  };

  // Handle line item change
  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    setFormData((prev) => {
      const nextItems = prev.lineItems.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const nextItem: LineItem = { ...item };

        if (field === 'quantity' || field === 'unitPrice') {
          const numericValue = Number(value);
          if (!Number.isFinite(numericValue)) {
            return item;
          }

          nextItem[field] = numericValue;
          nextItem.total = nextItem.quantity * nextItem.unitPrice;
          return nextItem;
        }

        const typedValue = value as string;
        nextItem[field] = typedValue as never;
        return nextItem;
      });

      return { ...prev, lineItems: nextItems };
    });
  };

  // Add line item
  const addLineItem = () => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, buildEmptyLineItem()],
    }));
  };

  // Remove line item
  const removeLineItem = (index: number) => {
    setFormData((prev) => {
      if (prev.lineItems.length === 1) {
        toast.error('Debe haber al menos un artículo');
        return prev;
      }

      return {
        ...prev,
        lineItems: prev.lineItems.filter((_, i) => i !== index),
      };
    });
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.clientName.trim()) errors.clientName = 'El cliente es requerido';
    if (!formData.expiryDate) errors.expiryDate = 'Fecha de vencimiento requerida';
    if (formData.lineItems.length === 0) errors.lineItems = 'Debe haber al menos un artículo';

    formData.lineItems.forEach((item, idx) => {
      if (!item.description.trim()) errors[`item-${idx}-desc`] = 'Descripción requerida';
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
        setQuotations((prev) => prev.map((q) => (q.id === editingId ? newQuotation : q)));
        toast.success('Cotización actualizada');
      } else {
        setQuotations((prev) => [...prev, newQuotation]);
        toast.success('Cotización creada');
      }

      resetForm();
      setShowForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error');
    }
  };

  // FEATURE 3.2: Generate real PDF export
  const handleExportPDF = (quotation: QuotationRecord) => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.setFillColor(37, 99, 235);
    pdf.rect(0, 0, pageWidth, 24, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.text('ORIGEN ERP - Cotización', 14, 14);

    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(10);
    pdf.text(`Cliente: ${quotation.clientName}`, 14, 38);
    pdf.text(`Fecha: ${quotation.date}`, 14, 44);
    pdf.text(`Vencimiento: ${quotation.expiryDate}`, 14, 50);
    pdf.text(`Estado: ${quotation.status}`, 14, 56);

    pdf.setFontSize(11);
    pdf.setTextColor(30, 41, 59);
    pdf.text('Detalle', 14, 72);

    let y = 80;
    pdf.setFontSize(9);

    quotation.lineItems.forEach((item) => {
      const itemText = `${item.description} | Qty ${item.quantity} | Q${item.unitPrice.toLocaleString()} | Total Q${item.total.toLocaleString()}`;
      const splitText = pdf.splitTextToSize(itemText, 170);

      if (y + splitText.length * 5 > pageHeight - 40) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(splitText, 14, y);
      y += splitText.length * 5 + 2;
    });

    pdf.setFontSize(10);
    pdf.text(`Subtotal: Q${quotation.subtotal.toLocaleString()}`, 130, y + 10);
    pdf.text(`Descuento (${quotation.discount}%): -Q${quotation.discountAmount.toLocaleString()}`, 130, y + 17);
    pdf.text(`IVA (12%): Q${quotation.tax.toLocaleString()}`, 130, y + 24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`TOTAL: Q${quotation.total.toLocaleString()}`, 130, y + 33);
    pdf.setFont('helvetica', 'normal');

    if (quotation.notes) {
      pdf.text('Notas:', 14, y + 12);
      pdf.splitTextToSize(quotation.notes, 110).forEach((line: string, index: number) => {
        pdf.text(line, 14, y + 18 + index * 5);
      });
    }

    pdf.save(`cotizacion_${quotation.clientName}_${quotation.date}.pdf`);
    toast.success('PDF exportado correctamente');
  };

  const handleEditQuotation = (quotation: QuotationRecord) => {
    setEditingId(quotation.id);
    setFormData({
      clientName: quotation.clientName,
      expiryDate: quotation.expiryDate,
      lineItems: quotation.lineItems.map((item) => ({ ...item })),
      discount: String(quotation.discount),
      notes: quotation.notes,
      logoUrl: quotation.logoUrl,
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleCancelForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleDeleteQuotation = (quotationId: string) => {
    const confirmed = window.confirm('¿Deseas eliminar esta cotización?');
    if (!confirmed) {
      return;
    }

    setQuotations((prev) => prev.filter((quotation) => quotation.id !== quotationId));
    if (previewQuotation?.id === quotationId) {
      setPreviewQuotation(null);
    }
    toast.success('Cotización eliminada');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center gap-2 text-slate-600">
          <Loader className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Cargando cotizaciones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Cotizaciones</h1>
          <p className="mt-1 text-sm text-slate-600">Total: {quotations.length} cotizaciones</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-6 text-lg font-semibold text-slate-900">
            {editingId ? 'Editar Cotización' : 'Nueva Cotización'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client & Expiry */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Cliente *</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.clientName ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Nombre del cliente"
                />
              </div>

              {/* FEATURE 3.1: Expiry Date */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Vencimiento *
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.expiryDate ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  {/* FEATURE 3.1: Show count */}
                  Artículos ({formData.lineItems.length})
                </label>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="rounded bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-200"
                >
                  + Agregar
                </button>
              </div>

              <div className="max-h-64 space-y-3 overflow-y-auto">
                {formData.lineItems.map((item, idx) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-5">
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-slate-600">Descripción</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                          className={`w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            formErrors[`item-${idx}-desc`] ? 'border-red-500' : 'border-slate-300'
                          }`}
                          placeholder="Descripción del artículo"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-600">Cantidad</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)}
                          className={`w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            formErrors[`item-${idx}-qty`] ? 'border-red-500' : 'border-slate-300'
                          }`}
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-600">Precio Unit.</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleLineItemChange(idx, 'unitPrice', e.target.value)}
                          className={`w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            formErrors[`item-${idx}-price`] ? 'border-red-500' : 'border-slate-300'
                          }`}
                          min="0"
                        />
                      </div>

                      <div className="flex gap-1">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-slate-600">Total</label>
                          <div className="rounded border border-slate-300 bg-white px-2 py-1 text-sm">
                            Q{item.total.toLocaleString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          className="mt-5 rounded-lg p-2 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
                          title="Remover item"
                          aria-label="Remover item"
                        >
                          <Trash2 className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount - FEATURE 3.4: Validation */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Descuento (%) - Máx 50%
                </label>
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => {
                    const value = e.target.value;
                    const nextValue = value === '' ? '' : value;

                    setFormData({ ...formData, discount: nextValue });

                    if (formErrors.discount) {
                      setFormErrors({
                        ...formErrors,
                        discount: validateDiscountValue(nextValue) ? '' : 'Máximo 50%',
                      });
                    }
                  }}
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.discount ? 'border-red-500' : 'border-slate-300'
                  }`}
                  min="0"
                  max="50"
                />
                {formErrors.discount && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.discount}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Condiciones, términos de pago, etc."
              />
            </div>

            {/* Discount Warning */}
            {parseFloat(formData.discount) > 30 && (
              <Alert
                variant="warning"
                title="Descuento alto"
                message={`Descuento alto: ${formData.discount}%`}
                dismissible={false}
                className="mb-4"
              />
            )}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={handleCancelForm}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
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
          <div className="rounded-lg border border-slate-200 bg-white py-12 text-center">
            <FileText className="mx-auto mb-3 h-12 w-12 text-slate-300" aria-hidden="true" />
            <p className="text-slate-600">No hay cotizaciones registradas</p>
          </div>
        ) : (
          quotations.map((quotation) => {
            const daysLeft = getDaysUntilExpiry(quotation.expiryDate);
            const expiryStatus = getExpiryStatus(daysLeft);

            return (
              <div
                key={quotation.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {quotation.clientName}
                      </h3>
                      {/* FEATURE 3.1: Show items count */}
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                        {quotation.lineItems.length} items
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-4">
                      <p>Fecha: {quotation.date}</p>
                      <p>
                        {/* FEATURE 3.1: Expiry warning */}
                        Vence: <span className={expiryStatus.color}>{expiryStatus.status}</span>
                      </p>
                      <p>Estado: {quotation.status}</p>
                      <p>
                        Descuento: <span className="font-semibold">{quotation.discount}%</span>
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
                  <div className="mb-3 flex items-center gap-2 rounded border border-orange-200 bg-orange-50 p-2 text-sm">
                    <Clock className="h-4 w-4 text-orange-600" aria-hidden="true" />
                    <p className="text-orange-700">
                      Cotización vence en {daysLeft} día(s). Confirma con el cliente.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                  <button
                    onClick={() => setPreviewQuotation(quotation)}
                    className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                    title="Ver detalles"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {/* FEATURE 3.2: PDF Export with Logo */}
                  <button
                    onClick={() => handleExportPDF(quotation)}
                    className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-100"
                    title="Descargar PDF"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => handleEditQuotation(quotation)}
                    className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                    title="Editar"
                    aria-label={`Editar cotización de ${quotation.clientName}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuotation(quotation.id)}
                    className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-100"
                    title="Eliminar"
                    aria-label={`Eliminar cotización de ${quotation.clientName}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
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
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Nueva Cotización
        </button>
      )}

      {/* Preview Modal */}
      {previewQuotation && (
        <Modal
          isOpen={Boolean(previewQuotation)}
          onClose={() => setPreviewQuotation(null)}
          title={`Cotización - ${previewQuotation.clientName}`}
          maxWidth="lg"
        >
          <div className="p-6">
            {/* Logo */}
            <div className="mb-4 text-center">
              <Image
                src={previewQuotation.logoUrl}
                alt="Logo"
                width={153}
                height={153}
                className="inline-block h-12 w-12 object-contain"
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
                <p className="mb-2 font-semibold">Artículos:</p>
                <table className="w-full text-xs">
                  <tbody>
                    {previewQuotation.lineItems.map((item) => (
                      <tr key={item.id} className="border-b border-slate-200">
                        <td className="py-1">{item.description}</td>
                        <td className="text-right">{item.quantity}</td>
                        <td className="text-right">Q{item.unitPrice.toLocaleString()}</td>
                        <td className="text-right font-semibold">Q{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 pt-2">
                <div className="mb-1 flex justify-between text-xs">
                  <span>Subtotal:</span>
                  <span>Q{previewQuotation.subtotal.toLocaleString()}</span>
                </div>
                {previewQuotation.discount > 0 && (
                  <div className="mb-1 flex justify-between text-xs text-green-600">
                    <span>Descuento ({previewQuotation.discount}%):</span>
                    <span>-Q{previewQuotation.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="mb-1 flex justify-between text-xs">
                  <span>IVA (12%):</span>
                  <span>Q{previewQuotation.tax.toLocaleString()}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-sm font-bold">
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
        </Modal>
      )}
    </div>
  );
}

export default QuotationsView;

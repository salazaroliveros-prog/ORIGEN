/**
 * ORIGEN ERP - Crear Factura FEL (Factura Electrónica de Guatemala)
 *
 * Permite al usuario ingresar manualmente los datos de una factura
 * electrónica obtenidos del SAT (Agencia Virtual del Contribuyente).
 * No se usa ninguna API ni credenciales del SAT.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useActiveWorkspace } from '@/lib/hooks/useActiveWorkspace';
import { useFelInvoices } from '@/lib/hooks/data/useFelInvoices';
import { canWriteFelInvoices } from '@/lib/permissions';
import {
  IVA_RATE_GT,
  normalizeFelInvoiceItems,
  calculateFelInvoiceTotals,
  formatFelDteNumber,
  formatFelCurrency,
} from '@/lib/domain/felInvoice';
import type { FelInvoice, FelInvoiceItem, FelInvoiceEmisor, FelInvoiceReceptor } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

interface NewInvoiceFormData {
  dteNumber: string;
  serie: string;
  correlativo: string;
  date: string;
  emisorNit: string;
  emisorNombre: string;
  emisorDireccion: string;
  emisorCorreo: string;
  emisorTelefono: string;
  receptorNit: string;
  receptorNombre: string;
  receptorDireccion: string;
  receptorCorreo: string;
  receptorTelefono: string;
  notes: string;
  paymentMethod: string;
  paymentDate: string;
}

export default function NewFelInvoicePage() {
  const router = useRouter();
  const {
    status,
    companyId,
    currentUserId,
    role,
    ready,
    loading: workspaceLoading,
    error: workspaceError,
  } = useActiveWorkspace();
  const { addInvoice, loading } = useFelInvoices({ companyId, currentUserId });
  const canWrite = canWriteFelInvoices(role);

  useEffect(() => {
    if (status === 'unauthenticated' || status === 'error') {
      router.replace('/login');
    }
  }, [status, router]);

  const [formData, setFormData] = useState<NewInvoiceFormData>({
    dteNumber: '',
    serie: 'F',
    correlativo: '000000001',
    date: new Date().toISOString().split('T')[0],
    emisorNit: '',
    emisorNombre: '',
    emisorDireccion: '',
    emisorCorreo: '',
    emisorTelefono: '',
    receptorNit: '',
    receptorNombre: '',
    receptorDireccion: '',
    receptorCorreo: '',
    receptorTelefono: '',
    notes: '',
    paymentMethod: 'Efectivo',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  const [items, setItems] = useState<FelInvoiceItem[]>([
    {
      id: 'item-1',
      description: '',
      quantity: 1,
      unit: 'Und',
      unitPriceGTQ: 0,
      totalPriceGTQ: 0,
      // Fracción (0.12 = 12 % de IVA Guatemala), no porcentaje.
      taxRate: IVA_RATE_GT,
      taxAmountGTQ: 0,
    },
  ]);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemData, setEditItemData] = useState<{
    description: string;
    quantity: string;
    unit: string;
    unitPriceGTQ: string;
  }>({ description: '', quantity: '', unit: 'Und', unitPriceGTQ: '' });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Totales en vivo: se normalizan los ítems antes de sumar, igual que al
  // guardar. Sin esto el resumen mostraba Q 0 mientras se digitaban los ítems.
  const { subtotalGTQ, taxAmountGTQ, totalGTQ } = useMemo(
    () => calculateFelInvoiceTotals(normalizeFelInvoiceItems(items)),
    [items]
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.dteNumber.trim()) {
      newErrors.dteNumber = 'El número de DTE es requerido';
    }
    if (!formData.serie.trim()) {
      newErrors.serie = 'La serie es requerida';
    }
    if (!formData.correlativo.trim()) {
      newErrors.correlativo = 'El correlativo es requerido';
    }
    if (!formData.date) {
      newErrors.date = 'La fecha es requerida';
    }
    if (!formData.emisorNit.trim()) {
      newErrors.emisorNit = 'El NIT del emisor es requerido';
    }
    if (!formData.emisorNombre.trim()) {
      newErrors.emisorNombre = 'El nombre del emisor es requerido';
    }
    if (!formData.emisorDireccion.trim()) {
      newErrors.emisorDireccion = 'La dirección del emisor es requerida';
    }
    if (!formData.receptorNit.trim()) {
      newErrors.receptorNit = 'El NIT del receptor es requerido';
    }
    if (!formData.receptorNombre.trim()) {
      newErrors.receptorNombre = 'El nombre del receptor es requerido';
    }
    if (!formData.receptorDireccion.trim()) {
      newErrors.receptorDireccion = 'La dirección del receptor es requerida';
    }
    if (items.length === 0) {
      newErrors.items = 'Debe agregar al menos un ítem';
    } else {
      items.forEach((item, idx) => {
        if (!item.description.trim()) {
          newErrors[`item-${idx}-description`] = `Ítem ${idx + 1}: descripción requerida`;
        }
        if (!item.quantity || item.quantity <= 0) {
          newErrors[`item-${idx}-qty`] = `Ítem ${idx + 1}: cantidad inválida`;
        }
        if (!item.unitPriceGTQ || item.unitPriceGTQ < 0) {
          newErrors[`item-${idx}-price`] = `Ítem ${idx + 1}: precio unitario inválido`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addItem = () => {
    const newItem: FelInvoiceItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unit: 'Und',
      unitPriceGTQ: 0,
      totalPriceGTQ: 0,
      taxRate: IVA_RATE_GT,
      taxAmountGTQ: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof FelInvoiceItem, value: any) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const startEditItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setEditingItemId(id);
    setEditItemData({
      description: item.description,
      quantity: item.quantity.toString(),
      unit: item.unit,
      unitPriceGTQ: item.unitPriceGTQ.toString(),
    });
  };

  const saveEditItem = () => {
    if (!editingItemId) return;
    const quantity = parseFloat(editItemData.quantity) || 0;
    const unitPriceGTQ = parseFloat(editItemData.unitPriceGTQ) || 0;
    setItems(
      items.map((i) =>
        i.id === editingItemId
          ? {
              ...i,
              description: editItemData.description,
              quantity,
              unit: editItemData.unit,
              unitPriceGTQ,
            }
          : i
      )
    );
    setEditingItemId(null);
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor completa todos los campos correctamente');
      return;
    }

    if (!currentUserId || !companyId) {
      toast.error('No hay sesión activa');
      return;
    }

    const normalizedItems = normalizeFelInvoiceItems(items);
    const totals = calculateFelInvoiceTotals(normalizedItems);

    const invoice: FelInvoice = {
      id: `fel-${Date.now()}`,
      companyId,
      authorId: currentUserId,
      dteNumber: formData.dteNumber.trim(),
      serie: formData.serie.trim(),
      correlativo: formData.correlativo.trim(),
      date: formData.date,
      status: 'Borrador',
      emisor: {
        nit: formData.emisorNit.trim(),
        nombre: formData.emisorNombre.trim(),
        direccion: formData.emisorDireccion.trim(),
        correo: formData.emisorCorreo.trim(),
        telefono: formData.emisorTelefono.trim(),
      },
      receptor: {
        nit: formData.receptorNit.trim(),
        nombre: formData.receptorNombre.trim(),
        direccion: formData.receptorDireccion.trim(),
        correo: formData.receptorCorreo.trim(),
        telefono: formData.receptorTelefono.trim(),
      },
      items: normalizedItems,
      subtotalGTQ: totals.subtotalGTQ,
      taxAmountGTQ: totals.taxAmountGTQ,
      totalGTQ: totals.totalGTQ,
      paymentMethod: formData.paymentMethod as FelInvoice['paymentMethod'],
      paymentDate: formData.paymentDate,
      notes: formData.notes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addInvoice(invoice).then((success) => {
      if (success) {
        setTimeout(() => {
          router.replace(`/fel-invoices/${invoice.id}/print`);
        }, 1500);
      }
    });
  };

  if (status === 'loading' || workspaceLoading || (!ready && !workspaceError)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 flex h-8 w-8 animate-spin items-center justify-center rounded-full border-4 border-brand-primary/30 border-t-brand-primary" />
          <p className="text-slate-400">Preparando el formulario…</p>
        </div>
      </div>
    );
  }

  if (workspaceError || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <Card variant="glass" padding="lg" className="max-w-md text-center">
          <h1 className="mb-2 text-xl font-bold text-white">No se pudo cargar la empresa</h1>
          <p className="mb-4 text-sm text-slate-400">
            {workspaceError ?? 'Inicia sesión para emitir facturas FEL.'}
          </p>
          <Button variant="primary" onClick={() => router.replace('/login')}>
            Ir a iniciar sesión
          </Button>
        </Card>
      </div>
    );
  }

  if (!canWrite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <Card variant="glass" padding="lg" className="max-w-md text-center">
          <h1 className="mb-2 text-xl font-bold text-white">Permiso insuficiente</h1>
          <p className="mb-4 text-sm text-slate-400">
            Solo los roles de propietario, administrador o finanzas pueden emitir facturas FEL.
          </p>
          <Button variant="outline" onClick={() => router.replace('/fel-invoices')}>
            Volver al listado
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <Card variant="glass" padding="lg">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-sky-500 shadow-glass">
            <span className="font-bold text-white">🧾</span>
          </div>
          <div>
            <h1 className="mb-0 text-2xl font-bold text-white">Nueva Factura FEL</h1>
            <p className="text-sm text-slate-400">
              Ingrese los datos de su factura electrónica de Guatemala
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* DTE Information */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Número de DTE
              </label>
              <Input
                type="text"
                placeholder="FAC-001-000000001"
                value={formData.dteNumber}
                onChange={(e) => setFormData({ ...formData, dteNumber: e.target.value })}
                required
                variant={errors.dteNumber ? 'error' : 'default'}
              />
              {errors.dteNumber && <p className="mt-1 text-xs text-danger">{errors.dteNumber}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Serie
              </label>
              <Input
                type="text"
                value={formData.serie}
                onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                required
                variant={errors.serie ? 'error' : 'default'}
              />
              {errors.serie && <p className="mt-1 text-xs text-red-400">{errors.serie}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Correlativo
              </label>
              <Input
                type="text"
                placeholder="000000001"
                value={formData.correlativo}
                onChange={(e) => setFormData({ ...formData, correlativo: e.target.value })}
                required
                variant={errors.correlativo ? 'error' : 'default'}
              />
              {errors.correlativo && (
                <p className="mt-1 text-xs text-red-400">{errors.correlativo}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Fecha de Emisión
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                variant={errors.date ? 'error' : 'default'}
              />
              {errors.date && <p className="mt-1 text-xs text-red-400">{errors.date}</p>}
            </div>
          </div>

          {/* Emisor */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                NIT Emisor
              </label>
              <Input
                type="text"
                placeholder="1234567-8"
                value={formData.emisorNit}
                onChange={(e) => setFormData({ ...formData, emisorNit: e.target.value })}
                required
                variant={errors.emisorNit ? 'error' : 'default'}
              />
              {errors.emisorNit && <p className="mt-1 text-xs text-red-400">{errors.emisorNit}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Nombre Emisor
              </label>
              <Input
                type="text"
                placeholder="Nombre de la empresa emisora"
                value={formData.emisorNombre}
                onChange={(e) => setFormData({ ...formData, emisorNombre: e.target.value })}
                required
                variant={errors.emisorNombre ? 'error' : 'default'}
              />
              {errors.emisorNombre && (
                <p className="mt-1 text-xs text-red-400">{errors.emisorNombre}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Dirección Emisor
              </label>
              <Input
                type="text"
                placeholder="Dirección completa"
                value={formData.emisorDireccion}
                onChange={(e) => setFormData({ ...formData, emisorDireccion: e.target.value })}
                required
                variant={errors.emisorDireccion ? 'error' : 'default'}
              />
              {errors.emisorDireccion && (
                <p className="mt-1 text-xs text-red-400">{errors.emisorDireccion}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Correo Emisor
              </label>
              <Input
                type="email"
                placeholder="empresa@correo.com"
                value={formData.emisorCorreo}
                onChange={(e) => setFormData({ ...formData, emisorCorreo: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Teléfono Emisor
              </label>
              <Input
                type="tel"
                placeholder="+502 1234-5678"
                value={formData.emisorTelefono}
                onChange={(e) => setFormData({ ...formData, emisorTelefono: e.target.value })}
              />
            </div>
          </div>

          {/* Receptor */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                NIT Receptor
              </label>
              <Input
                type="text"
                placeholder="1234567-8"
                value={formData.receptorNit}
                onChange={(e) => setFormData({ ...formData, receptorNit: e.target.value })}
                required
                variant={errors.receptorNit ? 'error' : 'default'}
              />
              {errors.receptorNit && (
                <p className="mt-1 text-xs text-red-400">{errors.receptorNit}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Nombre Receptor
              </label>
              <Input
                type="text"
                placeholder="Nombre del cliente"
                value={formData.receptorNombre}
                onChange={(e) => setFormData({ ...formData, receptorNombre: e.target.value })}
                required
                variant={errors.receptorNombre ? 'error' : 'default'}
              />
              {errors.receptorNombre && (
                <p className="mt-1 text-xs text-red-400">{errors.receptorNombre}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Dirección Receptor
              </label>
              <Input
                type="text"
                placeholder="Dirección completa"
                value={formData.receptorDireccion}
                onChange={(e) => setFormData({ ...formData, receptorDireccion: e.target.value })}
                required
                variant={errors.receptorDireccion ? 'error' : 'default'}
              />
              {errors.receptorDireccion && (
                <p className="mt-1 text-xs text-red-400">{errors.receptorDireccion}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Correo Receptor
              </label>
              <Input
                type="email"
                placeholder="cliente@correo.com"
                value={formData.receptorCorreo}
                onChange={(e) => setFormData({ ...formData, receptorCorreo: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Teléfono Receptor
              </label>
              <Input
                type="tel"
                placeholder="+502 1234-5678"
                value={formData.receptorTelefono}
                onChange={(e) => setFormData({ ...formData, receptorTelefono: e.target.value })}
              />
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="mb-2 flex items-end justify-between">
              <h3 className="text-sm font-semibold text-white">Ítems de la Factura</h3>
              <Button variant="outline" size="sm" onClick={addItem} className="text-xs">
                + Agregar Ítem
              </Button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white/[0.05]">
                <tr>
                  <th className="pb-2 text-left">Descripción</th>
                  <th className="pb-2 text-right">Cantidad</th>
                  <th className="pb-2 text-right">Unidad</th>
                  <th className="pb-2 text-right">Precio Unit. (Q)</th>
                  <th className="pb-2 text-right">Total (Q)</th>
                  <th className="pb-2 text-right">IVA (Q)</th>
                  <th className="pb-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-white/10">
                    {editingItemId === item.id ? (
                      <td colSpan={5}>
                        <div className="flex gap-2">
                          <Input
                            value={editItemData.description}
                            onChange={(e) =>
                              setEditItemData({
                                ...editItemData,
                                description: e.target.value,
                              })
                            }
                            className="flex-1 text-xs"
                            placeholder="Descripción"
                          />
                          <Input
                            type="number"
                            value={editItemData.quantity}
                            onChange={(e) =>
                              setEditItemData({
                                ...editItemData,
                                quantity: e.target.value,
                              })
                            }
                            className="w-16 text-xs"
                            placeholder="Cant."
                          />
                          <Input
                            value={editItemData.unit}
                            onChange={(e) =>
                              setEditItemData({
                                ...editItemData,
                                unit: e.target.value,
                              })
                            }
                            className="w-20 text-xs"
                            placeholder="Und"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            value={editItemData.unitPriceGTQ}
                            onChange={(e) =>
                              setEditItemData({
                                ...editItemData,
                                unitPriceGTQ: e.target.value,
                              })
                            }
                            className="w-24 text-xs"
                            placeholder="0.00"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={saveEditItem}
                            className="text-xs"
                          >
                            Guardar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelEditItem}
                            className="text-xs text-red-400"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="py-2">{item.description}</td>
                        <td className="py-2 text-right">{item.quantity}</td>
                        <td className="py-2 text-right">{item.unit}</td>
                        <td className="py-2 text-right">{formatFelCurrency(item.unitPriceGTQ)}</td>
                        <td className="py-2 text-right font-medium">
                          {formatFelCurrency(item.totalPriceGTQ)}
                        </td>
                        <td className="py-2 text-right">
                          {formatFelCurrency(item.taxAmountGTQ ?? 0)}
                        </td>
                        <td className="py-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditItem(item.id)}
                            className="text-xs"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="text-xs text-red-400"
                          >
                            Eliminar
                          </Button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="text-right">
              <div className="text-xs text-slate-400">Subtotal</div>
              <div className="font-mono text-lg font-bold text-white">
                {formatFelCurrency(subtotalGTQ)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">IVA (12%)</div>
              <div className="font-mono text-lg font-bold text-white">
                {formatFelCurrency(taxAmountGTQ)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-400">Total</div>
              <div className="font-mono text-2xl font-bold text-amber-400">
                {formatFelCurrency(totalGTQ)}
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Método de Pago
              </label>
              <Input
                type="text"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Fecha de Pago
              </label>
              <Input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Observaciones
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary/50"
              placeholder="Observaciones adicionales de la factura…"
            />
          </div>

          <div className="pt-6">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Guardando…' : 'Guardar Factura FEL'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

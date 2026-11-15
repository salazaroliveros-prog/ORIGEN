/**
 * ORIGEN ERP - Crear Factura FEL (Factura Electrónica de Guatemala)
 *
 * Permite al usuario ingresar manualmente los datos de una factura
 * electrónica obtenidos del SAT (Agencia Virtual del Contribuyente).
 * No se usa ninguna API ni credenciales del SAT.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { useFelInvoices } from '@/lib/hooks/data/useFelInvoices';
import {
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
  const { currentUser } = useAuthSession();
  const { addInvoice, loading } = useFelInvoices({
    companyId: '', // se resolverá desde el contexto
    currentUserId: '',
  });

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
      taxRate: 12,
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

  // Recalcular totales cuando cambian los ítems
  const { subtotalGTQ, taxAmountGTQ, totalGTQ } = calculateFelInvoiceTotals(items);

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
      taxRate: 12,
      taxAmountGTQ: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof FelInvoiceItem, value: any) => {
    setItems(
      items.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
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

    if (!currentUser) {
      toast.error('No hay sesión activa');
      return;
    }

    const normalizedItems = normalizeFelInvoiceItems(items);
    const totals = calculateFelInvoiceTotals(normalizedItems);

    const invoice: FelInvoice = {
      id: `fel-${Date.now()}`,
      companyId: '', // se resolverá en el hook
      authorId: currentUser.uid,
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

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card variant="glass" padding="lg">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-sky-500 flex items-center justify-center shadow-glass">
            <span className="text-white font-bold">🧾</span>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Número de DTE
              </label>
              <Input
                type="text"
                placeholder="FAC-001-000000001"
                value={formData.dteNumber}
                onChange={(e) =>
                  setFormData({ ...formData, dteNumber: e.target.value })}
                required
                variant={errors.dteNumber ? 'error' : 'default'}
              />
              {errors.dteNumber && (
                <p className="mt-1 text-xs text-danger">{errors.dteNumber}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Correlativo
              </label>
              <Input
                type="text"
                placeholder="000000001"
                value={formData.correlativo}
                onChange={(e) =>
                  setFormData({ ...formData, correlativo: e.target.value })
                }
                required
                variant={errors.correlativo ? 'error' : 'default'}
              />
              {errors.correlativo && (
                <p className="mt-1 text-xs text-red-400">{errors.correlativo}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                NIT Emisor
              </label>
              <Input
                type="text"
                placeholder="1234567-8"
                value={formData.emisorNit}
                onChange={(e) =>
                  setFormData({ ...formData, emisorNit: e.target.value })
                }
                required
                variant={errors.emisorNit ? 'error' : 'default'}
              />
              {errors.emisorNit && (
                <p className="mt-1 text-xs text-red-400">{errors.emisorNit}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Nombre Emisor
              </label>
              <Input
                type="text"
                placeholder="Nombre de la empresa emisora"
                value={formData.emisorNombre}
                onChange={(e) =>
                  setFormData({ ...formData, emisorNombre: e.target.value })
                }
                required
                variant={errors.emisorNombre ? 'error' : 'default'}
              />
              {errors.emisorNombre && (
                <p className="mt-1 text-xs text-red-400">{errors.emisorNombre}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Dirección Emisor
              </label>
              <Input
                type="text"
                placeholder="Dirección completa"
                value={formData.emisorDireccion}
                onChange={(e) =>
                  setFormData({ ...formData, emisorDireccion: e.target.value })
                }
                required
                variant={errors.emisorDireccion ? 'error' : 'default'}
              />
              {errors.emisorDireccion && (
                <p className="mt-1 text-xs text-red-400">{errors.emisorDireccion}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Correo Emisor
              </label>
              <Input
                type="email"
                placeholder="empresa@correo.com"
                value={formData.emisorCorreo}
                onChange={(e) =>
                  setFormData({ ...formData, emisorCorreo: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Teléfono Emisor
              </label>
              <Input
                type="tel"
                placeholder="+502 1234-5678"
                value={formData.emisorTelefono}
                onChange={(e) =>
                  setFormData({ ...formData, emisorTelefono: e.target.value })
                }
              />
            </div>
          </div>

          {/* Receptor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                NIT Receptor
              </label>
              <Input
                type="text"
                placeholder="1234567-8"
                value={formData.receptorNit}
                onChange={(e) =>
                  setFormData({ ...formData, receptorNit: e.target.value })
                }
                required
                variant={errors.receptorNit ? 'error' : 'default'}
              />
              {errors.receptorNit && (
                <p className="mt-1 text-xs text-red-400">{errors.receptorNit}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Nombre Receptor
              </label>
              <Input
                type="text"
                placeholder="Nombre del cliente"
                value={formData.receptorNombre}
                onChange={(e) =>
                  setFormData({ ...formData, receptorNombre: e.target.value })
                }
                required
                variant={errors.receptorNombre ? 'error' : 'default'}
              />
              {errors.receptorNombre && (
                <p className="mt-1 text-xs text-red-400">{errors.receptorNombre}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Dirección Receptor
              </label>
              <Input
                type="text"
                placeholder="Dirección completa"
                value={formData.receptorDireccion}
                onChange={(e) =>
                  setFormData({ ...formData, receptorDireccion: e.target.value })
                }
                required
                variant={errors.receptorDireccion ? 'error' : 'default'}
              />
              {errors.receptorDireccion && (
                <p className="mt-1 text-xs text-red-400">{errors.receptorDireccion}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Correo Receptor
              </label>
              <Input
                type="email"
                placeholder="cliente@correo.com"
                value={formData.receptorCorreo}
                onChange={(e) =>
                  setFormData({ ...formData, receptorCorreo: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Teléfono Receptor
              </label>
              <Input
                type="tel"
                placeholder="+502 1234-5678"
                value={formData.receptorTelefono}
                onChange={(e) =>
                  setFormData({ ...formData, receptorTelefono: e.target.value })
                }
              />
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <h3 className="text-sm font-semibold text-white">Ítems de la Factura</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addItem}
                className="text-xs"
              >
                + Agregar Ítem
              </Button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white/[0.05]">
                <tr>
                  <th className="text-left pb-2">Descripción</th>
                  <th className="text-right pb-2">Cantidad</th>
                  <th className="text-right pb-2">Unidad</th>
                  <th className="text-right pb-2">Precio Unit. (Q)</th>
                  <th className="text-right pb-2">Total (Q)</th>
                  <th className="text-right pb-2">IVA (Q)</th>
                  <th className="text-center pb-2">Acciones</th>
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
                        <td className="text-right py-2">{item.quantity}</td>
                        <td className="text-right py-2">{item.unit}</td>
                        <td className="text-right py-2">
                          {formatFelCurrency(item.unitPriceGTQ)}
                        </td>
                        <td className="text-right py-2 font-medium">
                          {formatFelCurrency(item.totalPriceGTQ)}
                        </td>
                        <td className="text-right py-2">
                          {formatFelCurrency(item.taxAmountGTQ ?? 0)}
                        </td>
                        <td className="text-center py-2">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="text-right">
              <div className="text-xs text-slate-400">Subtotal</div>
              <div className="text-lg font-mono font-bold text-white">
                {formatFelCurrency(subtotalGTQ)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">IVA (12%)</div>
              <div className="text-lg font-mono font-bold text-white">
                {formatFelCurrency(taxAmountGTQ)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-400">Total</div>
              <div className="text-2xl font-mono font-bold text-amber-400">
                {formatFelCurrency(totalGTQ)}
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Método de Pago
              </label>
              <Input
                type="text"
                value={formData.paymentMethod}
                onChange={(e) =>
                  setFormData({ ...formData, paymentMethod: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Fecha de Pago
              </label>
              <Input
                type="date"
                value={formData.paymentDate}
                onChange={(e) =>
                  setFormData({ ...formData, paymentDate: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Observaciones
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })}
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

/**
 * ORIGEN ERP - Listado de Facturas FEL
 *
 * Muestra todas las facturas electrónicas de Guatemala registradas
 * por la empresa actual. Permite ver, editar, eliminar e imprimir cada factura.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { useFelInvoices } from '@/lib/hooks/data/useFelInvoices';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatFelCurrency } from '@/lib/domain/felInvoice';
import type { FelInvoice } from '@/lib/types';

export default function FelInvoicesListPage() {
  const router = useRouter();
  const { currentUser } = useAuthSession();
  const { invoices, loading, addInvoice, updateInvoice, deleteInvoice } =
    useFelInvoices({ companyId: '', currentUserId: '' });

  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    status: FelInvoice['status'];
    notes: string;
  }>({ status: 'Borrador', notes: '' });

  const filteredInvoices = invoices.filter((inv) => {
    if (!filter) return true;
    const term = filter.toLowerCase();
    return (
      inv.dteNumber.toLowerCase().includes(term) ||
      inv.emisor.nombre.toLowerCase().includes(term) ||
      inv.receptor.nombre.toLowerCase().includes(term) ||
      inv.emisor.nit.includes(term) ||
      inv.receptor.nit.includes(term)
    );
  });

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-GT');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta factura FEL?')) return;
    const ok = await deleteInvoice(id);
    if (ok) {
      toast.success('Factura FEL eliminada correctamente');
    } else {
      toast.error('No se pudo eliminar la factura FEL');
    }
  };

  const handleEditStatus = async (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    setEditData({ status: inv.status, notes: inv.notes ?? '' });
    setEditingId(id);
  };

  const saveEdit = async (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;

    const updated: FelInvoice = {
      ...inv,
      status: editData.status,
      notes: editData.notes,
      updatedAt: new Date().toISOString(),
    };

    const ok = await updateInvoice(updated);
    if (ok) {
      toast.success('Factura FEL actualizada');
      setEditingId(null);
    } else {
      toast.error('No se pudo actualizar la factura');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-4 border-brand-primary/30 border-t-brand-primary animate-spin mb-4" />
          <p className="text-slate-400">Cargando facturas FEL…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Facturas FEL</h1>
          <p className="text-sm text-slate-400">
            Facturas electrónicas de Guatemala (SAT)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/fel-invoices/new')}
            className="text-sm"
          >
            + Nueva Factura
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Buscar por DTE, serie, NIT, nombre…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-md"
        />
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-slate-500 text-xl">No hay facturas FEL registradas</div>
          <p className="text-sm text-slate-400 mt-2">
            Comience creando su primera factura electrónica.
          </p>
          <Button
            variant="primary"
            onClick={() => router.push('/fel-invoices/new')}
          >
            Crear Primera Factura
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-700">
                  DTE
                </th>
                <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-700">
                  Emisor
                </th>
                <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-700">
                  Receptor
                </th>
                <th className="text-right py-3 px-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-700">
                  Total (Q)
                </th>
                <th className="text-center py-3 px-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-700">
                  Estado
                </th>
                <th className="text-left py-3 px-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-700">
                  Fecha
                </th>
                <th className="text-center py-3 px-4 text-xs font-bold text-slate-400 uppercase border-b border-slate-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-sm font-mono text-slate-200">
                    {inv.dteNumber}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-200">
                    <div className="font-medium">{inv.emisor.nombre}</div>
                    <div className="text-xs text-slate-500">{inv.emisor.nit}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-200">
                    <div className="font-medium">{inv.receptor.nombre}</div>
                    <div className="text-xs text-slate-500">{inv.receptor.nit}</div>
                  </td>
                  <td className="text-right py-3 px-4 text-sm font-mono text-slate-200">
                    {formatFelCurrency(inv.totalGTQ)}
                  </td>
                  <td className="text-center py-3 px-4 text-sm">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                        inv.status === 'Emitida'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : inv.status === 'Anulada'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-400">
                    {formatDate(inv.date)}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/fel-invoices/${inv.id}/print`)}
                        className="text-xs p-2"
                      >
                        Ver
                      </Button>
                      {inv.status === 'Borrador' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditStatus(inv.id)}
                            className="text-xs p-2"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(inv.id)}
                            className="text-xs p-2"
                          >
                            Eliminar
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editar estado y notas */}
      {editingId && (
        <Card variant="glass-l2" padding="md" className="shadow-glass-xl mt-6">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Editar Factura FEL</h3>
            <p className="text-xs text-slate-400 mt-1">
              {invoices.find((i) => i.id === editingId)?.dteNumber}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Estado
              </label>
              <select
                value={editData.status}
                onChange={(e) =>
                  setEditData({ ...editData, status: e.target.value as FelInvoice['status'] })
                }
                className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-secondary/50"
              >
                <option value="Borrador">Borrador</option>
                <option value="Emitida">Emitida</option>
                <option value="Anulada">Anulada</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Observaciones
              </label>
              <textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary/50"
              />
            </div>
          </div>
          <div className="pt-4 flex gap-2">
            <Button
              variant="primary"
              onClick={() => saveEdit(editingId!)}
              className="w-full"
            >
              Guardar Cambios
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditingId(null)}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

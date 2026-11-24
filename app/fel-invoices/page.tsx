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
import { useActiveWorkspace } from '@/lib/hooks/useActiveWorkspace';
import { useFelInvoices } from '@/lib/hooks/data/useFelInvoices';
import { canWriteFelInvoices } from '@/lib/permissions';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatFelCurrency } from '@/lib/domain/felInvoice';
import type { FelInvoice } from '@/lib/types';

export default function FelInvoicesListPage() {
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
  const { invoices, loading, loaded, updateInvoice, deleteInvoice } = useFelInvoices({
    companyId,
    currentUserId,
  });
  const canWrite = canWriteFelInvoices(role);

  useEffect(() => {
    if (status === 'unauthenticated' || status === 'error') {
      router.replace('/login');
    }
  }, [status, router]);

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

  if (
    status === 'loading' ||
    (Boolean(currentUserId) && !ready && !workspaceError) ||
    (ready && (!loaded || loading))
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 flex h-8 w-8 animate-spin items-center justify-center rounded-full border-4 border-brand-primary/30 border-t-brand-primary" />
          <p className="text-slate-400">Cargando facturas FEL…</p>
        </div>
      </div>
    );
  }

  if (workspaceError || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <Card variant="outlined" padding="lg" className="max-w-md text-center">
          <h1 className="mb-2 text-xl font-bold text-white">No se pudo cargar la empresa</h1>
          <p className="mb-4 text-sm text-slate-400">
            {workspaceError ?? 'Inicia sesión para consultar las facturas FEL.'}
          </p>
          <Button variant="primary" onClick={() => router.replace('/login')}>
            Ir a iniciar sesión
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Facturas FEL</h1>
          <p className="text-sm text-slate-400">Facturas electrónicas de Guatemala (SAT)</p>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <Button
              variant="outline"
              onClick={() => router.push('/fel-invoices/new')}
              className="text-sm"
            >
              + Nueva Factura
            </Button>
          )}
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
        <div className="py-12 text-center">
          <div className="text-xl text-slate-500">No hay facturas FEL registradas</div>
          <p className="mt-2 text-sm text-slate-400">
            {canWrite
              ? 'Comience creando su primera factura electrónica.'
              : 'Tu rol puede consultar facturas, pero no emitirlas ni editarlas.'}
          </p>
          {canWrite && (
            <Button variant="primary" onClick={() => router.push('/fel-invoices/new')}>
              Crear Primera Factura
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="border-b border-slate-700 px-4 py-3 text-left text-xs font-bold uppercase text-slate-400">
                  DTE
                </th>
                <th className="border-b border-slate-700 px-4 py-3 text-left text-xs font-bold uppercase text-slate-400">
                  Emisor
                </th>
                <th className="border-b border-slate-700 px-4 py-3 text-left text-xs font-bold uppercase text-slate-400">
                  Receptor
                </th>
                <th className="border-b border-slate-700 px-4 py-3 text-right text-xs font-bold uppercase text-slate-400">
                  Total (Q)
                </th>
                <th className="border-b border-slate-700 px-4 py-3 text-center text-xs font-bold uppercase text-slate-400">
                  Estado
                </th>
                <th className="border-b border-slate-700 px-4 py-3 text-left text-xs font-bold uppercase text-slate-400">
                  Fecha
                </th>
                <th className="border-b border-slate-700 px-4 py-3 text-center text-xs font-bold uppercase text-slate-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="transition-colors hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-sm text-slate-200">{inv.dteNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-200">
                    <div className="font-medium">{inv.emisor.nombre}</div>
                    <div className="text-xs text-slate-500">{inv.emisor.nit}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-200">
                    <div className="font-medium">{inv.receptor.nombre}</div>
                    <div className="text-xs text-slate-500">{inv.receptor.nit}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-slate-200">
                    {formatFelCurrency(inv.totalGTQ)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                        inv.status === 'Emitida'
                          ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : inv.status === 'Anulada'
                            ? 'border border-rose-500/20 bg-rose-500/10 text-rose-400'
                            : 'border border-amber-500/20 bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{formatDate(inv.date)}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/fel-invoices/${inv.id}/print`)}
                        className="p-2 text-xs"
                      >
                        Ver
                      </Button>
                      {inv.status === 'Borrador' && canWrite && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditStatus(inv.id)}
                            className="p-2 text-xs"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(inv.id)}
                            className="p-2 text-xs"
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
        <Card variant="outlined" padding="md" className="mt-6 shadow-glass-xl">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Editar Factura FEL</h3>
            <p className="mt-1 text-xs text-slate-400">
              {invoices.find((i) => i.id === editingId)?.dteNumber}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
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
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
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
          <div className="flex gap-2 pt-4">
            <Button variant="primary" onClick={() => saveEdit(editingId!)} className="w-full">
              Guardar Cambios
            </Button>
            <Button variant="outline" onClick={() => setEditingId(null)} className="w-full">
              Cancelar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * ORIGEN ERP - Componente Cliente: Imprimir Factura FEL
 *
 * Componente de cliente para la vista de impresión de facturas FEL.
 * Contiene toda la interactividad (hooks, estado, navegación).
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveWorkspace } from '@/lib/hooks/useActiveWorkspace';
import { useFelInvoices } from '@/lib/hooks/data/useFelInvoices';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatFelCurrency } from '@/lib/domain/felInvoice';
import type { FelInvoice } from '@/lib/types';

export function FelInvoicePrintContent({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const { status, companyId, currentUserId, ready, loading, error } = useActiveWorkspace();
  const {
    invoices,
    loading: invoicesLoading,
    loaded: invoicesLoaded,
  } = useFelInvoices({
    companyId,
    currentUserId,
  });

  const [invoice, setInvoice] = useState<FelInvoice | null>(null);
  const [printing, setPrinting] = useState(false);
  const hasAutoPrinted = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated' || status === 'error') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    setInvoice(invoices.find((i) => i.id === invoiceId) ?? null);
  }, [invoices, invoiceId]);

  useEffect(() => {
    if (!invoice || hasAutoPrinted.current) return;
    // Auto-imprimir una sola vez, cuando la factura ya está disponible.
    hasAutoPrinted.current = true;
    setPrinting(true);
    window.print();
    setPrinting(false);
  }, [invoice]);

  const handlePrint = () => {
    setPrinting(true);
    window.print();
    setPrinting(false);
  };

  const handleBack = () => {
    router.replace('/fel-invoices');
  };

  if (loading || (ready && (!invoicesLoaded || invoicesLoading))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 flex h-8 w-8 animate-spin items-center justify-center rounded-full border-4 border-brand-primary/30 border-t-brand-primary" />
          <p className="text-slate-400">Cargando factura…</p>
        </div>
      </div>
    );
  }

  if (error || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <Card variant="outlined" padding="lg" className="max-w-md text-center">
          <h1 className="mb-2 text-xl font-bold text-white">No se pudo cargar la empresa</h1>
          <p className="mb-4 text-sm text-slate-400">
            {error ?? 'Inicia sesión para consultar la factura.'}
          </p>
          <Button variant="primary" onClick={() => router.replace('/login')}>
            Ir a iniciar sesión
          </Button>
        </Card>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <Card variant="outlined" padding="lg" className="max-w-md text-center">
          <h1 className="mb-2 text-xl font-bold text-white">Factura no encontrada</h1>
          <p className="mb-4 text-sm text-slate-400">
            La factura solicitada no existe o no pertenece a tu empresa.
          </p>
          <Button variant="primary" onClick={handleBack}>
            Volver al listado
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      {/* Controles de impresión (solo visibles en pantalla, no al imprimir) */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Factura FEL - {invoice.dteNumber}</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="text-xs">
            Imprimir / Guardar PDF
          </Button>
          <Button variant="outline" onClick={handleBack} className="text-xs">
            Volver
          </Button>
        </div>
      </div>

      {/* Área imprimible - se oculta al imprimir los controles superiores */}
      <div className="print-only rounded-lg bg-white p-8 text-slate-900 shadow-xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">FACTURA ELECTRÓNICA</h1>
            <p className="text-sm text-slate-600">
              Sistema de Facturación Electrónica - Guatemala (SAT)
            </p>
          </div>
          <div className="text-right">
            <div className="rounded border border-slate-300 px-3 py-1 font-mono text-lg font-bold">
              {invoice.dteNumber}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Serie: {invoice.serie} | Correlativo: {invoice.correlativo}
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Emisor
            </h4>
            <div className="space-y-1 text-sm">
              <p>
                <strong>NIT:</strong> {invoice.emisor.nit}
              </p>
              <p>
                <strong>Nombre:</strong> {invoice.emisor.nombre}
              </p>
              <p>
                <strong>Dirección:</strong> {invoice.emisor.direccion}
              </p>
              <p>
                <strong>Correo:</strong> {invoice.emisor.correo}
              </p>
              {invoice.emisor.telefono && (
                <p>
                  <strong>Teléfono:</strong> {invoice.emisor.telefono}
                </p>
              )}
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Receptor
            </h4>
            <div className="space-y-1 text-sm">
              <p>
                <strong>NIT:</strong> {invoice.receptor.nit}
              </p>
              <p>
                <strong>Nombre:</strong> {invoice.receptor.nombre}
              </p>
              <p>
                <strong>Dirección:</strong> {invoice.receptor.direccion}
              </p>
              {invoice.receptor.correo && (
                <p>
                  <strong>Correo:</strong> {invoice.receptor.correo}
                </p>
              )}
              {invoice.receptor.telefono && (
                <p>
                  <strong>Teléfono:</strong> {invoice.receptor.telefono}
                </p>
              )}
            </div>
          </div>
        </div>

        <table className="mb-6 w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                Descripción
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                Cantidad
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                Unidad
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                Precio Unit. (Q)
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                Total (Q)
              </th>
              <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                IVA (Q)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="border-b border-slate-100 px-4 py-3 text-sm">{item.description}</td>
                <td className="border-b border-slate-100 px-4 py-3 text-right text-sm">
                  {item.quantity}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-right text-sm">
                  {item.unit}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-right text-sm">
                  {formatFelCurrency(item.unitPriceGTQ)}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-right text-sm font-medium">
                  {formatFelCurrency(item.totalPriceGTQ)}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-right text-sm">
                  {formatFelCurrency(item.taxAmountGTQ ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td className="border-t border-slate-200 px-4 py-3 text-right font-bold" colSpan={4}>
                Totales:
              </td>
              <td className="border-t border-slate-200 px-4 py-3 text-right text-sm font-medium">
                {formatFelCurrency(invoice.subtotalGTQ)}
              </td>
              <td className="border-t border-slate-200 px-4 py-3 text-right text-sm font-medium">
                {formatFelCurrency(invoice.taxAmountGTQ)}
              </td>
            </tr>
            <tr className="bg-slate-900 text-white">
              <td
                className="border-t border-slate-700 px-4 py-3 text-right text-lg font-bold"
                colSpan={4}
              >
                TOTAL A PAGAR:
              </td>
              <td className="border-t border-slate-700 px-4 py-3 text-right font-mono text-2xl font-bold">
                {formatFelCurrency(invoice.totalGTQ)}
              </td>
              <td className="border-t border-slate-700 px-4 py-3 text-right text-sm"></td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">
              <strong>Método de Pago:</strong> {invoice.paymentMethod}
            </p>
            {invoice.paymentDate && (
              <p className="text-xs text-slate-500">
                <strong>Fecha de Pago:</strong> {invoice.paymentDate}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">
              <strong>Estado:</strong> {invoice.status}
            </p>
            <p className="text-xs text-slate-500">
              <strong>Fecha de Emisión:</strong> {invoice.date}
            </p>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-6">
            <h5 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              Observaciones
            </h5>
            <p className="text-sm italic text-slate-600">{invoice.notes}</p>
          </div>
        )}

        <div className="mt-8 border-t border-slate-200 pt-4 text-center">
          <p className="text-xs text-slate-400">
            Factura generada por ORIGEN ERP - Sistema de Gestión de Obras Guatemala
          </p>
        </div>
      </div>

      {/* Versión para pantalla (oculta al imprimir) */}
      <div className="print-hidden mt-6">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-white">
            Estado:{' '}
            <span
              className={`text-${invoice.status === 'Emitida' ? 'emerald' : invoice.status === 'Anulada' ? 'rose' : 'amber'}-400`}
            >
              {invoice.status}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="text-xs">
              Reimprimir
            </Button>
            <Button variant="outline" onClick={handleBack} className="text-xs">
              Volver a la lista
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

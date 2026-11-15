/**
 * ORIGEN ERP - Imprimir Factura FEL
 *
 * Muestra la factura en formato imprimible. El usuario puede imprimir
 * directamente desde el navegador (Ctrl+P) o guardar como PDF.
 * Los datos son los que el usuario ingresó manualmente.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { useFelInvoices } from '@/lib/hooks/data/useFelInvoices';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatFelCurrency } from '@/lib/domain/felInvoice';
import type { FelInvoice } from '@/lib/types';

function FelInvoicePrintContent({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const { currentUser } = useAuthSession();
  const { invoices } = useFelInvoices({ companyId: '', currentUserId: '' });

  const [invoice, setInvoice] = useState<FelInvoice | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const found = invoices.find((i) => i.id === invoiceId);
    if (found) {
      setInvoice(found);
    }
  }, [invoices, invoiceId]);

  useEffect(() => {
    // Auto-imprimir al cargar la página
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

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-4 border-brand-primary/30 border-t-brand-primary animate-spin mb-4" />
          <p className="text-slate-400">Cargando factura…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Controles de impresión (solo visibles en pantalla, no al imprimir) */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm font-semibold text-white">
          Factura FEL - {invoice.dteNumber}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="text-xs"
          >
            Imprimir / Guardar PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleBack}
            className="text-xs"
          >
            Volver
          </Button>
        </div>
      </div>

      {/* Área imprimible - se oculta al imprimir los controles superiores */}
      <div className="print-only bg-white text-slate-900 p-8 rounded-lg shadow-xl">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold">FACTURA ELECTRÓNICA</h1>
            <p className="text-sm text-slate-600">
              Sistema de Facturación Electrónica - Guatemala (SAT)
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-mono font-bold border border-slate-300 px-3 py-1 rounded">
              {invoice.dteNumber}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Serie: {invoice.serie} | Correlativo: {invoice.correlativo}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Emisor
            </h4>
            <div className="space-y-1 text-sm">
              <p><strong>NIT:</strong> {invoice.emisor.nit}</p>
              <p><strong>Nombre:</strong> {invoice.emisor.nombre}</p>
              <p><strong>Dirección:</strong> {invoice.emisor.direccion}</p>
              <p><strong>Correo:</strong> {invoice.emisor.correo}</p>
              {invoice.emisor.telefono && (
                <p><strong>Teléfono:</strong> {invoice.emisor.telefono}</p>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Receptor
            </h4>
            <div className="space-y-1 text-sm">
              <p><strong>NIT:</strong> {invoice.receptor.nit}</p>
              <p><strong>Nombre:</strong> {invoice.receptor.nombre}</p>
              <p><strong>Dirección:</strong> {invoice.receptor.direccion}</p>
              {invoice.receptor.correo && (
                <p><strong>Correo:</strong> {invoice.receptor.correo}</p>
              )}
              {invoice.receptor.telefono && (
                <p><strong>Teléfono:</strong> {invoice.receptor.telefono}</p>
              )}
            </div>
          </div>
        </div>

        <table className="w-full mb-6">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                Descripción
              </th>
              <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                Cantidad
              </th>
              <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                Unidad
              </th>
              <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                Precio Unit. (Q)
              </th>
              <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                Total (Q)
              </th>
              <th className="text-right py-3 px-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                IVA (Q)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 px-4 text-sm border-b border-slate-100">
                  {item.description}
                </td>
                <td className="text-right py-3 px-4 text-sm border-b border-slate-100">
                  {item.quantity}
                </td>
                <td className="text-right py-3 px-4 text-sm border-b border-slate-100">
                  {item.unit}
                </td>
                <td className="text-right py-3 px-4 text-sm border-b border-slate-100">
                  {formatFelCurrency(item.unitPriceGTQ)}
                </td>
                <td className="text-right py-3 px-4 text-sm font-medium border-b border-slate-100">
                  {formatFelCurrency(item.totalPriceGTQ)}
                </td>
                <td className="text-right py-3 px-4 text-sm border-b border-slate-100">
                  {formatFelCurrency(item.taxAmountGTQ ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td className="py-3 px-4 text-right font-bold border-t border-slate-200" colSpan={4}>
                Totales:
              </td>
              <td className="text-right py-3 px-4 text-sm font-medium border-t border-slate-200">
                {formatFelCurrency(invoice.subtotalGTQ)}
              </td>
              <td className="text-right py-3 px-4 text-sm font-medium border-t border-slate-200">
                {formatFelCurrency(invoice.taxAmountGTQ)}
              </td>
            </tr>
            <tr className="bg-slate-900 text-white">
              <td className="py-3 px-4 text-right font-bold text-lg border-t border-slate-700" colSpan={4}>
                TOTAL A PAGAR:
              </td>
              <td className="text-right py-3 px-4 text-2xl font-mono font-bold border-t border-slate-700">
                {formatFelCurrency(invoice.totalGTQ)}
              </td>
              <td className="text-right py-3 px-4 text-sm border-t border-slate-700"></td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500"><strong>Método de Pago:</strong> {invoice.paymentMethod}</p>
            {invoice.paymentDate && (
              <p className="text-xs text-slate-500"><strong>Fecha de Pago:</strong> {invoice.paymentDate}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500"><strong>Estado:</strong> {invoice.status}</p>
            <p className="text-xs text-slate-500"><strong>Fecha de Emisión:</strong> {invoice.date}</p>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-6">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Observaciones
            </h5>
            <p className="text-sm text-slate-600 italic">{invoice.notes}</p>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">
            Factura generada por ORIGEN ERP - Sistema de Gestión de Obras Guatemala
          </p>
        </div>
      </div>

      {/* Versión para pantalla (oculta al imprimir) */}
      <div className="print-hidden mt-6">
        <div className="flex justify-between items-center">
          <div className="text-sm font-semibold text-white">
            Estado: <span className={`text-${invoice.status === 'Emitida' ? 'emerald' : invoice.status === 'Anulada' ? 'rose' : 'amber'}-400`}>
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

export default async function FelInvoicePrintPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: invoiceId } = await params;
  return <FelInvoicePrintContent invoiceId={invoiceId} />;
}

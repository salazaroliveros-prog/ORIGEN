/**
 * ORIGEN ERP - Imprimir Factura FEL
 *
 * Página de impresión de facturas FEL. Es un Server Component que recibe
 * params (Promise en Next.js 15) y renderiza el componente cliente con el ID.
 */

import { FelInvoicePrintContent } from './FelInvoicePrintContent.client';

export default async function FelInvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: invoiceId } = await params;
  return <FelInvoicePrintContent invoiceId={invoiceId} />;
}

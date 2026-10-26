'use client';

import { formatGTQ, formatUSD } from '@/lib/data';
import { APUItem, CompanySettings, Project, QuoteRecord } from '@/lib/types';
import { Plus, Printer } from 'lucide-react';
import React, { useState } from 'react';

interface QuotesManagerProps {
  quotes: QuoteRecord[];
  projects: Project[];
  activeProjectId: string;
  onAddQuote: (quote: QuoteRecord) => void;
  currency: 'GTQ' | 'USD';
  company: CompanySettings;
  budgetItems: APUItem[];
}

export function QuotesManager({
  quotes,
  projects,
  activeProjectId,
  onAddQuote,
  currency,
  company,
}: QuotesManagerProps) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientNit, setClientNit] = useState('');
  const [total, setTotal] = useState('150000');

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const formatMoney = (amount: number) => {
    return currency === 'GTQ' ? formatGTQ(amount) : formatUSD(amount, company.exchangeRate);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    const q: QuoteRecord = {
      id: `q-${Date.now()}`,
      projectId: activeProject.id,
      clientName,
      clientNit: clientNit || 'CF',
      date: new Date().toISOString().split('T')[0],
      validUntil: '2025-06-30',
      items: [
        {
          description: 'Presupuesto global de obra civil según planos',
          qty: 1,
          unit: 'Global',
          unitPriceGTQ: Number(total) || 150000,
        },
      ],
      totalGTQ: Number(total) || 150000,
      status: 'Enviada',
    };

    onAddQuote(q);
    setIsOpenModal(false);
    setClientName('');
    setClientNit('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Cotizaciones a Clientes & Presupuestos Comerciales
          </h2>
          <p className="text-xs text-slate-500">
            Gestión de propuestas económicas para clientes institucionales y privados en Guatemala.
          </p>
        </div>
        <button
          onClick={() => setIsOpenModal(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> Nueva Cotización
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                  Cotización #{quote.id}
                </span>
                <h3 className="mt-1 text-base font-bold text-slate-900">{quote.clientName}</h3>
                <p className="text-xs text-slate-500">
                  NIT: {quote.clientNit} • Fecha: {quote.date}
                </p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {quote.status}
              </span>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {quote.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs text-slate-700">
                  <span>
                    {it.description} ({it.qty} {it.unit})
                  </span>
                  <span className="font-semibold">{formatMoney(it.unitPriceGTQ * it.qty)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2">
              <div>
                <p className="text-[10px] text-slate-400">Total Propuesta</p>
                <p className="text-base font-bold text-slate-900">{formatMoney(quote.totalGTQ)}</p>
              </div>
              <button
                onClick={() => window.print()}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
              >
                <Printer className="h-3.5 w-3.5" /> Imprimir PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
              <h3 className="text-base font-bold">Crear Cotización para Cliente</h3>
              <button
                onClick={() => setIsOpenModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 p-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Nombre del Cliente / Empresa
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej. Inmobiliaria El Bosque, S.A."
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  NIT del Cliente
                </label>
                <input
                  type="text"
                  value={clientNit}
                  onChange={(e) => setClientNit(e.target.value)}
                  placeholder="Ej. 5920182-3"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Monto Total Cotización (GTQ)
                </label>
                <input
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  Emitir Cotización
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

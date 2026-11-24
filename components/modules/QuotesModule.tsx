'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Quote {
  id: string;
  code: string;
  clientName: string;
  description: string;
  amount: number;
  validityDate: string;
  status: 'Pendiente' | 'Enviada' | 'Aceptada' | 'Rechazada' | 'Expirada';
  projectId?: string;
  createdDate: string;
}

interface QuotesModuleProps {
  quotes?: Quote[];
  loading?: boolean;
  onCreateQuote?: (data: Partial<Quote>) => Promise<void>;
  onUpdateQuote?: (id: string, data: Partial<Quote>) => Promise<void>;
  onDeleteQuote?: (id: string) => Promise<void>;
  canWrite?: boolean;
}

/**
 * QUOTES MODULE - Módulo de Cotizaciones Mejorado
 */
export function QuotesModuleExpanded({
  quotes = [],
  loading = false,
  onCreateQuote,
  onUpdateQuote,
  onDeleteQuote,
  canWrite = false,
}: QuotesModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: 'all' });

  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote) => {
      if (
        searchTerm &&
        !(
          quote.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quote.code.toLowerCase().includes(searchTerm.toLowerCase())
        )
      ) {
        return false;
      }
      if (filters.status !== 'all' && quote.status !== filters.status) return false;
      return true;
    });
  }, [quotes, searchTerm, filters]);

  const totals = useMemo(
    () => ({
      total: filteredQuotes.reduce((sum, q) => sum + q.amount, 0),
      accepted: filteredQuotes
        .filter((q) => q.status === 'Aceptada')
        .reduce((sum, q) => sum + q.amount, 0),
      pending: filteredQuotes
        .filter((q) => q.status === 'Pendiente')
        .reduce((sum, q) => sum + q.amount, 0),
    }),
    [filteredQuotes]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendiente':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Enviada':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'Aceptada':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Rechazada':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'Expirada':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Cotizaciones</h1>
          <p className="mt-1 text-sm text-slate-400">
            Gestión de cotizaciones y presupuestos de clientes
          </p>
        </div>
        {canWrite && (
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nueva Cotización
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card variant="default">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Total</p>
          <p className="mt-2 text-2xl font-bold text-white">Q{totals.total.toLocaleString()}</p>
        </Card>
        <Card variant="default">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Aceptadas
          </p>
          <p className="mt-2 text-2xl font-bold text-white">Q{totals.accepted.toLocaleString()}</p>
        </Card>
        <Card variant="default">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Pendientes
          </p>
          <p className="mt-2 text-2xl font-bold text-white">Q{totals.pending.toLocaleString()}</p>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar cotización..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.05] py-2 pl-10 pr-4 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        >
          <option value="all">Todos</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Enviada">Enviada</option>
          <option value="Aceptada">Aceptada</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredQuotes.map((quote) => (
          <Card key={quote.id} variant="default">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">{quote.code}</p>
                  <h3 className="mt-1 font-semibold text-white">{quote.clientName}</h3>
                </div>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor(quote.status)}`}
                >
                  {quote.status}
                </span>
              </div>
              <p className="text-sm text-slate-300">{quote.description}</p>
              <div className="flex items-center justify-between border-t border-white/10 pt-2">
                <span className="text-sm text-slate-400">Q{quote.amount.toLocaleString()}</span>
                <span className="text-xs text-slate-500">
                  {new Date(quote.validityDate).toLocaleDateString('es-ES')}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredQuotes.length === 0 && (
        <Card
          variant="default"
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <FileText className="mb-4 h-12 w-12 text-slate-500" />
          <h3 className="mb-2 text-lg font-semibold text-white">Sin cotizaciones</h3>
        </Card>
      )}
    </div>
  );
}

export default QuotesModuleExpanded;

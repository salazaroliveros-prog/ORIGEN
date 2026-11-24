'use client';

import React, { useState } from 'react';
import { Mail, Search, Archive, Send } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Email {
  id: string;
  from: string;
  subject: string;
  date: Date;
  read: boolean;
  starred: boolean;
}

/**
 * GMAIL MODULE - Módulo de Correos & Avisos Mejorado
 */
export function GmailModuleExpanded({
  emails = [],
}: {
  emails?: Email[];
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('inbox');

  const dummyEmails: Email[] = [
    { id: '1', from: 'cliente@ejemplo.com', subject: 'Consulta sobre proyecto', date: new Date(), read: false, starred: true },
    { id: '2', from: 'proveedor@ejemplo.com', subject: 'Cotización disponible', date: new Date(Date.now() - 3600000), read: true, starred: false },
    { id: '3', from: 'admin@sistema.com', subject: 'Reporte mensual', date: new Date(Date.now() - 86400000), read: true, starred: false },
  ];

  const allEmails = emails.length > 0 ? emails : dummyEmails;

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Correo & Avisos</h1>
          <p className="mt-1 text-sm text-slate-400">Comunicaciones y notificaciones del proyecto</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Nuevo Correo
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Buscar correos..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.05] py-2 pl-10 pr-4 text-sm text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white"
        >
          <option value="inbox">Recibidos</option>
          <option value="sent">Enviados</option>
          <option value="starred">Marcados</option>
          <option value="archive">Archivo</option>
        </select>
      </div>

      {/* Email List */}
      <Card variant="default" className="space-y-1 p-0">
        {allEmails.map((email) => (
          <div
            key={email.id}
            className={`flex items-center gap-4 border-b border-white/5 p-4 transition-colors hover:bg-white/[0.05] cursor-pointer ${
              !email.read ? 'bg-white/[0.03]' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${
                  email.read
                    ? 'bg-slate-700/50 text-slate-400'
                    : 'bg-primary-500/20 text-primary-300'
                }`}
              >
                {email.from.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm ${email.read ? 'text-slate-400' : 'font-semibold text-white'}`}>
                  {email.from}
                </p>
                <span className="text-xs text-slate-500">
                  {email.date.toLocaleDateString('es-ES')}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-slate-400">
                {email.subject}
              </p>
            </div>
            {email.starred && (
              <div className="text-amber-400">★</div>
            )}
          </div>
        ))}
      </Card>

      {allEmails.length === 0 && (
        <Card variant="default" className="flex flex-col items-center justify-center py-12">
          <Mail className="mb-4 h-12 w-12 text-slate-500" />
          <h3 className="text-lg font-semibold text-white">Sin correos</h3>
        </Card>
      )}
    </div>
  );
}

export default GmailModuleExpanded;

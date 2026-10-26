'use client';

import { useState } from 'react';
import { CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { CompanySettings, Project } from '@/lib/types';
import { sendGmailMessage } from '@/lib/gmail';

interface GmailManagerProps {
  company: CompanySettings;
  projects: Project[];
  userEmail?: string | null;
  accessToken?: string | null;
  tokenExpiresAt?: number | null;
  onAuthorize: () => Promise<{ accessToken: string; expiresAt: number }>;
}

export function GmailManager({
  company,
  projects,
  userEmail,
  accessToken,
  tokenExpiresAt,
  onAuthorize,
}: GmailManagerProps) {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('Actualización de proyecto');
  const [body, setBody] = useState('');
  const [projectId, setProjectId] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const project = projects.find((item) => item.id === projectId);
  const hasActiveGrant = Boolean(accessToken && tokenExpiresAt && tokenExpiresAt > Date.now());

  const preparePreview = () => {
    if (!recipient.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())) {
      setError('Ingresa un correo de destino válido.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError('Completa el asunto y el mensaje antes de preparar el envío.');
      return;
    }
    setError(null);
    setPreviewReady(true);
  };

  const sendMessage = async () => {
    if (!accessToken || !tokenExpiresAt || tokenExpiresAt <= Date.now()) {
      setError('El permiso de Gmail venció. Autoriza nuevamente antes de enviar.');
      return;
    }
    setIsSending(true);
    setError(null);
    try {
      const messageId = await sendGmailMessage(accessToken, {
        to: recipient,
        subject,
        body,
      });
      toast.success(`Gmail confirmó el envío (${messageId}).`);
      setPreviewReady(false);
      setBody('');
      setRecipient('');
    } catch (cause) {
      console.error('No se pudo enviar el mensaje de Gmail:', cause);
      const message = cause instanceof Error ? cause.message : 'No se pudo enviar el correo.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    setError(null);
    try {
      await onAuthorize();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudo autorizar Gmail.';
      setError(message);
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full space-y-5">
      <header className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-blue-500/15 p-3 text-blue-300"><Mail className="h-5 w-5" /></span>
          <div>
            <h1 className="text-lg font-bold text-white">Envío de correo con Gmail</h1>
            <p className="text-xs text-slate-400">Revisa el mensaje antes de autorizar el envío. Los correos se envían desde la cuenta conectada.</p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-white">Permiso de envío</h2>
            <p className="mt-1 text-xs text-slate-400">
              Cuenta actual: {userEmail || 'no autenticada'} · Permiso limitado a enviar mensajes desde Gmail.
            </p>
          </div>
          <button type="button" onClick={() => void handleAuthorize()} disabled={isAuthorizing} className="rounded-xl border border-blue-400/40 px-4 py-2 text-sm font-bold text-blue-200 hover:bg-blue-500/10 disabled:opacity-50">
            {isAuthorizing ? 'Esperando autorización...' : hasActiveGrant ? 'Renovar permiso Gmail' : 'Conectar / autorizar Gmail'}
          </button>
        </div>
        {hasActiveGrant && <p className="mt-3 flex items-center gap-2 text-xs text-emerald-300"><ShieldCheck className="h-4 w-4" />Permiso temporal activo en esta sesión. El token no se guarda en Firestore ni en almacenamiento local.</p>}
        <p className="mt-2 text-[11px] text-slate-500">Google puede requerir verificación OAuth y dominios autorizados antes de habilitar el permiso.</p>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-semibold text-white">Redactar mensaje</h2>
          <label className="block text-xs font-semibold text-slate-300">
            Para
            <input type="email" autoComplete="email" value={recipient} onChange={(event) => { setRecipient(event.target.value); setPreviewReady(false); }} required className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
          </label>
          <label className="block text-xs font-semibold text-slate-300">
            Vincular proyecto (opcional)
            <select value={projectId} onChange={(event) => { setProjectId(event.target.value); setPreviewReady(false); }} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">
              <option value="">Sin proyecto vinculado</option>
              {projects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-300">
            Asunto
            <input value={subject} onChange={(event) => { setSubject(event.target.value); setPreviewReady(false); }} maxLength={250} required className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
          </label>
          <label className="block text-xs font-semibold text-slate-300">
            Mensaje
            <textarea rows={8} value={body} onChange={(event) => { setBody(event.target.value); setPreviewReady(false); }} maxLength={100000} required className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" placeholder="Redacta el contenido del correo..." />
          </label>
          {project && (
            <div className="rounded-lg bg-slate-950 p-3 text-xs text-slate-300">
              Proyecto seleccionado: <strong>{project.name}</strong> · Estado {project.status} · Avance {project.progressPercent}%
              <button type="button" onClick={() => setBody((current) => `${current}${current ? '\n\n' : ''}Proyecto: ${project.name} (${project.code})\nEstado: ${project.status}\nAvance: ${project.progressPercent}%\nCliente: ${project.client}\nEmpresa: ${company.commercialName || company.companyName}`)} className="mt-2 block text-blue-300 underline">
                Insertar resumen del proyecto en el mensaje
              </button>
            </div>
          )}
          {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          <button type="button" onClick={preparePreview} disabled={!hasActiveGrant || isSending} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50">
            Revisar mensaje
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-semibold text-white">Vista previa</h2>
          {!previewReady ? (
            <p className="mt-3 text-sm text-slate-400">Completa el mensaje y elige «Revisar mensaje» para comprobarlo antes de enviar.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">De: {userEmail}</p>
                <p className="text-xs text-slate-400">Para: {recipient}</p>
                <p className="mt-2 text-sm font-bold text-white">{subject}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{body}</p>
              </div>
              <p className="text-xs text-amber-200">Al confirmar, Gmail enviará este contenido al destinatario. Esta operación no se puede deshacer.</p>
              <button type="button" onClick={() => void sendMessage()} disabled={isSending || !hasActiveGrant} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" />{isSending ? 'Enviando...' : 'Confirmar y enviar'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

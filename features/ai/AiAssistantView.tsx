'use client';

import { FormEvent, useState } from 'react';
import { LoaderCircle, Send } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import type { CompanySettings } from '@/lib/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
}

export function AiAssistantView({ company }: { company?: CompanySettings } = {}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || isSending) return;

    const userMessage: ChatMessage = {
      id: globalThis.crypto.randomUUID(),
      role: 'user',
      content: message,
    };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setError(null);
    setIsSending(true);
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message, department: 'Guatemala' }),
      });
      const result: { reply?: unknown; error?: unknown; source?: unknown } = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof result.error === 'string'
            ? result.error
            : 'El asistente no pudo procesar la consulta.'
        );
      }
      const assistantReply = result.reply;
      if (typeof assistantReply !== 'string' || !assistantReply.trim()) {
        throw new Error('El servicio devolvió una respuesta vacía.');
      }
      setMessages((current) => [
        ...current,
        {
          id: globalThis.crypto.randomUUID(),
          role: 'assistant',
          content: assistantReply,
          source: typeof result.source === 'string' ? result.source : undefined,
        },
      ]);
    } catch (cause) {
      console.error('Error consultando el asistente técnico:', cause);
      setError(cause instanceof Error ? cause.message : 'No se pudo conectar con el asistente.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full space-y-5">
      <PageHeader
        title="Asistente Técnico IA"
        subtitle="Consultas sobre construcción, costos y normas: valida siempre las respuestas con profesionales y fuentes oficiales"
        logoUrl={company?.logoUrl}
        companyName={company?.companyName}
      />
      <section className="flex min-h-[min(70vh,700px)] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          {messages.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">Asistente técnico</p>
              <p className="mt-1">
                Pregunta sobre presupuestos, ejecución de obra o conceptos técnicos. No envíes datos
                personales o financieros confidenciales.
              </p>
            </div>
          )}
          {messages.map((message) => (
            <article
              key={message.id}
              className={`max-w-3xl rounded-xl p-4 text-sm whitespace-pre-wrap ${
                message.role === 'user'
                  ? 'ml-auto bg-blue-600 text-white'
                  : 'border border-slate-700 bg-slate-950 text-slate-200'
              }`}
            >
              <p className="mb-1 text-[10px] font-bold tracking-wide uppercase opacity-70">
                {message.role === 'user'
                  ? 'Tú'
                  : `Asistente${message.source === 'gemini-ai' ? ' · Gemini' : message.source ? ' · Motor local' : ''}`}
              </p>
              {message.content}
            </article>
          ))}
          {isSending && (
            <p role="status" className="flex items-center gap-2 text-sm text-slate-400">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Generando respuesta...
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
            >
              {error}
            </p>
          )}
        </div>
        <form
          onSubmit={(event) => void sendMessage(event)}
          className="border-t border-slate-800 p-4"
        >
          <label htmlFor="technical-assistant-input" className="sr-only">
            Escribe tu consulta técnica
          </label>
          <div className="flex gap-2">
            <textarea
              id="technical-assistant-input"
              rows={2}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Escribe una consulta técnica..."
              disabled={isSending}
              className="min-h-11 flex-1 resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="self-end rounded-xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Enviar consulta"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            La respuesta puede contener errores; verifica normativa, cálculos y requisitos con las
            entidades correspondientes.
          </p>
        </form>
      </section>
    </div>
  );
}

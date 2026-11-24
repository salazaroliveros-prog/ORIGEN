'use client';

import React, { useState } from 'react';
import { Sparkles, MessageSquare, Send } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * AI MODULE - Módulo de Asistente IA Mejorado
 */
export function AIModuleExpanded() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hola, soy tu asistente IA. Puedo ayudarte con preguntas sobre presupuestos, normativas AGIES y COGUANOR.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages([...messages, {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }]);
    setInput('');
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Asistente IA</h1>
        <p className="mt-1 text-sm text-slate-400">Consultas sobre presupuestos, normativas AGIES y COGUANOR</p>
      </div>

      {/* Chat Container */}
      <Card variant="default" className="flex h-96 flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-primary-500/20 text-primary-100 border border-primary-500/30'
                    : 'bg-sky-500/10 text-slate-200 border border-sky-500/20'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <span className="mt-1 block text-xs opacity-70">
                  {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-white/10 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe tu pregunta..."
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            <Button variant="primary" size="sm" onClick={handleSend}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-300">Preguntas sugeridas:</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {[
            '¿Cómo calculo un APU?',
            '¿Cuáles son los requisitos AGIES?',
            '¿Cómo se organiza una planilla?',
            '¿Qué es COGUANOR?',
          ].map((q, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => {
                setInput(q);
              }}
              className="justify-start text-left"
            >
              {q}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AIModuleExpanded;

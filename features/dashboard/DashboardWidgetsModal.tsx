'use client';

import React from 'react';
import { X, RotateCcw, SlidersHorizontal, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FocusTrap } from '@/components/a11y/FocusTrap';
import type { WidgetMetadata, WidgetId } from './types';
import { WIDGET_CATALOG, HIGH_PRIORITY_WIDGETS, DEFAULT_VISIBLE_WIDGETS } from './widgetCatalog';

interface DashboardWidgetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibleWidgets: Record<WidgetId, boolean>;
  onToggleWidget: (id: WidgetId) => void;
  activeWidgetCount: number;
}

export function DashboardWidgetsModal({
  isOpen,
  onClose,
  visibleWidgets,
  onToggleWidget,
  activeWidgetCount,
}: DashboardWidgetsModalProps) {
  if (!isOpen) return null;

  const handleSetOnlyHighPriority = () => {
    Object.entries(HIGH_PRIORITY_WIDGETS).forEach(([id, value]) => {
      if (visibleWidgets[id as WidgetId] !== value) {
        onToggleWidget(id as WidgetId);
      }
    });
  };

  const handleResetWidgets = () => {
    Object.entries(DEFAULT_VISIBLE_WIDGETS).forEach(([id, value]) => {
      if (visibleWidgets[id as WidgetId] !== value) {
        onToggleWidget(id as WidgetId);
      }
    });
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md duration-200" role="dialog" aria-modal="true" aria-labelledby="widget-modal-title">
      <FocusTrap isActive={isOpen} onEscape={onClose}>
        <Card variant="elevated" className="flex max-h-[90vh] w-full max-w-2xl flex-col space-y-6 overflow-hidden border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl border border-amber-500/30 bg-amber-500/20 p-2.5 text-amber-400" aria-hidden="true">
              <SlidersHorizontal className="h-5 w-5" />
            </span>
            <div>
              <h3 id="widget-modal-title" className="text-lg font-extrabold text-white">
                Personalizar Panel de Control & Widgets
              </h3>
              <p className="text-xs text-slate-400">
                Selecciona qué gráficos y módulos de alta prioridad deseas visualizar en tu tablero.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2 text-slate-400 hover:text-white" aria-label="Cerrar modal de personalización">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-800/50 p-3 text-xs">
          <span className="font-bold text-slate-400">Modos Rápidos:</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSetOnlyHighPriority} className="text-xs font-bold text-amber-300">
              Alta Prioridad (4)
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetWidgets} className="text-xs font-bold">
              <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Todos Visibles
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {WIDGET_CATALOG.map((widget) => {
            const isVisible = visibleWidgets[widget.id];
            const IconComponent = widget.icon;

            return (
              <div
                key={widget.id}
                onClick={() => onToggleWidget(widget.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleWidget(widget.id);
                  }
                }}
                className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 duration-200 ${
                  isVisible
                    ? 'border-amber-500/50 bg-slate-800/80 shadow-md'
                    : 'border-slate-800/60 bg-slate-900/40 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 rounded-xl border p-2.5 ${
                      isVisible
                        ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                        : 'border-slate-700 bg-slate-800 text-slate-500'
                    }`}
                    aria-hidden="true"
                  >
                    <IconComponent className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{widget.title}</h4>
                      {widget.priority === 'alta' && (
                        <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[9px] font-extrabold uppercase text-amber-300">
                          Alta Prioridad
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{widget.description}</p>
                  </div>
                </div>

                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
                    isVisible
                      ? 'border-amber-400 bg-amber-500 text-slate-950'
                      : 'border-slate-700 bg-slate-800 text-transparent'
                  }`}
                  aria-hidden="true"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <span className="text-xs text-slate-400">{activeWidgetCount} de {WIDGET_CATALOG.length} widgets activos</span>
          <Button variant="primary" size="md" onClick={onClose}>Guardar Preferencias</Button>
        </div>
      </Card>
      </FocusTrap>
    </div>
  );
}
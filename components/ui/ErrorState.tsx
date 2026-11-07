import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  title: string;
  description: string;
  digest?: string;
  onRetry?: () => void;
  retryLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title,
  description,
  digest,
  onRetry,
  retryLabel = 'Reintentar',
  actions,
  className = '',
}: ErrorStateProps) {
  return (
    <div role="alert" className={`glass-panel mx-auto w-full max-w-md text-center ${className}`}>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/20 text-amber-300 backdrop-blur-sm">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{description}</p>
      {digest && (
        <p className="mt-3 text-xs text-slate-400">
          Código de referencia: <span className="font-mono">{digest}</span>
        </p>
      )}
      {(onRetry || actions) && (
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-slate-950 transition-all duration-300 hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
            >
              {retryLabel}
            </button>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}

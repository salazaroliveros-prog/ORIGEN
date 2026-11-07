import React from 'react';
import { Spinner } from './Spinner';

interface LoadingScreenProps {
  message?: string;
  className?: string;
}

export function LoadingScreen({
  message = 'Cargando ConstructERP Guatemala…',
  className = '',
}: LoadingScreenProps) {
  return (
    <div
      className={`bg-deep flex min-h-screen items-center justify-center px-4 text-slate-300 ${className}`}
    >
      <div className="flex flex-col items-center gap-4 text-center backdrop-blur-sm">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-brand-primary/20 blur-xl" />
          <Spinner size="lg" label={message} />
        </div>
        <p className="animate-fade-in text-sm font-medium text-slate-300">{message}</p>
      </div>
    </div>
  );
}

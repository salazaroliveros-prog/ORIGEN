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
      className={`flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-300 ${className}`}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Spinner size="md" label={message} />
        <p className="text-sm font-medium text-slate-300">{message}</p>
      </div>
    </div>
  );
}

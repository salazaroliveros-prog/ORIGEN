'use client';

import React, { useEffect } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App runtime error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
      <ErrorState
        title="Error en la aplicación"
        description="Ocurrió un problema inesperado al procesar esta vista. Puedes reintentar la carga; si persiste, recarga la página."
        digest={error.digest}
        onRetry={() => reset()}
        retryLabel="Reintentar"
      />
    </div>
  );
}

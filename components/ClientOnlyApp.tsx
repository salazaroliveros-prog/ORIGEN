'use client';

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import MainApp from './MainApp';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ChunkErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Captured error in ChunkErrorBoundary:', error, errorInfo);
    // If it is a ChunkLoadError, automatically reload once to fetch the fresh bundle
    const errorMsg = error?.message || '';
    const errorName = error?.name || '';
    if (
      errorName === 'ChunkLoadError' ||
      errorMsg.includes('Loading chunk') ||
      errorMsg.includes('ChunkLoadError')
    ) {
      if (typeof window !== 'undefined') {
        const lastReload = sessionStorage.getItem('chunk_load_reload');
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem('chunk_load_reload', now.toString());
          window.location.reload();
        }
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 text-slate-100">
          <div className="max-w-md w-full rounded-2xl border border-slate-700 bg-slate-800 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">ConstructERP Guatemala</h2>
            <p className="text-sm text-slate-400 mb-6">
              Se detectó una actualización o cambio de versión en los recursos. Presione el botón para sincronizar la aplicación.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="w-full rounded-xl bg-amber-500 py-2.5 px-4 font-semibold text-slate-950 transition hover:bg-amber-400 active:scale-95"
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ClientOnlyApp() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
          <p className="text-sm font-medium">Cargando ConstructERP Guatemala...</p>
        </div>
      </div>
    );
  }

  return (
    <ChunkErrorBoundary>
      <MainApp />
    </ChunkErrorBoundary>
  );
}

'use client';

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import MainApp from './MainApp';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

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
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
          <ErrorState
            title="ConstructERP Guatemala"
            description="Se detectó una actualización o cambio de versión en los recursos de la aplicación. Recarga para sincronizar la versión más reciente."
            onRetry={this.handleRetry}
            retryLabel="Recargar aplicación"
          />
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
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
    }
  }, []);

  if (!mounted) {
    return <LoadingScreen message="Cargando ConstructERP Guatemala…" />;
  }

  return (
    <ChunkErrorBoundary>
      <MainApp />
    </ChunkErrorBoundary>
  );
}

'use client';

import React, { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  isolated?: boolean; // If true, only catch errors in children, not parent
  recoverable?: boolean; // If true, show "Try again" button
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Catches React errors and displays fallback UI
 * Prevents entire app crash
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <section
          aria-live="polite"
          aria-atomic="true"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 max-w-md mx-auto"
          role="alert"
        >
          <div className="flex gap-3 items-start">
            <AlertCircle
              className="h-6 w-6 flex-shrink-0 text-red-500"
              aria-label="Error"
            />
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-red-200">Error inesperado</h3>
              <p className="text-sm text-red-100">
                {this.state.error.message ||
                  'Ocurrió un error inesperado. El equipo ha sido notificado.'}
              </p>
              {process.env.NODE_ENV === 'development' && (
                <pre
                  className="mt-2 max-h-40 overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-300"
                >
                  {this.state.error.stack}
                </pre>
              )}
              {this.props.recoverable !== false && (
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={this.resetError}
                    aria-label="Intentar de nuevo"
                  >
                    Intentar de nuevo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => (window.location.href = '/')}
                    aria-label="Ir al inicio"
                  >
                    Ir al inicio
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * Componente mejorado de Error Boundary
 * - Mejor manejo de accesibilidad ARIA
 * - Mensajes de error amigables para usuario
 * - Soporte para recuperación de errores
 * - Diferenciación entre desarrollo y producción
 */

/** 
 * Versión mejorada con:
 * - Mejor manejo de accesibilidad (ARIA live regions)
 * - Mensajes de error más amigables
 * - Soporte para modo recuperación
 * - Mejor experiencia en desarrollo vs producción
 */

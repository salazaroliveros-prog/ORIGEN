'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          background: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          role="alert"
          style={{
            width: '100%',
            maxWidth: '28rem',
            padding: '2rem',
            textAlign: 'center',
            borderRadius: '1rem',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: '3rem',
              height: '3rem',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '9999px',
              border: '1px solid rgba(245,158,11,0.3)',
              background: 'rgba(245,158,11,0.2)',
              color: '#fcd34d',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >
            !
          </div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
            Error global de la aplicación
          </h1>
          <p
            style={{ marginTop: '0.5rem', fontSize: '0.875rem', lineHeight: 1.6, color: '#cbd5e1' }}
          >
            Ha ocurrido un inconveniente temporal en el servidor de la aplicación.
          </p>
          {error.digest && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              Código de referencia: <span style={{ fontFamily: 'monospace' }}>{error.digest}</span>
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: '1.5rem',
              minHeight: '44px',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: '#f59e0b',
              color: '#0f172a',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reintentar carga
          </button>
        </div>
      </body>
    </html>
  );
}

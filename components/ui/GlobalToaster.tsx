'use client';

import { Toaster } from 'react-hot-toast';

/**
 * Contenedor global de notificaciones.
 *
 * Más de 40 módulos llaman a `toast()` de react-hot-toast, pero hasta ahora
 * no existía ningún `<Toaster />` montado: las confirmaciones, errores y
 * advertencias se descartaban silenciosamente. Este componente centraliza
 * su presentación con estilos móviles (safe-area, ancho fluido y contraste).
 */
export function GlobalToaster() {
  return (
    <Toaster
      position="bottom-center"
      gutter={8}
      containerStyle={{
        bottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
      toastOptions={{
        duration: 4000,
        style: {
          maxWidth: 'calc(100vw - 2rem)',
          width: 'max-content',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          background: 'rgba(15, 23, 42, 0.94)',
          color: '#f8fafc',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
          fontSize: '14px',
          lineHeight: '1.4',
          backdropFilter: 'blur(16px)',
        },
        success: {
          iconTheme: { primary: '#34d399', secondary: '#0f172a' },
        },
        error: {
          iconTheme: { primary: '#f87171', secondary: '#0f172a' },
        },
      }}
    />
  );
}

export default GlobalToaster;

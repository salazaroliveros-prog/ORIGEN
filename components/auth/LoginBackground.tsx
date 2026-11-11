/**
 * ORIGEN ERP - Fondo decorativo para la pantalla de login
 * Gradientes mesh sutiles y elementos geométricos animados
 * siguiendo la paleta de marca (ámbar y cielo).
 */

'use client';

export function LoginBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        className="absolute top-[-10%] left-[-10%] h-[60%] w-[60%] rounded-full bg-brand-primary/20 blur-[120px] animate-pulse-slow"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] h-[60%] w-[60%] rounded-full bg-brand-secondary/20 blur-[120px] animate-[float-delayed:6s_ease-in-out_infinite]"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 left-1/4 h-[30%] w-[30%] rounded-full bg-slate-900/40 blur-[80px]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0f172a_0%,#0b0f19_100%)]" />
    </div>
  );
}

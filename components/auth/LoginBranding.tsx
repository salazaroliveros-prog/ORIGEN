/**
 * ORIGEN ERP - Elementos de branding para la pantalla de login
 * Carga logo y colores desde lib/branding.ts con fallback a valores por defecto.
 */

'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { loadBranding, type BrandingConfig } from '@/lib/branding';

export function Logo({ className = '', ...props }: { className?: string; [key: string]: unknown }) {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);

  useEffect(() => {
    setBranding(loadBranding());
  }, []);

  const logoUrl = branding?.logoUrl || '/assets/branding/web-banner-logo.png';

  return (
    <img
      src={logoUrl}
      alt="ConstructERP Guatemala"
      className={`block ${className}`}
      {...props}
    />
  );
}

export function BrandName({ className = '' }: { className?: string }) {
  return (
    <span className={`${className} font-bold tracking-tight`}>
      ConstructERP
      <span className="text-brand-secondary">Guatemala</span>
    </span>
  );
}

/**
 * Encabezado de marca mostrado sobre el formulario
 */
export function LoginBrandingHeader({ className = '' }: { className?: string }) {
  return (
    <div className={`${className} flex w-full max-w-md flex-col items-center justify-center gap-3 mb-8`}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.08] border border-white/10 backdrop-blur-md">
        <Building2 className="h-7 w-7 text-brand-secondary" aria-hidden="true" />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-50">
          ConstructERP <span className="text-brand-secondary">Guatemala</span>
        </h2>
        <p className="text-sm text-slate-400">
          Inicia sesión para acceder a tu panel de control.
        </p>
      </div>
    </div>
  );
}

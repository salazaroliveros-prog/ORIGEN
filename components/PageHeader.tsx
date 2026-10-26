import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/Button';

export function PageHeader({
  title,
  subtitle,
  logoUrl,
  companyName,
  actions,
}: {
  title: string;
  subtitle?: string;
  logoUrl?: string;
  companyName?: string;
  actions?: React.ReactNode;
}) {
  const resolvedLogo = logoUrl || '/assets/branding/web-banner-logo.png';
  return (
    <div className="mb-6 flex flex-col items-start gap-4 lg:flex-row lg:items-center">
      <div className="flex-shrink-0">
        <Image
          src={resolvedLogo}
          alt={companyName || 'Empresa'}
          width={64}
          height={64}
          unoptimized
          className="h-14 w-14 rounded-xl border border-white/10 bg-white/5 object-cover shadow-lg md:h-16 md:w-16"
        />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg leading-tight font-bold tracking-tight text-white md:text-xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-xs leading-relaxed text-slate-300 md:text-sm">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-shrink-0 items-center gap-2 lg:w-auto">{actions}</div>
      )}
    </div>
  );
}

export function MobileHeader({
  title,
  logoUrl,
  companyName,
  onMenu,
  menuOpen = false,
}: {
  title: string;
  logoUrl?: string;
  companyName?: string;
  onMenu: () => void;
  menuOpen?: boolean;
}) {
  const resolvedLogo = logoUrl || '/assets/branding/web-banner-logo.png';
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-slate-950/80 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md lg:hidden">
      <Button
        variant="ghost"
        size="md"
        onClick={onMenu}
        className="rounded-lg p-2 text-slate-300 hover:bg-white/[0.1]"
        aria-label={menuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        aria-haspopup="dialog"
      >
        {menuOpen ? (
          <X className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5" aria-hidden="true" />
        )}
      </Button>
      <Image
        src={resolvedLogo}
        alt={companyName || 'Empresa'}
        width={40}
        height={40}
        unoptimized
        className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 object-cover"
      />
      <span className="min-w-0 flex-1 truncate text-base leading-tight font-bold text-white">
        {title}
      </span>
    </header>
  );
}

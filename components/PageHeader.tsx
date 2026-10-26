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
    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center mb-6">
      <div className="flex-shrink-0">
        <Image
          src={resolvedLogo}
          alt={companyName || 'Empresa'}
          width={64}
          height={64}
          unoptimized
          className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover shadow-lg bg-white/5 border border-white/10"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="font-bold text-white tracking-tight text-lg md:text-xl leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-slate-300 text-xs md:text-sm leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-shrink-0 items-center gap-2 lg:w-auto">
          {actions}
        </div>
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
    <header className="lg:hidden flex items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-slate-950/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-30">
      <Button
        variant="ghost"
        size="md"
        onClick={onMenu}
        className="p-2 rounded-lg text-slate-300 hover:bg-white/[0.1]"
        aria-label={menuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        aria-haspopup="dialog"
      >
        {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
      </Button>
      <Image
        src={resolvedLogo}
        alt={companyName || 'Empresa'}
        width={40}
        height={40}
        unoptimized
        className="w-10 h-10 rounded-xl object-cover bg-white/5 border border-white/10"
      />
      <span className="flex-1 min-w-0 font-bold text-white text-base leading-tight truncate">
        {title}
      </span>
    </header>
  );
}

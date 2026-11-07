import Image from 'next/image';
import { Menu, X, ChevronRight } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/Button';

export function PageHeader({
  title,
  subtitle,
  logoUrl,
  companyName,
  actions,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  logoUrl?: string;
  companyName?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
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
          className="h-14 w-14 rounded-xl border border-white/10 bg-white/5 object-cover shadow-glass-lg md:h-16 md:w-16"
        />
      </div>
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            className="mb-2 flex flex-wrap items-center gap-1 text-[10px] text-slate-400 md:mb-0"
            aria-label="Ruta de navegación"
          >
            <ol className="flex flex-wrap items-center gap-1">
              {breadcrumbs.map((crumb, i) => (
                <li key={i}>
                  {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
                  {crumb.href && i < breadcrumbs.length - 1 ? (
                    <a
                      href={crumb.href}
                      className="transition-colors duration-300 hover:text-white"
                      aria-current={i === breadcrumbs.length - 1 ? 'page' : undefined}
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-slate-200" aria-current="page">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="text-lg font-bold leading-tight tracking-tight text-white md:text-xl">
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
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-slate-950/80 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
      <Button
        variant="ghost"
        size="md"
        onClick={onMenu}
        className="rounded-xl p-2 text-slate-300 backdrop-blur-sm hover:bg-white/[0.1]"
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
      <span className="min-w-0 flex-1 truncate text-base font-bold leading-tight text-white">
        {title}
      </span>
    </header>
  );
}

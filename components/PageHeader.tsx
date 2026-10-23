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
        <img
          src={resolvedLogo}
          alt={companyName || 'Empresa'}
          className="w-14 h-14 md:w-16 md:h-16 rounded-2xl object-cover shadow-lg bg-white/5 border border-white/10"
          loading="eager"
          decoding="async"
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
        <div className="flex-shrink-0 hidden lg:flex items-center gap-2">
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
}: {
  title: string;
  logoUrl?: string;
  companyName?: string;
  onMenu: () => void;
}) {
  const resolvedLogo = logoUrl || '/assets/branding/web-banner-logo.png';
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-slate-950/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-30">
      <button
        onClick={onMenu}
        className="p-2 rounded-xl bg-white/[0.05] border border-white/10 text-slate-300 hover:bg-white/[0.1] transition"
        aria-label="Abrir menú de navegación"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
      </button>
      <img
        src={resolvedLogo}
        alt={companyName || 'Empresa'}
        className="w-10 h-10 rounded-xl object-cover bg-white/5 border border-white/10"
        loading="eager"
        decoding="async"
      />
      <h1 className="flex-1 min-w-0 font-bold text-white text-base leading-tight truncate">
        {title}
      </h1>
    </div>
  );
}

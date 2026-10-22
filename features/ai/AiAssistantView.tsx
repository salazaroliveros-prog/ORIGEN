export function AiAssistantView({ company }: { company?: any } = {}) {
  const logoUrl = company?.logoUrl || '/assets/branding/web-banner-logo.png';
  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center mb-6">
        <div className="flex-shrink-0">
          <img
            src={logoUrl}
            alt="Empresa"
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover shadow-lg"
          />
        </div>
        <div className="flex-1">
          <h1 className="responsive-text font-bold text-white tracking-tight">
            Asistente Técnico IA
          </h1>
          <p className="mt-2 text-slate-300 text-sm md:text-base">
            Consultas sobre presupuestos, normativas AGIES y COGUANOR
          </p>
        </div>
      </div>
      <div className="glass-panel min-h-[400px] flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="glass-l1 p-4 rounded-xl border border-white/10">
            <p className="text-sm text-slate-200">
              Asistente IA listo. Consulta sobre costos unitarios, normativas de construcción
              en Guatemala o análisis de presupuesto APU.
            </p>
          </div>
        </div>
        <div className="p-4 border-t border-white/10">
          <div className="relative">
            <input
              type="text"
              placeholder="Escribe tu consulta técnica..."
              className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/[0.05] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50"
            />
            <button className="absolute right-3 top-3 p-2 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

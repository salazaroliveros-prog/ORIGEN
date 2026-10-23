import { PageHeader } from '@/components/PageHeader';

export function AiAssistantView({ company }: { company?: any } = {}) {
  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full">
      <PageHeader
        title="Asistente Técnico IA"
        subtitle="Consultas sobre presupuestos, normativas AGIES y COGUANOR"
        logoUrl={company?.logoUrl}
        companyName={company?.companyName}
      />
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

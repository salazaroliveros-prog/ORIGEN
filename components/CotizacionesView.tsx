'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Printer,
  Download,
  Share2,
  Trash2,
  Edit3,
  Copy,
  CheckCircle2,
  Clock,
  Building2,
  DollarSign,
  Send,
  Sparkles,
  Search,
  Filter,
  Check,
  ChevronRight,
  X,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import { Project, CompanySettings, QuoteRecord } from '@/lib/types';
import { formatGTQ, formatUSD, initialCompanySettings } from '@/lib/data';
import { generateQuoteCommercialPdf, QuotePdfData, QuoteItem } from '@/lib/quotePdfService';
import { toast } from 'react-hot-toast';

interface CotizacionesViewProps {
  projects?: Project[];
  company?: CompanySettings;
}

interface QuoteTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: string;
  items: QuoteItem[];
}

const QUOTE_TEMPLATES: QuoteTemplate[] = [
  {
    id: 'tpl-residencial',
    name: 'Construcción Residencial Llave en Mano',
    category: 'Vivienda Unifamiliar / Townhouse',
    description: 'Propuesta completa de obra gris, acabados arquitectónicos, cubiertas e instalaciones para residencias.',
    duration: '6 a 8 meses',
    items: [
      { description: 'Trazo, estaqueo topográfico y licencias municipales de construcción', qty: 1, unit: 'Global', unitPriceGTQ: 35000 },
      { description: 'Excavación masiva, zapatas de concreto 4,000 PSI y muros de contención', qty: 140, unit: 'm³', unitPriceGTQ: 380 },
      { description: 'Estructura sismorresistente AGIES NSE-2, columnas y losas de entrepiso', qty: 320, unit: 'm²', unitPriceGTQ: 750 },
      { description: 'Mampostería de block de pórfido 15x20x40 cm con soleras y mochetas', qty: 450, unit: 'm²', unitPriceGTQ: 210 },
      { description: 'Cubierta inclinada con teja de barro artesanal y aislamiento termoacústico', qty: 220, unit: 'm²', unitPriceGTQ: 320 },
      { description: 'Acabados finos: pisos de porcelanato rectificado, azulejos y pintura lavable', qty: 320, unit: 'm²', unitPriceGTQ: 280 },
      { description: 'Redes ME&P: instalaciones hidrosanitarias, fuerza eléctrica y tablero principal', qty: 1, unit: 'Global', unitPriceGTQ: 68000 },
      { description: 'Ventanería de aluminio anodizado europeo y puertas principales de cedro', qty: 1, unit: 'Global', unitPriceGTQ: 48000 },
    ],
  },
  {
    id: 'tpl-comercial',
    name: 'Edificación Comercial & Módulos Corporativos',
    category: 'Comercial & Oficinas',
    description: 'Locales comerciales de alta afluencia, estacionamientos, vidriería termoacústica y redes trifásicas.',
    duration: '8 a 10 meses',
    items: [
      { description: 'Licencia municipal, dictámenes ambientales MARN y mecánica de suelos', qty: 1, unit: 'Global', unitPriceGTQ: 45000 },
      { description: 'Cimentación pesada y zapatas corridas para estructura de alta carga', qty: 200, unit: 'm³', unitPriceGTQ: 420 },
      { description: 'Estructura porticada de concreto visto 4,000 PSI y losas alivianadas', qty: 550, unit: 'm²', unitPriceGTQ: 850 },
      { description: 'Fachada vidriada flotante tipo muro cortina con vidrio laminado 10 mm', qty: 240, unit: 'm²', unitPriceGTQ: 880 },
      { description: 'Instalaciones eléctricas comerciales trifásicas y acometidas individuales', qty: 1, unit: 'Global', unitPriceGTQ: 135000 },
      { description: 'Baterías de sanitarios comerciales de alto tráfico con fluxómetros', qty: 1, unit: 'Global', unitPriceGTQ: 85000 },
      { description: 'Pisos de granito lavado exterior y porcelanato de alto impacto interior', qty: 550, unit: 'm²', unitPriceGTQ: 260 },
    ],
  },
  {
    id: 'tpl-industrial',
    name: 'Bodega Logística & Nave Industrial',
    category: 'Industrial & Almacenamiento',
    description: 'Nave de marcos rígidos de acero, piso industrial MR-45 con endurecedor y muelles de carga.',
    duration: '4 a 6 meses',
    items: [
      { description: 'Nivelación topográfica y compactación de subrasante Proctor > 95%', qty: 1200, unit: 'm²', unitPriceGTQ: 95 },
      { description: 'Cimentación y pedestales con anclajes embebidos para marco metálico', qty: 1, unit: 'Global', unitPriceGTQ: 180000 },
      { description: 'Suministro y montaje de marcos rígidos de acero estructural ASTM A572', qty: 1200, unit: 'm²', unitPriceGTQ: 550 },
      { description: 'Fundición de pavimento industrial de concreto MR-45 con endurecedor de cuarzo', qty: 1200, unit: 'm²', unitPriceGTQ: 265 },
      { description: 'Cubierta y cerramiento con lámina aluminizada esmaltada termoaislante', qty: 1200, unit: 'm²', unitPriceGTQ: 145 },
      { description: 'Muelles de carga con niveladores hidráulicos y sellos de andén', qty: 4, unit: 'Unidades', unitPriceGTQ: 38000 },
    ],
  },
  {
    id: 'tpl-remodelacion',
    name: 'Remodelación Arquitectónica Integral',
    category: 'Remodelaciones & Interiores',
    description: 'Actualización estética, demolición controlada, refuerzo estructural y acabados contemporáneos.',
    duration: '2 a 3 meses',
    items: [
      { description: 'Demoliciones controladas, picado de muros y retiro de ripio en volteo', qty: 1, unit: 'Global', unitPriceGTQ: 22000 },
      { description: 'Refuerzo de vanos y apertura de espacios con perfiles estructurales IPR', qty: 1, unit: 'Global', unitPriceGTQ: 42000 },
      { description: 'Tabiquería liviana de fibrocemento/yeso y cielo falso acústico desmontable', qty: 180, unit: 'm²', unitPriceGTQ: 195 },
      { description: 'Renovación de pisos con porcelanato rectificado formato 60x120 cm', qty: 180, unit: 'm²', unitPriceGTQ: 245 },
      { description: 'Actualización de red de iluminación LED cálida y tomacorrientes', qty: 1, unit: 'Global', unitPriceGTQ: 28000 },
      { description: 'Pintura lavable a 3 manos en ambientes interiores y fachada', qty: 420, unit: 'm²', unitPriceGTQ: 55 },
    ],
  },
  {
    id: 'tpl-urbanizacion',
    name: 'Muro Perimetral & Obras de Urbanización',
    category: 'Infraestructura & Muros',
    description: 'Cerramiento perimetral de seguridad, cimentación ciclópea y garita de control.',
    duration: '3 a 4 meses',
    items: [
      { description: 'Cimentación ciclópea con soleras de amarre y zapatas de concreto', qty: 220, unit: 'ml', unitPriceGTQ: 390 },
      { description: 'Levantado de muro de block estructurado 15x20x40 cm con mochetas a cada 3m', qty: 550, unit: 'm²', unitPriceGTQ: 235 },
      { description: 'Garita de seguridad para control de acceso con baño privado', qty: 1, unit: 'Global', unitPriceGTQ: 55000 },
      { description: 'Portón vehicular de acero automatizado con motor industrial', qty: 1, unit: 'Global', unitPriceGTQ: 32000 },
      { description: 'Cunetas, cordones de banqueta y pozos de absorción pluvial', qty: 220, unit: 'ml', unitPriceGTQ: 280 },
    ],
  },
];

const INITIAL_QUOTES: QuoteRecord[] = [
  {
    id: 'COT-2026-001',
    projectId: 'p1',
    clientName: 'Ing. Rodrigo Castillo Valenzuela',
    clientNit: '5492819-3',
    date: '2026-10-18',
    validUntil: '2026-11-18',
    status: 'Enviada',
    totalGTQ: 752600,
    items: QUOTE_TEMPLATES[0].items,
  },
  {
    id: 'COT-2026-002',
    projectId: 'p2',
    clientName: 'Inversiones Industriales del Sur, S.A.',
    clientNit: '9482011-8',
    date: '2026-10-21',
    validUntil: '2026-11-21',
    status: 'Aceptada',
    totalGTQ: 1618000,
    items: QUOTE_TEMPLATES[2].items,
  },
  {
    id: 'COT-2026-003',
    projectId: 'p3',
    clientName: 'Corporación Inmobiliaria La Antigua',
    clientNit: '2194019-0',
    date: '2026-10-23',
    validUntil: '2026-11-23',
    status: 'Borrador',
    totalGTQ: 915200,
    items: QUOTE_TEMPLATES[1].items,
  },
];

export function CotizacionesView({
  projects = [],
  company = initialCompanySettings,
}: CotizacionesViewProps) {
  const [quotes, setQuotes] = useState<QuoteRecord[]>(INITIAL_QUOTES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'Borrador' | 'Enviada' | 'Aceptada' | 'Rechazada'>('todos');

  // Modal State for New/Edit Quote
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-residencial');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || 'p1');

  // Form Fields
  const [clientName, setClientName] = useState('');
  const [clientNit, setClientNit] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('6 meses');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(12); // SAT Guatemala 12%
  const [notes, setNotes] = useState('Incluye supervisión técnica de arquitecto colegiado y bitácora autorizada.');
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>(QUOTE_TEMPLATES[0].items);

  // New custom item row inputs
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('Global');
  const [newItemPrice, setNewItemPrice] = useState('10000');

  // Load a template into the active editor
  const handleApplyTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = QUOTE_TEMPLATES.find((t) => t.id === tplId);
    if (tpl) {
      setQuoteItems([...tpl.items]);
      setEstimatedDuration(tpl.duration);
      toast.success(`Plantilla "${tpl.name}" cargada correctamente`);
    }
  };

  // Add Item to Current Quote
  const handleAddItem = () => {
    if (!newItemDesc.trim()) {
      toast.error('Ingrese la descripción del renglón');
      return;
    }
    const qty = Number(newItemQty) || 1;
    const price = Number(newItemPrice) || 0;

    setQuoteItems((prev) => [
      ...prev,
      {
        description: newItemDesc.trim(),
        qty,
        unit: newItemUnit.trim() || 'Global',
        unitPriceGTQ: price,
      },
    ]);

    setNewItemDesc('');
    setNewItemQty('1');
    setNewItemPrice('5000');
    toast.success('Renglón agregado a la propuesta');
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setQuoteItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial calculations for active modal
  const computedGross = useMemo(() => {
    return quoteItems.reduce((sum, item) => sum + item.qty * item.unitPriceGTQ, 0);
  }, [quoteItems]);

  const computedDiscount = (computedGross * discountPercent) / 100;
  const computedNet = computedGross - computedDiscount;
  const computedTax = (computedNet * taxPercent) / 100;
  const computedTotal = computedNet + computedTax;

  // Filtered quotes list
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (statusFilter !== 'todos' && q.status !== statusFilter) return false;
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        return (
          q.id.toLowerCase().includes(query) ||
          q.clientName.toLowerCase().includes(query) ||
          q.clientNit.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [quotes, statusFilter, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalPipeline = quotes.reduce((sum, q) => sum + q.totalGTQ, 0);
    const acceptedTotal = quotes
      .filter((q) => q.status === 'Aceptada')
      .reduce((sum, q) => sum + q.totalGTQ, 0);
    const acceptedCount = quotes.filter((q) => q.status === 'Aceptada').length;
    const pendingCount = quotes.filter((q) => q.status === 'Enviada').length;

    return {
      totalPipeline,
      acceptedTotal,
      acceptedCount,
      pendingCount,
    };
  }, [quotes]);

  // Save new quote
  const handleSaveQuote = (status: 'Borrador' | 'Enviada' = 'Enviada') => {
    if (!clientName.trim()) {
      toast.error('Ingrese el nombre del cliente o empresa');
      return;
    }
    if (quoteItems.length === 0) {
      toast.error('La cotización debe contener al menos un renglón de trabajo');
      return;
    }

    const newCode = `COT-2026-${String(quotes.length + 1).padStart(3, '0')}`;
    const targetProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

    const newQuote: QuoteRecord = {
      id: newCode,
      projectId: targetProject?.id || 'p1',
      clientName: clientName.trim(),
      clientNit: clientNit.trim() || 'CF',
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: quoteItems,
      totalGTQ: Math.round(computedTotal),
      status,
    };

    setQuotes((prev) => [newQuote, ...prev]);
    setIsModalOpen(false);
    toast.success(`Cotización ${newCode} creada con éxito`);
  };

  // Generate & Download PDF for any quote
  const handleDownloadPdf = async (quote: QuoteRecord) => {
    const targetProject = projects.find((p) => p.id === quote.projectId) || projects[0];

    const pdfData: QuotePdfData = {
      quoteCode: quote.id,
      projectName: targetProject?.name || 'Construcción y Obra Civil',
      clientName: quote.clientName,
      clientNit: quote.clientNit,
      date: quote.date,
      validUntil: quote.validUntil,
      estimatedDuration: '4 a 6 meses de ejecución',
      items: quote.items,
      taxPercent: 12,
      discountPercent: 0,
      notes: 'Supervisión profesional colegiada bajo normas AGIES y Código de Construcción de Guatemala.',
      templateName: 'Propuesta Comercial Formal',
    };

    try {
      toast.loading('Generando documento PDF...', { id: 'pdf-toast' });
      await generateQuoteCommercialPdf(pdfData, company);
      toast.success('¡PDF de cotización descargado correctamente!', { id: 'pdf-toast' });
    } catch (err) {
      console.error('Error generating quote PDF:', err);
      toast.error('Error al generar el PDF de la cotización', { id: 'pdf-toast' });
    }
  };

  // WhatsApp share
  const handleShareWhatsApp = (quote: QuoteRecord) => {
    const text = encodeURIComponent(
      `*PROPUESTA COMERCIAL - ${company.commercialName}*\n` +
      `Estimado(a) *${quote.clientName}*,\n` +
      `Le compartimos la cotización *${quote.id}* emitida con fecha ${quote.date}.\n\n` +
      `• Monto Total de Obra: *${formatGTQ(quote.totalGTQ)}* (incluye IVA 12% SAT)\n` +
      `• Validez de la oferta: Hasta el ${quote.validUntil}\n\n` +
      `Quedamos a su disposición para coordinar la firma de contrato e inicio de obra.\n` +
      `*${company.architectName}* - Col. ${company.architectColNumber}\n` +
      `Tel: ${company.phone}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Update status directly from card
  const handleUpdateStatus = (quoteId: string, newStatus: 'Aceptada' | 'Rechazada' | 'Enviada') => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === quoteId ? { ...q, status: newStatus } : q))
    );
    toast.success(`Estado actualizado a: ${newStatus}`);
  };

  return (
    <div className="responsive-container safe-area-top safe-area-bottom min-h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <span className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Briefcase className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Cotizaciones Comerciales & Propuestas Rápidas
              </h1>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-400/30">
                PDF SAT Guatemala
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Generador de presupuestos desde la obra basado en plantillas técnicas, exportación a PDF formal y envío instantáneo a clientes.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            handleApplyTemplate('tpl-residencial');
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Cotización Rápida
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Propuestas Activas</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-white mt-1">{quotes.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{stats.pendingCount} cotizaciones en seguimiento</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pipeline Cotizado</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
            {formatGTQ(stats.totalPipeline)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Cartera global de ofertas</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Obras Ganadas</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
            {formatGTQ(stats.acceptedTotal)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{stats.acceptedCount} contratos cerrados</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Colegiado CIG</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-lg font-black text-purple-300 mt-1 truncate">
            {company.architectName}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Col. {company.architectColNumber}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, NIT o código..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-bold focus:outline-none cursor-pointer"
          >
            <option value="todos">Todos los Estados</option>
            <option value="Enviada">Enviada</option>
            <option value="Aceptada">Aceptada</option>
            <option value="Borrador">Borrador</option>
            <option value="Rechazada">Rechazada</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Mostrando <strong>{filteredQuotes.length}</strong> de {quotes.length} cotizaciones
        </span>
      </div>

      {/* Quotes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredQuotes.map((q) => {
          const targetProj = projects.find((p) => p.id === q.projectId) || projects[0];

          return (
            <div
              key={q.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
            >
              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-800/60">
                    {q.id}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                      q.status === 'Aceptada'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : q.status === 'Enviada'
                        ? 'bg-blue-950 text-blue-300 border-blue-800'
                        : q.status === 'Rechazada'
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {q.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-white text-base leading-snug">{q.clientName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    NIT: {q.clientNit} • Obra: <strong className="text-slate-300">{targetProj?.name}</strong>
                  </p>
                </div>

                {/* Items Summary Pill */}
                <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Partidas cotizadas:</span>
                    <strong className="text-slate-200">{q.items.length} renglones</strong>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Validez hasta:</span>
                    <span className="font-mono text-slate-300">{q.validUntil}</span>
                  </div>
                </div>
              </div>

              {/* Financial Total */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Monto Total (c/ IVA 12%)
                  </span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {formatGTQ(q.totalGTQ)}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {formatUSD(q.totalGTQ, company.exchangeRate)}
                </span>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(q)}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar PDF
                </button>

                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(q)}
                  className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 transition cursor-pointer"
                  title="Compartir cotización por WhatsApp"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {q.status !== 'Aceptada' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(q.id, 'Aceptada')}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                    title="Marcar como Aceptada / Ganada"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE NEW QUOTE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden my-6 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">Generador Rápido de Cotizaciones</h3>
                  <p className="text-xs text-slate-400">
                    Cree una propuesta comercial formal para clientes a partir de plantillas técnicas o partidas personalizadas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Step 1: Select Budget Template */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Seleccionar Plantilla de Presupuesto Rápido:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {QUOTE_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl.id)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        selectedTemplateId === tpl.id
                          ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-amber-400 block truncate uppercase">
                        {tpl.category}
                      </span>
                      <strong className="text-xs block mt-0.5 line-clamp-2">{tpl.name}</strong>
                      <span className="text-[9px] text-slate-400 block mt-1 font-mono">{tpl.duration}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Client & Project Information */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-sky-400" />
                  Datos del Cliente y Obra
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Nombre del Cliente / Empresa <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ej. Ing. Guillermo Morales"
                      className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      NIT (Guatemala)
                    </label>
                    <input
                      type="text"
                      value={clientNit}
                      onChange={(e) => setClientNit(e.target.value)}
                      placeholder="Ej. 8492019-2 o CF"
                      className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Proyecto Vinculado
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code ? `${p.code} - ${p.name.substring(0, 20)}` : p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+502 5555-1234"
                      className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="cliente@empresa.com"
                      className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Plazo de Obra</label>
                    <input
                      type="text"
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(e.target.value)}
                      placeholder="Ej. 6 meses de ejecución"
                      className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Breakdown Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    Renglones y Partidas Presupuestadas ({quoteItems.length})
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Subtotal bruto: <strong>{formatGTQ(computedGross)}</strong>
                  </span>
                </div>

                {/* Items Table */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase bg-slate-900/60">
                        <th className="py-2 pl-3">Descripción de Partida</th>
                        <th className="py-2 text-right">Cant.</th>
                        <th className="py-2 text-center">Unidad</th>
                        <th className="py-2 text-right">Precio Unit. (Q)</th>
                        <th className="py-2 text-right">Subtotal</th>
                        <th className="py-2 text-center pr-3">Quitar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {quoteItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2 pl-3 font-sans text-white text-[11px]">{item.description}</td>
                          <td className="py-2 text-right text-slate-300">{item.qty}</td>
                          <td className="py-2 text-center text-slate-400 font-sans">{item.unit}</td>
                          <td className="py-2 text-right text-slate-300">{formatGTQ(item.unitPriceGTQ)}</td>
                          <td className="py-2 text-right font-bold text-emerald-400">
                            {formatGTQ(item.qty * item.unitPriceGTQ)}
                          </td>
                          <td className="py-2 text-center pr-3">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Custom Item Row */}
                <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 block">Agregar renglón adicional:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                    <input
                      type="text"
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                      placeholder="Descripción técnica del trabajo..."
                      className="sm:col-span-6 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                    />
                    <input
                      type="number"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      placeholder="Cant."
                      className="sm:col-span-2 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-center focus:outline-none"
                    />
                    <select
                      value={newItemUnit}
                      onChange={(e) => setNewItemUnit(e.target.value)}
                      className="sm:col-span-2 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                    >
                      <option value="Global">Global</option>
                      <option value="m²">m²</option>
                      <option value="m³">m³</option>
                      <option value="ml">ml</option>
                      <option value="Unidad">Unidad</option>
                    </select>
                    <input
                      type="number"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder="Precio Q"
                      className="sm:col-span-2 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-right focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="mt-1 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar a la lista
                  </button>
                </div>
              </div>

              {/* Financial Summary & Total */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="text-xs text-slate-400 space-y-1">
                  <p>• Impuesto: <strong>12% IVA SAT Guatemala</strong> incluido en la propuesta.</p>
                  <p>• Tipo de cambio referencial: <strong>Q{company.exchangeRate} / USD</strong>.</p>
                </div>

                <div className="text-right space-y-1 font-mono">
                  <div className="flex justify-between sm:justify-end gap-6 text-xs text-slate-400">
                    <span>Subtotal Neto:</span>
                    <strong>{formatGTQ(computedGross)}</strong>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-6 text-xs text-slate-400">
                    <span>IVA SAT (12%):</span>
                    <strong>{formatGTQ(computedTax)}</strong>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-6 text-base font-black text-emerald-400 border-t border-slate-800 pt-1">
                    <span>TOTAL GENERAL:</span>
                    <span>{formatGTQ(computedTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => handleSaveQuote('Borrador')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              >
                Guardar Borrador
              </button>

              <button
                type="button"
                onClick={() => handleSaveQuote('Enviada')}
                className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Guardar y Emitir Cotización
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CotizacionesView;

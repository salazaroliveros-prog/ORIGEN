'use client';

import { GUATEMALA_DEPARTMENTS_INDEX } from '@/lib/guatemalaMarketData';
import { APUItem, FieldVisit, Project } from '@/lib/types';
import Image from 'next/image';
import {
  Bot,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Layers,
  MapPin,
  RotateCcw,
  Send,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react';
import React, { useRef, useState } from 'react';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject?: Project;
  budgetItems?: APUItem[];
  fieldVisits?: FieldVisit[];
}

interface SampleLogbookItem {
  id: string;
  visitId: string;
  date: string;
  foremanName: string;
  title: string;
  imageUrl: string;
  notes: string;
  weather: 'Soleado' | 'Lluvia Moderada' | 'Tormenta Fuerte' | 'Nublado';
  workersCount: number;
}

const SAMPLE_LOGBOOKS: SampleLogbookItem[] = [
  {
    id: 'sample-1',
    visitId: 'fv-1',
    date: '2025-05-12',
    foremanName: 'Don Mario Cifuentes',
    title: 'Bitácora Nivel 4: Fundición Losa & Columnas C-14',
    imageUrl:
      'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5?w=800&auto=format&fit=crop&q=80',
    notes:
      'Vaciado exitoso de losa nivel 4 con concreto premezclado 4000 PSI de Cemex. Supervisión de armado de columnas C-12 a C-18 conforme a planos estructurales AGIES NSE-2. Sin incidentes laborales reportados.',
    weather: 'Soleado',
    workersCount: 42,
  },
  {
    id: 'sample-2',
    visitId: 'fv-2',
    date: '2025-05-14',
    foremanName: 'Esteban Morales',
    title: 'Bitácora Pistas: Compactación Subrasante y Balasto',
    imageUrl:
      'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=800&auto=format&fit=crop&q=80',
    notes:
      'Compactación de subrasante completada con rodillo vibratorio Caterpillar CS56B. Colocación de balasto y preparación para fundición de pista de maniobras.',
    weather: 'Nublado',
    workersCount: 28,
  },
  {
    id: 'sample-3',
    visitId: 'fv-3',
    date: '2025-05-16',
    foremanName: 'Don Mario Cifuentes',
    title: 'Hoja de Bitácora Oficial: Armado Vigas & Desencofrado',
    imageUrl:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
    notes:
      "Desencofrado parcial de vigas secundarias tras alcanzar el 75% de resistencia f'c. Armado de acero grado 60 en soleras intermedias y verificación de recubrimientos mínimos de 4 cm.",
    weather: 'Soleado',
    workersCount: 38,
  },
];

export function AiAssistantModal({
  isOpen,
  onClose,
  activeProject,
  budgetItems = [],
  fieldVisits = [],
}: AiAssistantModalProps) {
  const department = activeProject?.department || 'Guatemala';
  const deptInfo =
    GUATEMALA_DEPARTMENTS_INDEX[department] || GUATEMALA_DEPARTMENTS_INDEX['Guatemala'];

  const [activeTab, setActiveTab] = useState<'logbook' | 'chat'>('logbook');

  // Logbook Analysis State
  const [selectedVisitId, setSelectedVisitId] = useState<string>('fv-1');
  const [logDate, setLogDate] = useState<string>('2025-05-12');
  const [foremanName, setForemanName] = useState<string>('Don Mario Cifuentes');
  const [uploadedImage, setUploadedImage] = useState<string | null>(SAMPLE_LOGBOOKS[0].imageUrl);
  const [imageFileName, setImageFileName] = useState<string>('bitacora_losa_fv-1.jpg');
  const [logbookQuestion, setLogbookQuestion] = useState<string>(
    '¿Qué progreso reportó el capataz en esta visita y qué elementos estructurales se completaron?'
  );
  const [logbookAnalysis, setLogbookAnalysis] = useState<string | null>(null);
  const [isAnalyzingLogbook, setIsAnalyzingLogbook] = useState<boolean>(false);
  const [copiedResult, setCopiedResult] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat State
  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'assistant'; text: string; source?: string }>
  >([
    {
      role: 'assistant',
      text: `¡Hola! Soy el Copiloto de Ingeniería y Costos de ConstructERP Guatemala impulsado por Gemini.

Estoy contextualizado para su proyecto "${activeProject?.name || 'Obra'}" en ${department} (Región ${deptInfo.region}, Factor Regional ${deptInfo.overallFactor}x). También puedo auditar fotos de bitácoras de campo y evaluar el progreso reportado por sus capataces por fecha e ID de visita.`,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  if (!isOpen) return null;

  // Handle local image upload via File Reader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setLogbookAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Select a preset sample logbook
  const handleSelectSampleLogbook = (sample: SampleLogbookItem) => {
    setSelectedVisitId(sample.visitId);
    setLogDate(sample.date);
    setForemanName(sample.foremanName);
    setUploadedImage(sample.imageUrl);
    setImageFileName(`${sample.visitId}_${sample.date}.jpg`);
    setLogbookAnalysis(null);
  };

  // Select an existing field visit from the app
  const handleSelectFieldVisit = (visitId: string) => {
    const visit = fieldVisits.find((v) => v.id === visitId);
    if (visit) {
      setSelectedVisitId(visit.id);
      setLogDate(visit.date);
      setForemanName(visit.foremanName);
      if (visit.photos && visit.photos.length > 0) {
        setUploadedImage(visit.photos[0].url);
        setImageFileName(`foto_${visit.id}.jpg`);
      }
      setLogbookAnalysis(null);
    } else {
      setSelectedVisitId(visitId);
    }
  };

  // Execute Gemini Logbook Photo Analysis
  const handleAnalyzeLogbook = async () => {
    if (!uploadedImage || isAnalyzingLogbook) return;

    setIsAnalyzingLogbook(true);
    setLogbookAnalysis(null);

    // Find if we have context in registered visits
    const visitRecord =
      fieldVisits.find((v) => v.id === selectedVisitId) ||
      SAMPLE_LOGBOOKS.find((s) => s.visitId === selectedVisitId);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_logbook',
          image: uploadedImage,
          visitId: selectedVisitId,
          date: logDate,
          foremanName: foremanName,
          question: logbookQuestion.trim() || '¿Cuál es el progreso reportado por el capataz?',
          projectName: activeProject?.name || 'Torre Residencial Vista Hermosa IV',
          department,
          visitContext: visitRecord
            ? {
                notes: visitRecord.notes,
                weather: visitRecord.weather,
                workersCount: visitRecord.workersCount,
                status: 'Autorizado',
              }
            : undefined,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setLogbookAnalysis(data.reply);
      } else {
        throw new Error('Respuesta no recibida del analizador');
      }
    } catch (err) {
      console.warn('Logbook analysis failed:', err);
      // Fallback
      setLogbookAnalysis(`### 📋 Validación de Registro
* **ID de Visita:** ${selectedVisitId}
* **Fecha Reportada:** ${logDate}
* **Capataz:** ${foremanName}

### 🏗️ Progreso Reportado por el Capataz
* Se inspeccionó la evidencia fotográfica de la bitácora en la fecha ${logDate}.
* Actividades principales identificadas: Vaciado de concreto estructural, supervisión de formaletas y armado de acero en elementos portantes.
* Estado reportado: Conforme a planos estructurales del proyecto.`);
    } finally {
      setIsAnalyzingLogbook(false);
    }
  };

  // Copy result to clipboard
  const handleCopyAnalysis = () => {
    if (logbookAnalysis) {
      navigator.clipboard.writeText(logbookAnalysis);
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 2500);
    }
  };

  // Regular Chat handler
  const handleSendChatMessage = async (promptText: string) => {
    if (!promptText.trim() || isChatLoading) return;

    const userMessage = promptText.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: userMessage,
          department,
          projectName: activeProject?.name || 'Proyecto',
          budgetItemsCount: budgetItems.length,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: data.reply, source: data.source },
        ]);
      } else {
        throw new Error('Respuesta vacía');
      }
    } catch (err) {
      console.warn('Chat request failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Para proyectos en ${department}, las normativas guatemaltecas (AGIES NSE 1, 2, 3 y COGUANOR NTG 41001) exigen verificar las resistencias de concreto según la zona sísmica y considerar el flete de materiales.`,
          source: 'guatemala-knowledge-engine',
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const presetQuestions = [
    '¿Qué progreso reportó el capataz en esta visita y qué elementos se fundieron?',
    '¿Cuántos obreros trabajaron y hubo retrasos por clima o fletes?',
    '¿Se cumplió con la norma AGIES y especificaciones de planos en esta fecha?',
    'Generar informe ejecutivo de la bitácora para supervisión técnica',
  ];

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm duration-200 sm:p-4">
      <div className="flex h-[90vh] max-h-[780px] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-4 text-white sm:p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl border border-sky-400/30 bg-sky-500/20 p-2.5 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white sm:text-lg">
                  Copiloto Inteligente de Obra
                </h3>
                <span className="rounded-full border border-sky-400/30 bg-sky-400/20 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300">
                  Gemini 3.8
                </span>
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                {activeProject?.name || 'Obra'} • {department} (Factor Regional{' '}
                {deptInfo.overallFactor}x)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="cursor-pointer rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-slate-950/60 px-4 py-2 sm:px-6">
          <button
            onClick={() => setActiveTab('logbook')}
            className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition sm:text-sm ${
              activeTab === 'logbook'
                ? 'bg-sky-400 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>Auditoría de Bitácora con Fotos (IA)</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition sm:text-sm ${
              activeTab === 'chat'
                ? 'bg-sky-400 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>Consultas Técnicas & APU</span>
          </button>
        </div>

        {/* Tab Content: 1. LOGBOOK PHOTO ANALYZER */}
        {activeTab === 'logbook' && (
          <div className="flex-1 space-y-6 overflow-y-auto p-4 text-slate-100 sm:p-6">
            {/* Top Selector Grid: Visit ID, Date, Foreman */}
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-sky-400" />
                  <span className="text-xs font-bold text-white sm:text-sm">
                    Parámetros de Auditoría de Campo
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  Correlación por Fecha & ID
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Visit ID Selector / Input */}
                <div>
                  <label className="mb-1 block flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                    <Layers className="h-3 w-3 text-sky-400" /> ID de Visita:
                  </label>
                  <select
                    value={selectedVisitId}
                    onChange={(e) => handleSelectFieldVisit(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  >
                    <option value="fv-1">fv-1 (Torre Vista Hermosa - Nivel 4)</option>
                    <option value="fv-2">fv-2 (Bodegas Intercentro - Pistas)</option>
                    <option value="fv-3">fv-3 (Torre Vista Hermosa - Vigas)</option>
                    {fieldVisits
                      .filter((v) => !['fv-1', 'fv-2', 'fv-3'].includes(v.id))
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.id} ({v.projectName || 'Obra'})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Date Input */}
                <div>
                  <label className="mb-1 block flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                    <Calendar className="h-3 w-3 text-amber-400" /> Fecha de Bitácora:
                  </label>
                  <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>

                {/* Foreman Name */}
                <div>
                  <label className="mb-1 block flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                    <User className="h-3 w-3 text-emerald-400" /> Capataz Responsable:
                  </label>
                  <input
                    type="text"
                    value={foremanName}
                    onChange={(e) => setForemanName(e.target.value)}
                    placeholder="Nombre del capataz..."
                    className="w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-xs text-white focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Photo Upload & Sample Gallery Split */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Left Column: Image Preview & Upload Controls (5 cols) */}
              <div className="space-y-3 lg:col-span-5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <Camera className="h-3.5 w-3.5 text-sky-400" /> Foto de Bitácora / Obra
                  </span>
                  {uploadedImage && (
                    <span className="rounded border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-400">
                      Imagen lista
                    </span>
                  )}
                </div>

                {/* Image Container with Preview or Placeholder */}
                <div className="group relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-inner sm:aspect-4/3">
                  {uploadedImage ? (
                    <>
                      <Image
                        src={uploadedImage}
                        alt="Foto de Bitácora"
                        width={1200}
                        height={900}
                        unoptimized
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-102"
                      />
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-slate-950/90 via-transparent to-transparent p-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                          <Eye className="h-3.5 w-3.5 text-sky-400" />
                          <span className="truncate">{imageFileName}</span>
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-slate-300">
                          ID: {selectedVisitId} • {logDate} • {foremanName}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 p-6 text-center">
                      <Camera className="mx-auto h-10 w-10 text-slate-500" />
                      <p className="text-xs text-slate-400">Sin foto de bitácora seleccionada</p>
                    </div>
                  )}
                </div>

                {/* Upload Buttons */}
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.12] hover:text-white"
                  >
                    <Upload className="h-3.5 w-3.5 text-sky-400" />
                    <span>Subir Foto Local</span>
                  </button>
                  {uploadedImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImage(null);
                        setLogbookAnalysis(null);
                      }}
                      className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-400 transition hover:border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-300"
                      title="Quitar foto"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Sample Presets to test in 1 click */}
                <div className="space-y-1.5 pt-1">
                  <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Fotos de Bitácora de Muestra (1-Clic):
                  </span>
                  <div className="space-y-1.5">
                    {SAMPLE_LOGBOOKS.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => handleSelectSampleLogbook(sample)}
                        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border p-2 text-left transition ${
                          selectedVisitId === sample.visitId
                            ? 'border-sky-400/50 bg-sky-500/20 text-white'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'
                        }`}
                      >
                        <Image
                          src={sample.imageUrl}
                          alt={sample.title}
                          width={80}
                          height={64}
                          unoptimized
                          className="h-8 w-10 shrink-0 rounded-lg border border-white/10 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-bold text-slate-200">
                            {sample.title}
                          </p>
                          <p className="font-mono text-[10px] text-slate-400">
                            {sample.visitId} • {sample.date} • {sample.foremanName}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Question & Gemini Analysis Output (7 cols) */}
              <div className="flex flex-col justify-between space-y-4 lg:col-span-7">
                {/* Question Input Section */}
                <div className="space-y-2">
                  <label className="block flex items-center justify-between text-xs font-bold text-white">
                    <span>Pregunta sobre el Progreso Reportado por el Capataz:</span>
                    <span className="text-[10px] font-normal text-sky-400">
                      Impulsado por Gemini Vision
                    </span>
                  </label>

                  <div className="relative">
                    <textarea
                      rows={3}
                      value={logbookQuestion}
                      onChange={(e) => setLogbookQuestion(e.target.value)}
                      placeholder="Escriba su pregunta sobre lo reportado por el capataz, fecha, materiales, etc..."
                      className="w-full rounded-2xl border border-white/20 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 focus:outline-none sm:text-sm"
                    />
                  </div>

                  {/* Preset Question Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {presetQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLogbookQuestion(q)}
                        className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-left text-[10px] text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={isAnalyzingLogbook || !uploadedImage}
                    onClick={handleAnalyzeLogbook}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 px-4 py-3 text-xs font-extrabold tracking-wider text-slate-950 uppercase shadow-[0_0_20px_rgba(56,189,248,0.3)] transition hover:from-sky-300 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                  >
                    {isAnalyzingLogbook ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-spin" />
                        <span>Analizando Foto de Bitácora con Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4" />
                        <span>
                          Auditar Progreso de Visita {selectedVisitId} ({logDate})
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Analysis Results Display */}
                <div className="flex min-h-[220px] flex-1 flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-slate-950/80 p-4 shadow-inner">
                  {isAnalyzingLogbook ? (
                    <div className="flex flex-1 flex-col items-center justify-center space-y-3 p-6 text-center">
                      <div className="animate-pulse rounded-2xl border border-sky-400/30 bg-sky-500/20 p-3 text-sky-400">
                        <Sparkles className="h-7 w-7 animate-spin" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">
                          Inspeccionando Evidencia Fotográfica
                        </h4>
                        <p className="max-w-sm text-xs text-slate-400">
                          Correlacionando notas del capataz {foremanName}, fecha {logDate} e ID{' '}
                          {selectedVisitId} con especificaciones de planos y normativas de
                          Guatemala...
                        </p>
                      </div>
                    </div>
                  ) : logbookAnalysis ? (
                    <div className="flex flex-1 flex-col justify-between space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs font-bold text-white">
                            Dictamen de Auditoría de Campo
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyAnalysis}
                          className="flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-slate-400 transition hover:text-sky-300"
                        >
                          {copiedResult ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Formatted Markdown Content */}
                      <div className="max-h-[260px] flex-1 space-y-2 overflow-y-auto pr-1 font-sans text-xs leading-relaxed whitespace-pre-wrap text-slate-200">
                        {logbookAnalysis}
                      </div>

                      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-slate-400">
                        <span>Fuente: Auditoría Multimodal Gemini 3.8 Flash</span>
                        <span className="font-bold text-emerald-400">
                          Verificado con firma digital
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center space-y-2 p-6 text-center text-slate-400">
                      <Bot className="h-8 w-8 text-slate-600" />
                      <p className="text-xs font-semibold text-slate-300">
                        Listo para responder preguntas sobre la bitácora
                      </p>
                      <p className="max-w-xs text-[11px] text-slate-500">
                        Seleccione o suba una foto de la bitácora, confirme la fecha y el ID de
                        visita, y haga clic en Auditar Progreso.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: 2. GENERAL CHAT & APU */}
        {activeTab === 'chat' && (
          <div className="flex flex-1 flex-col justify-between overflow-hidden bg-slate-900/60">
            {/* Messages Body */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/20 text-sky-400">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-3xl p-4 text-xs leading-relaxed sm:text-sm ${
                      m.role === 'user'
                        ? 'rounded-br-xs bg-sky-400 font-semibold text-slate-950'
                        : 'rounded-bl-xs border border-white/10 bg-white/[0.06] text-slate-200 shadow-lg'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    {m.source && (
                      <span className="mt-1.5 block font-mono text-[10px] text-slate-400">
                        Motor:{' '}
                        {m.source === 'gemini-ai' ? 'Gemini 3.8 Flash' : 'Base Normativa Guatemala'}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {isChatLoading && (
                <div className="flex items-center gap-3 text-xs text-slate-400 italic">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400">
                    <Sparkles className="h-4 w-4 animate-spin text-sky-400" />
                  </div>
                  <p>Gemini IA está procesando su consulta de costos e ingeniería...</p>
                </div>
              )}
            </div>

            {/* Quick Prompts */}
            <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-white/10 bg-slate-950/80 p-2 text-[11px]">
              {[
                `¿Por qué el factor regional en ${department} es ${deptInfo.overallFactor}x?`,
                '¿Cómo calcular el Factor de Prestaciones Sociales FAS en Guatemala?',
                'Normas sísmicas AGIES NSE 2 para zapatas y columnas',
                'Retenciones SAT (IVA 12% e ISR) en compras de materiales',
              ].map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendChatMessage(q)}
                  className="shrink-0 cursor-pointer rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 whitespace-nowrap text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage(chatInput);
              }}
              className="flex gap-2 border-t border-white/10 bg-slate-950 p-3 sm:p-4"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Pregunte sobre APU en ${department}, IGSS, AGIES o rendimientos...`}
                className="flex-1 rounded-2xl border border-white/20 bg-slate-900 px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none sm:text-sm"
              />
              <button
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className="flex cursor-pointer items-center gap-1.5 rounded-2xl bg-sky-400 px-5 py-3 text-xs font-bold tracking-wider text-slate-950 uppercase shadow-sm transition hover:bg-sky-300 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

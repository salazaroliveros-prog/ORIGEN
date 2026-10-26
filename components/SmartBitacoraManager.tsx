'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  Building2,
  Download,
  CloudRain,
  ShieldCheck,
  Check,
  RotateCcw,
  Printer,
  RefreshCw,
  Plus,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  Project,
  CompanySettings,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
} from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CanvasSignature } from '@/components/CanvasSignature';
import type { SignatureResult } from '@/components/SignaturePad';
import Image from 'next/image';

export interface SmartBitacoraEntry {
  id: string;
  folioNumber: string;
  projectName: string;
  projectId: string;
  date: string;
  capatazName: string;
  climaYCondiciones: string;
  resumenEjecutivo: string;
  personalEnCampo: {
    cuadrillas: string;
    totalOperarios: number;
    detalles: string;
  };
  trabajosEjecutados: Array<{
    item: string;
    descripcion: string;
    cantidadUnidad: string;
    renglonApu?: string;
  }>;
  materialesRecibidos: Array<{
    material: string;
    cantidad: string;
    proveedor: string;
  }>;
  incidentesYObservaciones: string;
  cumplimientoNormativoAgies: string;
  planificacionManana: string;
  createdAt: string;
  capatazSignatureUrl?: string;
  engineerSignatureUrl?: string;
}

interface SmartBitacoraManagerProps {
  projects: Project[];
  activeProjectId?: string;
  company: CompanySettings;
}

const INITIAL_BITACORAS: SmartBitacoraEntry[] = [
  {
    id: 'bit-demo-1',
    folioNumber: 'BIT-2026-8801',
    projectName: 'Torre Residencial Las Majadas',
    projectId: 'proj-1',
    date: '2026-10-24',
    capatazName: 'José Manuel Morales (Capataz General)',
    climaYCondiciones:
      'Soleado por la mañana (24°C). Lluvia moderada de 14:15 a 15:30 (afectó 1.25 hrs de fundición).',
    resumenEjecutivo:
      'Se completó la fundición de zapatas Z-3 y Z-4 en sector Norte. Llegó el pedido de hierro estructural de 1/2 pulgada. Inspección estructural aprobó traslape de armaduría.',
    personalEnCampo: {
      cuadrillas: 'Cuadrilla de Fundición (6), Armadores de Hierro (4), Bodeguero (1)',
      totalOperarios: 11,
      detalles: '11 operarios reportados sin novedades de salud ni accidentes.',
    },
    trabajosEjecutados: [
      {
        item: 'Fundición de Concreto',
        descripcion: 'Colado de concreto premezclado 3000 PSI en zapatas Z-3 y Z-4',
        cantidadUnidad: '18.5 m³',
        renglonApu: 'Estructura Subterránea - Renglon 03',
      },
      {
        item: 'Armado de Columnas',
        descripcion: 'Habilitado de estribos y varillas grado 60 para columnas C-1',
        cantidadUnidad: '12 columnas',
        renglonApu: 'Hierro de Refuerzo - Renglon 04',
      },
    ],
    materialesRecibidos: [
      {
        material: 'Hierro Legítimo Grado 60 (1/2")',
        cantidad: '35 Quintales',
        proveedor: 'Distribuidora De Acero El Sol S.A.',
      },
      {
        material: 'Concreto Premezclado 3000 PSI',
        cantidad: '18.5 m³',
        proveedor: 'Mixcoac ready mix',
      },
    ],
    incidentesYObservaciones:
      'Sin accidentes reportados. Se cubrieron los sacos de cemento durante el aguacero de la tarde.',
    cumplimientoNormativoAgies:
      'Conforme a norma AGIES NSE-2 (Cimentaciones) y COGUANOR NGO 41007.',
    planificacionManana:
      'Desencofrar zapatas Z-3 y comenzar excavación de zanja de cimentación para muro perimetral.',
    createdAt: '2026-10-24T10:30:00.000Z',
    capatazSignatureUrl:
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD01MCI+PHBhdGggZD0iTSAxMCAyNSBRIDMwIDEwIDUwIDI1IFQgOTAgMjUiIHN0cm9rZT0iIzAzNmI5OCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PC9zdmc+',
  },
];

export function SmartBitacoraManager({
  projects = [],
  activeProjectId,
  company,
}: SmartBitacoraManagerProps) {
  const [bitacoras, setBitacoras] = useState<SmartBitacoraEntry[]>(INITIAL_BITACORAS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    activeProjectId || projects[0]?.id || ''
  );
  const [capatazName, setCapatazName] = useState<string>('Capataz Jorge Contreras');
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Voice recording & transcription state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceNotes, setVoiceNotes] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedBitacora, setSelectedBitacora] = useState<SmartBitacoraEntry | null>(
    INITIAL_BITACORAS[0]
  );
  const [showSignModal, setShowSignModal] = useState<boolean>(false);

  // Speech Recognition ref
  const recognitionRef = useRef<any>(null);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Initialize Web Speech API if supported in browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'es-GT';

        rec.onresult = (event: SpeechRecognitionEvent) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript) {
            setVoiceNotes((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
          }
        };

        rec.onerror = (e: SpeechRecognitionErrorEvent) => {
          console.warn('Speech recognition notice:', e.error);
          setIsRecording(false);
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  const handleToggleRecord = () => {
    if (!recognitionRef.current) {
      alert(
        'El reconocimiento de voz por micrófono no está disponible en este navegador. Puede escribir manualmente la nota de voz en la casilla.'
      );
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        setErrorMessage(null);
      } catch (err) {
        console.warn('Recording start error:', err);
        setIsRecording(false);
      }
    }
  };

  const handleGenerateBitacora = async () => {
    if (!voiceNotes.trim()) {
      setErrorMessage(
        'Por favor hable o escriba la nota de voz del capataz antes de generar la bitácora.'
      );
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/gemini/bitacora', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceNotes,
          projectName: activeProject ? activeProject.name : 'Proyecto General',
          capatazName,
          date: reportDate,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al comunicarse con Gemini IA.');
      }

      const newEntry: SmartBitacoraEntry = {
        ...data.bitacora,
        projectId: selectedProjectId,
      };

      setBitacoras((prev) => [newEntry, ...prev]);
      setSelectedBitacora(newEntry);
      setVoiceNotes('');
    } catch (err: unknown) {
      console.error('Error in handleGenerateBitacora:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al generar la Bitácora Inteligente. Intente nuevamente.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySignature = (result: SignatureResult) => {
    if (selectedBitacora) {
      const updated = {
        ...selectedBitacora,
        capatazSignatureUrl: result.dataUrl,
      };
      setSelectedBitacora(updated);
      setBitacoras((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setShowSignModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 p-6 shadow-2xl md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <span className="rounded-2xl border border-indigo-500/30 bg-indigo-500/20 p-3.5 text-indigo-400">
            <Sparkles className="h-7 w-7" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-white">
                Smart Bitácora de Obra (Gemini IA)
              </h2>
              <Badge variant="primary" size="sm">
                Voz a Texto AGIES
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Generación automatizada de libros de bitácora oficial basada en dictados de capataces
              de campo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Voice Note Creator */}
        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
              <Mic className="h-4 w-4 text-amber-400" />
              Dictado de Capataz & Dictado por Voz
            </h3>
            <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
              Gemini 3.8 Flash
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="mb-1 block font-bold text-slate-300">
                Nombre del Capataz / Informante
              </label>
              <input
                type="text"
                value={capatazName}
                onChange={(e) => setCapatazName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 font-medium text-white focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej. Capataz Jorge Contreras"
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-300">Fecha del Reporte</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 font-medium text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Mic Dictation Trigger Card */}
            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Mic className="h-4 w-4" /> Grabación de Audio
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isRecording
                      ? 'animate-pulse border border-rose-500/40 bg-rose-500/20 text-rose-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isRecording ? '● Grabando nota...' : 'Listo para grabar'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant={isRecording ? 'danger' : 'primary'}
                  size="md"
                  onClick={handleToggleRecord}
                  className="flex flex-1 items-center justify-center gap-2"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="h-4 w-4 animate-bounce" /> Detener Micrófono
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 text-slate-950" /> Grabar Dictado Capataz
                    </>
                  )}
                </Button>
                {voiceNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVoiceNotes('')}
                    className="p-2 text-slate-400 hover:text-white"
                    title="Limpiar nota"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <p className="text-[11px] leading-relaxed text-slate-400 italic">
                Ejemplo: &quot;Hoy vino la cuadrilla de fundición, colamos 18 metros cúbicos de
                concreto en zapatas Z-3 y Z-4, llovió a las 2pm por una hora, recibimos 35 quintales
                de hierro de 1/2 pulgada de Distribuidora El Sol, sin accidentes.&quot;
              </p>
            </div>

            {/* Textarea for transcript / manual input */}
            <div>
              <label className="mb-1 block font-bold text-slate-300">
                Transcripción / Nota de Voz Desestructurada
              </label>
              <textarea
                rows={5}
                value={voiceNotes}
                onChange={(e) => setVoiceNotes(e.target.value)}
                placeholder="Presione el botón de micrófono para hablar o escriba directamente la nota de campo del capataz aquí..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 leading-relaxed font-medium text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-800 bg-rose-950/60 p-3 text-xs text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              disabled={isGenerating || !voiceNotes.trim()}
              onClick={handleGenerateBitacora}
              className="flex w-full items-center justify-center gap-2 font-bold shadow-lg shadow-amber-500/10"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                  <span>Procesando con Gemini IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-slate-950" />
                  <span>Generar Bitácora Inteligente Oficial</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Bitácora Preview & History */}
        <div className="space-y-4 lg:col-span-7">
          {/* History List Selector */}
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2">
            {bitacoras.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBitacora(b)}
                className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold transition ${
                  selectedBitacora?.id === b.id
                    ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-md'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{b.folioNumber}</span>
                <span className="font-mono text-[10px] text-slate-500">({b.date})</span>
              </button>
            ))}
          </div>

          {selectedBitacora ? (
            <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl">
              {/* Bitácora Document Header */}
              <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-amber-400 uppercase">
                      {selectedBitacora.folioNumber}
                    </span>
                    <span className="rounded-md border border-emerald-700 bg-emerald-900/60 px-2 py-0.5 text-xs font-extrabold text-emerald-300">
                      IA Verificada
                    </span>
                  </div>
                  <h3 className="mt-1 text-lg font-black text-white">
                    {selectedBitacora.projectName}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Informante: <strong>{selectedBitacora.capatazName}</strong> • Fecha:{' '}
                    {selectedBitacora.date}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSignModal(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-300"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>Firma Digital Capataz</span>
                  </Button>
                </div>
              </div>

              {/* Clima & Resumen */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1 rounded-2xl border border-slate-700/60 bg-slate-800/50 p-4">
                  <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-amber-400 uppercase">
                    <CloudRain className="h-3.5 w-3.5" /> Clima y Condiciones de Obra
                  </span>
                  <p className="text-xs leading-relaxed font-medium text-slate-200">
                    {selectedBitacora.climaYCondiciones}
                  </p>
                </div>

                <div className="space-y-1 rounded-2xl border border-slate-700/60 bg-slate-800/50 p-4">
                  <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-sky-400 uppercase">
                    <User className="h-3.5 w-3.5" /> Personal en Campo
                  </span>
                  <p className="text-xs leading-relaxed font-medium text-slate-200">
                    {selectedBitacora.personalEnCampo.detalles} (Total:{' '}
                    {selectedBitacora.personalEnCampo.totalOperarios} operarios)
                  </p>
                </div>
              </div>

              {/* Resumen Ejecutivo */}
              <div className="space-y-1 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase">
                  Resumen Ejecutivo de la Jornada
                </span>
                <p className="text-xs leading-relaxed font-medium text-slate-200">
                  {selectedBitacora.resumenEjecutivo}
                </p>
              </div>

              {/* Trabajos Ejecutados */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-1.5 font-mono text-xs font-extrabold tracking-wider text-slate-400 uppercase">
                  <Layers className="h-4 w-4 text-indigo-400" /> Trabajos y Unidades Ejecutadas
                </h4>

                <div className="space-y-2">
                  {selectedBitacora.trabajosEjecutados.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-800/60 p-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="font-bold text-white">{t.item}</strong>
                          {t.renglonApu && (
                            <span className="rounded border border-amber-800 bg-amber-950/60 px-2 py-0.5 font-mono text-[10px] text-amber-400">
                              {t.renglonApu}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400">{t.descripcion}</p>
                      </div>

                      <span className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs font-extrabold text-emerald-400">
                        {t.cantidadUnidad}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Materiales Ingresados */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-1.5 font-mono text-xs font-extrabold tracking-wider text-slate-400 uppercase">
                  <Building2 className="h-4 w-4 text-amber-400" /> Materiales e Insumos Ingresados
                </h4>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {selectedBitacora.materialesRecibidos.map((m, idx) => (
                    <div
                      key={idx}
                      className="space-y-0.5 rounded-xl border border-slate-700/60 bg-slate-800/60 p-3 font-mono text-xs"
                    >
                      <span className="block font-bold text-slate-200">{m.material}</span>
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-amber-400">{m.cantidad}</span>
                        <span className="text-slate-400">{m.proveedor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cumplimiento AGIES & Planificación */}
              <div className="grid grid-cols-1 gap-4 font-mono text-xs md:grid-cols-2">
                <div className="space-y-1 rounded-2xl border border-emerald-800/80 bg-emerald-950/30 p-3.5 text-emerald-200">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase">
                    <ShieldCheck className="h-3.5 w-3.5" /> AGIES & Normativa Guatemala
                  </span>
                  <p className="font-sans text-[11px] leading-relaxed text-slate-300">
                    {selectedBitacora.cumplimientoNormativoAgies}
                  </p>
                </div>

                <div className="space-y-1 rounded-2xl border border-sky-800/80 bg-sky-950/30 p-3.5 text-sky-200">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-sky-400 uppercase">
                    <Calendar className="h-3.5 w-3.5" /> Planificación de Mañana
                  </span>
                  <p className="font-sans text-[11px] leading-relaxed text-slate-300">
                    {selectedBitacora.planificacionManana}
                  </p>
                </div>
              </div>

              {/* Signature Section */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                <div>
                  <span className="block font-mono text-[10px] text-slate-400 uppercase">
                    Firma Capataz Responsable
                  </span>
                  {selectedBitacora.capatazSignatureUrl ? (
                    <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 p-2">
                      <Image
                        src={selectedBitacora.capatazSignatureUrl}
                        alt="Firma Capataz"
                        width={240}
                        height={64}
                        unoptimized
                        className="h-8 max-w-[120px] object-contain invert"
                      />
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <Check className="h-3 w-3" /> Firmado
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-400 italic">
                      Pendiente de firma sobre lienzo
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimir Folio</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 rounded-3xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">
              <FileText className="mx-auto h-8 w-8 text-slate-600" />
              <p className="text-sm font-bold text-white">No hay bitácoras seleccionadas</p>
            </div>
          )}
        </div>
      </div>

      {/* Signature Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-white">Firma Digital del Capataz en Campo</h3>
            <p className="text-xs text-slate-400">
              Dibuje su firma digital sobre el lienzo para validar el folio{' '}
              {selectedBitacora?.folioNumber}.
            </p>
            <CanvasSignature onSaveSignature={handleApplySignature} />
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowSignModal(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

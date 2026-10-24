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
import { Project, CompanySettings } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CanvasSignature } from '@/components/CanvasSignature';

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
    climaYCondiciones: 'Soleado por la mañana (24°C). Lluvia moderada de 14:15 a 15:30 (afectó 1.25 hrs de fundición).',
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
    cumplimientoNormativoAgies: 'Conforme a norma AGIES NSE-2 (Cimentaciones) y COGUANOR NGO 41007.',
    planificacionManana:
      'Desencofrar zapatas Z-3 y comenzar excavación de zanja de cimentación para muro perimetral.',
    createdAt: '2026-10-24T10:30:00.000Z',
    capatazSignatureUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD01MCI+PHBhdGggZD0iTSAxMCAyNSBRIDMwIDEwIDUwIDI1IFQgOTAgMjUiIHN0cm9rZT0iIzAzNmI5OCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PC9zdmc+',
  },
];

export const SmartBitacoraManager: React.FC<SmartBitacoraManagerProps> = ({
  projects = [],
  activeProjectId,
  company,
}) => {
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

        rec.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript) {
            setVoiceNotes((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
          }
        };

        rec.onerror = (e: any) => {
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
      setErrorMessage('Por favor hable o escriba la nota de voz del capataz antes de generar la bitácora.');
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
    } catch (err: any) {
      console.error('Error in handleGenerateBitacora:', err);
      setErrorMessage(
        err.message || 'Ocurrió un error al generar la Bitácora Inteligente. Intente nuevamente.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySignature = (sigUrl: string) => {
    if (selectedBitacora) {
      const updated = {
        ...selectedBitacora,
        capatazSignatureUrl: sigUrl,
      };
      setSelectedBitacora(updated);
      setBitacoras((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setShowSignModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 p-6 rounded-3xl border border-indigo-500/20 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="p-3.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-7 h-7" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">Smart Bitácora de Obra (Gemini IA)</h2>
              <Badge variant="primary" size="sm">
                Voz a Texto AGIES
              </Badge>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Generación automatizada de libros de bitácora oficial basada en dictados de capataces de campo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Voice Note Creator */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-amber-400" />
              Dictado de Capataz & Dictado por Voz
            </h3>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
              Gemini 3.8 Flash
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Nombre del Capataz / Informante</label>
              <input
                type="text"
                value={capatazName}
                onChange={(e) => setCapatazName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej. Capataz Jorge Contreras"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Fecha del Reporte</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Mic Dictation Trigger Card */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                  <Mic className="w-4 h-4" /> Grabación de Audio
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isRecording
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
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
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4 animate-bounce" /> Detener Micrófono
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-slate-950" /> Grabar Dictado Capataz
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
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <p className="text-[11px] text-slate-400 italic leading-relaxed">
                Ejemplo: &quot;Hoy vino la cuadrilla de fundición, colamos 18 metros cúbicos de concreto en zapatas Z-3 y Z-4, llovió a las 2pm por una hora, recibimos 35 quintales de hierro de 1/2 pulgada de Distribuidora El Sol, sin accidentes.&quot;
              </p>
            </div>

            {/* Textarea for transcript / manual input */}
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Transcripción / Nota de Voz Desestructurada
              </label>
              <textarea
                rows={5}
                value={voiceNotes}
                onChange={(e) => setVoiceNotes(e.target.value)}
                placeholder="Presione el botón de micrófono para hablar o escriba directamente la nota de campo del capataz aquí..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white font-medium focus:ring-2 focus:ring-indigo-500 leading-relaxed placeholder:text-slate-500"
              />
            </div>

            {errorMessage && (
              <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              disabled={isGenerating || !voiceNotes.trim()}
              onClick={handleGenerateBitacora}
              className="w-full flex items-center justify-center gap-2 font-bold shadow-lg shadow-amber-500/10"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Procesando con Gemini IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Generar Bitácora Inteligente Oficial</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Bitácora Preview & History */}
        <div className="lg:col-span-7 space-y-4">
          {/* History List Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {bitacoras.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBitacora(b)}
                className={`px-3 py-2 rounded-2xl border text-xs font-bold shrink-0 transition flex items-center gap-2 ${
                  selectedBitacora?.id === b.id
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{b.folioNumber}</span>
                <span className="text-[10px] text-slate-500 font-mono">({b.date})</span>
              </button>
            ))}
          </div>

          {selectedBitacora ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
              {/* Bitácora Document Header */}
              <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-amber-400 font-extrabold uppercase">
                      {selectedBitacora.folioNumber}
                    </span>
                    <span className="text-xs bg-emerald-900/60 border border-emerald-700 text-emerald-300 px-2 py-0.5 rounded-md font-extrabold">
                      IA Verificada
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1">{selectedBitacora.projectName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Informante: <strong>{selectedBitacora.capatazName}</strong> • Fecha: {selectedBitacora.date}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSignModal(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-300"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Firma Digital Capataz</span>
                  </Button>
                </div>
              </div>

              {/* Clima & Resumen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-amber-400 flex items-center gap-1">
                    <CloudRain className="w-3.5 h-3.5" /> Clima y Condiciones de Obra
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {selectedBitacora.climaYCondiciones}
                  </p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-sky-400 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Personal en Campo
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {selectedBitacora.personalEnCampo.detalles} (Total: {selectedBitacora.personalEnCampo.totalOperarios} operarios)
                  </p>
                </div>
              </div>

              {/* Resumen Ejecutivo */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-emerald-400">
                  Resumen Ejecutivo de la Jornada
                </span>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {selectedBitacora.resumenEjecutivo}
                </p>
              </div>

              {/* Trabajos Ejecutados */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-400" /> Trabajos y Unidades Ejecutadas
                </h4>

                <div className="space-y-2">
                  {selectedBitacora.trabajosEjecutados.map((t, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-white font-bold">{t.item}</strong>
                          {t.renglonApu && (
                            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
                              {t.renglonApu}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">{t.descripcion}</p>
                      </div>

                      <span className="font-mono font-extrabold text-emerald-400 text-xs bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg shrink-0">
                        {t.cantidadUnidad}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Materiales Ingresados */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-400" /> Materiales e Insumos Ingresados
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedBitacora.materialesRecibidos.map((m, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-xs space-y-0.5 font-mono"
                    >
                      <span className="text-slate-200 font-bold block">{m.material}</span>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-amber-400 font-bold">{m.cantidad}</span>
                        <span className="text-slate-400">{m.proveedor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cumplimiento AGIES & Planificación */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-emerald-950/30 border border-emerald-800/80 p-3.5 rounded-2xl text-emerald-200 space-y-1">
                  <span className="font-bold uppercase text-[10px] text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> AGIES & Normativa Guatemala
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    {selectedBitacora.cumplimientoNormativoAgies}
                  </p>
                </div>

                <div className="bg-sky-950/30 border border-sky-800/80 p-3.5 rounded-2xl text-sky-200 space-y-1">
                  <span className="font-bold uppercase text-[10px] text-sky-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Planificación de Mañana
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    {selectedBitacora.planificacionManana}
                  </p>
                </div>
              </div>

              {/* Signature Section */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Firma Capataz Responsable</span>
                  {selectedBitacora.capatazSignatureUrl ? (
                    <div className="mt-1 flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                      <img
                        src={selectedBitacora.capatazSignatureUrl}
                        alt="Firma Capataz"
                        className="h-8 max-w-[120px] object-contain invert"
                      />
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Firmado
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-400 italic">Pendiente de firma sobre lienzo</span>
                  )}
                </div>

                <Button variant="outline" size="sm" onClick={() => window.print()} className="flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Folio</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-white">No hay bitácoras seleccionadas</p>
            </div>
          )}
        </div>
      </div>

      {/* Signature Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Firma Digital del Capataz en Campo</h3>
            <p className="text-xs text-slate-400">
              Dibuje su firma digital sobre el lienzo para validar el folio {selectedBitacora?.folioNumber}.
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
};

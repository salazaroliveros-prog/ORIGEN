'use client';

import { auth, saveFieldVisitToFirestore } from '@/lib/firebaseService';
import { FieldVisit } from '@/lib/types';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileCheck,
  Loader2,
  MapPin,
  PenTool,
  RotateCcw,
  ShieldCheck,
  Undo2,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface SignatureCanvasResult {
  dataUrl: string;
  signerName: string;
  signerDpi: string;
  signerRole: string;
  timestamp: string;
  location?: { lat: number; lng: number };
}

export interface SignatureCanvasProps {
  /** Optional existing field visit to be signed and updated */
  visit?: FieldVisit;
  /** Optional ID of field visit if visit object isn't provided directly */
  visitId?: string;
  /** Project ID context */
  projectId?: string;
  /** Company workspace that owns the visit */
  companyId?: string;
  /** Modal open/closed flag if rendered as modal */
  isOpen?: boolean;
  /** Callback fired when user closes or cancels */
  onClose?: () => void;
  onCancel?: () => void;
  /** Callback fired when signature is completed and saved */
  onSave?: (
    dataUrl: string,
    metadata: SignatureCanvasResult,
    updatedVisit?: FieldVisit
  ) => void | Promise<void>;
  /** Default metadata values */
  defaultSignerName?: string;
  defaultSignerDpi?: string;
  defaultSignerRole?: string;
  /** Display as inline component instead of full modal dialog */
  inline?: boolean;
  /** Whether to attempt direct Firestore save (default: true) */
  autoSaveToFirestore?: boolean;
  /** Custom title & subtitle */
  title?: string;
  subtitle?: string;
  className?: string;
}

interface Point {
  x: number;
  y: number;
  time: number;
}

export function SignatureCanvas({
  visit,
  visitId,
  projectId,
  companyId,
  isOpen = true,
  onClose,
  onCancel,
  onSave,
  defaultSignerName,
  defaultSignerDpi,
  defaultSignerRole,
  inline = false,
  autoSaveToFirestore = true,
  title = 'Firma Digital de Visita de Campo',
  subtitle = 'Autorización formal del capataz para bitácoras y avances diarios de obra',
  className = '',
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);
  const [penColor, setPenColor] = useState<string>('#1e3a8a'); // Legal Notary Blue by default
  const [penWidth, setPenWidth] = useState<number>(2.5);

  // Signer metadata state
  const [signerName, setSignerName] = useState<string>(
    visit?.foremanName || defaultSignerName || 'Don Mario Cifuentes'
  );
  const [signerDpi, setSignerDpi] = useState<string>(
    visit?.signerDpi || defaultSignerDpi || '2489 10293 0101'
  );
  const [signerRole, setSignerRole] = useState<string>(
    visit?.signerRole || defaultSignerRole || 'Capataz General de Obra'
  );

  // GPS and status state
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | undefined>(
    visit?.gpsCoords || undefined
  );
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'success' | 'fallback'>('loading');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleClose = () => {
    if (onClose) onClose();
    else if (onCancel) onCancel();
  };

  // Draw signature baseline guideline
  const drawBaseline = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    const lineY = height * 0.78;
    ctx.beginPath();
    ctx.moveTo(30, lineY);
    ctx.lineTo(width - 30, lineY);
    ctx.stroke();

    // Baseline marker label
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('✕ FIRMA DEL CAPATAZ O INGENIERO RESIDENTE (SOBRE LA LÍNEA)', 32, lineY - 8);
    ctx.restore();
  };

  // Canvas initialization with high-DPI scaling
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const displayWidth = rect.width || 480;
    const displayHeight = rect.height || 200;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    // Initial crisp white fill
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    drawBaseline(ctx, displayWidth, displayHeight);

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    setHasDrawn(false);
    setStrokeHistory([]);
    setValidationError(null);
  }, [penColor, penWidth]);

  // Handle resizing with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      initCanvas();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [initCanvas]);

  // Capture Geolocation for digital field certification
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
          setGpsStatus('success');
        },
        () => {
          // Fallback to Guatemala City coordinates
          setGpsCoords({ lat: 14.6349, lng: -90.5069 });
          setGpsStatus('fallback');
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 }
      );
    } else {
      setGpsCoords({ lat: 14.6349, lng: -90.5069 });
      setGpsStatus('fallback');
    }
  }, []);

  // Coordinate helper
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Pointer drawing handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Save state for undo
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory((prev) => [...prev.slice(-15), currentState]);

    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setValidationError(null);

    const { x, y } = getCanvasCoords(e);
    setPoints([{ x, y, time: Date.now() }]);

    ctx.beginPath();
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    const newPoints = [...points, { x, y, time: Date.now() }];
    setPoints(newPoints);

    if (newPoints.length >= 3) {
      const p1 = newPoints[newPoints.length - 2];
      const p2 = newPoints[newPoints.length - 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      ctx.beginPath();
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      ctx.stroke();
    }

    if (!hasDrawn) setHasDrawn(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // benign
    }
    setIsDrawing(false);
    setPoints([]);
  };

  // Undo last stroke
  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokeHistory.length === 0) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const previousState = strokeHistory[strokeHistory.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setStrokeHistory((prev) => prev.slice(0, -1));

    if (strokeHistory.length <= 1) {
      setHasDrawn(false);
    }
  };

  // Clear canvas
  const handleClear = () => {
    initCanvas();
  };

  // Save Signature & persist to Firestore
  const handleSave = async () => {
    if (!hasDrawn) {
      setValidationError('Debe plasmar su firma en el lienzo antes de guardar el reporte.');
      return;
    }
    if (!signerName.trim()) {
      setValidationError('Por favor ingrese el nombre del capataz o responsable.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    setValidationError(null);

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const timestamp = new Date().toLocaleString('es-GT', {
        timeZone: 'America/Guatemala',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const metadata: SignatureCanvasResult = {
        dataUrl,
        signerName: signerName.trim(),
        signerDpi: signerDpi.trim(),
        signerRole: signerRole.trim(),
        timestamp,
        location: gpsCoords,
      };

      // If we have a visit or visitId, prepare the updated visit object
      const targetVisitId = visit?.id || visitId;
      let updatedVisit: FieldVisit | undefined;

      if (visit) {
        updatedVisit = {
          ...visit,
          companyId: companyId ?? visit.companyId,
          signatureDataUrl: dataUrl,
          foremanName: metadata.signerName,
          signerDpi: metadata.signerDpi,
          signerRole: metadata.signerRole,
          gpsCoords: metadata.location || visit.gpsCoords,
          status: 'Autorizado',
        };
      } else if (targetVisitId) {
        updatedVisit = {
          id: targetVisitId,
          companyId,
          projectId: projectId || 'p1',
          projectName: 'Visita de Campo',
          date: new Date().toISOString().split('T')[0],
          foremanName: metadata.signerName,
          signerDpi: metadata.signerDpi,
          signerRole: metadata.signerRole,
          notes: 'Autorizado en obra con firma digital',
          weather: 'Soleado',
          workersCount: 15,
          signatureDataUrl: dataUrl,
          gpsCoords: metadata.location,
          status: 'Autorizado',
        };
      }

      // Persist directly to Firestore if autoSaveToFirestore is enabled and we have an authorized user or visit
      if (autoSaveToFirestore && updatedVisit) {
        const userId = auth.currentUser?.uid;
        const workspaceId = companyId ?? updatedVisit.companyId;
        if (!userId || !workspaceId) {
          setValidationError(
            'Inicia sesión y selecciona un espacio de empresa para guardar la firma.'
          );
          setIsSaving(false);
          return;
        }
        const saved = await saveFieldVisitToFirestore(updatedVisit, workspaceId, userId);
        if (!saved) {
          setValidationError(
            'No se pudo guardar la firma en la empresa. Revisa tu conexión e inténtalo de nuevo.'
          );
          setIsSaving(false);
          return;
        }
      }

      // Invoke parent onSave callback
      if (onSave) {
        await onSave(dataUrl, metadata, updatedVisit);
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        setIsSuccess(false);
        handleClose();
      }, 900);
    } catch (err) {
      console.error('Error saving signature:', err);
      setValidationError('Ocurrió un error al procesar y guardar la firma digital.');
      setIsSaving(false);
    }
  };

  if (!inline && !isOpen) return null;

  const content = (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 bg-slate-800/80 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/20 text-sky-400">
            <PenTool className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-white">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>

        {!inline && (
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer rounded-xl p-2 text-slate-400 transition hover:bg-slate-700/60 hover:text-white"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 p-5">
        {/* Signer Info Form */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-300 uppercase">
              Nombre del Capataz / Firmante
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Ej: Don Mario Cifuentes"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-white focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-300 uppercase">
              DPI (13 Dígitos - Guatemala)
            </label>
            <input
              type="text"
              value={signerDpi}
              onChange={(e) => setSignerDpi(e.target.value)}
              placeholder="Ej: 2489 10293 0101"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-300 uppercase">
              Cargo / Rol en Obra
            </label>
            <select
              value={signerRole}
              onChange={(e) => setSignerRole(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
            >
              <option value="Capataz General de Obra">Capataz General de Obra</option>
              <option value="Maestro de Obra">Maestro de Obra</option>
              <option value="Ingeniero Residente">Ingeniero Residente</option>
              <option value="Supervisor de Calidad">Supervisor de Calidad</option>
              <option value="Encargado de Bodega">Encargado de Bodega</option>
            </select>
          </div>
        </div>

        {/* Canvas Tools Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Color & Size selectors */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400">Tinta:</span>
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setPenColor('#1e3a8a')}
                className={`h-6 w-6 rounded-lg border-2 bg-blue-900 transition ${
                  penColor === '#1e3a8a'
                    ? 'scale-110 border-sky-400 shadow-sm'
                    : 'border-transparent opacity-60'
                }`}
                title="Azul Notarial / Jurídico"
              />
              <button
                type="button"
                onClick={() => setPenColor('#0f172a')}
                className={`h-6 w-6 rounded-lg border-2 bg-slate-950 transition ${
                  penColor === '#0f172a'
                    ? 'scale-110 border-sky-400 shadow-sm'
                    : 'border-slate-700 opacity-60'
                }`}
                title="Negro Carbón Legal"
              />
            </div>

            <span className="ml-2 text-xs font-medium text-slate-400">Grosor:</span>
            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
              {[1.8, 2.5, 4.0].map((w, idx) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setPenWidth(w)}
                  className={`rounded-lg px-2 py-1 font-mono text-[11px] transition ${
                    penWidth === w
                      ? 'border border-sky-400/40 bg-sky-500/20 font-bold text-sky-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {idx === 0 ? 'Fino' : idx === 1 ? 'Medio' : 'Grueso'}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons: Undo & Clear */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={strokeHistory.length === 0}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Undo2 className="h-3.5 w-3.5" /> Deshacer
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Limpiar
            </button>
          </div>
        </div>

        {/* The Interactive Canvas Area */}
        <div
          ref={containerRef}
          className="relative h-48 w-full cursor-crosshair touch-none overflow-hidden rounded-xl border-2 border-dashed border-slate-600 bg-white shadow-inner select-none sm:h-56"
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="block h-full w-full"
            style={{ touchAction: 'none' }}
          />

          {!hasDrawn && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400 opacity-60">
              <PenTool className="h-8 w-8 text-slate-400" />
              <p className="text-xs font-medium">Firme aquí con el dedo o puntero táctil</p>
            </div>
          )}
        </div>

        {/* Validation error display */}
        {validationError && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Forensic & Legal Footnote */}
        <div className="flex flex-col justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] text-slate-400 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>Certificación digital de campo • Art. 89 Código de Trabajo de Guatemala</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400">
            {gpsCoords && (
              <span className="flex items-center gap-1 text-sky-400">
                <MapPin className="h-3 w-3" /> {gpsCoords.lat.toFixed(4)},{' '}
                {gpsCoords.lng.toFixed(4)}
              </span>
            )}
            <span className="flex items-center gap-1 text-slate-400">
              <Calendar className="h-3 w-3" /> {new Date().toLocaleDateString('es-GT')}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-700/60 bg-slate-800/80 px-5 py-3">
        {!inline && (
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="cursor-pointer rounded-xl bg-slate-700/60 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            Cancelar
          </button>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasDrawn}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold tracking-wider uppercase shadow-lg transition ${
            isSuccess
              ? 'bg-emerald-500 text-white'
              : 'bg-sky-400 text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Guardando en Firestore...</span>
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>¡Firmado y Sincronizado!</span>
            </>
          ) : (
            <>
              <FileCheck className="h-4 w-4" />
              <span>Firmar y Guardar en Firestore</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md duration-200">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto">{content}</div>
    </div>
  );
}
export default SignatureCanvas;

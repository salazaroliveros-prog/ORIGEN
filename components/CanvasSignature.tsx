'use client';

import { SignatureResult } from '@/components/SignaturePad';
import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  PenTool,
  RotateCcw,
  Undo2,
  UserCheck,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface CanvasSignatureProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSaveSignature: (result: SignatureResult) => void;
  defaultSignerName?: string;
  defaultSignerDpi?: string;
  defaultSignerRole?: string;
  inline?: boolean;
  title?: string;
  subtitle?: string;
}

export function CanvasSignature({
  isOpen = true,
  onClose,
  onSaveSignature,
  defaultSignerName = 'Don Mario Cifuentes',
  defaultSignerDpi = '2489 10293 0101',
  defaultSignerRole = 'Capataz General de Obra',
  inline = false,
  title = 'Firma Digital del Capataz en Lienzo Táctil',
  subtitle = 'Autorización legal sobre pantalla para reportes de campo y bitácoras diarias de obra.',
}: CanvasSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);
  const [penColor, setPenColor] = useState<string>('#0f172a');
  const [penWidth, setPenWidth] = useState<number>(2.5);

  // Metadata
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerDpi, setSignerDpi] = useState(defaultSignerDpi);
  const [signerRole, setSignerRole] = useState(defaultSignerRole);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'success' | 'fallback'>('loading');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize canvas with high-DPI scaling
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Get display dimensions
    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    // Set internal resolution
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Scale context to match DPR
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;

    // Draw clean background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw baseline guide for signing
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(24, rect.height - 35);
    ctx.lineTo(rect.width - 24, rect.height - 35);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Text guide "X  Firma del Capataz"
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('✕ Firma autorizada del Capataz sobre lienzo táctil', 24, rect.height - 16);

    // Reset stroke history
    setStrokeHistory([]);
    setHasDrawn(false);
  }, [penColor, penWidth]);

  // Handle resizing / opening
  useEffect(() => {
    if (!isOpen && !inline) return;

    const timer = setTimeout(() => {
      initCanvas();
    }, 120);

    // Acquire GPS location
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setGpsStatus('success');
        },
        () => {
          // Fallback location for Guatemala City
          setGpsCoords({ lat: 14.6133, lng: -90.4875 });
          setGpsStatus('fallback');
        },
        { timeout: 6000, enableHighAccuracy: true }
      );
    } else {
      setGpsCoords({ lat: 14.6133, lng: -90.4875 });
      setGpsStatus('fallback');
    }

    return () => clearTimeout(timer);
  }, [isOpen, inline, initCanvas]);

  // Coordinate conversion helper
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  // Drawing handlers
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (e.cancelable && e.type.startsWith('touch')) {
      e.preventDefault();
    }
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Save state for undo
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory((prev) => [...prev.slice(-10), currentFrame]);

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasDrawn(true);
    setValidationError(null);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (e.cancelable && e.type.startsWith('touch')) {
      e.preventDefault();
    }
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    if (e.cancelable && e.type.startsWith('touch')) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.closePath();
    setIsDrawing(false);
  };

  // Undo last stroke
  const handleUndo = () => {
    if (strokeHistory.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const previousState = strokeHistory[strokeHistory.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setStrokeHistory((prev) => prev.slice(0, prev.length - 1));
    if (strokeHistory.length <= 1) {
      setHasDrawn(false);
    }
  };

  // Save Signature
  const handleSave = () => {
    if (!hasDrawn) {
      setValidationError('Por favor dibuje su firma sobre el lienzo antes de autorizar.');
      return;
    }
    if (!signerName.trim()) {
      setValidationError('Indique el nombre completo del capataz que autoriza.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const timestamp = new Date().toLocaleString('es-GT', {
      timeZone: 'America/Guatemala',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const result: SignatureResult = {
      dataUrl,
      signerName: signerName.trim(),
      signerDpi: signerDpi.trim() || 'No especificado',
      signerRole: signerRole.trim() || 'Capataz de Obra',
      timestamp,
      location: gpsCoords,
    };

    onSaveSignature(result);
    if (onClose) onClose();
  };

  const content = (
    <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900 p-4 text-white sm:p-5">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-blue-500/30 bg-blue-600/30 p-2 text-blue-400">
            <PenTool className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white sm:text-base">{title}</h3>
            <p className="text-[11px] text-slate-400">{subtitle}</p>
          </div>
        </div>
        {!inline && onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {/* Signer Identification inputs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-bold tracking-wider text-slate-700 uppercase">
              Nombre del Capataz / Firmante
            </label>
            <div className="relative">
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Don Mario Cifuentes"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-1.5 pr-3 pl-8 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
                required
              />
              <UserCheck className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold tracking-wider text-slate-700 uppercase">
              DPI / Identificación (Guatemala)
            </label>
            <input
              type="text"
              value={signerDpi}
              onChange={(e) => setSignerDpi(e.target.value)}
              placeholder="2489 10293 0101"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 font-mono text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">{signerRole}</span>
          <div className="flex items-center gap-1 font-mono text-[11px] text-sky-700">
            <MapPin className="h-3 w-3 text-sky-600" />
            {gpsCoords
              ? `${gpsCoords.lat.toFixed(4)}°N, ${gpsCoords.lng.toFixed(4)}°W`
              : 'Obteniendo GPS...'}
          </div>
        </div>

        {/* Canvas Signature Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800">Lienzo Táctil (HTML5 Canvas)</span>
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                Touch Ready
              </span>
            </div>
            {/* Color & Undo Controls */}
            <div className="flex items-center gap-1">
              <div className="mr-1 flex items-center rounded-lg bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setPenColor('#0f172a')}
                  className={`h-5 w-5 rounded-md transition ${penColor === '#0f172a' ? 'scale-110 ring-2 ring-blue-500' : ''}`}
                  style={{ backgroundColor: '#0f172a' }}
                  title="Tinta Grafito Ejecutivo"
                />
                <button
                  type="button"
                  onClick={() => setPenColor('#1e3a8a')}
                  className={`ml-1 h-5 w-5 rounded-md transition ${penColor === '#1e3a8a' ? 'scale-110 ring-2 ring-blue-500' : ''}`}
                  style={{ backgroundColor: '#1e3a8a' }}
                  title="Tinta Azul Contrato"
                />
              </div>
              <button
                type="button"
                onClick={handleUndo}
                disabled={strokeHistory.length === 0}
                className="cursor-pointer rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"
                title="Deshacer trazo"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={initCanvas}
                className="cursor-pointer rounded-lg p-1.5 text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
                title="Limpiar lienzo completo"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={containerRef}
            className="relative h-48 w-full cursor-crosshair touch-none overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-inner select-none"
          >
            <canvas
              ref={canvasRef}
              className="block h-full w-full touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              onTouchCancel={stopDrawing}
            />
          </div>
          <p className="text-center text-[10px] text-slate-400">
            Firme con el dedo o lápiz óptico dentro del recuadro blanco. La firma se estampa con
            sello de tiempo y GPS.
          </p>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
          {!inline && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            Guardar y Autorizar Firma
          </button>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs duration-150">
      {content}
    </div>
  );
}

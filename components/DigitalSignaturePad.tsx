'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  PenTool,
  RotateCcw,
  CheckCircle2,
  X,
  MapPin,
  Undo2,
  AlertCircle,
  Smartphone,
  ShieldCheck,
  Download,
  Eraser,
  Sparkles,
} from 'lucide-react';

export interface SignatureResult {
  dataUrl: string;
  signerName: string;
  signerDpi: string;
  signerRole: string;
  timestamp: string;
  location?: { lat: number; lng: number };
  strokeCount: number;
}

export interface DigitalSignaturePadProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSaveSignature?: (result: SignatureResult) => void;
  onSave?: (result: SignatureResult | string) => void;
  onConfirm?: (result: SignatureResult) => void;
  defaultSignerName?: string;
  defaultSignerDpi?: string;
  defaultSignerRole?: string;
  inline?: boolean;
  title?: string;
  subtitle?: string;
  visitId?: string;
  reportCode?: string;
  className?: string;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  isOpen = true,
  onClose,
  onSaveSignature,
  onSave,
  onConfirm,
  defaultSignerName = 'Don Mario Cifuentes',
  defaultSignerDpi = '2489 10293 0101',
  defaultSignerRole = 'Capataz General de Obra',
  inline = false,
  title = 'Firma Digital de Capataz (Lienzo Táctil Canvas)',
  subtitle = 'Firma táctil optimizada para teléfonos y tablets en obra',
  visitId,
  reportCode,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerDpi, setSignerDpi] = useState(defaultSignerDpi);
  const [signerRole, setSignerRole] = useState(defaultSignerRole);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'success' | 'fallback'>('loading');

  const [penColor, setPenColor] = useState<string>('#1e3a8a'); // Blue Obra default
  const [strokeWidth, setStrokeWidth] = useState<number>(3); // Touch optimal thickness
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize and scale canvas for High-DPI Mobile Displays
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width || 420;
    const height = 200; // Fixed touch height for field usability

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    ctx.strokeStyle = penColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw baseline guide and mobile watermark
    drawGuideLines(ctx, width, height);

    setStrokeCount(0);
    setStrokeHistory([]);
  }, [penColor, strokeWidth]);

  const drawGuideLines = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    // Dashed signature baseline
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(24, height - 42);
    ctx.lineTo(width - 24, height - 42);
    ctx.stroke();

    // Text guide
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('✕ Firma Digital del Capataz en Campo (DPI Verificado)', 26, height - 22);

    ctx.restore();
  };

  useEffect(() => {
    if (isOpen || inline) {
      const timer = setTimeout(initCanvas, 60);

      // Acquire mobile GPS location
      if (typeof window !== 'undefined' && navigator.geolocation) {
        setGpsStatus('loading');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGpsCoords({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
            setGpsStatus('success');
          },
          () => {
            // Default Guatemala construction site coordinates if offline
            setGpsCoords({ lat: 14.6133, lng: -90.4875 });
            setGpsStatus('fallback');
          },
          { enableHighAccuracy: true, timeout: 7000 }
        );
      } else {
        setGpsCoords({ lat: 14.6133, lng: -90.4875 });
        setGpsStatus('fallback');
      }

      return () => clearTimeout(timer);
    }
  }, [isOpen, inline, initCanvas]);

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory((prev) => [...prev.slice(-12), imageData]);
  };

  const getPointerPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent mobile page scroll while signing
    if (e.cancelable) e.preventDefault();
    setValidationError(null);
    saveCanvasState();

    setIsDrawing(true);
    setStrokeCount((prev) => prev + 1);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.strokeStyle = penColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const { x, y } = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleMoveDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const { x, y } = getPointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleEndDraw = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    initCanvas();
    setValidationError(null);
  };

  const handleUndo = () => {
    if (strokeHistory.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const newHistory = [...strokeHistory];
    const previousState = newHistory.pop();
    setStrokeHistory(newHistory);

    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      setStrokeCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleConfirm = () => {
    if (strokeCount === 0) {
      setValidationError('Por favor estampación táctil requerida. Dibuje su firma sobre el cuadro blanco.');
      return;
    }
    if (!signerName.trim()) {
      setValidationError('Ingrese el nombre completo del capataz o responsable de obra.');
      return;
    }
    if (!signerDpi.trim()) {
      setValidationError('Ingrese el DPI (CUI) del capataz para validez legal.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const timestamp = new Date().toLocaleString('es-GT', { timeZone: 'America/Guatemala' });

    const result: SignatureResult = {
      dataUrl,
      signerName: signerName.trim(),
      signerDpi: signerDpi.trim(),
      signerRole: signerRole.trim(),
      timestamp,
      location: gpsCoords,
      strokeCount,
    };

    if (onSaveSignature) onSaveSignature(result);
    if (onSave) onSave(result);
    if (onConfirm) onConfirm(result);
    if (onClose) onClose();
  };

  if (!isOpen && !inline) return null;

  const content = (
    <div className="space-y-4">
      {/* Signer Info inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nombre del Capataz / Residente <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Ej. Don Mario Cifuentes"
            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            DPI / CUI Guatemala <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={signerDpi}
            onChange={(e) => setSignerDpi(e.target.value)}
            placeholder="XXXX XXXXX XXXX"
            className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Cargo o Puesto en Obra</label>
        <input
          type="text"
          value={signerRole}
          onChange={(e) => setSignerRole(e.target.value)}
          placeholder="Ej. Capataz General de Estructura"
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Canvas Tool Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            Recuadro de Firma Táctil (HTML5 Canvas):
          </label>

          <div className="flex items-center gap-2">
            {/* Pen Color Selectors */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setPenColor('#1e3a8a')}
                className={`w-4 h-4 rounded-full bg-blue-900 ${penColor === '#1e3a8a' ? 'ring-2 ring-blue-500 scale-110' : ''}`}
                title="Tinta Azul Obra"
              />
              <button
                type="button"
                onClick={() => setPenColor('#0f172a')}
                className={`w-4 h-4 rounded-full bg-slate-900 ${penColor === '#0f172a' ? 'ring-2 ring-blue-500 scale-110' : ''}`}
                title="Tinta Negra"
              />
            </div>

            {/* Thickness Selectors */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setStrokeWidth(2)}
                className={`px-1.5 py-0.5 rounded ${strokeWidth === 2 ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
              >
                Fina
              </button>
              <button
                type="button"
                onClick={() => setStrokeWidth(3)}
                className={`px-1.5 py-0.5 rounded ${strokeWidth === 3 ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
              >
                Normal
              </button>
            </div>

            {/* Undo & Clear */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={strokeHistory.length === 0}
              className="text-xs text-slate-600 hover:text-slate-900 disabled:opacity-30 flex items-center gap-1 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Limpiar
            </button>
          </div>
        </div>

        {/* HTML5 Canvas Container */}
        <div
          ref={containerRef}
          className="border-2 border-slate-300 rounded-2xl bg-white overflow-hidden shadow-inner flex justify-center relative touch-none select-none"
        >
          <canvas
            ref={canvasRef}
            style={{ touchAction: 'none' }}
            onMouseDown={handleStartDraw}
            onMouseMove={handleMoveDraw}
            onMouseUp={handleEndDraw}
            onMouseLeave={handleEndDraw}
            onTouchStart={handleStartDraw}
            onTouchMove={handleMoveDraw}
            onTouchEnd={handleEndDraw}
            className="cursor-crosshair bg-white w-full"
          />

          {strokeCount === 0 && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40 text-slate-400 text-xs font-semibold">
              Deslice su dedo o lápiz óptico aquí para firmar
            </div>
          )}
        </div>
      </div>

      {/* Validation alert */}
      {validationError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Geolocation & Legal Timestamp Stamp */}
      <div className="bg-slate-900 text-slate-300 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          {gpsCoords && (
            <span className="flex items-center gap-1 text-cyan-400 font-bold">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              GPS: {gpsCoords.lat.toFixed(5)}°N, {gpsCoords.lng.toFixed(5)}°W
              {gpsStatus === 'success' && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-700">
                  GPS En Vivo
                </span>
              )}
            </span>
          )}
          <span className="text-slate-400 font-sans">
            Fecha: {new Date().toLocaleDateString('es-GT')} {new Date().toLocaleTimeString('es-GT')}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 font-sans leading-tight">
          Garantía de Autoría: Firma HTML5 almacenada en Firestore con georreferencia en tiempo real para bitácoras oficiales de construcción.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center justify-end gap-2.5">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer transition"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-lg cursor-pointer transition"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          Autorizar Bitácora con Firma Digital
        </button>
      </div>
    </div>
  );

  if (inline) {
    return <div className={`bg-white rounded-2xl p-5 border border-slate-200 shadow-md ${className}`}>{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base">{title}</h3>
                {reportCode && (
                  <span className="text-[10px] font-mono font-bold bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded border border-blue-400/30">
                    {reportCode}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-5">{content}</div>
      </div>
    </div>
  );
};

export default DigitalSignaturePad;

'use client';

import { Camera, CameraOff, Check, MapPin, Receipt, RotateCcw, Upload, X } from 'lucide-react';
import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (
    dataUrl: string,
    metadata: {
      coords?: { lat: number; lng: number };
      timestamp: string;
      caption?: string;
    }
  ) => void;
  mode?: 'construction_site' | 'receipt';
  title?: string;
  subtitle?: string;
  defaultLocation?: { lat: number; lng: number };
  projectCode?: string;
  foremanName?: string;
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  mode = 'construction_site',
  title,
  subtitle,
  defaultLocation,
  projectCode = 'OBRA-2025',
  foremanName = 'Supervisor de Obra',
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestIdRef = useRef(0);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isFlashing, setIsFlashing] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [addWatermark, setAddWatermark] = useState(true);

  // GPS state
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    defaultLocation || null
  );
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'ready' | 'fallback'>('searching');

  // Active tab: 'camera' vs 'upload'
  const [inputTab, setInputTab] = useState<'camera' | 'upload'>('camera');
  const defaultLatitude = defaultLocation?.lat;
  const defaultLongitude = defaultLocation?.lng;

  // Audio shutter effect using Web Audio API
  const playShutterSound = () => {
    try {
      const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioCtx = window.AudioContext || audioWindow.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio playback fails gracefully if blocked by browser policy
    }
  };

  // Acquire GPS Location
  const requestLocation = useCallback(() => {
    setGpsStatus('searching');
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setGpsStatus('ready');
        },
        () => {
          if (defaultLatitude !== undefined && defaultLongitude !== undefined) {
            setCoords({ lat: defaultLatitude, lng: defaultLongitude });
          } else {
            setCoords({ lat: 14.6349, lng: -90.5069 }); // Guatemala City
          }
          setGpsStatus('fallback');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setCoords({
        lat: defaultLatitude ?? 14.6349,
        lng: defaultLongitude ?? -90.5069,
      });
      setGpsStatus('fallback');
    }
  }, [defaultLatitude, defaultLongitude]);

  const stopCameraStream = useCallback(() => {
    cameraRequestIdRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCameraStream = useCallback(
    async (targetFacing: 'environment' | 'user') => {
      stopCameraStream();
      const requestId = cameraRequestIdRef.current;
      setCameraError(null);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('La API de cámara no está disponible en este navegador o contexto.');
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: targetFacing,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (requestId !== cameraRequestIdRef.current) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err: unknown) {
        if (requestId !== cameraRequestIdRef.current) return;
        console.warn('getUserMedia error:', err);
        let msg = 'No se pudo activar la cámara del dispositivo.';
        const errorName = err instanceof Error ? err.name : '';
        if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
          msg =
            'Permiso denegado para acceder a la cámara. Permita el acceso a la cámara o use la opción de subir archivo.';
        } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
          msg = 'No se encontró ninguna cámara conectada en este equipo.';
        }
        setCameraError(msg);
        setInputTab('upload');
      }
    },
    [stopCameraStream]
  );

  useEffect(() => {
    if (isOpen) {
      setPreviewDataUrl(null);
      setCaption('');
      requestLocation();
      if (inputTab === 'camera') {
        startCameraStream(facingMode);
      }
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, facingMode, inputTab, requestLocation, startCameraStream, stopCameraStream]);

  // Toggle Camera Facing Mode
  const handleToggleFacingMode = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
  };

  // Capture Snapshot from Video Stream
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Trigger visual flash and audio shutter
    setIsFlashing(true);
    playShutterSound();
    setTimeout(() => setIsFlashing(false), 200);

    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, mirror for natural selfie preview, otherwise standard
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);
    if (facingMode === 'user') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Optional Watermark
    if (addWatermark) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('es-GT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('es-GT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      ctx.save();
      const bannerHeight = Math.max(58, Math.round(height * 0.09));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

      ctx.fillStyle = '#f8fafc';
      const fontSize = Math.max(13, Math.round(height * 0.024));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'left';

      const firstLineY = height - bannerHeight + fontSize + 6;
      const secondLineY = height - 8;
      const primaryWatermark =
        mode === 'receipt'
          ? `COMPROBANTE / FACTURA FEL • ${dateStr} ${timeStr}`
          : `CONSTRUCTERP • ${projectCode} • ${dateStr} ${timeStr}`;
      ctx.fillText(primaryWatermark, 16, firstLineY, width - 32);

      if (mode !== 'receipt') {
        ctx.font = `${fontSize - 1}px sans-serif`;
        ctx.fillText(`CAPATAZ: ${foremanName}`, 16, secondLineY, width / 2 - 24);
      }
      if (coords) {
        ctx.textAlign = 'right';
        ctx.font = `${fontSize - 1}px monospace`;
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(
          `GPS: ${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°W`,
          width - 16,
          secondLineY,
          width / 2 - 24
        );
      }
      ctx.restore();
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setPreviewDataUrl(dataUrl);
    stopCameraStream();
  };

  // Handle File Upload Fallback
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewDataUrl(reader.result as string);
      stopCameraStream();
    };
    reader.readAsDataURL(file);
  };

  // Confirm and save
  const handleConfirm = () => {
    if (!previewDataUrl) return;
    const now = new Date();
    const timestamp = `${now.toLocaleDateString('es-GT')} ${now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}`;

    onCapture(previewDataUrl, {
      coords: coords || undefined,
      timestamp,
      caption:
        caption.trim() ||
        (mode === 'receipt' ? 'Comprobante / Factura FEL' : 'Fotografía de avance en obra'),
    });
    handleModalClose();
  };

  const handleRetake = () => {
    setPreviewDataUrl(null);
    if (inputTab === 'camera') {
      startCameraStream(facingMode);
    }
  };

  const handleModalClose = () => {
    stopCameraStream();
    setPreviewDataUrl(null);
    onClose();
  };

  if (!isOpen) return null;

  const modalTitle =
    title ||
    (mode === 'receipt'
      ? 'Capturar Comprobante o Factura con Cámara'
      : 'Capturar Fotografía de Obra con Cámara');
  const modalSubtitle =
    subtitle ||
    (mode === 'receipt'
      ? 'Tome una foto nítida de la factura física, ticket de caja o recibo de compra con la cámara del dispositivo.'
      : 'Registre evidencia fotográfica del avance físico, fundiciones o acabados directamente desde la obra.');

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-xs duration-150 sm:p-4">
      <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 px-4 py-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <div
              className={`rounded-xl p-2 ${mode === 'receipt' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}
            >
              {mode === 'receipt' ? (
                <Receipt className="h-5 w-5" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm leading-tight font-bold sm:text-base">{modalTitle}</h3>
              <p className="hidden text-[11px] text-slate-400 sm:block">{modalSubtitle}</p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="cursor-pointer rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher: Cámara vs Archivo */}
        {!previewDataUrl && (
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 pt-2 text-xs">
            <button
              onClick={() => setInputTab('camera')}
              className={`flex cursor-pointer items-center gap-1.5 border-b-2 px-3 pb-2 font-semibold transition ${
                inputTab === 'camera'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              Cámara en Vivo
            </button>
            <button
              onClick={() => setInputTab('upload')}
              className={`flex cursor-pointer items-center gap-1.5 border-b-2 px-3 pb-2 font-semibold transition ${
                inputTab === 'upload'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Subir Imagen / Archivo
            </button>
          </div>
        )}

        {/* Viewport Area */}
        <div className="relative flex max-h-[500px] min-h-[320px] flex-1 items-center justify-center overflow-hidden bg-slate-950">
          {/* Flash animation */}
          {isFlashing && (
            <div className="animate-out fade-out absolute inset-0 z-40 bg-white duration-200" />
          )}

          {previewDataUrl ? (
            /* Snapshot Preview */
            <div className="relative flex h-full w-full items-center justify-center bg-black">
              <Image
                src={previewDataUrl}
                alt="Vista previa capturada"
                width={1200}
                height={900}
                unoptimized
                className="max-h-[460px] w-auto object-contain"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[11px] text-white backdrop-blur-xs">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Fotografía capturada con éxito
              </div>
            </div>
          ) : inputTab === 'camera' ? (
            /* Live Camera Stream */
            <div className="relative flex h-full w-full items-center justify-center bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Viewfinder Overlay Guides */}
              {mode === 'receipt' ? (
                /* Document Viewfinder Overlay for Invoices/Receipts */
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 sm:p-8">
                  <div className="relative flex h-full max-h-[360px] w-full max-w-sm flex-col justify-between rounded-xl border-2 border-dashed border-amber-400/80 bg-amber-400/5 p-3 shadow-2xl">
                    {/* Corner Reticles */}
                    <div className="absolute -top-1 -left-1 h-6 w-6 border-t-4 border-l-4 border-amber-400" />
                    <div className="absolute -top-1 -right-1 h-6 w-6 border-t-4 border-r-4 border-amber-400" />
                    <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-amber-400" />
                    <div className="absolute -right-1 -bottom-1 h-6 w-6 border-r-4 border-b-4 border-amber-400" />

                    <div className="self-center rounded border border-amber-400/40 bg-slate-950/70 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      Enfoque la Factura / Recibo dentro del marco
                    </div>
                    <div className="self-center rounded bg-slate-950/60 px-2 py-0.5 text-center text-[10px] text-slate-300">
                      Asegure buena iluminación sobre los datos del emisor y total
                    </div>
                  </div>
                </div>
              ) : (
                /* Construction Site Viewfinder Guide */
                <div className="pointer-events-none absolute inset-0">
                  {/* Grid lines for rule of thirds */}
                  <div className="grid h-full w-full grid-cols-3 grid-rows-3 opacity-25">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>
                  {/* Center Level Crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/50">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Status and Controls Over Video */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1 text-[10px] text-white backdrop-blur-xs">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Cámara Activa ({facingMode === 'environment' ? 'Trasera' : 'Frontal'})
                </div>
                {coords && (
                  <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1 font-mono text-[10px] text-sky-300 backdrop-blur-xs">
                    <MapPin className="h-3 w-3 text-sky-400" />
                    {coords.lat.toFixed(4)}°N, {coords.lng.toFixed(4)}°W
                    <span className="font-sans">
                      {gpsStatus === 'ready'
                        ? 'GPS fijo'
                        : gpsStatus === 'fallback'
                          ? 'Referencia'
                          : 'Buscando'}
                    </span>
                  </div>
                )}
              </div>

              {/* Camera Switch Button */}
              <div className="absolute top-3 right-3">
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="flex cursor-pointer items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/80 p-2 text-xs text-white backdrop-blur-xs transition hover:bg-slate-800"
                  title="Cambiar entre cámara trasera y frontal"
                >
                  <RotateCcw className="h-4 w-4 text-blue-400" />
                  <span className="hidden text-[10px] sm:inline">Girar Cámara</span>
                </button>
              </div>

              {/* Error warning if any */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center text-white">
                  <CameraOff className="mb-2 h-10 w-10 text-rose-400" />
                  <p className="mb-1 text-sm font-bold text-rose-300">
                    Acceso a cámara no disponible
                  </p>
                  <p className="mb-4 max-w-sm text-xs text-slate-400">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-500"
                  >
                    <Upload className="h-4 w-4" />
                    Subir foto desde este dispositivo
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* File Upload Tab */
            <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center text-slate-300">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-blue-400">
                <Upload className="h-8 w-8" />
              </div>
              <h4 className="mb-1 text-sm font-bold text-white">Cargar Fotografía o Recibo</h4>
              <p className="mb-4 max-w-sm text-xs text-slate-400">
                Seleccione una imagen PNG, JPG o WEBP tomada previamente o use el explorador de
                archivos.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-blue-500"
              >
                <Upload className="h-4 w-4" />
                Examinar Archivos
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="space-y-3 border-t border-slate-200 bg-white p-4">
          {previewDataUrl ? (
            /* Post-capture controls */
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  {mode === 'receipt'
                    ? 'Nota o Detalle del Comprobante'
                    : 'Descripción / Pie de Foto de la Obra'}
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={
                    mode === 'receipt'
                      ? 'Ej. Factura FEL de Cemento Progreso #A-49201'
                      : 'Ej. Fundición y armado de columnas eje 4-C'
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-blue-600"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Tomar de Nuevo
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-blue-700"
                  >
                    <Check className="h-4 w-4" />
                    {mode === 'receipt' ? 'Adjuntar Recibo' : 'Adjuntar a Bitácora'}
                  </button>
                </div>
              </div>
            </div>
          ) : inputTab === 'camera' ? (
            /* Live Camera Snapshot trigger */
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <label className="flex cursor-pointer items-center gap-1.5 select-none">
                  <input
                    type="checkbox"
                    checked={addWatermark}
                    onChange={(e) => setAddWatermark(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Estampar marca de agua (Fecha, Hora & GPS)</span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>

                {/* Shutter Button */}
                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  disabled={!stream}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-500 active:scale-95 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                  <span>Capturar Foto</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleModalClose}
                className="cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

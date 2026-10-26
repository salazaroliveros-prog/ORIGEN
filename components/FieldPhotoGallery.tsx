'use client';

import { FieldPhoto, FieldVisit, Project } from '@/lib/types';
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle2,
  Download,
  Eye,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import Image from 'next/image';
import React, { useRef, useState } from 'react';

interface FieldPhotoGalleryProps {
  project: Project;
  fieldVisits: FieldVisit[];
  onAddPhoto: (visitId: string, photo: FieldPhoto) => void;
  onDeletePhoto?: (visitId: string, photoId: string) => void;
}

export function FieldPhotoGallery({
  project,
  fieldVisits,
  onAddPhoto,
  onDeletePhoto,
}: FieldPhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<FieldPhoto | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string>(
    fieldVisits.find((v) => v.projectId === project.id)?.id || fieldVisits[0]?.id || ''
  );

  // Camera capture state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [takenByName, setTakenByName] = useState('Don Mario Cifuentes');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'ready' | 'fallback'>('acquiring');

  // Filter state
  const [selectedFilterVisit, setSelectedFilterVisit] = useState<string>('all');

  // Gather all photos for this project
  const projectVisits = fieldVisits.filter((v) => v.projectId === project.id);
  const allPhotos: { visit: FieldVisit; photo: FieldPhoto }[] = [];

  projectVisits.forEach((visit) => {
    if (visit.photos && visit.photos.length > 0) {
      visit.photos.forEach((photo) => {
        allPhotos.push({ visit, photo });
      });
    }
  });

  const filteredPhotos =
    selectedFilterVisit === 'all'
      ? allPhotos
      : allPhotos.filter((item) => item.visit.id === selectedFilterVisit);

  // Geolocation lookup
  const fetchLocation = () => {
    setGpsStatus('acquiring');
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
          // Use project coordinates as fallback
          setCoords({ lat: project.lat, lng: project.lng });
          setGpsStatus('fallback');
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    } else {
      setCoords({ lat: project.lat, lng: project.lng });
      setGpsStatus('fallback');
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    setCapturedDataUrl(null);
    fetchLocation();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: unknown) {
      console.warn('Camera stream error:', err);
      setCameraError(
        'No se pudo acceder a la cámara web. Puede subir una foto desde sus archivos.'
      );
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  const handleOpenModal = () => {
    setIsCameraModalOpen(true);
    setCaption('');
    setCapturedDataUrl(null);
    startCamera();
  };

  const handleCloseModal = () => {
    stopCamera();
    setIsCameraModalOpen(false);
    setCapturedDataUrl(null);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Optional: draw watermark with GPS & Date
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(
      `ConstructERP • ${project.code} • ${new Date().toLocaleDateString('es-GT')} ${new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}`,
      15,
      canvas.height - 22
    );
    if (coords) {
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(
        `GPS: ${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°W`,
        canvas.width - 15,
        canvas.height - 22
      );
    }
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedDataUrl(dataUrl);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    fetchLocation();
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedDataUrl(reader.result as string);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = () => {
    if (!capturedDataUrl) return;
    const targetVisitId = selectedVisitId || projectVisits[0]?.id;
    if (!targetVisitId) return;

    const newPhoto: FieldPhoto = {
      id: `pht-${Date.now()}`,
      url: capturedDataUrl,
      caption: caption.trim() || 'Fotografía de avance de obra en campo',
      date: new Date().toISOString().split('T')[0],
      timestamp: `${new Date().toLocaleDateString('es-GT')} ${new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}`,
      coords: coords || { lat: project.lat, lng: project.lng },
      takenBy: takenByName.trim() || 'Capataz de Obra',
    };

    onAddPhoto(targetVisitId, newPhoto);
    handleCloseModal();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Camera className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Galería Fotográfica de Campo con GPS
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Registro visual geolocalizado de avances, colados de losas, inspecciones y maquinaria en{' '}
            {project.name}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {projectVisits.length > 0 && (
            <select
              value={selectedFilterVisit}
              onChange={(e) => setSelectedFilterVisit(e.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
            >
              <option value="all">Todas las Bitácoras ({allPhotos.length} fotos)</option>
              {projectVisits.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.date} - {v.foremanName}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Camera className="h-4 w-4" /> Tomar / Subir Foto
          </button>
        </div>
      </div>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Camera className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">No hay fotografías registradas aún</h4>
          <p className="mx-auto max-w-sm text-xs text-slate-500">
            Utilice la cámara de su dispositivo móvil o computadora para capturar evidencias con
            coordenadas GPS de obra.
          </p>
          <button
            type="button"
            onClick={handleOpenModal}
            className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Capturar Primera Fotografía
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPhotos.map(({ visit, photo }) => (
            <div
              key={photo.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:shadow-md"
            >
              {/* Image Container with GPS Badge */}
              <div
                className="relative aspect-4/3 cursor-pointer overflow-hidden bg-slate-900"
                onClick={() => setSelectedPhoto(photo)}
              >
                <Image
                  src={photo.url}
                  alt={photo.caption}
                  width={1200}
                  height={900}
                  unoptimized
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-90" />

                {/* Coordinate Badge */}
                {photo.coords && (
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-md bg-slate-950/80 px-2 py-1 font-mono text-[10px] text-white backdrop-blur-xs">
                    <MapPin className="h-3 w-3 text-rose-400" />
                    <span>
                      {photo.coords.lat.toFixed(4)}°, {photo.coords.lng.toFixed(4)}°
                    </span>
                  </div>
                )}

                {/* Date stamp */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-md bg-slate-950/80 px-2 py-1 text-[10px] text-slate-200 backdrop-blur-xs">
                  <Calendar className="h-3 w-3 text-blue-400" />
                  <span>{photo.date}</span>
                </div>

                {/* Caption overlay */}
                <div className="absolute right-2.5 bottom-2.5 left-2.5 text-white">
                  <p className="line-clamp-2 text-xs font-semibold">{photo.caption}</p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 bg-white p-3.5 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate font-medium text-slate-700">
                    {photo.takenBy || visit.foremanName}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setSelectedPhoto(photo)}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
                    title="Ver Fotografía Completa"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  {onDeletePhoto && (
                    <button
                      onClick={() => onDeletePhoto(visit.id, photo.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      title="Eliminar Foto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CAMERA & UPLOAD MODAL */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="my-6 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold">Cámara de Campo con Geolocalización</h3>
              </div>
              <button onClick={handleCloseModal} className="p-1 text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* Video Preview or Captured Image */}
              <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                {capturedDataUrl ? (
                  <Image
                    src={capturedDataUrl}
                    alt="Captura"
                    width={1200}
                    height={900}
                    unoptimized
                    className="h-full w-full object-contain"
                  />
                ) : cameraError ? (
                  <div className="space-y-3 p-6 text-center text-slate-300">
                    <AlertCircle className="mx-auto h-8 w-8 text-amber-400" />
                    <p className="text-xs">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      <Upload className="h-4 w-4" /> Seleccionar Archivo / Foto
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                    {/* Viewfinder crosshairs */}
                    <div className="pointer-events-none absolute inset-0 m-6 flex items-center justify-center rounded-lg border-2 border-white/20">
                      <div className="absolute top-0 left-0 h-8 w-8 border-t-2 border-l-2 border-amber-400" />
                      <div className="absolute top-0 right-0 h-8 w-8 border-t-2 border-r-2 border-amber-400" />
                      <div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-amber-400" />
                      <div className="absolute right-0 bottom-0 h-8 w-8 border-r-2 border-b-2 border-amber-400" />
                    </div>
                  </>
                )}

                {/* GPS Stamp in preview */}
                {coords && (
                  <div className="absolute bottom-2 left-2 rounded bg-slate-900/80 px-2 py-1 font-mono text-[10px] text-white backdrop-blur-xs">
                    📍 GPS: {coords.lat.toFixed(5)}°N, {coords.lng.toFixed(5)}°W
                  </div>
                )}
              </div>

              {/* Camera Action Buttons */}
              <div className="flex items-center justify-between gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {!capturedDataUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Upload className="h-3.5 w-3.5" /> Subir desde Galería
                    </button>

                    <button
                      type="button"
                      onClick={handleCaptureSnapshot}
                      disabled={!!cameraError}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400 disabled:opacity-40"
                    >
                      <Camera className="h-4 w-4" /> Disparar Foto
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedDataUrl(null);
                      startCamera();
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Tomar Otra Foto
                  </button>
                )}
              </div>

              {/* Metadata Form Inputs */}
              <div className="space-y-3 border-t border-slate-100 pt-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Vincular a Bitácora / Reporte de Obra
                  </label>
                  <select
                    value={selectedVisitId}
                    onChange={(e) => setSelectedVisitId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    {projectVisits.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.date} — {v.foremanName} ({v.weather})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Descripción / Pie de Foto
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Ej. Armado de acero en columna C-14, nivel 4"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Tomada por (Capataz / Residente)
                  </label>
                  <input
                    type="text"
                    value={takenByName}
                    onChange={(e) => setTakenByName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSavePhoto}
                  disabled={!capturedDataUrl}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" /> Guardar en Galería
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL PHOTO LIGHTBOX MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
          <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-4 text-white">
              <div>
                <h4 className="text-sm font-bold text-slate-100">{selectedPhoto.caption}</h4>
                <p className="text-xs text-slate-400">
                  {selectedPhoto.date} • {selectedPhoto.takenBy}
                </p>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative flex max-h-[65vh] items-center justify-center bg-black">
              <Image
                src={selectedPhoto.url}
                alt={selectedPhoto.caption}
                width={1200}
                height={900}
                unoptimized
                className="max-h-[65vh] w-auto object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900 p-4 text-xs">
              {selectedPhoto.coords && (
                <div className="flex items-center gap-2 font-mono text-slate-300">
                  <MapPin className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>
                    Coordenadas: {selectedPhoto.coords.lat.toFixed(5)}°N,{' '}
                    {selectedPhoto.coords.lng.toFixed(5)}°W
                  </span>
                </div>
              )}

              <a
                href={selectedPhoto.url}
                download={`foto_obra_${selectedPhoto.id}.jpg`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
              >
                <Download className="h-3.5 w-3.5" /> Descargar Fotografía
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

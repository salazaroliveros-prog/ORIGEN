'use client';

import { CameraCaptureModal } from '@/components/CameraCaptureModal';
import { FieldPhotoGallery } from '@/components/FieldPhotoGallery';
import { GoogleMapsSafetyView } from '@/components/GoogleMapsSafetyView';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { SignatureResult } from '@/components/SignaturePad';
import { formatGTQ, formatUSD } from '@/lib/data';
import { captureExactFieldGps, ExactGpsCapture } from '@/lib/geofencing';
import {
  AttendanceRecord,
  CompanySettings,
  ExpenseRecord,
  FieldPhoto,
  FieldVisit,
  Machinery,
  MachineryLog,
  Project,
} from '@/lib/types';
import Image from 'next/image';
import {
  Camera,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  LocateFixed,
  MapPin,
  PenTool,
  Plus,
  Printer,
  Radio,
  ShieldCheck,
  X,
} from 'lucide-react';
import React, { useState } from 'react';

interface ProjectsAndVisitsProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: (project: Project) => void;
  fieldVisits: FieldVisit[];
  onAddFieldVisit: (visit: FieldVisit) => void;
  onUpdateFieldVisit?: (visit: FieldVisit) => void;
  currency: 'GTQ' | 'USD';
  company: CompanySettings;
  expenses: ExpenseRecord[];
  machineryLogs: MachineryLog[];
  machinery: Machinery[];
  attendance: AttendanceRecord[];
}

export function ProjectsAndVisits({
  projects,
  activeProjectId,
  onSelectProject,
  onAddProject,
  fieldVisits,
  onAddFieldVisit,
  onUpdateFieldVisit,
  currency,
  company,
  expenses,
  machineryLogs,
  machinery,
  attendance,
}: ProjectsAndVisitsProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    'bitacoras' | 'galeria' | 'mapa_clima' | 'proyectos'
  >('bitacoras');

  // Modal new project
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('OBRA-2025-04');
  const [newName, setNewName] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newMunicipality, setNewMunicipality] = useState('Guatemala');
  const [newBudget, setNewBudget] = useState('5000000');

  // Modal new field visit / bitácora with Digital Signature & Photos
  const [isNewVisitModalOpen, setIsNewVisitModalOpen] = useState(false);
  const [visitNotes, setVisitNotes] = useState('');
  const [visitForeman, setVisitForeman] = useState('Don Mario Cifuentes');
  const [visitWeather, setVisitWeather] = useState<
    'Soleado' | 'Lluvia Moderada' | 'Tormenta Fuerte' | 'Nublado'
  >('Soleado');
  const [visitWorkersCount, setVisitWorkersCount] = useState('35');
  const [visitAttachedPhotos, setVisitAttachedPhotos] = useState<FieldPhoto[]>([]);

  // Real-time GPS Geolocation state for field visit
  const [capturedGps, setCapturedGps] = useState<ExactGpsCapture | null>(null);
  const [isCapturingGps, setIsCapturingGps] = useState(false);

  const handleAcquireExactGps = async (projLat?: number, projLng?: number) => {
    setIsCapturingGps(true);
    try {
      const lat = projLat ?? activeProject.lat;
      const lng = projLng ?? activeProject.lng;
      const res = await captureExactFieldGps(lat, lng, 500);
      setCapturedGps(res);
    } catch (err) {
      console.error('Error capturando GPS:', err);
    } finally {
      setIsCapturingGps(false);
    }
  };

  const handleOpenNewVisitModal = () => {
    setSignedData(null);
    setVisitAttachedPhotos([]);
    setIsNewVisitModalOpen(true);
    handleAcquireExactGps(activeProject.lat, activeProject.lng);
  };

  // Signing state (can sign new visit or an existing pending visit)
  const [isSignaturePadOpen, setIsSignaturePadOpen] = useState(false);
  const [signingVisitId, setSigningVisitId] = useState<string | null>(null); // null means new visit
  const [signedData, setSignedData] = useState<SignatureResult | null>(null);

  // Lightbox preview for photos
  const [lightboxPhoto, setLightboxPhoto] = useState<FieldPhoto | null>(null);

  // Camera Modal for construction site photos
  const [isSiteCameraOpen, setIsSiteCameraOpen] = useState(false);
  const [cameraVisitTargetId, setCameraVisitTargetId] = useState<string | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const formatMoney = (amount: number) => {
    return currency === 'GTQ' ? formatGTQ(amount) : formatUSD(amount, company.exchangeRate);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const proj: Project = {
      id: `p-${Date.now()}`,
      code: newCode,
      name: newName,
      client: newClient || 'Cliente General',
      location: newLocation || 'Guatemala',
      municipality: newMunicipality,
      department: 'Guatemala',
      budgetTotal: Number(newBudget) || 1000000,
      spentTotal: 0,
      progressPercent: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-12-31',
      status: 'Planificación',
      lat: 14.6349,
      lng: -90.5069,
    };

    onAddProject(proj);
    setIsNewProjectModalOpen(false);
    setNewName('');
    setNewClient('');
    setNewLocation('');
  };

  const handleSaveSignature = (signatureResult: SignatureResult) => {
    if (signingVisitId) {
      // Signing an existing visit
      const targetVisit = fieldVisits.find((v) => v.id === signingVisitId);
      if (targetVisit) {
        const updatedVisit: FieldVisit = {
          ...targetVisit,
          signatureDataUrl: signatureResult.dataUrl,
          signerDpi: signatureResult.signerDpi,
          signerRole: signatureResult.signerRole,
          foremanName: signatureResult.signerName,
          gpsCoords: signatureResult.location || targetVisit.gpsCoords,
          status: 'Autorizado',
        };
        if (onUpdateFieldVisit) {
          onUpdateFieldVisit(updatedVisit);
        }
      }
      setSigningVisitId(null);
    } else {
      // Signing a new visit before publish
      setSignedData(signatureResult);
      setVisitForeman(signatureResult.signerName);
    }
  };

  const handlePublishVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitNotes.trim()) return;

    const finalLat = capturedGps ? capturedGps.latitude : activeProject.lat;
    const finalLng = capturedGps ? capturedGps.longitude : activeProject.lng;
    const finalAccuracy = capturedGps ? capturedGps.accuracy : 12.5;
    const finalGeofenceValid = capturedGps ? capturedGps.geofenceValid : true;
    const finalGeofenceDist = capturedGps ? capturedGps.geofenceDistanceMeters : 0;
    const finalGpsTimestamp = capturedGps ? capturedGps.timestamp : new Date().toISOString();

    const newVisit: FieldVisit = {
      id: `fv-${Date.now()}`,
      companyId: activeProject.companyId,
      projectId: activeProject.id,
      projectName: activeProject.name,
      date: new Date().toISOString().split('T')[0],
      foremanName: visitForeman,
      notes: visitNotes,
      weather: visitWeather,
      workersCount: Number(visitWorkersCount) || 30,
      signatureDataUrl: signedData ? signedData.dataUrl : undefined,
      signerDpi: signedData ? signedData.signerDpi : '2489 10293 0101',
      signerRole: signedData ? signedData.signerRole : 'Capataz General de Obra',
      gpsCoords: { lat: finalLat, lng: finalLng },
      latitude: finalLat,
      longitude: finalLng,
      accuracy: finalAccuracy,
      geofenceValid: finalGeofenceValid,
      geofenceDistanceMeters: finalGeofenceDist,
      gpsTimestamp: finalGpsTimestamp,
      status: signedData ? 'Autorizado' : 'Pendiente',
      photos: visitAttachedPhotos,
    };

    onAddFieldVisit(newVisit);
    setIsNewVisitModalOpen(false);
    setVisitNotes('');
    setSignedData(null);
    setVisitAttachedPhotos([]);
    setCapturedGps(null);
  };

  // Add photo to an existing visit
  const handleAddPhotoToVisit = (visitId: string, photo: FieldPhoto) => {
    const targetVisit = fieldVisits.find((v) => v.id === visitId);
    if (!targetVisit) return;

    const updatedPhotos = [...(targetVisit.photos || []), photo];
    const updatedVisit: FieldVisit = {
      ...targetVisit,
      photos: updatedPhotos,
    };

    if (onUpdateFieldVisit) {
      onUpdateFieldVisit(updatedVisit);
    }
  };

  const handleDeletePhotoFromVisit = (visitId: string, photoId: string) => {
    const targetVisit = fieldVisits.find((v) => v.id === visitId);
    if (!targetVisit) return;

    const updatedPhotos = (targetVisit.photos || []).filter((p) => p.id !== photoId);
    const updatedVisit: FieldVisit = {
      ...targetVisit,
      photos: updatedPhotos,
    };

    if (onUpdateFieldVisit) {
      onUpdateFieldVisit(updatedVisit);
    }
  };

  // Quick camera snapshot for new visit
  const handleAttachSnapshotToNewVisit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const photo: FieldPhoto = {
        id: `pht-new-${Date.now()}`,
        url: reader.result as string,
        caption: 'Evidencia fotográfica tomada en campo',
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toLocaleTimeString('es-GT'),
        coords: { lat: activeProject.lat, lng: activeProject.lng },
        takenBy: visitForeman,
      };
      setVisitAttachedPhotos((prev) => [...prev, photo]);
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureSitePhoto = (
    dataUrl: string,
    meta: { coords?: { lat: number; lng: number }; timestamp: string; caption?: string }
  ) => {
    const photo: FieldPhoto = {
      id: `pht-${Date.now()}`,
      url: dataUrl,
      caption: meta.caption || 'Fotografía de avance de obra en campo',
      date: new Date().toISOString().split('T')[0],
      timestamp: meta.timestamp,
      coords: meta.coords || { lat: activeProject.lat, lng: activeProject.lng },
      takenBy: visitForeman || 'Supervisor de Obra',
    };

    if (cameraVisitTargetId) {
      handleAddPhotoToVisit(cameraVisitTargetId, photo);
      setCameraVisitTargetId(null);
    } else {
      setVisitAttachedPhotos((prev) => [...prev, photo]);
    }
  };

  // Count total photos for the active project
  const projectPhotosCount = fieldVisits
    .filter((v) => v.projectId === activeProject.id)
    .reduce((sum, v) => sum + (v.photos?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Sub-header navigation */}
      <div className="glass-panel flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-white">
            Gestión de Proyectos, Bitácoras & Galería GPS
          </h2>
          <p className="text-xs text-slate-400">
            Control satelital de campo, reportes diarios de avance, fotografías con
            georreferenciación y firma en lienzo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.06] p-1">
            <button
              onClick={() => setActiveSubTab('bitacoras')}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeSubTab === 'bitacoras'
                  ? 'bg-sky-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Bitácoras & Firmas
            </button>
            <button
              onClick={() => setActiveSubTab('galeria')}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeSubTab === 'galeria'
                  ? 'bg-sky-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              Galería GPS ({projectPhotosCount})
            </button>
            <button
              onClick={() => setActiveSubTab('mapa_clima')}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeSubTab === 'mapa_clima'
                  ? 'bg-sky-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              Mapa Google & Clima
            </button>
            <button
              onClick={() => setActiveSubTab('proyectos')}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeSubTab === 'proyectos'
                  ? 'bg-sky-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Proyectos ({projects.length})
            </button>
          </div>

          {activeSubTab === 'proyectos' ? (
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-sky-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-sky-300"
            >
              <Plus className="h-4 w-4" /> Nuevo Proyecto
            </button>
          ) : (
            <button
              onClick={handleOpenNewVisitModal}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-amber-300"
            >
              <PenTool className="h-4 w-4" /> Nueva Bitácora con Firma
            </button>
          )}
        </div>
      </div>

      {/* Projects SubView */}
      {activeSubTab === 'proyectos' && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((proj) => {
            const isSelected = proj.id === activeProjectId;
            return (
              <div
                key={proj.id}
                className={`glass-panel flex flex-col justify-between transition ${
                  isSelected ? 'border-sky-400 ring-2 ring-sky-400/30' : 'hover:border-white/20'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="rounded border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300 uppercase">
                      {proj.code}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        proj.status === 'En Ejecución'
                          ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                          : 'border border-amber-400/30 bg-amber-400/10 text-amber-300'
                      }`}
                    >
                      {proj.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">{proj.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-400">Cliente: {proj.client}</p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                    <span className="truncate">{proj.location}</span>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                      <span>Avance Físico</span>
                      <span className="font-bold text-sky-400">{proj.progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500"
                        style={{ width: `${proj.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
                  <div>
                    <p className="text-[10px] text-slate-400">Presupuesto</p>
                    <p className="text-xs font-bold text-white">{formatMoney(proj.budgetTotal)}</p>
                  </div>
                  <button
                    onClick={() => onSelectProject(proj.id)}
                    className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      isSelected
                        ? 'bg-sky-400 text-slate-950 shadow-sm'
                        : 'border border-white/10 bg-white/[0.08] text-white hover:bg-white/[0.14]'
                    }`}
                  >
                    {isSelected ? 'Proyecto Activo' : 'Seleccionar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bitácoras & Digital Signature SubView */}
      {activeSubTab === 'bitacoras' && (
        <div className="space-y-5">
          <div className="glass-panel flex items-start gap-3 border-amber-400/30 bg-amber-400/5 p-4">
            <div className="mt-0.5 shrink-0 rounded-xl bg-amber-400 p-2 text-slate-950">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1 text-xs text-amber-200">
              <p className="text-sm font-bold text-amber-300">
                Firma Digital sobre Lienzo Canvas & Fotos con GPS
              </p>
              <p className="leading-relaxed">
                Cada reporte diario y bitácora de obra cuenta con validación oficial del capataz en
                HTML5 canvas y soporte de evidencias fotográficas capturadas en obra con coordenadas
                geográficas y sello de tiempo inalterable.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {fieldVisits.map((visit) => (
              <div key={visit.id} className="glass-panel space-y-4">
                <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/20 font-bold text-sky-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{visit.projectName}</h4>
                      <p className="text-xs text-slate-400">
                        Fecha: {visit.date} • Clima: {visit.weather}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        visit.status === 'Autorizado'
                          ? 'border border-emerald-400/30 bg-emerald-400/20 text-emerald-300'
                          : 'border border-amber-400/30 bg-amber-400/20 text-amber-300'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> {visit.status}
                    </span>
                    <button
                      onClick={() => window.print()}
                      className="cursor-pointer rounded-xl bg-white/[0.08] p-2 text-slate-300 transition hover:bg-white/[0.14] hover:text-white"
                      title="Imprimir Bitácora"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-3 md:col-span-2">
                    <p className="font-mono text-xs font-semibold tracking-wider text-slate-400 uppercase">
                      Bitácora de Campo & Novedades
                    </p>
                    <p className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5 text-xs leading-relaxed text-slate-200 sm:text-sm">
                      {visit.notes}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                      <span>
                        Obreros en Frentes:{' '}
                        <strong className="text-white">{visit.workersCount}</strong>
                      </span>
                      <span className="flex items-center gap-1 font-mono text-emerald-400">
                        <LocateFixed className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        GPS:{' '}
                        {(visit.latitude ?? visit.gpsCoords?.lat ?? activeProject.lat).toFixed(
                          6
                        )}°,{' '}
                        {(visit.longitude ?? visit.gpsCoords?.lng ?? activeProject.lng).toFixed(6)}°
                        <span className="text-[10px] text-slate-400">
                          (±{visit.accuracy ?? 10}m)
                        </span>
                      </span>
                    </div>

                    {/* Photo Gallery Thumbnail Strip for this Visit */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-semibold">
                          <Camera className="h-3.5 w-3.5 text-blue-600" />
                          Fotografías en Obra ({visit.photos?.length || 0})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCameraVisitTargetId(visit.id);
                              setIsSiteCameraOpen(true);
                            }}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100"
                            title="Tomar fotografía con cámara para esta bitácora"
                          >
                            <Camera className="h-3 w-3 text-blue-600" />+ Tomar Foto con Cámara
                          </button>
                          <button
                            onClick={() => setActiveSubTab('galeria')}
                            className="cursor-pointer text-[11px] font-medium text-blue-600 hover:text-blue-700"
                          >
                            Ver en Galería GPS →
                          </button>
                        </div>
                      </div>

                      {visit.photos && visit.photos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {visit.photos.map((photo) => (
                            <div
                              key={photo.id}
                              onClick={() => setLightboxPhoto(photo)}
                              className="group relative aspect-4/3 cursor-pointer overflow-hidden rounded-lg border border-slate-200 shadow-2xs"
                            >
                              <Image
                                src={photo.url}
                                alt={photo.caption}
                                width={1200}
                                height={900}
                                unoptimized
                                className="h-full w-full object-cover transition group-hover:scale-105"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 text-white opacity-0 transition group-hover:opacity-100">
                                <Eye className="h-4 w-4" />
                              </div>
                              {photo.coords && (
                                <div className="absolute bottom-1 left-1 rounded bg-slate-900/80 px-1 font-mono text-[8px] text-white">
                                  GPS
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          Sin fotos registradas aún. Use el botón &quot;+ Tomar Foto con
                          Cámara&quot; para documentar este frente.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Verification Column: Signature & Exact GPS Card */}
                  <div className="space-y-3">
                    {/* GPS Verification Card */}
                    <div className="space-y-2.5 rounded-xl border border-slate-700 bg-slate-900/90 p-3.5 text-white shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-sky-400 uppercase">
                          <LocateFixed className="h-3.5 w-3.5 text-emerald-400" />
                          GPS Satelital Exacto
                        </p>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            (visit.geofenceValid ?? true)
                              ? 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                              : 'border border-amber-500/30 bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {(visit.geofenceValid ?? true)
                            ? '✓ En Perímetro'
                            : '⚠️ Fuera de Perímetro'}
                        </span>
                      </div>

                      <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-950/60 p-2 font-mono text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-sans text-slate-400">Latitud:</span>
                          <span className="font-bold text-emerald-400">
                            {(visit.latitude ?? visit.gpsCoords?.lat ?? activeProject.lat).toFixed(
                              6
                            )}
                            °
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-sans text-slate-400">Longitud:</span>
                          <span className="font-bold text-emerald-400">
                            {(visit.longitude ?? visit.gpsCoords?.lng ?? activeProject.lng).toFixed(
                              6
                            )}
                            °
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-sans text-slate-400">Precisión:</span>
                          <span className="font-bold text-sky-300">±{visit.accuracy ?? 10} m</span>
                        </div>
                        {visit.geofenceDistanceMeters !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="font-sans text-slate-400">Distancia Obra:</span>
                            <span className="text-slate-200">{visit.geofenceDistanceMeters} m</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <span className="text-slate-400">
                          {visit.gpsTimestamp
                            ? new Date(visit.gpsTimestamp).toLocaleTimeString('es-GT')
                            : 'Sincronizado'}
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${visit.latitude ?? visit.gpsCoords?.lat ?? activeProject.lat},${visit.longitude ?? visit.gpsCoords?.lng ?? activeProject.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-sky-400 hover:text-sky-300 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Ver en Google Maps
                        </a>
                      </div>
                    </div>

                    {/* Signature Verification Card */}
                    <div className="flex flex-col justify-between space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                          Autorizado por Capataz
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-slate-900">
                          {visit.foremanName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {visit.signerRole || 'Capataz General'}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-slate-600">
                          DPI: {visit.signerDpi || '2489 10293 0101'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
                        {visit.signatureDataUrl ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-11 w-28 items-center justify-center rounded-lg border border-slate-300 bg-white p-1 shadow-2xs">
                              <Image
                                src={visit.signatureDataUrl}
                                alt="Firma Digital"
                                width={240}
                                height={96}
                                unoptimized
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSigningVisitId(visit.id);
                                setIsSignaturePadOpen(true);
                              }}
                              className="cursor-pointer text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                              title="Reemplazar o re-firmar esta bitácora"
                            >
                              Re-firmar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSigningVisitId(visit.id);
                              setIsSignaturePadOpen(true);
                            }}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-blue-700"
                          >
                            <PenTool className="h-3.5 w-3.5" /> Firmar con SignaturePad
                          </button>
                        )}
                        <span
                          className={`flex items-center gap-1 text-[10px] font-semibold ${visit.signatureDataUrl ? 'text-emerald-600' : 'text-amber-600'}`}
                        >
                          <CheckCircle2 className="h-3 w-3" />{' '}
                          {visit.signatureDataUrl ? 'Autorizado' : 'Pendiente Firma'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo Gallery SubView */}
      {activeSubTab === 'galeria' && (
        <FieldPhotoGallery
          project={activeProject}
          fieldVisits={fieldVisits}
          onAddPhoto={handleAddPhotoToVisit}
          onDeletePhoto={handleDeletePhotoFromVisit}
        />
      )}

      {/* Google Maps & Weather Safety Monitoring SubView */}
      {activeSubTab === 'mapa_clima' && (
        <GoogleMapsSafetyView
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={onSelectProject}
          currency={currency}
        />
      )}

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
              <h3 className="text-base font-bold">Registrar Nueva Obra en Guatemala</h3>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Código de Obra
                </label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Edificio Comercial Zona 10"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Cliente / Propietario
                </label>
                <input
                  type="text"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  placeholder="Ej. Inmobiliaria Constructiva, S.A."
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Dirección / Ubicación en Guatemala
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Ej. 4a Avenida 10-21 Zona 14"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Presupuesto Inicial (GTQ)
                </label>
                <input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  Guardar Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Visit / Bitácora Modal with Digital Signature & Photo Capture */}
      {isNewVisitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="my-8 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
              <div className="flex items-center gap-2">
                <PenTool className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold">Nueva Bitácora con Firma de Capataz</h3>
              </div>
              <button
                onClick={() => setIsNewVisitModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePublishVisit} className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Obra Asignada
                </label>
                <input
                  type="text"
                  disabled
                  value={`${activeProject.code} - ${activeProject.name}`}
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Condición Climática
                  </label>
                  <select
                    value={visitWeather}
                    onChange={(event) => {
                      const weather = event.target.value;
                      if (
                        weather === 'Soleado' ||
                        weather === 'Nublado' ||
                        weather === 'Lluvia Moderada' ||
                        weather === 'Tormenta Fuerte'
                      ) {
                        setVisitWeather(weather);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <option value="Soleado">Soleado</option>
                    <option value="Nublado">Nublado</option>
                    <option value="Lluvia Moderada">Lluvia Moderada</option>
                    <option value="Tormenta Fuerte">Tormenta Fuerte</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Obreros en Frentes
                  </label>
                  <input
                    type="number"
                    value={visitWorkersCount}
                    onChange={(e) => setVisitWorkersCount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Servicio de Geolocalización Satelital GPS */}
              <div className="space-y-2.5 rounded-xl border border-slate-700 bg-slate-900 p-3.5 text-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
                      <LocateFixed className="h-4 w-4 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="flex items-center gap-1.5 text-xs font-bold text-white">
                        Geolocalización GPS de Campo
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                          {capturedGps ? 'Coordenadas Fijadas' : 'Buscando Satélite'}
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Captura de coordenadas exactas y validación de perímetro
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAcquireExactGps(activeProject.lat, activeProject.lng)}
                    disabled={isCapturingGps}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 shadow-xs transition hover:bg-slate-700 disabled:opacity-50"
                  >
                    <Radio
                      className={`h-3 w-3 text-emerald-400 ${isCapturingGps ? 'animate-spin' : ''}`}
                    />
                    {isCapturingGps ? 'Fijando GPS...' : 'Recapturar GPS'}
                  </button>
                </div>

                {capturedGps ? (
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 font-mono text-xs">
                    <div>
                      <span className="block font-sans text-[10px] text-slate-400">Latitud:</span>
                      <span className="font-bold text-emerald-400">
                        {capturedGps.latitude.toFixed(6)}°
                      </span>
                    </div>
                    <div>
                      <span className="block font-sans text-[10px] text-slate-400">Longitud:</span>
                      <span className="font-bold text-emerald-400">
                        {capturedGps.longitude.toFixed(6)}°
                      </span>
                    </div>
                    <div>
                      <span className="block font-sans text-[10px] text-slate-400">
                        Precisión Satelital:
                      </span>
                      <span className="font-bold text-sky-300">±{capturedGps.accuracy} m</span>
                    </div>
                    <div>
                      <span className="block font-sans text-[10px] text-slate-400">
                        Geocerca de Obra (500m):
                      </span>
                      <span
                        className={`font-bold ${capturedGps.geofenceValid ? 'text-emerald-400' : 'text-amber-400'}`}
                      >
                        {capturedGps.geofenceValid
                          ? `✓ En obra (${capturedGps.geofenceDistanceMeters}m)`
                          : `⚠️ Fuera (${capturedGps.geofenceDistanceMeters}m)`}
                      </span>
                    </div>
                    <div className="col-span-2 border-t border-slate-800 pt-1 font-sans text-[10px] text-slate-400">
                      {capturedGps.statusMessage}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-2.5 text-[11px] text-slate-300">
                    <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                    <span>
                      Conectando con el sensor de geolocalización satelital del dispositivo...
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Bitácora / Novedades de Campo
                </label>
                <textarea
                  rows={3}
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="Describa avances de fundición, recepción de materiales, inspección estructural o incidentes..."
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>

              {/* Photo attachment in bitácora (Mobile Direct Camera & Base64 Storage) */}
              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-white shadow-sm">
                <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-extrabold tracking-wider text-amber-400 uppercase">
                      <Camera className="h-4 w-4 text-amber-400" />
                      Fotografía de Obra en Vivo (Cámara Móvil)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Captura el frente de trabajo con la cámara del dispositivo. Se guarda en
                      base64 con coordenadas GPS.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCameraVisitTargetId(null);
                        setIsSiteCameraOpen(true);
                      }}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-2 text-xs font-extrabold text-slate-950 shadow-md transition hover:from-amber-400 hover:to-amber-500 active:scale-95"
                    >
                      <Camera className="h-4 w-4 text-slate-950" />
                      Capturar Foto con Cámara
                    </button>
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white">
                      <ImageIcon className="h-3.5 w-3.5 text-sky-400" /> Galería
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleAttachSnapshotToNewVisit}
                      />
                    </label>
                  </div>
                </div>

                {visitAttachedPhotos.length > 0 ? (
                  <div className="space-y-2 border-t border-slate-800 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 font-bold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {visitAttachedPhotos.length}{' '}
                        fotografía(s) capturada(s) en base64
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        Almacenado en Bitácora
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 overflow-x-auto py-1.5">
                      {visitAttachedPhotos.map((p, idx) => (
                        <div
                          key={p.id}
                          className="group relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-md"
                        >
                          <Image
                            src={p.url}
                            alt="Foto de obra"
                            width={1200}
                            height={900}
                            unoptimized
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setVisitAttachedPhotos((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="absolute top-1 right-1 cursor-pointer rounded-lg bg-rose-600/90 p-1 text-white shadow transition hover:bg-rose-600"
                            title="Eliminar foto"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-slate-950/85 px-1 py-0.5 font-mono text-[8px] text-sky-400 backdrop-blur-xs">
                            <span>GPS OK</span>
                            <span className="font-sans text-slate-300">{p.timestamp || 'Hoy'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Camera className="h-3.5 w-3.5 text-amber-400/70" />
                      Sin fotografía adjunta. Haz clic en &quot;Capturar Foto con Cámara&quot; para
                      abrir la cámara móvil.
                    </span>
                    <span className="rounded border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] text-amber-400/80">
                      Recomendado
                    </span>
                  </div>
                )}
              </div>

              {/* Digital Signature status box */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Firma en Pantalla (HTML5 Canvas)
                  </p>
                  <p className="text-xs text-slate-500">
                    {signedData
                      ? `Firmado por: ${signedData.signerName}`
                      : 'Requerido para autorizar bitácora'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSigningVisitId(null);
                    setIsSignaturePadOpen(true);
                  }}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-xs transition ${
                    signedData
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  <PenTool className="h-3.5 w-3.5" />
                  {signedData ? 'Actualizar Firma' : 'Firmar en Pantalla'}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewVisitModalOpen(false)}
                  className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!signedData}
                  className="cursor-pointer rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Publicar Bitácora Autorizada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SignatureCanvas Modal for Foremen */}
      {isSignaturePadOpen && (
        <SignatureCanvas
          isOpen={isSignaturePadOpen}
          onClose={() => {
            setIsSignaturePadOpen(false);
            setSigningVisitId(null);
          }}
          visit={signingVisitId ? fieldVisits.find((v) => v.id === signingVisitId) : undefined}
          visitId={signingVisitId || undefined}
          projectId={activeProject.id}
          companyId={activeProject.companyId}
          onSave={(dataUrl, result, updatedVisit) => {
            handleSaveSignature(result as SignatureResult);
            if (updatedVisit && onUpdateFieldVisit) {
              onUpdateFieldVisit(updatedVisit);
            }
            setIsSignaturePadOpen(false);
            setSigningVisitId(null);
          }}
          defaultSignerName={visitForeman}
          title="Firma Digital del Capataz (SignatureCanvas)"
          subtitle={
            signingVisitId
              ? `Autorización formal de bitácora vinculada al registro #${signingVisitId}`
              : 'Autorización táctil para reportes diarios de campo y bitácoras de obra.'
          }
        />
      )}

      {/* Site Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isSiteCameraOpen}
        onClose={() => {
          setIsSiteCameraOpen(false);
          setCameraVisitTargetId(null);
        }}
        onCapture={handleCaptureSitePhoto}
        mode="construction_site"
        title="Capturar Fotografía de Obra con Cámara"
        subtitle="Enfoque el avance estructural o frente de trabajo con la cámara del dispositivo."
        defaultLocation={{ lat: activeProject.lat, lng: activeProject.lng }}
        projectCode={activeProject.code}
        foremanName={visitForeman}
      />

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-3 text-white">
              <span className="text-xs font-bold">{lightboxPhoto.caption}</span>
              <button
                onClick={() => setLightboxPhoto(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex max-h-[60vh] items-center justify-center bg-black">
              <Image
                src={lightboxPhoto.url}
                alt={lightboxPhoto.caption}
                width={1200}
                height={900}
                unoptimized
                className="max-h-[60vh] object-contain"
              />
            </div>
            <div className="flex items-center justify-between p-3 text-xs text-slate-400">
              {lightboxPhoto.coords && (
                <span>
                  GPS: {lightboxPhoto.coords.lat.toFixed(5)}°N,{' '}
                  {lightboxPhoto.coords.lng.toFixed(5)}°W
                </span>
              )}
              <span>
                {lightboxPhoto.date} • {lightboxPhoto.takenBy}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

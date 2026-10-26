'use client';

import { SignatureCanvas } from '@/components/SignatureCanvas';
import { SignatureResult } from '@/components/SignaturePad';
import { FieldPhoto, FieldVisit as FieldVisitType, Project } from '@/lib/types';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  CloudSun,
  Eye,
  FileText,
  MapPin,
  PenTool,
  Plus,
  Printer,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import React, { useState } from 'react';

export interface FieldVisitProps {
  visit?: FieldVisitType;
  visits?: FieldVisitType[];
  project?: Project;
  onUpdateVisit?: (updatedVisit: FieldVisitType) => void;
  onAddVisit?: (newVisit: FieldVisitType) => void;
  onSignVisit?: (visitId: string, signatureResult: SignatureResult) => void;
  className?: string;
  allowInlineSign?: boolean;
}

/**
 * FieldVisit Component
 * Renders field reports (Bitácoras de Obra) with integrated HTML5 Canvas SignaturePad,
 * enabling foremen (capataces) and resident engineers to formally sign and authorize reports.
 */
export function FieldVisit({
  visit,
  visits,
  project,
  onUpdateVisit,
  onAddVisit,
  onSignVisit,
  className = '',
  allowInlineSign = true,
}: FieldVisitProps) {
  const [activeSigningVisitId, setActiveSigningVisitId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<FieldPhoto | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // New Visit Form State
  const [newForeman, setNewForeman] = useState('Don Mario Cifuentes');
  const [newDpi, setNewDpi] = useState('2489 10293 0101');
  const [newNotes, setNewNotes] = useState('');
  const [newWeather, setNewWeather] = useState<
    'Soleado' | 'Lluvia Moderada' | 'Tormenta Fuerte' | 'Nublado'
  >('Soleado');
  const [newWorkersCount, setNewWorkersCount] = useState<number>(18);
  const [newSignatureResult, setNewSignatureResult] = useState<SignatureResult | null>(null);
  const [isNewVisitSigningOpen, setIsNewVisitSigningOpen] = useState(false);

  // Determine list of visits to display
  const displayVisits: FieldVisitType[] = visits || (visit ? [visit] : []);

  const handleSignatureSaved = (visitId: string, result: SignatureResult) => {
    if (onSignVisit) {
      onSignVisit(visitId, result);
    }

    if (onUpdateVisit) {
      const target = displayVisits.find((v) => v.id === visitId);
      if (target) {
        const updated: FieldVisitType = {
          ...target,
          signatureDataUrl: result.dataUrl,
          foremanName: result.signerName,
          signerDpi: result.signerDpi,
          signerRole: result.signerRole,
          gpsCoords: result.location || target.gpsCoords,
          status: 'Autorizado',
        };
        onUpdateVisit(updated);
      }
    }

    setActiveSigningVisitId(null);
  };

  const handleCreateVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotes.trim()) return;

    const newRecord: FieldVisitType = {
      id: `fv-${Date.now()}`,
      companyId: project?.companyId,
      projectId: project?.id || 'p1',
      projectName: project?.name || 'Proyecto Activo',
      date: new Date().toISOString().split('T')[0],
      foremanName: newSignatureResult ? newSignatureResult.signerName : newForeman,
      signerDpi: newSignatureResult ? newSignatureResult.signerDpi : newDpi,
      signerRole: newSignatureResult ? newSignatureResult.signerRole : 'Capataz General de Obra',
      notes: newNotes.trim(),
      weather: newWeather,
      workersCount: Number(newWorkersCount) || 1,
      signatureDataUrl: newSignatureResult ? newSignatureResult.dataUrl : undefined,
      gpsCoords:
        newSignatureResult?.location ||
        (project ? { lat: project.lat, lng: project.lng } : undefined),
      status: newSignatureResult ? 'Autorizado' : 'Pendiente',
      photos: [],
    };

    if (onAddVisit) {
      onAddVisit(newRecord);
    }

    // Reset
    setNewNotes('');
    setNewSignatureResult(null);
    setIsCreatingNew(false);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner & Action */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Bitácora de Campo & Firmas de Capataces
            </h3>
            <p className="text-xs text-slate-500">
              Validación legal y técnica de avances diarios mediante firma digital HTML5 Canvas
            </p>
          </div>
        </div>

        {onAddVisit && (
          <button
            type="button"
            onClick={() => setIsCreatingNew(!isCreatingNew)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
          >
            {isCreatingNew ? (
              'Cerrar Formulario'
            ) : (
              <>
                <Plus className="h-4 w-4" /> Nueva Bitácora con Firma
              </>
            )}
          </button>
        )}
      </div>

      {/* New Field Visit Form (if active) */}
      {isCreatingNew && (
        <form
          onSubmit={handleCreateVisitSubmit}
          className="animate-in fade-in space-y-4 rounded-2xl border-2 border-blue-200 bg-white p-5 shadow-sm duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Redactar Nuevo Reporte de Bitácora
            </h4>
            <span className="font-mono text-xs text-slate-500">
              Fecha: {new Date().toLocaleDateString('es-GT')}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Nombre del Capataz
              </label>
              <input
                type="text"
                value={newForeman}
                onChange={(e) => setNewForeman(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                DPI del Capataz
              </label>
              <input
                type="text"
                value={newDpi}
                onChange={(e) => setNewDpi(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Condición Climática
              </label>
              <select
                value={newWeather}
                onChange={(event) => {
                  const weather = event.target.value;
                  if (
                    weather === 'Soleado' ||
                    weather === 'Lluvia Moderada' ||
                    weather === 'Tormenta Fuerte' ||
                    weather === 'Nublado'
                  ) {
                    setNewWeather(weather);
                  }
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="Soleado">Soleado (Óptimo)</option>
                <option value="Nublado">Nublado</option>
                <option value="Lluvia Moderada">Lluvia Moderada</option>
                <option value="Tormenta Fuerte">Tormenta Fuerte (Paro)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Cantidad de Trabajadores / Cuadrillas en Sitio
            </label>
            <input
              type="number"
              min="1"
              value={newWorkersCount}
              onChange={(e) => setNewWorkersCount(Number(e.target.value))}
              className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Descripción de Trabajos Realizados & Observaciones Técnicas
            </label>
            <textarea
              rows={3}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Describa los frentes avanzados, fundiciones, recepción de materiales o incidencias del día..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Canvas Signature Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <PenTool className="h-3.5 w-3.5 text-blue-600" />
                  Firma Digital del Capataz (Lienzo Canvas)
                </p>
                <p className="text-[11px] text-slate-500">
                  {newSignatureResult
                    ? 'Firma estampada con coordenadas GPS.'
                    : 'Requerida para autorizar la validez técnica de la bitácora.'}
                </p>
              </div>

              {newSignatureResult ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-28 items-center justify-center rounded-lg border border-slate-300 bg-white p-1">
                    <Image
                      src={newSignatureResult.dataUrl}
                      alt="Firma Capataz"
                      width={140}
                      height={44}
                      unoptimized
                      className="max-h-full object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNewVisitSigningOpen(true)}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Modificar Firma
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsNewVisitSigningOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
                >
                  <PenTool className="h-3.5 w-3.5" /> Abrir SignaturePad Canvas
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className="rounded-lg px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
            >
              <CheckCircle2 className="h-4 w-4" /> Guardar Reporte de Bitácora
            </button>
          </div>
        </form>
      )}

      {/* Visits List */}
      {displayVisits.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <h4 className="text-sm font-bold text-slate-700">
            No hay bitácoras de campo registradas
          </h4>
          <p className="mx-auto max-w-sm text-xs text-slate-500">
            Utilice el botón &quot;Nueva Bitácora con Firma&quot; para crear reportes diarios y
            autorizarlos con el componente SignaturePad.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {displayVisits.map((item) => {
            const isSigned = !!item.signatureDataUrl;

            return (
              <div
                key={item.id}
                id={`field-visit-${item.id}`}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
              >
                {/* Header row */}
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{item.projectName}</h4>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                          {item.id}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" /> {item.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CloudSun className="h-3 w-3 text-amber-500" /> {item.weather}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isSigned
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {isSigned ? 'Autorizado en Obra' : 'Pendiente de Firma'}
                    </span>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="cursor-pointer rounded-lg bg-slate-100 p-2 text-slate-700 transition hover:bg-slate-200"
                      title="Imprimir Bitácora"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Content grid */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Left 2 cols: Notes, Workers, Photos */}
                  <div className="space-y-3 md:col-span-2">
                    <div>
                      <p className="mb-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                        Reporte Diario de Actividades
                      </p>
                      <p className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700 sm:text-sm">
                        {item.notes}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        Obreros en Frentes:{' '}
                        <strong className="text-slate-800">{item.workersCount}</strong>
                      </span>
                      {item.gpsCoords && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-rose-500" />
                          GPS: {item.gpsCoords.lat.toFixed(4)}°N, {item.gpsCoords.lng.toFixed(4)}°W
                        </span>
                      )}
                    </div>

                    {/* Photos Preview */}
                    {item.photos && item.photos.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <p className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                          <Camera className="h-3.5 w-3.5 text-blue-600" />
                          Fotografías de Evidencia ({item.photos.length})
                        </p>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {item.photos.map((ph) => (
                            <div
                              key={ph.id}
                              onClick={() => setSelectedPhoto(ph)}
                              className="group relative aspect-4/3 cursor-pointer overflow-hidden rounded-lg border border-slate-200 shadow-2xs"
                            >
                              <Image
                                src={ph.url}
                                alt={ph.caption}
                                width={1200}
                                height={900}
                                unoptimized
                                className="h-full w-full object-cover transition group-hover:scale-105"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 text-white opacity-0 transition group-hover:opacity-100">
                                <Eye className="h-4 w-4" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right col: Signature Card */}
                  <div className="flex flex-col justify-between space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <p className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                        <ShieldCheck className="h-3 w-3 text-blue-600" />
                        Aprobación del Capataz
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{item.foremanName}</p>
                      <p className="text-xs text-slate-500">
                        {item.signerRole || 'Capataz General de Obra'}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-slate-600">
                        DPI: {item.signerDpi || '2489 10293 0101'}
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-slate-200 pt-3">
                      {isSigned ? (
                        <div>
                          <p className="mb-1 text-[10px] font-semibold text-slate-400">
                            Firma en Pantalla (Canvas):
                          </p>
                          <div className="flex h-14 items-center justify-center rounded-lg border border-slate-300 bg-white p-1 shadow-2xs">
                            {item.signatureDataUrl && (
                              <Image
                                src={item.signatureDataUrl}
                                alt="Firma Digital Canvas"
                                width={240}
                                height={96}
                                unoptimized
                                className="max-h-full max-w-full object-contain"
                              />
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> Certificado
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveSigningVisitId(item.id)}
                              className="cursor-pointer text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              Re-firmar en Canvas
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-100/70 p-2 text-[11px] text-amber-800">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            Reporte pendiente de firma formal del capataz.
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveSigningVisitId(item.id)}
                            className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
                          >
                            <PenTool className="h-3.5 w-3.5" /> Firmar con SignaturePad
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SignatureCanvas Modal for existing visit */}
      {activeSigningVisitId && (
        <SignatureCanvas
          isOpen={!!activeSigningVisitId}
          onClose={() => setActiveSigningVisitId(null)}
          visit={displayVisits.find((v) => v.id === activeSigningVisitId)}
          visitId={activeSigningVisitId}
          companyId={
            project?.companyId ??
            displayVisits.find((v) => v.id === activeSigningVisitId)?.companyId
          }
          onSave={(dataUrl, result) =>
            handleSignatureSaved(activeSigningVisitId, result as SignatureResult)
          }
          defaultSignerName={
            displayVisits.find((v) => v.id === activeSigningVisitId)?.foremanName ||
            'Don Mario Cifuentes'
          }
          defaultSignerDpi={
            displayVisits.find((v) => v.id === activeSigningVisitId)?.signerDpi || '2489 10293 0101'
          }
          title="Firma Digital del Capataz (SignatureCanvas)"
          subtitle={`Autorización legal de bitácora #${activeSigningVisitId}`}
        />
      )}

      {/* SignatureCanvas Modal for new visit */}
      {isNewVisitSigningOpen && (
        <SignatureCanvas
          isOpen={isNewVisitSigningOpen}
          onClose={() => setIsNewVisitSigningOpen(false)}
          companyId={project?.companyId}
          onSave={(dataUrl, result) => {
            setNewSignatureResult(result as SignatureResult);
            setNewForeman(result.signerName);
            setNewDpi(result.signerDpi);
            setIsNewVisitSigningOpen(false);
          }}
          defaultSignerName={newForeman}
          defaultSignerDpi={newDpi}
          title="Firma Digital para Nueva Bitácora"
          subtitle="Estampe su firma en el lienzo para autorizar el reporte antes de guardarlo"
        />
      )}

      {/* Lightbox Photo Preview */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="w-full max-w-xl space-y-3 rounded-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <p className="text-xs font-bold text-slate-800">{selectedPhoto.caption}</p>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Cerrar
              </button>
            </div>
            <div className="flex max-h-96 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              <Image
                src={selectedPhoto.url}
                alt={selectedPhoto.caption}
                width={1200}
                height={900}
                unoptimized
                className="max-h-96 object-contain"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {selectedPhoto.date} {selectedPhoto.timestamp}
              </span>
              {selectedPhoto.coords && (
                <span>
                  GPS: {selectedPhoto.coords.lat.toFixed(4)}°N,{' '}
                  {selectedPhoto.coords.lng.toFixed(4)}°W
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FieldVisit;

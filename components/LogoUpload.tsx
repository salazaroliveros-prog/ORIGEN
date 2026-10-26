'use client';

import type { BrandingConfig } from '@/lib/branding';
import {
  isCustomLogo,
  loadBranding,
  revokeLogoUrl,
  saveBranding,
  subscribeToBrandingUpdates,
} from '@/lib/branding';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Maximize,
  Minimize,
  RefreshCw,
  Upload,
} from 'lucide-react';
import Image from 'next/image';
import React, { useCallback, useEffect, useState } from 'react';

interface LogoUploadProps {
  company: {
    logoUrl?: string;
    companyName?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  onUpdateCompany?: (
    updated: Partial<{
      logoUrl: string;
      companyName: string;
      primaryColor: string;
      secondaryColor: string;
    }>
  ) => void;
  className?: string;
  compact?: boolean;
}

export function LogoUpload({
  company,
  onUpdateCompany,
  className = '',
  compact = false,
}: LogoUploadProps) {
  const [branding, setBranding] = useState<BrandingConfig>(() => loadBranding());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const unsub = subscribeToBrandingUpdates((config) => setBranding(config));
    return unsub;
  }, []);

  useEffect(() => {
    if (company.logoUrl && company.logoUrl !== branding.logoUrl) {
      setBranding((prev) => ({ ...prev, logoUrl: company.logoUrl ?? prev.logoUrl }));
    }
  }, [company.logoUrl, branding.logoUrl]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Formato no soportado. Usa PNG, JPG, SVG o WebP.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no debe superar los 5 MB.');
        return;
      }

      setError(null);
      setUploading(true);

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPreviewUrl(dataUrl);

        const next: BrandingConfig = {
          ...branding,
          logoUrl: dataUrl,
          logoSmallUrl: dataUrl,
          logoSquareUrl: dataUrl,
          bannerUrl: dataUrl,
        };

        setBranding(() => next);
        saveBranding(next);

        if (onUpdateCompany) {
          onUpdateCompany({
            logoUrl: dataUrl,
            companyName: next.companyName,
            primaryColor: next.primaryColor,
            secondaryColor: next.secondaryColor,
          });
        }

        setUploading(false);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [branding, onUpdateCompany]
  );

  const resetLogo = useCallback(() => {
    const next: BrandingConfig = {
      ...branding,
      logoUrl: '/assets/branding/web-banner-logo.png',
      logoSmallUrl: '/assets/branding/icon-192x192.png',
      logoSquareUrl: '/assets/branding/icon-512x512.png',
      bannerUrl: '/assets/branding/web-banner-logo.png',
    };
    setPreviewUrl(null);
    setBranding(next);
    saveBranding(next);
    if (onUpdateCompany) {
      onUpdateCompany({
        logoUrl: next.logoUrl,
        companyName: next.companyName,
        primaryColor: next.primaryColor,
        secondaryColor: next.secondaryColor,
      });
    }
  }, [branding, onUpdateCompany]);

  const handleToggleExpand = () => setIsExpanded((prev) => !prev);

  const currentLogo = previewUrl || branding.logoUrl;
  const isCustom = isCustomLogo(currentLogo);

  if (compact) {
    return (
      <div className={`rounded-xl border border-white/10 bg-slate-950/50 p-3 ${className}`}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Marca y Logo</h3>
          </div>
          <button
            onClick={handleToggleExpand}
            className="rounded-lg bg-white/[0.05] p-1.5 text-slate-300 transition hover:bg-white/[0.1]"
            title={isExpanded ? 'Contraer' : 'Expandir'}
          >
            {isExpanded ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>

        {error && (
          <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 p-2">
            <AlertCircle className="h-3 w-3 shrink-0 text-red-400" />
            <span className="text-[11px] text-red-200">{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Logo Personalizado
            </label>
            <div className="group relative flex aspect-square h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-white/[0.03] transition-colors hover:border-white/40">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Logo preview"
                  width={288}
                  height={288}
                  unoptimized
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-slate-400">
                  <Upload className="h-6 w-6 opacity-50" />
                  <span className="text-[11px] font-medium">Subir logo</span>
                  <span className="text-[10px] opacity-60">PNG, JPG, SVG, WebP (5 MB)</span>
                </div>
              )}
              {isCustom && currentLogo && !previewUrl && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                  <Image
                    src={currentLogo}
                    alt="Logo actual"
                    width={288}
                    height={288}
                    unoptimized
                    className="h-full w-full rounded-xl object-cover opacity-40"
                  />
                  <div className="rounded-lg border border-white/20 bg-white/10 p-2 text-center backdrop-blur-md">
                    <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-emerald-400" />
                    <span className="text-[10px] font-medium text-white">Logo activo</span>
                  </div>
                </div>
              )}
              <RefreshCw
                className={`absolute top-1.5 right-1.5 h-3 w-3 text-slate-400 ${isCustom ? 'text-amber-400' : ''}`}
              />
            </div>
            {uploading && (
              <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1.5 rounded-lg bg-black/80 px-1.5 py-0.5 text-[10px] text-white backdrop-blur">
                <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Subiendo...</span>
              </div>
            )}
          </div>

          {isExpanded && (
            <div className="space-y-3 border-t border-white/10 pt-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Colores de Marca
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] text-slate-400">Color Primario</label>
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => {
                        const next = { ...branding, primaryColor: e.target.value };
                        setBranding(next);
                        saveBranding(next);
                        if (onUpdateCompany) onUpdateCompany({ primaryColor: e.target.value });
                      }}
                      className="h-8 w-full cursor-pointer rounded-lg border-none bg-transparent p-0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-slate-400">
                      Color Secundario
                    </label>
                    <input
                      type="color"
                      value={branding.secondaryColor}
                      onChange={(e) => {
                        const next = { ...branding, secondaryColor: e.target.value };
                        setBranding(next);
                        saveBranding(next);
                        if (onUpdateCompany) onUpdateCompany({ secondaryColor: e.target.value });
                      }}
                      className="h-8 w-full cursor-pointer rounded-lg border-none bg-transparent p-0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Nombre de Empresa
                </label>
                <input
                  type="text"
                  value={branding.companyName}
                  onChange={(e) => {
                    const next = { ...branding, companyName: e.target.value };
                    setBranding(next);
                    saveBranding(next);
                    if (onUpdateCompany) onUpdateCompany({ companyName: e.target.value });
                  }}
                  className="w-full rounded-lg border border-white/20 bg-white/[0.05] px-2.5 py-1.5 text-sm text-white placeholder-slate-500 transition focus:border-amber-400 focus:outline-none"
                  placeholder="Nombre de la empresa"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col items-end justify-between gap-2 border-t border-white/10 pt-3 sm:flex-row">
          <span className="text-[10px] text-slate-500">
            {isCustom ? 'Logo personalizado activo y propagado' : 'Logo por defecto'}
          </span>
          <div className="flex gap-1.5">
            {isCustom && (
              <button
                onClick={resetLogo}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-300 transition hover:bg-red-500/20"
              >
                Restaurar
              </button>
            )}
            <button
              onClick={() => {
                if (previewUrl) revokeLogoUrl(previewUrl);
                setPreviewUrl(null);
              }}
              className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-white/[0.1]"
            >
              {previewUrl ? 'Descartar' : 'Cerrar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full max-w-xl ${className}`}>
      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-6 shadow-2xl backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-amber-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Marca y Logo</h3>
              <p className="text-xs text-slate-400">Sube tu propio logo para personalizar la app</p>
            </div>
          </div>
          <button
            onClick={handleToggleExpand}
            className="rounded-lg bg-white/[0.05] p-1.5 text-slate-300 transition hover:bg-white/[0.1]"
            title={isExpanded ? 'Contraer' : 'Expandir'}
            aria-label={isExpanded ? 'Contraer opciones de marca' : 'Expandir opciones de marca'}
          >
            {isExpanded ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span className="text-sm text-red-200">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-3 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Logo Personalizado
            </label>
            <div className="group relative">
              <div
                className={`flex aspect-video w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-white/[0.03] transition-colors hover:border-white/40 ${
                  uploading ? 'opacity-70' : ''
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Logo preview"
                    width={288}
                    height={288}
                    unoptimized
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Upload className="h-8 w-8 opacity-50" />
                    <span className="text-sm font-medium">Subir logo de empresa</span>
                    <span className="text-xs opacity-70">PNG, JPG, SVG, WebP (máx. 5 MB)</span>
                  </div>
                )}
                {isCustom && currentLogo && !previewUrl && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                    <Image
                      src={currentLogo}
                      alt="Logo actual"
                      width={288}
                      height={288}
                      unoptimized
                      className="h-full w-full rounded-xl object-cover opacity-40"
                    />
                    <div className="rounded-lg border border-white/20 bg-white/10 p-3 text-center backdrop-blur-md">
                      <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-400" />
                      <span className="text-sm font-medium text-white">
                        Logo personalizado activo
                      </span>
                    </div>
                  </div>
                )}
                <RefreshCw
                  className={`absolute top-2 right-2 h-4 w-4 text-slate-400 ${isCustom ? 'text-amber-400' : ''}`}
                />
              </div>
              {uploading && (
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg bg-black/80 px-2 py-1 text-xs text-white backdrop-blur">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Subiendo...</span>
                </div>
              )}
            </div>
          </div>

          {isExpanded && (
            <div className="space-y-4 md:col-span-2">
              <div>
                <label className="mb-3 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Colores de Marca
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Color Primario</label>
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => {
                        const next = { ...branding, primaryColor: e.target.value };
                        setBranding(next);
                        saveBranding(next);
                        if (onUpdateCompany) onUpdateCompany({ primaryColor: e.target.value });
                      }}
                      className="h-10 w-full cursor-pointer rounded-lg border-none bg-transparent p-0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Color Secundario</label>
                    <input
                      type="color"
                      value={branding.secondaryColor}
                      onChange={(e) => {
                        const next = { ...branding, secondaryColor: e.target.value };
                        setBranding(next);
                        saveBranding(next);
                        if (onUpdateCompany) onUpdateCompany({ secondaryColor: e.target.value });
                      }}
                      className="h-10 w-full cursor-pointer rounded-lg border-none bg-transparent p-0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-3 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Nombre de Empresa
                </label>
                <input
                  type="text"
                  value={branding.companyName}
                  onChange={(e) => {
                    const next = { ...branding, companyName: e.target.value };
                    setBranding(next);
                    saveBranding(next);
                    if (onUpdateCompany) onUpdateCompany({ companyName: e.target.value });
                  }}
                  className="w-full rounded-lg border border-white/20 bg-white/[0.05] px-3 py-2 text-white placeholder-slate-500 transition focus:border-amber-400 focus:outline-none"
                  placeholder="Nombre de la empresa"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col items-end justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <span className="text-xs text-slate-500">
            {isCustom
              ? 'Logo personalizado detectado y propagado a toda la aplicación'
              : 'Usando logo por defecto'}
          </span>
          <div className="flex gap-2">
            {isCustom && (
              <button
                onClick={resetLogo}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
              >
                Restaurar por defecto
              </button>
            )}
            <button
              onClick={() => {
                if (previewUrl) revokeLogoUrl(previewUrl);
                setPreviewUrl(null);
              }}
              className="rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.1]"
            >
              {previewUrl ? 'Descartar' : 'Cerrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import type { BrandingConfig } from '@/lib/branding';
import { isCustomLogo,loadBranding,revokeLogoUrl,saveBranding,subscribeToBrandingUpdates } from '@/lib/branding';
import { AlertCircle,Building2,CheckCircle2,Maximize,Minimize,RefreshCw,Upload } from 'lucide-react';
import Image from 'next/image';
import React,{ useCallback,useEffect,useState } from 'react';

interface LogoUploadProps {
  company: { logoUrl?: string; companyName?: string; primaryColor?: string; secondaryColor?: string };
  onUpdateCompany?: (updated: Partial<{ logoUrl: string; companyName: string; primaryColor: string; secondaryColor: string }>) => void;
  className?: string;
  compact?: boolean;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({
  company,
  onUpdateCompany,
  className = '',
  compact = false,
}) => {
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
      <div className={`bg-slate-950/50 border border-white/10 rounded-xl p-3 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-sm">Marca y Logo</h3>
          </div>
          <button
            onClick={handleToggleExpand}
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 transition"
            title={isExpanded ? 'Contraer' : 'Expandir'}
          >
            {isExpanded ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
            <span className="text-[11px] text-red-200">{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Logo Personalizado
            </label>
            <div className="relative group aspect-square h-24 rounded-xl border-2 border-dashed border-white/20 bg-white/[0.03] hover:border-white/40 transition-colors flex items-center justify-center cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {previewUrl ? (
                <Image src={previewUrl} alt="Logo preview" width={288} height={288} unoptimized className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-slate-400">
                  <Upload className="w-6 h-6 opacity-50" />
                  <span className="text-[11px] font-medium">Subir logo</span>
                  <span className="text-[10px] opacity-60">PNG, JPG, SVG, WebP (5 MB)</span>
                </div>
              )}
              {isCustom && currentLogo && !previewUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                  <Image
                    src={currentLogo}
                    alt="Logo actual"
                    width={288}
                    height={288}
                    unoptimized
                    className="w-full h-full object-cover opacity-40 rounded-xl"
                  />
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2 text-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                    <span className="text-[10px] text-white font-medium">Logo activo</span>
                  </div>
                </div>
              )}
              <RefreshCw className={`absolute top-1.5 right-1.5 w-3 h-3 text-slate-400 ${isCustom ? 'text-amber-400' : ''}`} />
            </div>
            {uploading && (
              <div className="absolute top-1.5 left-1.5 z-10 bg-black/80 backdrop-blur text-white px-1.5 py-0.5 rounded-lg text-[10px] flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Subiendo...</span>
              </div>
            )}
          </div>

          {isExpanded && (
            <div className="pt-3 border-t border-white/10 space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Colores de Marca
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Color Primario</label>
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => {
                        const next = { ...branding, primaryColor: e.target.value };
                        setBranding(next);
                        saveBranding(next);
                        if (onUpdateCompany) onUpdateCompany({ primaryColor: e.target.value });
                      }}
                      className="w-full h-8 rounded-lg cursor-pointer border-none bg-transparent p-0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Color Secundario</label>
                    <input
                      type="color"
                      value={branding.secondaryColor}
                      onChange={(e) => {
                        const next = { ...branding, secondaryColor: e.target.value };
                        setBranding(next);
                        saveBranding(next);
                        if (onUpdateCompany) onUpdateCompany({ secondaryColor: e.target.value });
                      }}
                      className="w-full h-8 rounded-lg cursor-pointer border-none bg-transparent p-0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
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
                  className="w-full px-2.5 py-1.5 rounded-lg border border-white/20 bg-white/[0.05] text-white text-sm focus:outline-none focus:border-amber-400 transition placeholder-slate-500"
                  placeholder="Nombre de la empresa"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row gap-2 justify-between items-end">
          <span className="text-[10px] text-slate-500">
            {isCustom ? 'Logo personalizado activo y propagado' : 'Logo por defecto'}
          </span>
          <div className="flex gap-1.5">
            {isCustom && (
              <button
                onClick={resetLogo}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] font-medium hover:bg-red-500/20 transition"
              >
                Restaurar
              </button>
            )}
            <button
              onClick={() => {
                if (previewUrl) revokeLogoUrl(previewUrl);
                setPreviewUrl(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-slate-300 text-[11px] font-medium hover:bg-white/[0.1] transition"
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
      <div className="bg-slate-950/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-amber-400" />
            <div>
              <h3 className="font-bold text-white text-lg">Marca y Logo</h3>
              <p className="text-xs text-slate-400">Sube tu propio logo para personalizar la app</p>
            </div>
          </div>
          <button
            onClick={handleToggleExpand}
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 transition"
            title={isExpanded ? 'Contraer' : 'Expandir'}
            aria-label={isExpanded ? 'Contraer opciones de marca' : 'Expandir opciones de marca'}
          >
            {isExpanded ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-sm text-red-200">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
              Logo Personalizado
            </label>
            <div className="relative group">
              <div
                className={`aspect-video w-full rounded-xl border-2 border-dashed border-white/20 bg-white/[0.03] hover:border-white/40 transition-colors flex items-center justify-center cursor-pointer ${
                  uploading ? 'opacity-70' : ''
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {previewUrl ? (
                    <Image src={previewUrl} alt="Logo preview" width={288} height={288} unoptimized className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Upload className="w-8 h-8 opacity-50" />
                    <span className="text-sm font-medium">Subir logo de empresa</span>
                    <span className="text-xs opacity-70">PNG, JPG, SVG, WebP (máx. 5 MB)</span>
                  </div>
                )}
                {isCustom && currentLogo && !previewUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                    <Image
                      src={currentLogo}
                      alt="Logo actual"
                      width={288}
                      height={288}
                      unoptimized
                      className="w-full h-full object-cover opacity-40 rounded-xl"
                    />
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-3 text-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                      <span className="text-sm text-white font-medium">Logo personalizado activo</span>
                    </div>
                  </div>
                )}
                <RefreshCw className={`absolute top-2 right-2 w-4 h-4 text-slate-400 ${isCustom ? 'text-amber-400' : ''}`} />
              </div>
              {uploading && (
                <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur text-white px-2 py-1 rounded-lg text-xs flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Subiendo...</span>
                </div>
              )}
            </div>
          </div>

          {isExpanded && (
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                  Colores de Marca
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Color Primario</label>
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => {
                        const next = { ...branding, primaryColor: e.target.value };
                        setBranding(next);
                        saveBranding(next);
                        if (onUpdateCompany) onUpdateCompany({ primaryColor: e.target.value });
                      }}
                      className="w-full h-10 rounded-lg cursor-pointer border-none bg-transparent p-0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Color Secundario</label>
                    <input
                      type="color"
                      value={branding.secondaryColor}
                      onChange={(e) => {
                        const next = { ...branding, secondaryColor: e.target.value };
                        setBranding(next);
                        saveBranding(next);
                        if (onUpdateCompany) onUpdateCompany({ secondaryColor: e.target.value });
                      }}
                      className="w-full h-10 rounded-lg cursor-pointer border-none bg-transparent p-0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
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
                  className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/[0.05] text-white focus:outline-none focus:border-amber-400 transition placeholder-slate-500"
                  placeholder="Nombre de la empresa"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3 justify-between items-end">
          <span className="text-xs text-slate-500">
            {isCustom ? 'Logo personalizado detectado y propagado a toda la aplicación' : 'Usando logo por defecto'}
          </span>
          <div className="flex gap-2">
            {isCustom && (
              <button
                onClick={resetLogo}
                className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/20 transition"
              >
                Restaurar por defecto
              </button>
            )}
            <button
              onClick={() => {
                if (previewUrl) revokeLogoUrl(previewUrl);
                setPreviewUrl(null);
              }}
              className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/[0.1] transition"
            >
              {previewUrl ? 'Descartar' : 'Cerrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

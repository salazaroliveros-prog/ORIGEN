'use client';

import { Apple, Download, Monitor, Share2 } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface PWAInstallPromptProps {
  className?: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isBeforeInstallPromptEvent(event: Event): event is BeforeInstallPromptEvent {
  return 'prompt' in event && typeof event.prompt === 'function' && 'userChoice' in event;
}

export function PWAInstallPrompt({ className = '' }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [shown, setShown] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const dismissedRef = useRef(false);

  const dismissPrompt = useCallback(() => {
    dismissedRef.current = true;
    setShown(false);
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && navigator.standalone === true);

    setIsIOS(isIOS);
    setIsAndroid(/android/i.test(ua));
    setIsDesktop(!/Mobile|Android|iPhone|iPad|iPod/.test(ua));
    setShown(!isStandalone);
  }, []);

  const handleBeforeInstallPrompt = useCallback((e: Event) => {
    if (!isBeforeInstallPromptEvent(e)) return;
    e.preventDefault();
    if (dismissedRef.current) return;
    setDeferredPrompt(e);
    setShown(true);
  }, []);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    const handleInstalled = () => {
      dismissedRef.current = true;
      setDeferredPrompt(null);
      setShown(false);
    };
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [handleBeforeInstallPrompt]);

  const installPWA = async () => {
    if (!deferredPrompt) return;
    setInstallError(null);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        dismissedRef.current = true;
        setDeferredPrompt(null);
        setShown(false);
      }
    } catch (error) {
      console.error('No se pudo iniciar la instalación de ConstructERP:', error);
      setInstallError(
        'No se pudo iniciar la instalación. Inténtalo de nuevo desde el menú del navegador.'
      );
    }
  };

  if (!shown) return null;

  if (isIOS) {
    return (
      <div
        className={`animate-in slide-in-from-bottom fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 z-40 rounded-2xl border border-amber-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md duration-300 ${className}`}
      >
        <div className="mb-3 flex items-center gap-3">
          <Apple className="h-5 w-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Instalar en iOS</h3>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          Para instalar ConstructERP como app nativa en tu iPhone o iPad:
        </p>
        {installError && (
          <p role="alert" className="mb-3 text-xs text-rose-300">
            {installError}
          </p>
        )}
        <div className="mb-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Compartir
            </span>
            <span>→</span>
            <span>Agregar a pantalla de inicio</span>
          </div>
        </div>
        <button
          onClick={dismissPrompt}
          className="min-h-11 w-full rounded-xl bg-amber-500 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
        >
          Entendido
        </button>
      </div>
    );
  }

  if (isAndroid && deferredPrompt) {
    return (
      <div
        className={`animate-in slide-in-from-bottom fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-4 z-40 rounded-2xl border border-sky-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md duration-300 ${className}`}
      >
        <div className="mb-3 flex items-center gap-3">
          <Download className="h-5 w-5 text-sky-400" />
          <h3 className="text-sm font-bold text-white">Instalar ConstructERP</h3>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          Instala la aplicación para acceder a ConstructERP más rápido desde tu dispositivo.
        </p>
        {installError && (
          <p role="alert" className="mb-3 text-xs text-rose-300">
            {installError}
          </p>
        )}
        <div className="space-y-2">
          <button
            onClick={installPWA}
            className="min-h-11 w-full rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.4)] transition hover:bg-sky-400"
          >
            Instalar App
          </button>
          <button
            onClick={dismissPrompt}
            className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] py-2 text-sm text-slate-300 transition hover:bg-white/[0.1]"
          >
            Quizás después
          </button>
        </div>
      </div>
    );
  }

  if (isDesktop && deferredPrompt) {
    return (
      <div
        className={`animate-in slide-in-from-right fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 w-64 rounded-2xl border border-amber-500/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md duration-300 lg:bottom-4 ${className}`}
      >
        <div className="mb-3 flex items-center gap-3">
          <Monitor className="h-5 w-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Instalar en tu computadora</h3>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          ConstructERP puede instalarse como aplicación de escritorio.
        </p>
        {installError && (
          <p role="alert" className="mb-3 text-xs text-rose-300">
            {installError}
          </p>
        )}
        <div className="space-y-2">
          <button
            onClick={installPWA}
            className="min-h-11 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition hover:bg-amber-400"
          >
            Instalar App
          </button>
          <button
            onClick={dismissPrompt}
            className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.05] py-2 text-sm text-slate-300 transition hover:bg-white/[0.1]"
          >
            Quizás después
          </button>
        </div>
      </div>
    );
  }

  return null;
}

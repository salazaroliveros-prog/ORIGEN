'use client';

import { Apple,Command,Download,Monitor } from 'lucide-react';
import React,{ useCallback,useEffect,useState } from 'react';

interface PWAInstallPromptProps {
  className?: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isBeforeInstallPromptEvent(event: Event): event is BeforeInstallPromptEvent {
  return (
    'prompt' in event &&
    typeof event.prompt === 'function' &&
    'userChoice' in event
  );
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ className = '' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOS);
    setIsAndroid(/android/i.test(ua));
    setIsDesktop(!/Mobile|Android|iPhone|iPad|iPod/.test(ua));
  }, []);

  const handleBeforeInstallPrompt = useCallback((e: Event) => {
    if (!isBeforeInstallPromptEvent(e)) return;
    e.preventDefault();
    setDeferredPrompt(e);
    setShown(true);
  }, []);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [handleBeforeInstallPrompt]);

  const installPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShown(false);
    }
  };

  if (shown && !deferredPrompt) return null;

  if (isIOS) {
    return (
      <div className={`fixed bottom-4 left-4 right-4 z-50 bg-slate-950/95 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-300 ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <Apple className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white text-sm">Instalar en iOS</h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Para instalar ConstructERP como app nativa en tu iPhone o iPad:
        </p>
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Command>Compartir</Command>
            <span>→</span>
            <span>Agregar a pantalla de inicio</span>
          </div>
        </div>
        <button
          onClick={() => setShown(false)}
          className="w-full py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition"
        >
          Entendido
        </button>
      </div>
    );
  }

  if (isAndroid && deferredPrompt) {
    return (
      <div className={`fixed bottom-4 left-4 right-4 z-50 bg-slate-950/95 backdrop-blur-md border border-sky-500/30 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-300 ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <Download className="w-5 h-5 text-sky-400" />
          <h3 className="font-bold text-white text-sm">Instalar ConstructERP</h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Instala la aplicación para usarla sin conexión y acceder más rápido.
        </p>
        <div className="space-y-2">
          <button
            onClick={installPWA}
            className="w-full py-2.5 rounded-xl bg-sky-500 text-slate-950 text-sm font-bold hover:bg-sky-400 transition shadow-[0_0_20px_rgba(56,189,248,0.4)]"
          >
            Instalar App
          </button>
          <button
            onClick={() => setShown(false)}
            className="w-full py-2 rounded-xl bg-white/[0.05] border border-white/10 text-slate-300 text-sm hover:bg-white/[0.1] transition"
          >
            Quizás después
          </button>
        </div>
      </div>
    );
  }

  if (isDesktop && deferredPrompt) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 bg-slate-950/95 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-right duration-300 w-64 ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <Monitor className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white text-sm">Instalar en tu computadora</h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          ConstructERP puede instalarse como aplicación de escritorio.
        </p>
        <div className="space-y-2">
          <button
            onClick={installPWA}
            className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 text-sm font-bold hover:bg-amber-400 transition shadow-[0_0_20px_rgba(245,158,11,0.4)]"
          >
            Instalar App
          </button>
          <button
            onClick={() => setShown(false)}
            className="w-full py-2 rounded-xl bg-white/[0.05] border border-white/10 text-slate-300 text-sm hover:bg-white/[0.1] transition"
          >
            Quizás después
          </button>
        </div>
      </div>
    );
  }

  return null;
};

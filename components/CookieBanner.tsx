'use client';

import { useEffect, useState } from 'react';

/**
 * ✅ COOKIE BANNER COMPONENT
 * 
 * Features:
 * - GDPR/CCPA compliant
 * - Persistent consent storage
 * - Three options: Essentials only, Analytics, All
 * - Privacy policy link
 */

export interface CookieConsent {
  essentials: boolean; // Always true (required)
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  timestamp: string;
  version: string;
}

const CONSENT_VERSION = '1.0';
const CONSENT_STORAGE_KEY = 'cookie-consent';
const COOKIE_DURATION_DAYS = 365;

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<Partial<CookieConsent>>({
    essentials: true,
  });

  // Cargar consentimiento previo
  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      try {
        const { version } = JSON.parse(stored);
        // Si versión coincide, no mostrar banner
        if (version === CONSENT_VERSION) {
          setShowBanner(false);
          return;
        }
      } catch (error) {
        console.error('Error parsing consent:', error);
      }
    }

    // Mostrar banner si no hay consentimiento válido
    setShowBanner(true);
  }, []);

  const saveConsent = (consentData: Partial<CookieConsent>) => {
    const fullConsent: CookieConsent = {
      essentials: true,
      analytics: consentData.analytics || false,
      marketing: consentData.marketing || false,
      preferences: consentData.preferences || false,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };

    // Guardar en localStorage
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(fullConsent));

    // Establecer cookies
    Object.entries(fullConsent).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + COOKIE_DURATION_DAYS);
        document.cookie = `consent_${key}=${value}; expires=${expiry.toUTCString()}; path=/; SameSite=Strict`;
      }
    });

    // Enviar evento de consentimiento
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': fullConsent.analytics ? 'granted' : 'denied',
        'marketing_storage': fullConsent.marketing ? 'granted' : 'denied',
      });
    }

    setConsent(fullConsent);
    setShowBanner(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      analytics: true,
      marketing: true,
      preferences: true,
    });
  };

  const handleRejectAll = () => {
    saveConsent({
      analytics: false,
      marketing: false,
      preferences: false,
    });
  };

  const handleAcceptSelected = () => {
    saveConsent(consent);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Banner Principal */}
      <div className="fixed bottom-0 left-0 right-0 z-50 glass-panel rounded-t-2xl border-b-0 m-4 mb-0 max-w-md mx-auto sm:max-w-full">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">🍪 Consentimiento de Cookies</h3>
            <p className="text-sm text-slate-300 mt-2">
              Usamos cookies para mejorar tu experiencia. Algunos son esenciales para funcionamiento,
              otros ayudan con analytics y marketing.{' '}
              <a href="/privacy" className="text-brand-secondary hover:underline">
                Lee nuestra política de privacidad
              </a>
            </p>
          </div>

          {!showDetails ? (
            /* Botones Principales */
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 rounded-lg border border-slate-500 hover:bg-slate-800 transition-colors"
              >
                Rechazar Todo
              </button>
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 rounded-lg border border-brand-secondary text-brand-secondary hover:bg-brand-secondary/10 transition-colors"
              >
                Personalizar
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-lg bg-brand-primary text-brand-primary-hover font-medium hover:bg-brand-primary-hover transition-colors"
              >
                Aceptar Todo
              </button>
            </div>
          ) : (
            /* Detalles Personalizados */
            <div className="space-y-4 border-t border-slate-700 pt-4">
              <div className="space-y-3">
                {/* Essentials (siempre activado) */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="w-4 h-4 cursor-not-allowed"
                  />
                  <div>
                    <p className="font-medium">Esenciales (Requerido)</p>
                    <p className="text-xs text-slate-400">Necesarias para funcionamiento básico</p>
                  </div>
                </label>

                {/* Analytics */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.analytics || false}
                    onChange={(e) =>
                      setConsent({ ...consent, analytics: e.target.checked })
                    }
                    className="w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <p className="font-medium">Analytics</p>
                    <p className="text-xs text-slate-400">
                      Ayuda a entender cómo usas la app
                    </p>
                  </div>
                </label>

                {/* Marketing */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.marketing || false}
                    onChange={(e) =>
                      setConsent({ ...consent, marketing: e.target.checked })
                    }
                    className="w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <p className="font-medium">Marketing</p>
                    <p className="text-xs text-slate-400">
                      Para personalizar contenido y anuncios
                    </p>
                  </div>
                </label>

                {/* Preferences */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.preferences || false}
                    onChange={(e) =>
                      setConsent({ ...consent, preferences: e.target.checked })
                    }
                    className="w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <p className="font-medium">Preferencias</p>
                    <p className="text-xs text-slate-400">
                      Recuerda tus configuraciones
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-700 pt-4">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 rounded-lg border border-slate-500 hover:bg-slate-800 transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={handleAcceptSelected}
                  className="px-4 py-2 rounded-lg bg-brand-primary text-brand-primary-hover font-medium hover:bg-brand-primary-hover transition-colors"
                >
                  Guardar Preferencias
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay para oscurecer fondo */}
      {showBanner && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
      )}
    </>
  );
}

// Declaración global para window.gtag
declare global {
  interface Window {
    gtag?: (
      action: string,
      command: string,
      params: Record<string, unknown>
    ) => void;
  }
}

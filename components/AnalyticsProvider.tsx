'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { initializeAnalytics, trackPageView } from '@/lib/analytics';

/** Inicializa GA4 una sola vez y registra cada cambio de ruta. */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    const measurementId =
      process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
    if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) return;
    initializeAnalytics(measurementId);
    initialized.current = true;
  }, []);

  useEffect(() => {
    if (!initialized.current || !pathname) return;
    trackPageView(pathname, document.title);
  }, [pathname]);

  return null;
}

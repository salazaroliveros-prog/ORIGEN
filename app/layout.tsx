// app/layout.tsx - Layout raíz: viewport móvil, metadata PWA y notificaciones globales
/* eslint-disable @next/next/no-page-custom-font */

import type { Metadata, Viewport } from 'next';
import { GlobalToaster } from '@/components/ui/GlobalToaster';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Permite zoom (accesibilidad WCAG 1.4.4) sin desactivar el viewport adaptable.
  maximumScale: 5,
  // Extiende la app bajo el notch / barra de gestos y permite respetar los insets.
  viewportFit: 'cover',
  themeColor: '#1f2937',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  title: 'ORIGEN ERP Guatemala',
  description:
    'ERP integral para construcción con gestión de proyectos, APU, cotizaciones y personal',
  applicationName: 'ORIGEN ERP',
  // URL canónica única: evita que los 3 alias de Vercel generen contenido duplicado.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://origen-one-kohl.vercel.app'),
  alternates: { canonical: '/' },

  // Icon definitions - rutas reales existentes en /assets/branding
  icons: {
    icon: [
      { url: '/assets/branding/favicon.ico', type: 'image/x-icon' },
      { url: '/assets/branding/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/branding/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/assets/branding/apple-touch-icon.png', type: 'image/png' }],
  },

  // Manifest with optimized images
  manifest: '/site.webmanifest',

  // Open Graph - Optimized images
  openGraph: {
    type: 'website',
    locale: 'es_GT',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://origen-one-kohl.vercel.app',
    siteName: 'ORIGEN ERP Guatemala',
    title: 'ORIGEN ERP Guatemala',
    description:
      'ERP integral para construcción. Gestión de proyectos, APU, cotizaciones y personal',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://origen-one-kohl.vercel.app'}/assets/branding/web-banner-logo.png`,
        width: 1200,
        height: 630,
        alt: 'ORIGEN ERP',
        type: 'image/png',
      },
    ],
  },

  // Twitter Card - Optimized
  twitter: {
    card: 'summary_large_image',
    title: 'ORIGEN ERP Guatemala',
    description:
      'ERP integral para construcción. Gestión de proyectos, APU, cotizaciones y personal',
    images: [
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://origen-one-kohl.vercel.app'}/assets/branding/web-banner-logo.png`,
    ],
  },

  // Mobile optimization (el viewport se exporta arriba, no en metadata - Next 15)
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ORIGEN ERP',
  },

  // PWA setup
  formatDetection: {
    email: false,
    telephone: false,
  },
};

// JSON-LD Schema with optimized image
const schema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ORIGEN ERP',
  description:
    'ERP integral para construcción con gestión de proyectos, APU, cotizaciones y personal',
  applicationCategory: 'BusinessApplication',
  image: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://origen-one-kohl.vercel.app'}/assets/branding/web-banner-logo.png`,
  operatingSystem: 'Web',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://origen-one-kohl.vercel.app',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '250',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-GT">
      <head>
        {/* JSON-LD Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />

        {/* Preconnect to external services */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Fonts - with font-display: swap for LCP optimization */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* DNS Prefetch for external APIs */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      </head>

      <body className="bg-gray-50 dark:bg-gray-900">
        {/* WCAG 2.4.1 Bypass Blocks: permite a usuarios de teclado y lectores de pantalla saltar la navegación. */}
        <a
          href="#main-content"
          className="focus:white-space-normal focus:margin-0 sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:h-auto focus:w-auto focus:overflow-visible focus:rounded focus:bg-brand-400 focus:px-4 focus:py-2 focus:font-semibold focus:text-slate-950"
        >
          Saltar al contenido principal
        </a>
        <AnalyticsProvider />
        {children}
        <GlobalToaster />
        <footer className="border-t border-white/10 bg-slate-950 px-4 py-3 text-center text-[11px] text-slate-400">
          ORIGEN ERP Guatemala ·{' '}
          <a href="/privacy" className="text-amber-400 hover:underline">
            Política de Privacidad
          </a>{' '}
          ·{' '}
          <a href="/terms" className="text-amber-400 hover:underline">
            Términos y Condiciones
          </a>
        </footer>

        {/* Performance monitoring script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('load', () => {
                if (window.performance && window.performance.timing) {
                  const timing = window.performance.timing;
                  const loadTime = timing.loadEventEnd - timing.navigationStart;
                  console.log('Page Load Time:', loadTime + 'ms');
                  
                  // Send to monitoring if needed
                  if (navigator.sendBeacon) {
                    navigator.sendBeacon('/api/metrics', JSON.stringify({
                      type: 'page_load',
                      duration: loadTime,
                      timestamp: new Date().toISOString()
                    }));
                  }
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}

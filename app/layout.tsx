// app/layout.tsx - UPDATED with WebP/AVIF image optimization
/* eslint-disable @next/next/no-page-custom-font */

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1f2937',
};

export const metadata: Metadata = {
  title: 'ORIGEN ERP Guatemala',
  description:
    'ERP integral para construcción con gestión de proyectos, APU, cotizaciones y personal',
  applicationName: 'ORIGEN ERP',

  // Icon definitions (archivos reales en /assets/branding)
  icons: {
    icon: [
      {
        url: '/assets/branding/favicon.ico',
        type: 'image/x-icon',
      },
      {
        url: '/assets/branding/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/assets/branding/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/assets/branding/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },

  // Manifest with optimized images
  manifest: '/site.webmanifest',

  // Open Graph - Optimized images
  openGraph: {
    type: 'website',
    locale: 'es_GT',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://origen-erp.vercel.app',
    siteName: 'ORIGEN ERP Guatemala',
    title: 'ORIGEN ERP Guatemala',
    description:
      'ERP integral para construcción. Gestión de proyectos, APU, cotizaciones y personal',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://origen-erp.vercel.app'}/images-optimized/og-image.webp`,
        width: 1200,
        height: 630,
        alt: 'ORIGEN ERP',
        type: 'image/webp',
      },
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://origen-erp.vercel.app'}/og-image.png`,
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
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://origen-erp.vercel.app'}/images-optimized/twitter-image.webp`,
    ],
  },

  // Mobile optimization (viewport se exporta arriba, no aquí)
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
  image: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://origen-erp.vercel.app'}/images-optimized/logo.webp`,
  operatingSystem: 'Web',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://origen-erp.vercel.app',
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
        <AnalyticsProvider />
        {children}
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

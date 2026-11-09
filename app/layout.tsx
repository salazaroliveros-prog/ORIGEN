import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import './polyfills';
import { SentinelIOTDashboard } from '@/components/sentinel-dashboard';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#0f172a',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://origen-one-kohl.vercel.app'),
  title: 'ConstructERP Guatemala - Control de Obras y Firma Digital',
  description:
    'ERP integral para arquitectos y constructoras en Guatemala: control de obras, presupuestos APU, planillas IGSS, firma digital de capataces y gestión de maquinaria.',
  applicationName: 'ConstructERP Guatemala',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'ConstructERP Guatemala',
    description: 'ERP integral para arquitectos y constructoras en Guatemala.',
    type: 'website',
    url: '/',
    siteName: 'ConstructERP Guatemala',
    images: [{ url: '/assets/branding/web-banner-logo.png', width: 153, height: 153 }],
  },
  twitter: {
    card: 'summary',
    title: 'ConstructERP Guatemala',
    description: 'ERP integral para arquitectos y constructoras en Guatemala.',
    images: [{ url: '/assets/branding/web-banner-logo.png' }],
  },
  icons: {
    icon: [
      { url: '/assets/branding/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/assets/branding/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/branding/favicon.ico', sizes: 'any', type: 'image/x-icon' },
    ],
    apple: [{ url: '/assets/branding/apple-touch-icon.png', sizes: '180x180' }],
    other: [{ rel: 'mask-icon', url: '/assets/branding/icon-192x192.png', color: '#0f172a' }],
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ConstructERP',
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className="h-full touch-manipulation">
      <head>
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="#0f172a" />
        <link
          rel="apple-touch-startup-image"
          href="/assets/branding/apple-touch-icon.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/assets/branding/apple-touch-icon.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/assets/branding/apple-touch-icon.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/assets/branding/apple-touch-icon.png"
          media="(device-width: 393px) and (device-height: 851px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/assets/branding/apple-touch-icon.png"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/assets/branding/apple-touch-icon.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/assets/branding/apple-touch-icon.png"
          media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)"
        />
      </head>
      <body className="h-full min-h-screen overflow-x-hidden bg-bg-ambient text-slate-100 antialiased selection:bg-brand-primary selection:text-slate-950">
        <SentinelIOTDashboard className="fixed top-0 right-0 w-64 h-full z-50 md:hidden" />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              fontSize: '14px',
              maxWidth: '420px',
              backdropFilter: 'blur(12px)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#0f172a' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
          }}
        />
        {children}
        <SentinelIOTDashboard className="fixed top-0 right-0 w-64 h-screen z-50 hidden md:block" />
      </body>
    </html>
  );
}

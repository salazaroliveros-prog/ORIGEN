import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://origen-one-kohl.vercel.app'),
  title: 'ConstructERP Guatemala - Control de Obras y Firma Digital',
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className="h-full touch-manipulation">
      <head>
        <meta
          name="description"
          content="ERP integral para arquitectos y constructoras en Guatemala: control de obras, presupuestos APU, planillas y firma digital de capataces."
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ConstructERP" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="handheld-friendly" content="true" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="format-detection" content="address=no" />
        <meta name="format-detection" content="email=no" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/branding/apple-touch-icon.png" />
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
        <link rel="icon" sizes="any" href="/assets/branding/favicon.ico" />
        <link rel="mask-icon" href="/assets/branding/icon-192x192.png" color="#0f172a" />
      </head>
      <body className="h-full min-h-screen overflow-x-hidden text-slate-100 antialiased selection:bg-sky-400 selection:text-slate-950">
        <Toaster position="bottom-right" />
        {children}
      </body>
    </html>
  );
}

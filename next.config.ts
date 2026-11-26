import type { NextConfig } from 'next';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig: NextConfig = {
  // ============================================
  // SECURITY HEADERS
  // ============================================

  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          // HTTP Strict Transport Security (HSTS)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },

          // X-Frame-Options: Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },

          // X-Content-Type-Options: Prevent MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },

          // Referrer-Policy: Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },

          // Content Security Policy
          // 'unsafe-inline' en script-src y style-src es REQUERIDO: Next.js inyecta
          // scripts de hidratación (__next_f) y CSS crítico en línea, y la app usa
          // faked de estilos inline (recharts/motion) y <script> inline en layout.
          // Sin estas directivas o un nonce, la hidratación y el PWA worker se rompen.
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://www.gstatic.com https://www.google.com https://apis.google.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "img-src 'self' https: blob: data:; " +
              "font-src 'self' https://fonts.gstatic.com data:; " +
              "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google-analytics.com https://www.googletagmanager.com https://www.google.com https://www.gstatic.com https://recaptcha.google.com wss://*.firebaseio.com blob: data:; " +
              "frame-src 'self' https://www.google.com https://recaptcha.google.com https://accounts.google.com https://*.firebaseapp.com; " +
              "worker-src 'self' blob:; " +
              "manifest-src 'self'; " +
              "object-src 'none'; " +
              "base-uri 'self'; " +
              "form-action 'self'; " +
              'upgrade-insecure-requests; ' +
              'block-all-mixed-content;',
          },

          // Permissions-Policy (formerly Feature-Policy)
          {
            key: 'Permissions-Policy',
            value:
              'accelerometer=(), ' +
              'ambient-light-sensor=(), ' +
              'autoplay=(), ' +
              'battery=(), ' +
              'camera=(self), ' +
              'clipboard-read=(), ' +
              'clipboard-write=(self), ' +
              'geolocation=(self), ' +
              'gyroscope=(), ' +
              'magnetometer=(), ' +
              'microphone=(), ' +
              'payment=(), ' +
              'usb=(), ' +
              'vr=(), ' +
              'xr-spatial-tracking=()',
          },

          // X-DNS-Prefetch-Control
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },

          // X-Permitted-Cross-Domain-Policies
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
        ],
      },
    ];
  },

  // ============================================
  // OUTPUT & BUILD CONFIGURATION
  // ============================================

  outputFileTracingRoot: __dirname,
  // Necesario para `npm run start` (`.next/standalone/server.js`).
  output: 'standalone',

  compress: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // ============================================
  // BUILD OPTIMIZATIONS
  // ============================================

  productionBrowserSourceMaps: false,

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        runtimeChunk: 'single',
      };
    }
    return config;
  },

  // ============================================
  // SERVER EXTERNAL PACKAGES (Firebase, GCP)
  // ============================================

  serverExternalPackages: ['@google-cloud/firestore', '@firebase/app', '@firebase/auth'],

  // ============================================
  // EXPERIMENTAL FEATURES
  // ============================================

  experimental: {
    // Optimiza imports "barrel" de librerías con muchos exports (iconos, etc.)
    // Solo se listan paquetes realmente instalados.
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;

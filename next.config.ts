import type { NextConfig } from 'next';

// Cada corrida E2E recibe una carpeta de compilación exclusiva. Así no lee
// chunks antiguos de .next ni pisa la compilación de otro servidor local.
const e2eRunId = process.env.ORIGEN_E2E_RUN_ID;
const isolatedE2EDistDir =
  e2eRunId && /^[a-f0-9]{16}$/.test(e2eRunId) ? `.next-e2e-${e2eRunId}` : '.next';
const isolatedE2ETsConfig =
  e2eRunId && process.env.ORIGEN_E2E_TSCONFIG_PATH === `.tsconfig.e2e-${e2eRunId}.json`
    ? process.env.ORIGEN_E2E_TSCONFIG_PATH
    : undefined;

const nextConfig: NextConfig = {
  distDir: isolatedE2EDistDir,
  ...(isolatedE2ETsConfig ? { typescript: { tsconfigPath: isolatedE2ETsConfig } } : {}),
  outputFileTracingRoot: process.cwd(),
  output: 'standalone',
  devIndicators: false,
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // El explorador de segmentos de Next DevTools provoca errores 500 en el
    // servidor de desarrollo durante corridas largas. No aporta nada a la app.
    devtoolSegmentExplorer: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  reactStrictMode: true,
  transpilePackages: [],
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  // ESLint se ejecuta explícitamente en CI antes de compilar.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

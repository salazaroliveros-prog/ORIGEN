import type { CompanySettings } from '@/lib/types';

const STORAGE_KEY = 'constructerp_company_branding';
const DEFAULT_LOGO_URL = '/assets/branding/web-banner-logo.png';
const DEFAULT_LOGO_SMALL = '/assets/branding/icon-192x192.png';
const DEFAULT_LOGO_SQUARE = '/assets/branding/icon-512x512.png';

export type BrandingConfig = {
  logoUrl: string;
  logoSmallUrl: string;
  logoSquareUrl: string;
  bannerUrl: string;
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
};

export const DEFAULT_BRANDING: BrandingConfig = {
  logoUrl: DEFAULT_LOGO_URL,
  logoSmallUrl: DEFAULT_LOGO_SMALL,
  logoSquareUrl: DEFAULT_LOGO_SQUARE,
  bannerUrl: DEFAULT_LOGO_URL,
  companyName: 'ConstructERP Guatemala',
  primaryColor: '#0f172a',
  secondaryColor: '#38bdf8',
};

export const KNOWN_LOGO_PATHS = [
  '/assets/branding/web-banner-logo.png',
  '/assets/branding/report-letterhead-logo.png',
  '/assets/branding/icon-192x192.png',
  '/assets/branding/icon-512x512.png',
  '/assets/branding/apple-touch-icon.png',
];

export function loadBranding(): BrandingConfig {
  if (typeof window === 'undefined') return DEFAULT_BRANDING;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<BrandingConfig>;
      return { ...DEFAULT_BRANDING, ...parsed };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return DEFAULT_BRANDING;
}

export function saveBranding(config: BrandingConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('constructerp:branding-updated', { detail: config }));
  } catch {
    console.warn('Branding storage unavailable, using in-memory defaults.');
  }
}

export function detectUploadedLogo(file: File): string {
  if (!file || !(file as any).arrayBuffer) return DEFAULT_LOGO_URL;
  return URL.createObjectURL(file);
}

export function revokeLogoUrl(url: string): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export function isCustomLogo(url: string): boolean {
  return !KNOWN_LOGO_PATHS.includes(url) && url.startsWith('blob:');
}

export function mergeBrandingIntoCompanySettings(
  company: CompanySettings,
  branding: BrandingConfig
): CompanySettings {
  return {
    ...company,
    logoUrl: branding.logoUrl,
    logoSmallUrl: branding.logoSmallUrl,
    logoSquareUrl: branding.logoSquareUrl,
    bannerUrl: branding.bannerUrl,
    commercialName: branding.companyName || company.commercialName,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
  };
}

export function applyBrandingToDocument(branding: BrandingConfig): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--brand-primary', branding.primaryColor);
  root.style.setProperty('--brand-secondary', branding.secondaryColor);
  root.style.setProperty('--brand-logo-url', branding.logoUrl);

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', branding.primaryColor);

  const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleMeta) appleMeta.setAttribute('content', branding.companyName);
}

export function subscribeToBrandingUpdates(callback: (config: BrandingConfig) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: CustomEvent) => {
    callback(event.detail as BrandingConfig);
  };

  window.addEventListener('constructerp:branding-updated', handler as EventListener);
  return () => {
    window.removeEventListener('constructerp:branding-updated', handler as EventListener);
  };
}

export function getResponsiveLogoUrl(branding: BrandingConfig, variant: 'banner' | 'small' | 'square' = 'banner'): string {
  switch (variant) {
    case 'small':
      return branding.logoSmallUrl;
    case 'square':
      return branding.logoSquareUrl;
    default:
      return branding.logoUrl;
  }
}

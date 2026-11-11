import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  DEFAULT_BRANDING,
  loadBranding,
  saveBranding,
  detectUploadedLogo,
  revokeLogoUrl,
  isCustomLogo,
  mergeBrandingIntoCompanySettings,
  applyBrandingToDocument,
  subscribeToBrandingUpdates,
  getResponsiveLogoUrl,
  KNOWN_LOGO_PATHS,
} from './branding';

describe('lib/branding', () => {
  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalLocalStorage = global.localStorage;
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  beforeEach(() => {
    Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true, configurable: true });
    Object.defineProperty(global, 'window', {
      value: { ...originalWindow, localStorage: localStorageMock, dispatchEvent: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global, 'document', {
      value: { ...originalDocument, documentElement: { style: { setProperty: vi.fn() } }, querySelector: vi.fn(() => null) },
      writable: true,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.window = originalWindow;
    global.document = originalDocument;
    global.localStorage = originalLocalStorage;
    vi.restoreAllMocks();
  });

  describe('DEFAULT_BRANDING', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_BRANDING.companyName).toBe('ConstructERP Guatemala');
      expect(DEFAULT_BRANDING.primaryColor).toBe('#0f172a');
      expect(DEFAULT_BRANDING.secondaryColor).toBe('#38bdf8');
      expect(DEFAULT_BRANDING.logoUrl).toBe('/assets/branding/web-banner-logo.png');
    });
  });

  describe('KNOWN_LOGO_PATHS', () => {
    it('should contain known logo paths', () => {
      expect(KNOWN_LOGO_PATHS).toContain('/assets/branding/web-banner-logo.png');
      expect(KNOWN_LOGO_PATHS).toContain('/assets/branding/icon-192x192.png');
    });
  });

  describe('loadBranding', () => {
    it('should return DEFAULT_BRANDING when window is undefined', () => {
      Object.defineProperty(global, 'window', { value: undefined, writable: true, configurable: true });
      expect(loadBranding()).toBe(DEFAULT_BRANDING);
      Object.defineProperty(global, 'window', { value: { ...originalWindow, localStorage: localStorageMock, dispatchEvent: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }, writable: true, configurable: true });
    });

    it('should return DEFAULT_BRANDING when no stored data', () => {
      vi.mocked(localStorageMock.getItem).mockReturnValue(null as any);
      expect(loadBranding()).toEqual(DEFAULT_BRANDING);
    });

    it('should merge stored branding with defaults', () => {
      vi.mocked(localStorageMock.getItem).mockReturnValue(
        JSON.stringify({ companyName: 'Mi Empresa', primaryColor: '#ff0000' })
      );
      const result = loadBranding();
      expect(result.companyName).toBe('Mi Empresa');
      expect(result.primaryColor).toBe('#ff0000');
      expect(result.secondaryColor).toBe('#38bdf8'); // from default
    });

    it('should handle corrupted stored data', () => {
      vi.mocked(localStorageMock.getItem).mockReturnValue('not-json');
      expect(loadBranding()).toEqual(DEFAULT_BRANDING);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('saveBranding', () => {
    it('should save to localStorage and dispatch event', () => {
      const config = { ...DEFAULT_BRANDING, companyName: 'Test Co' };
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      saveBranding(config);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'constructerp_company_branding',
        JSON.stringify(config)
      );
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('should do nothing when window is undefined', () => {
      Object.defineProperty(global, 'window', { value: undefined, writable: true, configurable: true });
      expect(() => saveBranding(DEFAULT_BRANDING)).not.toThrow();
      Object.defineProperty(global, 'window', { value: { ...originalWindow, localStorage: localStorageMock, dispatchEvent: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }, writable: true, configurable: true });
    });
  });

  describe('detectUploadedLogo', () => {
    it('should return default URL for invalid file', () => {
      expect(detectUploadedLogo(null as any)).toBe('/assets/branding/web-banner-logo.png');
      expect(detectUploadedLogo(undefined as any)).toBe('/assets/branding/web-banner-logo.png');
    });

    it('should create blob URL for valid file', () => {
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      const file = { arrayBuffer: vi.fn() } as unknown as File;
      const url = detectUploadedLogo(file);
      expect(url).toBe('blob:mock-url');
      expect(createObjectURLSpy).toHaveBeenCalledWith(file);
      createObjectURLSpy.mockRestore();
    });
  });

  describe('revokeLogoUrl', () => {
    it('should revoke blob URLs', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      revokeLogoUrl('blob:http://localhost/123');
      expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/123');
    });

    it('should not revoke non-blob URLs', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      revokeLogoUrl('/assets/branding/logo.png');
      expect(revokeSpy).not.toHaveBeenCalled();
    });
  });

  describe('isCustomLogo', () => {
    it('should return false for known paths', () => {
      expect(isCustomLogo('/assets/branding/web-banner-logo.png')).toBe(false);
    });

    it('should return true for blob URLs not in known paths', () => {
      expect(isCustomLogo('blob:http://localhost/custom')).toBe(true);
    });

    it('should return false for non-blob URLs not in known paths', () => {
      expect(isCustomLogo('/other/path.png')).toBe(false);
    });
  });

  describe('mergeBrandingIntoCompanySettings', () => {
    it('should merge branding into company settings', () => {
      const company = { commercialName: 'Old Name', logoUrl: 'old.png' } as any;
      const branding = {
        companyName: 'New Co',
        logoUrl: 'new.png',
        logoSmallUrl: 'small.png',
        logoSquareUrl: 'square.png',
        bannerUrl: 'banner.png',
        primaryColor: '#red',
        secondaryColor: '#blue',
      };
      const result = mergeBrandingIntoCompanySettings(company, branding);
      expect(result.commercialName).toBe('New Co');
      expect(result.logoUrl).toBe('new.png');
      expect(result.primaryColor).toBe('#red');
    });
  });

  describe('applyBrandingToDocument', () => {
    it('should do nothing when document is undefined', () => {
      Object.defineProperty(global, 'document', { value: undefined, writable: true, configurable: true });
      expect(() => applyBrandingToDocument(DEFAULT_BRANDING)).not.toThrow();
      Object.defineProperty(global, 'document', { value: { ...originalDocument, documentElement: { style: { setProperty: vi.fn() } }, querySelector: vi.fn(() => null) }, writable: true, configurable: true });
    });

    it('should set CSS custom properties', () => {
      const setPropertySpy = vi.fn();
      Object.defineProperty(global, 'document', {
        value: {
          ...originalDocument,
          documentElement: { style: { setProperty: setPropertySpy } },
          querySelector: vi.fn(() => null),
        },
        writable: true,
        configurable: true,
      });
      applyBrandingToDocument(DEFAULT_BRANDING);
      expect(setPropertySpy).toHaveBeenCalledWith('--brand-primary', '#0f172a');
      expect(setPropertySpy).toHaveBeenCalledWith('--brand-secondary', '#38bdf8');
    });
  });

  describe('subscribeToBrandingUpdates', () => {
    it('should return no-op when window is undefined', () => {
      Object.defineProperty(global, 'window', { value: undefined, writable: true, configurable: true });
      const unsubscribe = subscribeToBrandingUpdates(() => {});
      expect(typeof unsubscribe).toBe('function');
      Object.defineProperty(global, 'window', { value: { ...originalWindow, localStorage: localStorageMock, dispatchEvent: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }, writable: true, configurable: true });
    });

    it('should add and remove event listener', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const callback = vi.fn();
      const unsubscribe = subscribeToBrandingUpdates(callback);
      expect(addSpy).toHaveBeenCalledWith('constructerp:branding-updated', expect.any(Function));
      unsubscribe();
      expect(removeSpy).toHaveBeenCalledWith('constructerp:branding-updated', expect.any(Function));
    });
  });

  describe('getResponsiveLogoUrl', () => {
    it('should return banner variant by default', () => {
      expect(getResponsiveLogoUrl(DEFAULT_BRANDING)).toBe(DEFAULT_BRANDING.logoUrl);
    });

    it('should return small variant', () => {
      expect(getResponsiveLogoUrl(DEFAULT_BRANDING, 'small')).toBe(DEFAULT_BRANDING.logoSmallUrl);
    });

    it('should return square variant', () => {
      expect(getResponsiveLogoUrl(DEFAULT_BRANDING, 'square')).toBe(DEFAULT_BRANDING.logoSquareUrl);
    });
  });
});

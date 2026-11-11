import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  firebaseRuntimeConfig,
  getGeminiApiKey,
  getFirebaseConfig,
  hasFirebaseRuntimeConfig,
  readNumber,
  normalizeText,
} from './config';

describe('lib/config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Reset the cached config object
    Object.assign(firebaseRuntimeConfig, {
      projectId: '',
      apiKey: '',
      authDomain: '',
      appId: '',
      storageBucket: '',
      messagingSenderId: '',
      measurementId: '',
      firestoreDatabaseId: '',
      appCheckRecaptchaKey: '',
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllEnvs();
  });

  describe('firebaseRuntimeConfig', () => {
    it('should return config object with all fields', () => {
      const config = getFirebaseConfig();
      expect(config).toHaveProperty('projectId');
      expect(config).toHaveProperty('apiKey');
      expect(config).toHaveProperty('authDomain');
      expect(config).toHaveProperty('appId');
      expect(config).toHaveProperty('storageBucket');
      expect(config).toHaveProperty('messagingSenderId');
      expect(config).toHaveProperty('measurementId');
      expect(config).toHaveProperty('firestoreDatabaseId');
      expect(config).toHaveProperty('appCheckRecaptchaKey');
    });

    it('should default to empty strings when env vars are missing', () => {
      Object.assign(firebaseRuntimeConfig, {
        projectId: '',
        apiKey: '',
        appId: '',
      });
      const config = getFirebaseConfig();
      expect(config.projectId).toBe('');
      expect(config.apiKey).toBe('');
      expect(config.appId).toBe('');
    });
  });

  describe('getGeminiApiKey', () => {
    it('should return trimmed Gemini API key', () => {
      process.env.GEMINI_API_KEY = '  gemini-key-123  ';
      expect(getGeminiApiKey()).toBe('gemini-key-123');
    });

    it('should return empty string when not set', () => {
      delete process.env.GEMINI_API_KEY;
      expect(getGeminiApiKey()).toBe('');
    });
  });

  describe('hasFirebaseRuntimeConfig', () => {
    it('should return true when required config is present', () => {
      Object.assign(firebaseRuntimeConfig, {
        projectId: 'proj',
        apiKey: 'key',
        appId: 'app',
        authDomain: 'domain',
      });
      expect(hasFirebaseRuntimeConfig()).toBe(true);
    });

    it('should return false when required config is missing', () => {
      Object.assign(firebaseRuntimeConfig, {
        projectId: '',
        apiKey: '',
        appId: '',
        authDomain: '',
      });
      expect(hasFirebaseRuntimeConfig()).toBe(false);
    });
  });

  describe('readNumber', () => {
    it('should return finite numbers as-is', () => {
      expect(readNumber(42)).toBe(42);
      expect(readNumber(3.14)).toBe(3.14);
      expect(readNumber(0)).toBe(0);
    });

    it('should return fallback for non-finite numbers', () => {
      expect(readNumber(Infinity, 99)).toBe(99);
      expect(readNumber(NaN, 99)).toBe(99);
    });

    it('should parse numeric strings', () => {
      expect(readNumber('42', 0)).toBe(42);
      expect(readNumber('  100  ', 0)).toBe(100);
    });

    it('should return fallback for non-numeric strings', () => {
      expect(readNumber('abc', 99)).toBe(99);
      expect(readNumber('', 99)).toBe(99);
    });

    it('should return fallback for null/undefined/objects', () => {
      expect(readNumber(null, 99)).toBe(99);
      expect(readNumber(undefined, 99)).toBe(99);
      expect(readNumber({}, 99)).toBe(99);
    });
  });

  describe('normalizeText', () => {
    it('should trim strings', () => {
      expect(normalizeText('  hello  ')).toBe('hello');
      expect(normalizeText('\tworld\n')).toBe('world');
    });

    it('should return fallback for non-strings', () => {
      expect(normalizeText(null, 'default')).toBe('default');
      expect(normalizeText(undefined, 'default')).toBe('default');
      expect(normalizeText(42, 'default')).toBe('default');
    });

    it('should return empty string fallback by default', () => {
      expect(normalizeText(null)).toBe('');
      expect(normalizeText(undefined)).toBe('');
    });
  });
});

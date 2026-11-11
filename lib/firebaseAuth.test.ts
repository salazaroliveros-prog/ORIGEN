import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock de firebaseService
const mockGetAuthOrThrow = vi.hoisted(() => vi.fn());
const mockNotifySyncStart = vi.hoisted(() => vi.fn());
const mockNotifySyncEnd = vi.hoisted(() => vi.fn());

vi.mock('./firebaseService', () => ({
  getAuthOrThrow: () => mockGetAuthOrThrow(),
  notifySyncStart: mockNotifySyncStart,
  notifySyncEnd: mockNotifySyncEnd,
  firebaseConfigured: true,
  app: null,
  auth: null,
  db: null,
  storage: null,
}));

// Mock de authErrors
const mockGetAuthErrorMessage = vi.hoisted(() => vi.fn((error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
}));

vi.mock('./authErrors', () => ({
  getAuthErrorMessage: (error: unknown) => mockGetAuthErrorMessage(error),
}));

// Mock de firebase/auth
const mockSignInWithEmailAndPassword = vi.hoisted(() => vi.fn());
const mockCreateUserWithEmailAndPassword = vi.hoisted(() => vi.fn());
const mockSendEmailVerification = vi.hoisted(() => vi.fn());
const mockSendPasswordResetEmail = vi.hoisted(() => vi.fn());
const mockSignOut = vi.hoisted(() => vi.fn());
const mockOnAuthStateChanged = vi.hoisted(() => vi.fn());
const mockSetPersistence = vi.hoisted(() => vi.fn());
const mockCredentialFromResult = vi.hoisted(() => vi.fn());
const mockGoogleAuthProvider: any = vi.hoisted(() => {
  const Cls: any = vi.fn(function MockGoogleAuthProvider(this: any) {
    this.addScope = vi.fn();
    this.setCustomParameters = vi.fn();
  });
  Cls.credentialFromResult = mockCredentialFromResult;
  return Cls;
});
const mockReauthenticateWithPopup = vi.hoisted(() => vi.fn());
const mockLinkWithPopup = vi.hoisted(() => vi.fn());

vi.mock('firebase/auth', () => ({
  browserLocalPersistence: 'local',
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUserWithEmailAndPassword(...args),
  GoogleAuthProvider: mockGoogleAuthProvider,
  linkWithPopup: (...args: any[]) => mockLinkWithPopup(...args),
  onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args),
  reauthenticateWithPopup: (...args: any[]) => mockReauthenticateWithPopup(...args),
  sendEmailVerification: (...args: any[]) => mockSendEmailVerification(...args),
  sendPasswordResetEmail: (...args: any[]) => mockSendPasswordResetEmail(...args),
  setPersistence: (...args: any[]) => mockSetPersistence(...args),
  signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
  signInWithPopup: vi.fn(),
  signOut: (...args: any[]) => mockSignOut(...args),
  type: {},
  User: class {},
  Auth: class {},
  Unsubscribe: class {},
  credentialFromResult: (...args: any[]) => mockCredentialFromResult(...args),
}));

import {
  signInWithEmail,
  createEmailAccount,
  resetEmailPassword,
  signOutUser,
  subscribeToAuthState,
  getCurrentAuth,
  isPrimaryAdministrator,
  authorizeGmailSend,
} from './firebaseAuth';

const mockUser = {
  uid: 'user-123',
  email: 'test@example.com',
  emailVerified: false,
  providerData: [],
  getIdToken: vi.fn(),
} as any;

const mockAuth = {
  currentUser: mockUser,
  providerData: [],
} as any;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthOrThrow.mockReturnValue(mockAuth);
  mockAuth.currentUser = mockUser;
  mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
  mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
  mockSendEmailVerification.mockResolvedValue(undefined);
  mockSendPasswordResetEmail.mockResolvedValue(undefined);
  mockSignOut.mockResolvedValue(undefined);
  mockSetPersistence.mockResolvedValue(undefined);
  mockOnAuthStateChanged.mockReturnValue(() => {});
  mockCredentialFromResult.mockReturnValue({ accessToken: 'token-123' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('firebaseAuth', () => {
  describe('isPrimaryAdministrator', () => {
    it('should return true when email matches PRIMARY_ADMIN_EMAIL', () => {
      vi.stubEnv('PRIMARY_ADMIN_EMAIL', 'admin@example.com');
      expect(isPrimaryAdministrator('admin@example.com')).toBe(true);
      expect(isPrimaryAdministrator('ADMIN@EXAMPLE.COM')).toBe(true);
      expect(isPrimaryAdministrator('  admin@example.com  ')).toBe(true);
      vi.unstubAllEnvs();
    });

    it('should return false when email does not match', () => {
      vi.stubEnv('PRIMARY_ADMIN_EMAIL', 'admin@example.com');
      expect(isPrimaryAdministrator('other@example.com')).toBe(false);
      vi.unstubAllEnvs();
    });

    it('should return false when PRIMARY_ADMIN_EMAIL is not set', () => {
      vi.unstubAllEnvs();
      expect(isPrimaryAdministrator('any@example.com')).toBe(false);
    });

    it('should return false when email is null or undefined', () => {
      vi.stubEnv('PRIMARY_ADMIN_EMAIL', 'admin@example.com');
      expect(isPrimaryAdministrator(null)).toBe(false);
      expect(isPrimaryAdministrator(undefined)).toBe(false);
      vi.unstubAllEnvs();
    });
  });

  describe('validateCredentials (indirect via signInWithEmail)', () => {
    it('should reject empty email', async () => {
      await expect(signInWithEmail('', 'password')).rejects.toThrow('El correo electrónico es requerido.');
    });

    it('should reject invalid email format', async () => {
      await expect(signInWithEmail('not-an-email', 'password')).rejects.toThrow('Escribe un correo electrónico válido.');
    });

    it('should reject empty password', async () => {
      await expect(signInWithEmail('test@example.com', '')).rejects.toThrow('La contraseña es requerida.');
    });

    it('should reject null email', async () => {
      await expect(signInWithEmail(null as any, 'password')).rejects.toThrow('El correo electrónico es requerido.');
    });
  });

  describe('signInWithEmail', () => {
    it('should sign in successfully with valid credentials', async () => {
      const result = await signInWithEmail('test@example.com', 'password123');
      expect(mockSetPersistence).toHaveBeenCalled();
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(mockAuth, 'test@example.com', 'password123');
      expect(result).toBe(mockUser);
    });

    it('should trim email before sending to Firebase', async () => {
      await signInWithEmail('  test@example.com  ', 'password123');
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(mockAuth, 'test@example.com', 'password123');
    });

    it('should handle Firebase auth errors', async () => {
      mockGetAuthErrorMessage.mockReturnValue('Credenciales inválidas');
      mockSignInWithEmailAndPassword.mockRejectedValue(new Error('auth/invalid-credential'));
      await expect(signInWithEmail('test@example.com', 'wrong')).rejects.toThrow('Credenciales inválidas');
    });
  });

  describe('createEmailAccount', () => {
    it('should create account and send verification email', async () => {
      const result = await createEmailAccount('new@example.com', 'password123');
      expect(mockSetPersistence).toHaveBeenCalled();
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(mockAuth, 'new@example.com', 'password123');
      expect(mockSendEmailVerification).toHaveBeenCalled();
      expect(result.verificationEmailSent).toBe(true);
      expect(result.user).toBe(mockUser);
    });

    it('should reject password shorter than 6 characters', async () => {
      await expect(createEmailAccount('new@example.com', '12345')).rejects.toThrow('La contraseña debe tener al menos 6 caracteres.');
    });

    it('should handle verification email failure gracefully', async () => {
      mockSendEmailVerification.mockRejectedValue(new Error('verification failed'));
      const result = await createEmailAccount('new@example.com', 'password123');
      expect(result.verificationEmailSent).toBe(false);
      expect((result as any).verificationEmailError).toBeDefined();
    });

    it('should reject invalid email', async () => {
      await expect(createEmailAccount('bad-email', 'password123')).rejects.toThrow('Escribe un correo electrónico válido.');
    });
  });

  describe('resetEmailPassword', () => {
    it('should send password reset email', async () => {
      await resetEmailPassword('test@example.com');
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(mockAuth, 'test@example.com');
    });

    it('should reject empty email', async () => {
      await expect(resetEmailPassword('')).rejects.toThrow('El correo electrónico es requerido.');
    });

    it('should reject invalid email format', async () => {
      await expect(resetEmailPassword('not-an-email')).rejects.toThrow('Escribe un correo electrónico válido.');
    });
  });

  describe('signOutUser', () => {
    it('should call signOut with auth', async () => {
      await signOutUser();
      expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
    });
  });

  describe('subscribeToAuthState', () => {
    it('should subscribe to auth state changes', () => {
      const onUser = vi.fn();
      const onError = vi.fn();
      const unsubscribe = subscribeToAuthState(onUser, onError);
      expect(mockOnAuthStateChanged).toHaveBeenCalledWith(mockAuth, onUser, onError);
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('getCurrentAuth', () => {
    it('should return the auth instance', () => {
      const auth = getCurrentAuth();
      expect(auth).toBe(mockAuth);
    });
  });

  describe('authorizeGmailSend', () => {
    it('should throw when no user is signed in', async () => {
      mockAuth.currentUser = null;
      await expect(authorizeGmailSend()).rejects.toThrow('Inicia sesión antes de autorizar el envío de correo.');
    });

    it('should link Google provider when user has no Google provider', async () => {
      mockUser.providerData = [];
      mockLinkWithPopup.mockResolvedValue({});
      const result = await authorizeGmailSend();
      expect(mockLinkWithPopup).toHaveBeenCalled();
      expect(result.accessToken).toBe('token-123');
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should reauthenticate when user already has Google provider', async () => {
      mockUser.providerData = [{ providerId: 'google.com' }];
      mockReauthenticateWithPopup.mockResolvedValue({});
      const result = await authorizeGmailSend();
      expect(mockReauthenticateWithPopup).toHaveBeenCalled();
      expect(result.accessToken).toBe('token-123');
    });

    it('should throw when Google returns no access token', async () => {
      mockCredentialFromResult.mockReturnValue(null);
      await expect(authorizeGmailSend()).rejects.toThrow('Google no devolvió permiso de Gmail');
    });
  });
});

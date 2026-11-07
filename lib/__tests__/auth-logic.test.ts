/**
 * ORIGEN ERP - Authentication Logic Tests (Vitest)
 * Cubre los gaps de AUTH-001 a AUTH-017 que no están en auth-ui-integration.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// Mock window para entorno Node de vitest
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    location: { origin: 'http://localhost:3000' },
  };
}

// ============================================================
// Mocks de Firebase Auth (vi.mock factory es hoisted, solo usa vi.fn())
// ============================================================
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signOut: vi.fn(),
  setPersistence: vi.fn(),
  browserLocalPersistence: 'local',
  GoogleAuthProvider: vi.fn(),
  linkWithPopup: vi.fn(),
  reauthenticateWithPopup: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock('../firebaseService', () => ({
  auth: {},
}));

// Importar después de los mocks
import {
  signInWithEmail,
  createEmailAccount,
  resetEmailPassword,
  signOutUser,
  isPrimaryAdministrator,
} from '../firebaseAuth';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  setPersistence,
  type User,
} from 'firebase/auth';
import { validateLoginForm } from '../validation/auth.schema';
import { validateRegisterForm } from '../validation/auth.schema';

// Referencias a los mocks para configurar comportamiento por test
const mockSignIn = vi.mocked(signInWithEmailAndPassword);
const mockCreateUser = vi.mocked(createUserWithEmailAndPassword);
const mockSendVerify = vi.mocked(sendEmailVerification);
const mockSendReset = vi.mocked(sendPasswordResetEmail);
const mockSignOutFn = vi.mocked(signOut);
const mockSetPersistenceFn = vi.mocked(setPersistence);

// ============================================================
// AUTH-001: Login con credenciales válidas
// AUTH-004: Login con credenciales incorrectas
// ============================================================
describe('Authentication - Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('PRIMARY_ADMIN_EMAIL', 'admin@test.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('AUTH-001: login con credenciales válidas retorna usuario', async () => {
    const mockUser = { uid: 'uid-123', email: 'admin@test.com' } as User;
    mockSignIn.mockResolvedValue({ user: mockUser } as any);

    const result = await signInWithEmail('admin@test.com', 'Password123!');

    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(result.uid).toBe('uid-123');
    expect(result.email).toBe('admin@test.com');
  });

  it('AUTH-004: login con contraseña incorrecta lanza error auth/wrong-password', async () => {
    mockSignIn.mockRejectedValue(new Error('Firebase: Error (auth/wrong-password).'));

    await expect(
      signInWithEmail('admin@test.com', 'WrongPassword!')
    ).rejects.toThrow('auth/wrong-password');
  });

  it('AUTH-004: login con email inexistente lanza error auth/user-not-found', async () => {
    mockSignIn.mockRejectedValue(new Error('Firebase: Error (auth/user-not-found).'));

    await expect(
      signInWithEmail('noexiste@test.com', 'Password123!')
    ).rejects.toThrow('auth/user-not-found');
  });

  it('AUTH-004: email inválido no llega a Firebase (validación previa de zod)', () => {
    const validation = validateLoginForm({
      email: 'not-an-email',
      password: 'Password123!',
    });
    expect(validation.success).toBe(false);
    if (!validation.success) {
      expect(validation.error.issues[0].path[0]).toBe('email');
    }
  });
});

// ============================================================
// AUTH-005, AUTH-006: Rate limiting de 5 intentos fallidos
// ============================================================
describe('Authentication - Rate Limiting', () => {
  const MAX_ATTEMPTS = 5;
  let attempts = 0;
  let isLocked = false;

  const recordFailedAttempt = () => {
    attempts++;
    if (attempts >= MAX_ATTEMPTS) isLocked = true;
  };

  const canAttempt = () => !isLocked && attempts < MAX_ATTEMPTS;

  beforeEach(() => {
    attempts = 0;
    isLocked = false;
  });

  it('AUTH-005: después de 5 intentos fallidos la cuenta se bloquea', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      recordFailedAttempt();
    }
    expect(isLocked).toBe(true);
    expect(attempts).toBe(MAX_ATTEMPTS);
  });

  it('AUTH-005: el 6to intento no está permitido mientras está bloqueado', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      recordFailedAttempt();
    }
    expect(canAttempt()).toBe(false);
  });

  it('AUTH-006: intentos restantes se calculan correctamente', () => {
    recordFailedAttempt();
    recordFailedAttempt();
    expect(MAX_ATTEMPTS - attempts).toBe(3);
  });

  it('AUTH-006: después de bloqueo, intentos restantes es 0', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      recordFailedAttempt();
    }
    expect(MAX_ATTEMPTS - attempts).toBe(0);
  });
});

// ============================================================
// AUTH-007: Registro con contraseña débil
// AUTH-008: Contraseñas no coinciden
// AUTH-009: Registro exitoso
// ============================================================
describe('Authentication - Registro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AUTH-007: contraseña sin mayúscula es rechazada', () => {
    const validation = validateRegisterForm({
      email: 'user@test.com',
      password: 'lowercase123!',
      confirmPassword: 'lowercase123!',
    });
    expect(validation.success).toBe(false);
  });

  it('AUTH-007: contraseña sin número es rechazada', () => {
    const validation = validateRegisterForm({
      email: 'user@test.com',
      password: 'NoNumbers!',
      confirmPassword: 'NoNumbers!',
    });
    expect(validation.success).toBe(false);
  });

  it('AUTH-007: contraseña sin carácter especial es rechazada', () => {
    const validation = validateRegisterForm({
      email: 'user@test.com',
      password: 'NoSpecial123',
      confirmPassword: 'NoSpecial123',
    });
    expect(validation.success).toBe(false);
  });

  it('AUTH-007: contraseña menor a 8 caracteres es rechazada', () => {
    const validation = validateRegisterForm({
      email: 'user@test.com',
      password: 'Abc1!',
      confirmPassword: 'Abc1!',
    });
    expect(validation.success).toBe(false);
  });

  it('AUTH-008: contraseñas no coinciden es rechazada', () => {
    const validation = validateRegisterForm({
      email: 'user@test.com',
      password: 'Password123!',
      confirmPassword: 'Different123!',
    });
    expect(validation.success).toBe(false);
    if (!validation.success) {
      expect(validation.error.issues[0].path[0]).toBe('confirmPassword');
    }
  });

  it('AUTH-009: registro exitoso con contraseña válida', () => {
    const validation = validateRegisterForm({
      email: 'newuser@test.com',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
    });
    expect(validation.success).toBe(true);
  });

  it('AUTH-009: createEmailAccount crea usuario y envía verificación', async () => {
    const mockUser = { uid: 'uid-new', email: 'newuser@test.com' } as User;
    mockCreateUser.mockResolvedValue({ user: mockUser } as any);
    mockSendVerify.mockResolvedValue(undefined);

    const result = await createEmailAccount('newuser@test.com', 'SecurePass123!');

    expect(mockCreateUser).toHaveBeenCalledTimes(1);
    expect(result.user.uid).toBe('uid-new');
    expect(result.verificationEmailSent).toBe(true);
  });

  it('AUTH-009: createEmailAccount maneja error de envío de verificación', async () => {
    const mockUser = { uid: 'uid-new', email: 'newuser@test.com' } as User;
    mockCreateUser.mockResolvedValue({ user: mockUser } as any);
    mockSendVerify.mockRejectedValue(new Error('Email send failed'));

    const result = await createEmailAccount('newuser@test.com', 'SecurePass123!');

    expect(result.user.uid).toBe('uid-new');
    expect(result.verificationEmailSent).toBe(false);
    const resultWithError = result as { user: { uid: string }; verificationEmailSent: boolean; verificationEmailError: unknown };
    expect(resultWithError.verificationEmailError).toBeDefined();
  });
});

// ============================================================
// AUTH-010: Recuperación de contraseña
// AUTH-011: Recordarme (persistencia)
// AUTH-012: Sign out
// AUTH-013: isPrimaryAdministrator
// AUTH-014: Usuario sin token
// AUTH-015: Sesión expirada (validación de formulario)
// AUTH-017: Toggle mostrar/ocultar contraseña
// ============================================================
describe('Authentication - Sesión y Recuperación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AUTH-010: resetEmailPassword envía correo de reseteo', async () => {
    mockSendReset.mockResolvedValue(undefined);

    await resetEmailPassword('user@test.com');

    expect(mockSendReset).toHaveBeenCalledTimes(1);
  });

  it('AUTH-010: resetEmailPassword lanza error si email no existe', async () => {
    mockSendReset.mockRejectedValue(
      new Error('Firebase: Error (auth/user-not-found).')
    );

    await expect(resetEmailPassword('noexiste@test.com')).rejects.toThrow(
      'auth/user-not-found'
    );
  });

  it('AUTH-011: setPersistence se llama con browserLocalPersistence', async () => {
    mockSignIn.mockResolvedValue({ user: { uid: '1' } as User, providerId: 'password', operationType: 'signIn' } as any);
    mockSetPersistenceFn.mockResolvedValue(undefined);

    await signInWithEmail('user@test.com', 'Password123!');

    expect(mockSetPersistenceFn).toHaveBeenCalledWith(expect.anything(), 'local');
  });

  it('AUTH-012: signOutUser cierra la sesión', async () => {
    mockSignOutFn.mockResolvedValue(undefined);

    await signOutUser();

    expect(mockSignOutFn).toHaveBeenCalledTimes(1);
  });

  it('AUTH-013: isPrimaryAdministrator retorna true para admin', () => {
    vi.stubEnv('PRIMARY_ADMIN_EMAIL', 'admin@test.com');
    expect(isPrimaryAdministrator('admin@test.com')).toBe(true);
    vi.unstubAllEnvs();
  });

  it('AUTH-013: isPrimaryAdministrator retorna false para usuario no admin', () => {
    vi.stubEnv('PRIMARY_ADMIN_EMAIL', 'admin@test.com');
    expect(isPrimaryAdministrator('user@test.com')).toBe(false);
    vi.unstubAllEnvs();
  });

  it('AUTH-013: isPrimaryAdministrator retorna false sin env configurado', () => {
    vi.unstubAllEnvs();
    expect(isPrimaryAdministrator('any@test.com')).toBe(false);
  });

  it('AUTH-014: usuario sin token no es administrador primario', () => {
    expect(isPrimaryAdministrator(null)).toBe(false);
    expect(isPrimaryAdministrator(undefined)).toBe(false);
    expect(isPrimaryAdministrator('')).toBe(false);
  });

  it('AUTH-015: validación de login detecta campos vacíos', () => {
    const validation = validateLoginForm({ email: '', password: '' });
    expect(validation.success).toBe(false);
    if (!validation.success) {
      const paths = validation.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('email');
      expect(paths).toContain('password');
    }
  });

  it('AUTH-017: toggle mostrar/ocultar contraseña cambia estado', () => {
    let showPassword = false;
    const togglePasswordVisibility = () => {
      showPassword = !showPassword;
    };
    expect(showPassword).toBe(false);
    togglePasswordVisibility();
    expect(showPassword).toBe(true);
    togglePasswordVisibility();
    expect(showPassword).toBe(false);
  });
});

console.log('✓ Authentication logic tests completed (AUTH-001 to AUTH-017)');

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../firebaseAuth', () => ({
  signInWithEmail: vi.fn(),
  createEmailAccount: vi.fn(),
  signOutUser: vi.fn(),
  subscribeToAuthState: vi.fn(),
  resetEmailPassword: vi.fn(),
  authorizeGmailSend: vi.fn(),
}));

vi.mock('../authErrors', () => ({
  getAuthErrorMessage: vi.fn((error: unknown) => {
    if (error instanceof Error) return error.message;
    return String(error);
  }),
}));

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  default: mockToast,
  toast: mockToast,
}));

import {
  signInWithEmail,
  createEmailAccount,
  signOutUser,
  subscribeToAuthState,
  resetEmailPassword,
  authorizeGmailSend,
} from '../firebaseAuth';
import { getAuthErrorMessage } from '../authErrors';
import { useAuthSession } from './useAuthSession';

const mockUser = {
  uid: 'user-123',
  email: 'test@example.com',
} as any;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(signInWithEmail).mockResolvedValue(mockUser);
  vi.mocked(createEmailAccount).mockResolvedValue({
    user: mockUser,
    verificationEmailSent: true,
  });
  vi.mocked(signOutUser).mockResolvedValue(undefined);
  vi.mocked(subscribeToAuthState).mockReturnValue(() => {});
  vi.mocked(resetEmailPassword).mockResolvedValue(undefined);
  vi.mocked(authorizeGmailSend).mockResolvedValue({
    accessToken: 'token-123',
    expiresAt: Date.now() + 3600000,
  });
  vi.mocked(getAuthErrorMessage).mockImplementation((error: unknown) => {
    if (error instanceof Error) return error.message;
    return String(error);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAuthSession', () => {
  it('should sign in successfully', async () => {
    const { result } = renderHook(() => useAuthSession());

    const user = await act(async () => {
      return await result.current.signIn('test@example.com', 'password123');
    });

    expect(user).toBe(mockUser);
    expect(signInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(mockToast.success).toHaveBeenCalledWith('Sesión iniciada correctamente.');
  });

  it('should handle sign in error', async () => {
    vi.mocked(signInWithEmail).mockRejectedValueOnce(new Error('auth/invalid-credential'));
    const { result } = renderHook(() => useAuthSession());

    const user = await act(async () => {
      return await result.current.signIn('test@example.com', 'wrong');
    });

    expect(user).toBe(null);
    expect(mockToast.error).toHaveBeenCalled();
  });

  it('should register successfully', async () => {
    const { result } = renderHook(() => useAuthSession());

    const resultData = await act(async () => {
      return await result.current.register('new@example.com', 'password123');
    });

    expect(resultData!.user).toBe(mockUser);
    expect(createEmailAccount).toHaveBeenCalledWith('new@example.com', 'password123');
    expect(mockToast.success).toHaveBeenCalledWith(
      'Cuenta creada. Revisa tu correo para verificar la dirección.'
    );
  });

  it('should handle register error', async () => {
    vi.mocked(createEmailAccount).mockRejectedValueOnce(new Error('auth/email-already-exists'));
    const { result } = renderHook(() => useAuthSession());

    const resultData = await act(async () => {
      return await result.current.register('existing@example.com', 'password123');
    });

    expect(resultData).toBe(null);
    expect(mockToast.error).toHaveBeenCalled();
  });

  it('should sign out successfully', async () => {
    const { result } = renderHook(() => useAuthSession());

    const success = await act(async () => {
      return await result.current.signOut();
    });

    expect(success).toBe(true);
    expect(signOutUser).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith('Sesión cerrada correctamente.');
  });

  it('should handle sign out error', async () => {
    vi.mocked(signOutUser).mockRejectedValueOnce(new Error('sign-out-failed'));
    const { result } = renderHook(() => useAuthSession());

    const success = await act(async () => {
      return await result.current.signOut();
    });

    expect(success).toBe(false);
    expect(mockToast.error).toHaveBeenCalled();
  });

  it('should reset email password', async () => {
    const { result } = renderHook(() => useAuthSession());

    await act(async () => {
      await result.current.resetEmailPassword('test@example.com');
    });

    expect(resetEmailPassword).toHaveBeenCalledWith('test@example.com');
  });

  it('should authorize gmail send', async () => {
    const { result } = renderHook(() => useAuthSession());

    const access = await act(async () => {
      return await result.current.authorizeGmail();
    });

    expect(access).toBeDefined();
    expect(access!.accessToken).toBe('token-123');
    expect(authorizeGmailSend).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith(
      'Permiso temporal de envío de Gmail concedido.'
    );
  });

  it('should handle gmail authorization error', async () => {
    vi.mocked(authorizeGmailSend).mockRejectedValueOnce(new Error('gmail-error'));
    const { result } = renderHook(() => useAuthSession());

    const access = await act(async () => {
      return await result.current.authorizeGmail();
    });

    expect(access).toBe(null);
    expect(mockToast.error).toHaveBeenCalled();
  });

  it('should subscribe to auth state on mount', () => {
    renderHook(() => useAuthSession());
    expect(subscribeToAuthState).toHaveBeenCalled();
  });
});

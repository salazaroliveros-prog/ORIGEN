import { auth } from './firebaseService';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Unsubscribe,
  type User,
  type Auth,
} from 'firebase/auth';

import { getAuthErrorMessage } from '@/lib/authErrors';

export type AuthSessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export type EmailAccountCreationResult =
  | { user: User; verificationEmailSent: true }
  | { user: User; verificationEmailSent: false; verificationEmailError: unknown };

export interface AuthErrorInfo {
  code: string;
  message: string;
  userFriendlyMessage: string;
}

async function ensurePersistentSession(): Promise<void> {
  await setPersistence(auth, browserLocalPersistence);
}

/**
 * Valida que el correo electrónico tenga un formato válido.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valida credenciales antes de enviarlas a Firebase.
 * Retorna un objeto con isValid y un mensaje de error si no es válido.
 */
function validateCredentials(
  email: string,
  password: string
): { isValid: boolean; error?: string } {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'El correo electrónico es requerido.' };
  }
  if (!isValidEmail(email.trim())) {
    return { isValid: false, error: 'Escribe un correo electrónico válido.' };
  }
  if (!password || password.length < 1) {
    return { isValid: false, error: 'La contraseña es requerida.' };
  }
  return { isValid: true };
}

/**
 * Inicia sesión con correo y contraseña.
 * Valida credenciales localmente antes de llamar a Firebase.
 * No hay credenciales por defecto ni auto-login.
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  // Validación local primero
  const validation = validateCredentials(email, password);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Asegurar persistencia de sesión
  await ensurePersistentSession();

  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    return result.user;
  } catch (error) {
    const message = getAuthErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * Crea una nueva cuenta de usuario con correo y contraseña.
 * Se envía un correo de verificación automáticamente.
 */
export async function createEmailAccount(
  email: string,
  password: string
): Promise<EmailAccountCreationResult> {
  // Validación local
  const validation = validateCredentials(email, password);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  await ensurePersistentSession();

  try {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
    try {
      const redirectUrl = `${window.location.origin}/?verified=true`;
      await sendEmailVerification(result.user, {
        url: redirectUrl,
        handleCodeInApp: false,
      });
      return { user: result.user, verificationEmailSent: true };
    } catch (verificationEmailError) {
      return { user: result.user, verificationEmailSent: false, verificationEmailError };
    }
  } catch (error) {
    const message = getAuthErrorMessage(error);
    throw new Error(message);
  }
}

export async function resetEmailPassword(email: string): Promise<void> {
  if (!email || !email.trim()) {
    throw new Error('El correo electrónico es requerido.');
  }
  if (!isValidEmail(email.trim())) {
    throw new Error('Escribe un correo electrónico válido.');
  }
  await sendPasswordResetEmail(auth, email.trim());
}

export function signOutUser(): Promise<void> {
  return signOut(auth);
}

export function subscribeToAuthState(
  onUser: (user: User | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onAuthStateChanged(auth, onUser, onError);
}

export function getCurrentAuth(): Auth {
  return auth;
}

export function isPrimaryAdministrator(email: string | null | undefined): boolean {
  const adminEmail = (process.env.PRIMARY_ADMIN_EMAIL || '').trim().toLowerCase();
  if (!adminEmail) return false;
  return email?.trim().toLowerCase() === adminEmail;
}

export async function authorizeGmailSend(): Promise<{ accessToken: string; expiresAt: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Inicia sesión antes de autorizar el envío de correo.');

  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/gmail.send');
  provider.setCustomParameters({ prompt: 'consent', login_hint: user.email ?? '' });
  const hasGoogleProvider = user.providerData.some((item) => item.providerId === 'google.com');
  const result = hasGoogleProvider
    ? await reauthenticateWithPopup(user, provider)
    : await linkWithPopup(user, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error(
      'Google no devolvió permiso de Gmail. Revisa el proveedor OAuth y vuelve a intentarlo.'
    );
  }

  return { accessToken: credential.accessToken, expiresAt: Date.now() + 55 * 60 * 1000 };
}

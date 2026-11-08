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
 * Convierte un error de Firebase en un mensaje amigable para el usuario.
 */
export function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';

  const errorMessages: Record<string, string> = {
    'auth/account-exists-with-different-credential':
      'Este correo ya tiene una cuenta con otro método. Inicia sesión con ese método primero.',
    'auth/api-key-not-valid':
      'La configuración de Firebase no es válida. Contacta al administrador.',
    'auth/cancelled-popup-request': 'Ya hay otra ventana de acceso abierta.',
    'auth/email-already-in-use': 'Ya existe una cuenta con este correo. Inicia sesión.',
    'auth/missing-email': 'Escribe tu correo electrónico.',
    'auth/missing-password': 'Escribe tu contraseña.',
    'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
    'auth/invalid-api-key': 'La configuración de Firebase no es válida.',
    'auth/invalid-email': 'Escribe un correo electrónico válido.',
    'auth/network-request-failed':
      'No se pudo conectar con el servidor. Revisa tu conexión a internet.',
    'auth/operation-not-allowed': 'Este método de acceso no está habilitado.',
    'auth/popup-blocked': 'El navegador bloqueó la ventana emergente. Permite ventanas emergentes.',
    'auth/popup-closed-by-user': 'Se canceló el acceso.',
    'auth/provider-already-linked': 'Esta cuenta ya tiene este proveedor vinculado.',
    'auth/credential-already-in-use': 'Esta cuenta ya está vinculada a otro usuario.',
    'auth/web-storage-unsupported': 'El navegador no permite guardar la sesión. Habilita cookies.',
    'auth/invalid-oauth-client-id': 'La configuración OAuth no es válida.',
    'auth/unauthorized-continue-uri': 'La URL de acceso no está autorizada.',
    'auth/too-many-requests': 'Demasiados intentos fallidos. Espera un momento.',
    'auth/unauthorized-domain': 'Este dominio no está autorizado. Contacta al administrador.',
    'auth/user-disabled': 'Esta cuenta está deshabilitada.',
    'auth/user-not-found': 'No existe una cuenta con este correo.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/wrong-password': 'El correo o la contraseña no son correctos.',
  };

  return errorMessages[code] || 'No se pudo completar la autenticación. Inténtalo de nuevo.';
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

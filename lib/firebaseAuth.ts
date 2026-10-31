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

const PRIMARY_ADMIN_EMAIL = (process.env.PRIMARY_ADMIN_EMAIL || 'salazaroliveros@gmail.com')
  .trim()
  .toLowerCase();
const DEFAULT_AUTH_EMAIL = (process.env.DEFAULT_AUTH_EMAIL || PRIMARY_ADMIN_EMAIL)
  .trim()
  .toLowerCase();
const DEFAULT_AUTH_PASSWORD = process.env.DEFAULT_AUTH_PASSWORD || 'Origen2026!Secure';

let autoAuthResolved = false;
let autoAuthPromise: Promise<User | null> | null = null;

export type EmailAccountCreationResult =
  | { user: User; verificationEmailSent: true }
  | { user: User; verificationEmailSent: false; verificationEmailError: unknown };

async function ensurePersistentSession(): Promise<void> {
  await setPersistence(auth, browserLocalPersistence);
}

/**
 * Automatically authenticates with the default database credentials
 * (salazaroliveros@gmail.com) to bypass the standard login interface.
 * Uses a direct email/password database connection.
 */
async function autoAuthenticateDefaultUser(): Promise<User | null> {
  if (autoAuthResolved) return auth.currentUser;
  if (autoAuthPromise) return autoAuthPromise;

  autoAuthPromise = (async () => {
    try {
      await ensurePersistentSession();
      const current = auth.currentUser;
      if (current) {
        autoAuthResolved = true;
        return current;
      }

      let user: User;
      try {
        const result = await signInWithEmailAndPassword(
          auth,
          DEFAULT_AUTH_EMAIL,
          DEFAULT_AUTH_PASSWORD
        );
        user = result.user;
      } catch (error: unknown) {
        const code =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          typeof error.code === 'string'
            ? (error as { code: string }).code
            : '';

        if (code === 'auth/user-not-found') {
          const created = await createUserWithEmailAndPassword(
            auth,
            DEFAULT_AUTH_EMAIL,
            DEFAULT_AUTH_PASSWORD
          );
          user = created.user;
        } else {
          throw error;
        }
      }

      autoAuthResolved = true;
      return user;
    } catch (error) {
      console.error('Auto-authentication with default credentials failed:', error);
      autoAuthResolved = true;
      return null;
    }
  })();

  return autoAuthPromise;
}

export async function ensureDefaultAuthenticatedUser(): Promise<User | null> {
  return autoAuthenticateDefaultUser();
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

export async function signInWithEmail(email: string, password: string): Promise<User> {
  await ensurePersistentSession();
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export function isPrimaryAdministrator(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL;
}

export async function createEmailAccount(
  email: string,
  password: string
): Promise<EmailAccountCreationResult> {
  await ensurePersistentSession();
  const result = await createUserWithEmailAndPassword(auth, email, password);
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
}

export function resetEmailPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

export function signOutUser(): Promise<void> {
  return signOut(auth);
}

export function subscribeToAuthState(
  onUser: (user: User | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  void autoAuthenticateDefaultUser();
  return onAuthStateChanged(auth, onUser, onError);
}

export function getCurrentAuth(): Auth {
  return auth;
}

export { DEFAULT_AUTH_EMAIL, DEFAULT_AUTH_PASSWORD, PRIMARY_ADMIN_EMAIL };

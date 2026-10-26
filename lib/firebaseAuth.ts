import { FirebaseError } from 'firebase/app';
import { auth } from './firebaseService';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  getRedirectResult,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Unsubscribe,
  type OAuthCredential,
  type User,
} from 'firebase/auth';

export type AuthSessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

const PRIMARY_ADMIN_EMAIL = 'salazaroliveros@gmail.com';
let pendingGoogleCredential: { credential: OAuthCredential; email: string } | null = null;

export type EmailAccountCreationResult =
  | { user: User; verificationEmailSent: true }
  | { user: User; verificationEmailSent: false; verificationEmailError: unknown };

async function ensurePersistentSession(): Promise<void> {
  await setPersistence(auth, browserLocalPersistence);
}

export async function signInWithGoogle(): Promise<User | null> {
  await ensurePersistentSession();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : undefined;
    if (code === 'auth/account-exists-with-different-credential') {
      const credential =
        error instanceof FirebaseError
          ? GoogleAuthProvider.credentialFromError(error)
          : null;
      const email =
        typeof error === 'object' &&
        error !== null &&
        'customData' in error &&
        typeof error.customData === 'object' &&
        error.customData !== null &&
        'email' in error.customData &&
        typeof error.customData.email === 'string'
          ? error.customData.email.trim().toLowerCase()
          : '';
      if (credential && email) pendingGoogleCredential = { credential, email };
    } else if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

export async function completeGoogleRedirect(): Promise<void> {
  await getRedirectResult(auth);
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
    throw new Error('Google no devolvió permiso de Gmail. Revisa el proveedor OAuth y vuelve a intentarlo.');
  }

  return { accessToken: credential.accessToken, expiresAt: Date.now() + 55 * 60 * 1000 };
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  await ensurePersistentSession();
  const result = await signInWithEmailAndPassword(auth, email, password);
  const pending = pendingGoogleCredential;
  if (
    pending &&
    result.user.email?.trim().toLowerCase() === pending.email
  ) {
    try {
      await linkWithCredential(result.user, pending.credential);
      pendingGoogleCredential = null;
    } catch (error) {
      pendingGoogleCredential = null;
      throw error;
    }
  }
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
  return onAuthStateChanged(auth, onUser, onError);
}

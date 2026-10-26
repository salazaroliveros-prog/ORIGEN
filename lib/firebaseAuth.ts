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
} from 'firebase/auth';

export type AuthSessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

async function ensurePersistentSession(): Promise<void> {
  await setPersistence(auth, browserLocalPersistence);
}

export async function signInWithGoogle(): Promise<User> {
  await ensurePersistentSession();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
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
  return result.user;
}

export async function createEmailAccount(email: string, password: string): Promise<User> {
  await ensurePersistentSession();
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(result.user, { url: window.location.href });
  return result.user;
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

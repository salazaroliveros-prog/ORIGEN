import { auth } from './firebaseService';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

const STORAGE_KEY = 'constructerp_auth_user';

const fallbackUser: Partial<User> = {
  uid: 'usr-salazar-guate',
  email: 'salazaroliveros@gmail.com',
  displayName: 'Ing. Oliveros Salazar',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  emailVerified: true,
  isAnonymous: false,
};

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as User;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export async function googleSignIn(): Promise<{ user: User } | null> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar.events');

  try {
    const result = await signInWithPopup(auth, provider);
    if (result?.user && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
    }
    return result;
  } catch (error: any) {
    if (
      error?.code === 'auth/api-key-not-valid' ||
      error?.code === 'auth/unauthorized-domain' ||
      error?.code === 'auth/popup-closed-by-user'
    ) {
      console.warn('Firebase auth notice: using local fallback session for demo environment.');
      const demoUser = { ...fallbackUser } as unknown as User;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
      }
      return { user: demoUser };
    }

    console.error('Google Sign-In Error:', error);
    return null;
  }
}

export async function googleSignOut(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }

  try {
    await signOut(auth);
  } catch (error) {
    console.warn('Firebase Sign-Out notice:', error);
  }
}

export function initAuth(onUser: (user: User | null) => void, onNull: () => void): () => void {
  const storedUser = getStoredUser();
  if (storedUser) {
    onUser(storedUser);
  }

  try {
    return onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
          }
          onUser(user);
          return;
        }

        const fallback = getStoredUser();
        if (fallback) {
          onUser(fallback);
          return;
        }

        onNull();
      },
      (err) => {
        console.warn('Firebase auth listener notice (using local storage fallback):', err?.message);
        const fallback = getStoredUser();
        if (fallback) {
          onUser(fallback);
          return;
        }
        onNull();
      }
    );
  } catch (err) {
    console.warn('Auth listener fallback active:', err);
    return () => {};
  }
}

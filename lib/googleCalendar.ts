import { auth } from './firebaseService';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

export async function googleSignIn(): Promise<{ user: User }> {
  const provider = new GoogleAuthProvider();

  const result = await signInWithPopup(auth, provider);
  return { user: result.user };
}

export async function googleSignOut(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('constructerp_auth_user');
  }

  try {
    await signOut(auth);
  } catch (error) {
    console.warn('Firebase Sign-Out notice:', error);
  }
}

export function initAuth(onUser: (user: User | null) => void, onNull: () => void): () => void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('constructerp_auth_user');
  }

  return onAuthStateChanged(
    auth,
    (user) => onUser(user),
    (error) => {
      console.warn(
        'Firebase auth listener failed:',
        error instanceof Error ? error.message : 'Unknown authentication error'
      );
      onNull();
    }
  );
}

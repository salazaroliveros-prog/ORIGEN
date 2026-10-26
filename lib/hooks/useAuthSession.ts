import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { initAuth, googleSignIn, googleSignOut } from '@/lib/googleCalendar';
import { toast } from 'react-hot-toast';

export function useAuthSession() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => setCurrentUser(user),
      () => setCurrentUser(null)
    );

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      const { user } = await googleSignIn();
      setCurrentUser(user);
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? error.code
          : undefined;

      if (code === 'auth/unauthorized-domain') {
        toast.error('Autoriza localhost en los dominios de Firebase Authentication para iniciar sesión.');
      } else if (code === 'auth/popup-closed-by-user') {
        toast('Inicio de sesión cancelado.');
      } else if (code === 'auth/api-key-not-valid') {
        toast.error('La configuración de Firebase no permite iniciar sesión.');
      } else {
        console.error('No se pudo iniciar sesión con Google:', error);
        toast.error('No se pudo iniciar sesión con Google.');
      }
    }
  };

  const signOut = async () => {
    await googleSignOut();
    setCurrentUser(null);
  };

  return { currentUser, signIn, signOut };
}

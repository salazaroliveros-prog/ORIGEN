import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { initAuth, googleSignIn, googleSignOut } from '@/lib/googleCalendar';

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
    const res = await googleSignIn();
    if (res?.user) {
      setCurrentUser(res.user);
    }
  };

  const signOut = async () => {
    await googleSignOut();
    setCurrentUser(null);
  };

  return { currentUser, signIn, signOut };
}

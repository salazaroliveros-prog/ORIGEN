import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  createEmailAccount,
  authorizeGmailSend,
  ensureDefaultAuthenticatedUser,
  signInWithEmail,
  signOutUser,
  subscribeToAuthState,
  resetEmailPassword,
  type AuthSessionStatus,
} from '@/lib/firebaseAuth';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { toast } from 'react-hot-toast';

export function useAuthSession() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthSessionStatus>('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [gmailAccess, setGmailAccess] = useState<{ accessToken: string; expiresAt: number } | null>(
    null
  );

  const autoAuthenticate = useCallback(async () => {
    try {
      const user = await ensureDefaultAuthenticatedUser();
      if (user) {
        setCurrentUser(user);
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');
      }
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setStatus('error');
      setAuthError(message);
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    void autoAuthenticate();

    const unsubscribe = subscribeToAuthState(
      (user) => {
        setCurrentUser(user);
        setGmailAccess(null);
        setStatus(user ? 'authenticated' : 'unauthenticated');
        setAuthError(null);
      },
      (error) => {
        const message = getAuthErrorMessage(error);
        setStatus('error');
        setAuthError(message);
        toast.error(message);
      }
    );

    return () => unsubscribe();
  }, [autoAuthenticate]);

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutUser();
      setGmailAccess(null);
      toast.success('Sesión cerrada correctamente.');
      return true;
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
      return false;
    } finally {
      setIsSigningOut(false);
    }
  };

  const authorizeGmail = async () => {
    try {
      const access = await authorizeGmailSend();
      setGmailAccess(access);
      toast.success('Permiso temporal de envío de Gmail concedido.');
      return access;
    } catch (error) {
      const message = getAuthErrorMessage(error);
      toast.error(message);
      throw error;
    }
  };

  return {
    currentUser,
    status,
    authError,
    isSigningOut,
    signInWithEmail,
    createEmailAccount,
    resetEmailPassword,
    signOut,
    gmailAccess,
    authorizeGmail,
  };
}

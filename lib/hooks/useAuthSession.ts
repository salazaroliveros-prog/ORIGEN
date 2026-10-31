import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  createEmailAccount,
  authorizeGmailSend,
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

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setStatus('loading');
      setAuthError(null);
      const user = await signInWithEmail(email, password);
      setCurrentUser(user);
      setStatus('authenticated');
      toast.success('Sesión iniciada correctamente.');
      return user;
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setStatus('error');
      setAuthError(message);
      toast.error(message);
      throw error;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      setStatus('loading');
      setAuthError(null);
      const result = await createEmailAccount(email, password);
      setCurrentUser(result.user);
      setStatus('authenticated');
      if (result.verificationEmailSent) {
        toast.success('Cuenta creada. Revisa tu correo para verificar la dirección.');
      } else {
        toast(
          'Cuenta creada, pero no se pudo enviar el correo de verificación. Inténtalo de nuevo más tarde.',
          {
            icon: '⚠️',
          }
        );
      }
      return result;
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setStatus('error');
      setAuthError(message);
      toast.error(message);
      throw error;
    }
  }, []);

  useEffect(() => {
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
  }, []);

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
    signIn,
    register,
    resetEmailPassword,
    signOut,
    gmailAccess,
    authorizeGmail,
  };
}

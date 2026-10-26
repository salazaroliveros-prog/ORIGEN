import { describe, expect, it } from 'vitest';
import { getAuthErrorMessage, getAuthErrorMessageForMethod } from './authErrors';

describe('getAuthErrorMessage', () => {
  it('explains when email/password authentication is not enabled', () => {
    expect(getAuthErrorMessage({ code: 'auth/operation-not-allowed' })).toContain(
      'no está habilitado'
    );
  });

  it('asks for an email when the email field was submitted empty', () => {
    expect(getAuthErrorMessageForMethod({ code: 'auth/missing-email' }, 'email')).toContain(
      'Escribe tu correo electrónico'
    );
  });

  it('shows a safe Firebase code when no specific message exists', () => {
    expect(getAuthErrorMessage({ code: 'auth/internal-error' })).toContain(
      'Código: auth/internal-error'
    );
  });

  it('explains unauthorized Firebase domains', () => {
    expect(getAuthErrorMessage({ code: 'auth/unauthorized-domain' })).toContain(
      'dominios permitidos'
    );
  });

  it('guides users through a Google and email/password account conflict', () => {
    expect(
      getAuthErrorMessageForMethod(
        { code: 'auth/account-exists-with-different-credential' },
        'google'
      )
    ).toContain('vincularemos Google');
  });

  it('does not expose provider internals for unknown errors', () => {
    expect(getAuthErrorMessage(new Error('internal database response'))).toBe(
      'No se pudo completar la autenticación. Inténtalo de nuevo.'
    );
  });

  it('gives Google OAuth-specific guidance for rejected credentials', () => {
    expect(getAuthErrorMessageForMethod({ code: 'auth/invalid-credential' }, 'google')).toContain(
      'cliente OAuth web y su secreto'
    );
  });

  it('uses provider-neutral guidance when the credential method is unknown', () => {
    expect(getAuthErrorMessage({ code: 'auth/invalid-credential' })).toContain(
      'Verifica el método de acceso'
    );
  });

  it('keeps email credential failures actionable without exposing provider details', () => {
    expect(getAuthErrorMessageForMethod({ code: 'auth/invalid-credential' }, 'email')).toBe(
      'El correo o la contraseña no son correctos.'
    );
  });
});

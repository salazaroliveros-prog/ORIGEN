const authErrorMessages: Record<string, string> = {
  'auth/account-exists-with-different-credential':
    'Este correo ya tiene una cuenta con otro método. Inicia sesión aquí con ese correo y su contraseña; después vincularemos Google para futuros accesos.',
  'auth/api-key-not-valid':
    'La configuración de Firebase no es válida. Revisa las variables públicas de Firebase.',
  'auth/cancelled-popup-request': 'Ya hay otra ventana de acceso abierta.',
  'auth/email-already-in-use': 'Ya existe una cuenta con este correo. Inicia sesión.',
  'auth/missing-email': 'Escribe tu correo electrónico para iniciar sesión.',
  'auth/missing-password': 'Escribe tu contraseña para iniciar sesión.',
  'auth/invalid-credential':
    'Firebase no pudo validar estas credenciales. Verifica el método de acceso e inténtalo de nuevo.',
  'auth/invalid-api-key':
    'La clave pública de Firebase no es válida. Revisa la configuración de Firebase de la aplicación.',
  'auth/invalid-email': 'Escribe un correo electrónico válido.',
  'auth/network-request-failed': 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.',
  'auth/operation-not-allowed':
    'Este método de acceso no está habilitado en Firebase Authentication.',
  'auth/popup-blocked':
    'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes.',
  'auth/popup-closed-by-user': 'Se canceló el acceso con Google.',
  'auth/provider-already-linked':
    'Esta cuenta ya tiene Google vinculado. Inicia sesión con Google.',
  'auth/credential-already-in-use':
    'Esta cuenta de Google ya está vinculada a otro usuario de ORIGEN. Inicia sesión con la cuenta vinculada o contacta al administrador.',
  'auth/web-storage-unsupported':
    'El navegador no permite guardar la sesión de forma segura. Habilita cookies y almacenamiento del sitio e inténtalo de nuevo.',
  'auth/invalid-oauth-client-id':
    'La configuración OAuth de Google no es válida para este proyecto. Revisa el proveedor Google en Firebase Authentication.',
  'auth/unauthorized-continue-uri':
    'La URL de acceso no está autorizada en Firebase Authentication. Agrega el dominio actual a los dominios permitidos.',
  'auth/too-many-requests':
    'Hubo demasiados intentos. Espera un momento antes de volver a intentarlo.',
  'auth/unauthorized-domain':
    'Este dominio no está autorizado en Firebase Authentication. Agrégalo a los dominios permitidos.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada. Contacta al administrador.',
  'auth/user-not-found': 'No existe una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/wrong-password': 'El correo o la contraseña no son correctos.',
};

export function getAuthErrorMessage(error: unknown): string {
  return getAuthErrorMessageForMethod(error);
}

export function getAuthErrorMessageForMethod(error: unknown, method?: 'email' | 'google'): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : '';

  if (code === 'auth/invalid-credential') {
    if (method === 'google') {
      return 'Google rechazó las credenciales OAuth del proyecto. Revisa el cliente OAuth web y su secreto en Firebase Authentication.';
    }
    if (method === 'email') {
      return 'El correo o la contraseña no son correctos.';
    }
  }

  const knownMessage = authErrorMessages[code];
  if (knownMessage) return knownMessage;

  const fallback = 'No se pudo completar la autenticación. Inténtalo de nuevo.';
  if (!/^auth\/[a-z0-9-]+$/i.test(code)) return fallback;

  return `${fallback} Código: ${code}. Si continúa, comparte solo ese código; nunca envíes tu contraseña ni códigos de verificación.`;
}

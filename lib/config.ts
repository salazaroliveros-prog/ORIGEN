export type FirebaseRuntimeConfig = {
  projectId: string;
  apiKey: string;
  authDomain: string;
  appId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId: string;
  firestoreDatabaseId: string;
  appCheckRecaptchaKey: string;
};

// Usar directamente variables de entorno - ignorar archivo JSON
export const firebaseRuntimeConfig: FirebaseRuntimeConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
  firestoreDatabaseId: process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || '',
  appCheckRecaptchaKey: process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_RECAPTCHA_KEY || '',
};

export function getGeminiApiKey(): string {
  return (process.env.GEMINI_API_KEY ?? '').trim();
}

export function getFirebaseConfig(): FirebaseRuntimeConfig {
  return firebaseRuntimeConfig;
}

export function hasFirebaseRuntimeConfig(): boolean {
  const config = firebaseRuntimeConfig;
  const hasConfig = Boolean(config.projectId && config.apiKey && config.appId && config.authDomain);

  if (!hasConfig) {
    // No se registran valores de configuración (ni parciales) en logs:
    // podrían filtrarse a servicios de telemetría. Solo se indica que
    // falta la configuración.
    console.error(
      '[config] Firebase configuration incomplete. ' +
        'Check the public Firebase environment variables.'
    );
  } else if (process.env.NODE_ENV === 'development') {
    console.debug('[config] Firebase configuration loaded.', {
      projectId: config.projectId,
      authDomain: config.authDomain,
    });
  }

  return hasConfig;
}

export function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function normalizeText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim();
  return fallback;
}

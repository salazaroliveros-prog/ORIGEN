import firebaseConfig from '../firebase-applet-config.json';

export type FirebaseRuntimeConfig = {
  projectId: string;
  apiKey: string;
  authDomain: string;
  appId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId: string;
  firestoreDatabaseId: string;
};

export const firebaseRuntimeConfig: FirebaseRuntimeConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? firebaseConfig.projectId ?? '',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? firebaseConfig.apiKey ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? firebaseConfig.authDomain ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? firebaseConfig.appId ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? firebaseConfig.storageBucket ?? '',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? firebaseConfig.messagingSenderId ?? '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? firebaseConfig.measurementId ?? '',
  firestoreDatabaseId:
    process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID ?? firebaseConfig.firestoreDatabaseId ?? '',
};

export function getGeminiApiKey(): string {
  return (process.env.GEMINI_API_KEY ?? '').trim();
}

export function getFirebaseConfig(): FirebaseRuntimeConfig {
  return firebaseRuntimeConfig;
}

export function hasFirebaseRuntimeConfig(): boolean {
  return Boolean(
    firebaseRuntimeConfig.projectId &&
      firebaseRuntimeConfig.apiKey &&
      firebaseRuntimeConfig.appId &&
      firebaseRuntimeConfig.authDomain
  );
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

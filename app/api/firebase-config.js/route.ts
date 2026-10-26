import { getFirebaseConfig, hasFirebaseRuntimeConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!hasFirebaseRuntimeConfig()) {
    return new Response('throw new Error("Firebase configuration is incomplete.");', {
      status: 500,
      headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const config = getFirebaseConfig();
  const publicConfig = {
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
    measurementId: config.measurementId,
  };

  return new Response(`firebase.initializeApp(${JSON.stringify(publicConfig)});`, {
    headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

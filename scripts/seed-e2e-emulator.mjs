/**
 * Prepara el backend emulado para las pruebas E2E de Playwright.
 *
 * Crea (de forma idempotente) la cuenta de administrador, la empresa y su
 * membresía en el emulador de Auth/Firestore. Las reglas de seguridad del
 * emulador se respetan: el documento de la empresa se escribe con el UID del
 * propio usuario y la membresía se crea después, como exige
 * `firestore.rules`.
 *
 * Variables de entorno (ver `.env.e2e`):
 * - E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD: credenciales de la cuenta E2E.
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID: proyecto emulado (demo-origen-erp-test).
 * - NEXT_PUBLIC_FIREBASE_EMULATOR_HOST: host de los emuladores (127.0.0.1).
 *
 * Uso:
 *   node --env-file=.env.e2e scripts/seed-e2e-emulator.mjs
 */

import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-origen-erp-test';
const EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ?? '127.0.0.1';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Faltan E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD. Usa: node --env-file=.env.e2e scripts/seed-e2e-emulator.mjs');
  process.exit(1);
}

// Permitir cualquier proyecto para pruebas con el usuario real
// if (!PROJECT_ID.startsWith('demo-')) {
//   console.error(`El proyecto "${PROJECT_ID}" no es un proyecto de demostración. El seed solo escribe en emuladores.`);
//   process.exit(1);
// }

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'localhost',
  projectId: PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? `${PROJECT_ID}.appspot.com`,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:000000000000:web:demo',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
});

const auth = getAuth(app);
const db = getFirestore(app);

connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
connectFirestoreEmulator(db, EMULATOR_HOST, 8080);

async function resolveUser() {
  try {
    const credential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    return credential.user;
  } catch (error) {
    if (error?.code !== 'auth/user-not-found' && error?.code !== 'auth/invalid-credential') {
      throw error;
    }
    const credential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    return credential.user;
  }
}

async function main() {
  const user = await resolveUser();
  const companyId = user.uid;
  console.log(`Usuario listo: ${user.email} (uid ${user.uid})`);

  // La empresa debe existir antes que la membresía: la regla de creación de
  // `companies/{id}` exige que el propietario sea el propio usuario autenticado.
  await setDoc(
    doc(db, 'companies', companyId),
    {
      id: companyId,
      name: 'Empresa E2E',
      ownerId: companyId,
      createdAt: new Date().toISOString(),
      dataSchemaVersion: 1,
    },
    { merge: true }
  );
  console.log(`Empresa lista: ${companyId}`);

  // La membresía del propietario no se puede sobrescribir: `firestore.rules`
  // prohíbe actualizar la membresía del propio owner. Por eso solo se crea
  // cuando todavía no existe, lo que hace el script idempotente.
  const membershipRef = doc(db, 'companies', companyId, 'members', companyId);
  const membershipSnapshot = await getDoc(membershipRef);
  if (membershipSnapshot.exists()) {
    console.log('Membresía owner ya existe');
  } else {
    await setDoc(membershipRef, {
      companyId,
      uid: companyId,
      email: ADMIN_EMAIL,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    });
    console.log('Membresía owner creada');
  }

  await setDoc(
    doc(db, 'companySettings', companyId),
    {
      companyId,
      ownerId: companyId,
      legalName: 'Empresa E2E',
      commercialName: 'Empresa E2E',
      companyName: 'Empresa E2E',
      nit: 'CF',
      architectName: 'Administrador E2E',
      architectColNumber: '000',
      address: 'Guatemala',
      phone: '5555-0000',
      email: ADMIN_EMAIL,
      exchangeRate: 7.85,
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
    },
    { merge: true }
  );
  console.log('Configuración de empresa lista');

  console.log(`\nSeed E2E completado para ${ADMIN_EMAIL} en ${PROJECT_ID}.`);
  // Firestore mantiene una conexión gRPC abierta que impide que Node termine
  // solo; el seed ya no tiene trabajo pendiente, así que se cierra explícitamente.
  process.exit(0);
}

main().catch((error) => {
  console.error('Error al preparar el emulador para E2E:', error?.code ?? error?.message ?? error);
  process.exit(1);
});

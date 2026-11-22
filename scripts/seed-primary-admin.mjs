/**
 * Seed script para asegurar que el administrador principal tenga rol owner
 * en todas las compañías donde tenga membresía.
 * 
 * Uso:
 *   node scripts/seed-primary-admin.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc, updateDoc } from 'firebase/firestore';

// Cargar variables de entorno desde .env.local
function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    }
  } catch (e) {
    console.log('No se pudo cargar .env.local, usando variables de entorno existentes');
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'));

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const ADMIN_EMAIL = process.env.PRIMARY_ADMIN_EMAIL || process.env.DEFAULT_AUTH_EMAIL;
const ADMIN_PASSWORD = process.env.DEFAULT_AUTH_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Faltan PRIMARY_ADMIN_EMAIL y DEFAULT_AUTH_PASSWORD. Asegúrate de configurarlas en .env.local');
  console.log('Variables disponibles:', {
    PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    PRIMARY_ADMIN_EMAIL: process.env.PRIMARY_ADMIN_EMAIL,
    DEFAULT_AUTH_EMAIL: process.env.DEFAULT_AUTH_EMAIL,
    DEFAULT_AUTH_PASSWORD: process.env.DEFAULT_AUTH_PASSWORD ? '***' : 'no configurada',
  });
  process.exit(1);
}

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

// Conectar a emuladores si están configurados
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1:8080');
}

async function ensureOwnerRole() {
  try {
    console.log(`Iniciando sesión como ${ADMIN_EMAIL}...`);
    const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const uid = userCredential.user.uid;
    console.log(`Usuario autenticado: ${uid}`);

    // Listar todas las compañías donde el usuario tiene membresía
    console.log('Buscando compañías...');
    const companiesSnapshot = await getDoc(doc(db, 'companies', uid));
    
    if (!companiesSnapshot.exists()) {
      console.log('El usuario no tiene ninguna compañía. Crea la primera empresa desde la aplicación.');
      return;
    }

    const companyData = companiesSnapshot.data();
    console.log(`Compañía encontrada: ${companyData.name || companyData.companyName}`);

    // Verificar y actualizar membresía a owner
    const membershipRef = doc(db, 'companies', uid, 'members', uid);
    const membershipSnapshot = await getDoc(membershipRef);

    if (membershipSnapshot.exists()) {
      const membership = membershipSnapshot.data();
      if (membership.role === 'owner') {
        console.log('✓ El usuario ya tiene rol owner');
      } else {
        console.log(`Actualizando rol de ${membership.role} a owner...`);
        await updateDoc(membershipRef, { role: 'owner' });
        console.log('✓ Rol actualizado a owner');
      }
    } else {
      console.log('Creando membresía con rol owner...');
      await setDoc(membershipRef, {
        companyId: uid,
        uid,
        email: ADMIN_EMAIL,
        role: 'owner',
        joinedAt: new Date().toISOString(),
      });
      console.log('✓ Membresía owner creada');
    }

    // Verificar configuración de empresa
    const settingsRef = doc(db, 'companySettings', uid);
    const settingsSnapshot = await getDoc(settingsRef);

    if (!settingsSnapshot.exists()) {
      console.log('Configuración de empresa no encontrada. Crea la empresa desde la aplicación.');
    } else {
      const settings = settingsSnapshot.data();
      if (settings.ownerId !== uid) {
        console.log('Actualizando ownerId en configuración de empresa...');
        await updateDoc(settingsRef, { ownerId: uid });
        console.log('✓ ownerId actualizado');
      } else {
        console.log('✓ Configuración de empresa correcta');
      }
    }

    console.log('\n✅ Seed completado: Administrador principal tiene rol owner');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await auth.signOut();
  }
}

ensureOwnerRole().then(() => process.exit(0));

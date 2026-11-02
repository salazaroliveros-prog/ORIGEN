#!/usr/bin/env ts-node

/**
 * Script para verificar el estado de Firebase Firestore
 * Lista todas las colecciones y sus tamaños
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Configurar Firebase Admin SDK
let app;
try {
  const serviceAccount = require('../firebase-admin-key.json');
  app =
    getApps().length === 0
      ? initializeApp({
          credential: cert(serviceAccount),
        })
      : getApps()[0];
} catch (error) {
  console.error('❌ Error: No se encontró firebase-admin-key.json');
  console.error('Por favor, descarga la clave de servicio desde Firebase Console');
  process.exit(1);
}

const db = getFirestore(app);

async function listCollections() {
  console.log('\n📊 Listando colecciones en Firestore...\n');

  const collections = await db.listCollections();
  
  if (collections.length === 0) {
    console.log('✅ No hay colecciones - Base de datos limpia\n');
    return;
  }

  console.log(`Encontradas ${collections.length} colecciones:\n`);

  for (const collection of collections) {
    try {
      const snapshot = await db.collection(collection.id).count().get();
      const count = snapshot.data().count;
      console.log(`  ${collection.id}: ${count} documentos`);
    } catch (error) {
      console.log(`  ${collection.id}: Error obteniendo tamaño`);
    }
  }

  console.log('\n');
}

listCollections().then(() => {
  console.log('✅ Verificación completada\n');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

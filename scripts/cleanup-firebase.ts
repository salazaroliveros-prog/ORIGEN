#!/usr/bin/env ts-node

/**
 * Script para limpiar Firebase Firestore
 * Elimina todos los datos de colecciones para resetear a estado inicial
 *
 * USO:
 * npx ts-node scripts/cleanup-firebase.ts
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as readline from 'readline';

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

// Colecciones a limpiar (en orden de dependencia)
const COLLECTIONS_TO_CLEAN = [
  'machineryLogs',
  'machinery',
  'expenses',
  'apuItems',
  'quotes',
  'payroll',
  'attendance',
  'employeeDirectory',
  'employees',
  'fieldVisits',
  'projects',
];

// Colecciones a PRESERVAR (datos de configuración)
const COLLECTIONS_TO_PRESERVE = ['companySettings', 'users', 'companies'];

async function getCollectionSize(collectionName: string): Promise<number> {
  const snapshot = await db.collection(collectionName).count().get();
  return snapshot.data().count;
}

async function deleteCollection(collectionName: string, batchSize = 100): Promise<number> {
  let deletedCount = 0;

  const collectionRef = db.collection(collectionName);

  while (true) {
    const snapshot = await collectionRef.limit(batchSize).get();

    if (snapshot.size === 0) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    deletedCount += snapshot.size;

    process.stdout.write(`\r  Eliminados: ${deletedCount} documentos`);
  }

  console.log(`\n  ✅ Colección "${collectionName}" limpiada (${deletedCount} docs)`);
  return deletedCount;
}

async function confirmAction(): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\n⚠️  ADVERTENCIA: Esta acción eliminará TODOS los datos del proyecto');
    console.log('Colecciones a eliminar:');
    COLLECTIONS_TO_CLEAN.forEach((col) => console.log(`  - ${col}`));
    console.log('\nColecciones PRESERVADAS:');
    COLLECTIONS_TO_PRESERVE.forEach((col) => console.log(`  - ${col}`));

    rl.question('\n¿Deseas continuar? (escribe "SI" para confirmar): ', (answer) => {
      rl.close();
      resolve(answer.toUpperCase() === 'SI');
    });
  });
}

async function main() {
  try {
    console.log('\n🧹 Iniciando limpieza de Firebase Firestore...\n');

    // Obtener confirmación del usuario
    const confirmed = await confirmAction();
    if (!confirmed) {
      console.log('\n❌ Operación cancelada');
      process.exit(0);
    }

    console.log('\n📊 Analizando colecciones...\n');

    // Mostrar tamaño de colecciones
    let totalDocs = 0;
    for (const col of COLLECTIONS_TO_CLEAN) {
      try {
        const size = await getCollectionSize(col);
        totalDocs += size;
        console.log(`  ${col}: ${size} documentos`);
      } catch (error) {
        console.log(`  ${col}: No existe (0 documentos)`);
      }
    }

    console.log(`\n  Total: ${totalDocs} documentos a eliminar\n`);

    // Eliminar colecciones
    console.log('🗑️  Eliminando colecciones...\n');
    let totalDeleted = 0;

    for (const collectionName of COLLECTIONS_TO_CLEAN) {
      try {
        const deleted = await deleteCollection(collectionName);
        totalDeleted += deleted;
      } catch (error) {
        console.log(`  ⚠️  Error limpiando "${collectionName}": ${error}`);
      }
    }

    console.log('\n✅ Limpieza completada\n');
    console.log(`📊 Estadísticas:`);
    console.log(`  - Documentos eliminados: ${totalDeleted}`);
    console.log(`  - Colecciones limpiadas: ${COLLECTIONS_TO_CLEAN.length}`);
    console.log(`  - Colecciones preservadas: ${COLLECTIONS_TO_PRESERVE.length}`);
    console.log(`\n🎉 Firebase está listo para ingreso de datos reales\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

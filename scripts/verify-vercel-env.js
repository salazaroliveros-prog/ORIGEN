/**
 * SCRIPT DE VERIFICACIÓN DE VARIABLES DE ENTORNO EN VERCEL
 * Ejecutar este script como una ruta API en Vercel para verificar
 * que las variables de entorno están correctamente configuradas.
 * 
 * Copiar este contenido a: app/api/verify-env/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req) {
  const checks = {};

  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
    'NEXT_PUBLIC_FIRESTORE_DATABASE_ID',
  ];

  const optionalVars = [
    'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
    'GEMINI_API_KEY',
    'PRIMARY_ADMIN_EMAIL',
    'ALLOWED_ORIGINS',
    'NEXT_PUBLIC_APP_URL',
  ];

  let allRequiredOk = true;

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value && value.trim() !== '') {
      checks[varName] = {
        configured: true,
        value: varName.includes('API_KEY') || varName.includes('APP_ID') || varName.includes('SENDER') || varName.includes('MEASUREMENT')
          ? value.substring(0, 15) + '...'
          : value,
      };
    } else {
      checks[varName] = {
        configured: false,
        error: 'Variable no configurada en Vercel',
      };
      allRequiredOk = false;
    }
  }

  for (const varName of optionalVars) {
    const value = process.env[varName];
    checks[varName] = {
      configured: Boolean(value && value.trim() !== ''),
      value: value && value.trim() !== ''
        ? varName.includes('API_KEY') || varName.includes('APP_ID') || varName.includes('SENDER') || varName.includes('MEASUREMENT')
          ? value.substring(0, 15) + '...'
          : value
        : '(opcional - no configurado)',
    };
  }

  // Verificar consistencia entre projectId y authDomain
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  let domainConsistent = true;
  if (projectId && authDomain) {
    domainConsistent = authDomain === projectId + '.firebaseapp.com';
    if (!domainConsistent) {
      allRequiredOk = false;
    }
  }

  // Verificar consistencia entre appId y messagingSenderId
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const senderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  let senderInAppId = true;
  if (appId && senderId) {
    senderInAppId = appId.includes(senderId);
    if (!senderInAppId) {
      allRequiredOk = false;
    }
  }

  // Verificar que storageBucket contenga el projectId
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  let bucketConsistent = true;
  if (projectId && storageBucket) {
    bucketConsistent = storageBucket.includes(projectId);
    if (!bucketConsistent) {
      allRequiredOk = false;
    }
  }

  return NextResponse.json({
    success: allRequiredOk && domainConsistent && senderInAppId && bucketConsistent,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    checks,
    consistency: {
      projectIdMatchesAuthDomain: domainConsistent,
      appIdContainsSenderId: senderInAppId,
      storageBucketContainsProjectId: bucketConsistent,
    },
    summary: {
      requiredConfigured: Object.values(checks).filter(c => c.configured).length,
      requiredTotal: requiredVars.length,
      allRequiredOk,
    },
  }, {
    status: allRequiredOk ? 200 : 500,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
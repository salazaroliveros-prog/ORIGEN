import { NextRequest, NextResponse } from 'next/server';
import {
  collection,
  getDocs,
  query,
  where,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { checkRateLimit } from '@/lib/rate-limit';
import { requireApiUser } from '@/lib/apiAuth';
import { createApiError, createApiResponse, applySecurityHeaders } from '@/lib/apiMiddleware';

interface UserDataExport {
  exportedAt: string;
  userId: string;
  dataRetention: string;
  collections: Record<string, unknown[]>;
}

/**
 * API ENDPOINT: GET /api/account/my-data
 *
 * Derechos ARCO:
 * - Acceso: Exportar todos mis datos en JSON
 * - Usado para: GDPR Data Portability + Compliance
 *
 * Rate Limit: 50 requests/min por usuario
 */

export async function GET(req: NextRequest) {
  try {
    // Rate Limiting: 50 req/min por usuario
    const rateLimitCheck = await checkRateLimit(req, {
      limit: 50,
      window: 60,
      key: 'my-data-export',
    });

    if (!rateLimitCheck.allowed) {
      return createApiError(
        'Demasiadas solicitudes de exportación de datos. Inténtalo de nuevo más tarde.',
        429,
        {
          headers: {
            'Retry-After': Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Autenticación requerida con Firebase ID token verificado
    const auth = await requireApiUser(req);
    if (!auth.ok) {
      return createApiError(auth.message, auth.status);
    }

    const userId = auth.user.uid;

    // Recolectar todos los datos del usuario (colecciones en inglés)
    const userData: UserDataExport = {
      exportedAt: new Date().toISOString(),
      userId,
      dataRetention: '2 años conforme a la legislación de Guatemala',
      collections: {},
    };

    const collectionNames = [
      'projects',
      'apuItems',
      'expenses',
      'attendance',
      'employees',
      'machinery',
      'quotes',
      'fieldVisits',
    ];

    for (const colName of collectionNames) {
      const q = query(collection(db, colName), where('userId', '==', userId));
      const snap = await getDocs(q);
      userData.collections[colName] = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
        id: d.id,
        ...d.data(),
      }));
    }

    return createApiResponse(userData, {
      headers: {
        'Content-Disposition': `attachment; filename="origen-data-${Date.now()}.json"`,
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
      },
    });
  } catch (error) {
    return createApiError(
      error instanceof Error ? error.message : 'Error exportando los datos',
      500
    );
  }
}

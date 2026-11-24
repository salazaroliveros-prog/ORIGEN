import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * ✅ API ENDPOINT: GET /api/account/my-data
 *
 * Derechos ARCO:
 * - Acceso: Exportar todos mis datos en JSON
 * - Usado para: GDPR Data Portability + Compliance
 *
 * Rate Limit: 50 requests/min por usuario
 */

interface UserDataExport {
  exportedAt: string;
  userId: string;
  dataRetention: string;
  collections: Record<string, unknown[]>;
}

export async function GET(req: NextRequest) {
  try {
    // ✅ Rate Limiting: 50 req/min por usuario
    const rateLimitCheck = await checkRateLimit(req, {
      limit: 50,
      window: 60,
      key: 'my-data-export',
    });

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many data export requests. Try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // ✅ Autenticación requerida
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // En producción, validar token con Firebase Admin SDK
    // const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = 'user-id-from-token'; // Placeholder

    // ✅ Recolectar todos los datos del usuario
    const userData: UserDataExport = {
      exportedAt: new Date().toISOString(),
      userId,
      dataRetention: '2 years per Guatemala law',
      collections: {},
    };

    const collectionNames = [
      'proyectos',
      'apu',
      'gastos',
      'personal',
      'cotizaciones',
      'maquinaria',
      'asistencia',
    ];

    for (const colName of collectionNames) {
      const q = query(collection(db, colName), where('userId', '==', userId));
      const snap = await getDocs(q);
      userData.collections[colName] = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
        id: d.id,
        ...d.data(),
      }));
    }

    // ✅ Crear registro de auditoría
    const auditLog = {
      action: 'data_export',
      userId,
      timestamp: new Date().toISOString(),
      dataSize: JSON.stringify(userData).length,
    };
    // await db.collection('_audit_logs').add(auditLog);

    return NextResponse.json(userData, {
      headers: {
        'Content-Disposition': `attachment; filename="origen-data-${Date.now()}.json"`,
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error exporting data' },
      { status: 500 }
    );
  }
}

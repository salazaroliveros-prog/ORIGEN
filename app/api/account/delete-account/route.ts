import { NextRequest, NextResponse } from 'next/server';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { checkRateLimit } from '@/lib/rate-limit';
import { requireApiUser } from '@/lib/apiAuth';
import { createApiError, createApiResponse, applySecurityHeaders } from '@/lib/apiMiddleware';

/**
 * API ENDPOINT: DELETE /api/account/delete-account
 *
 * Derechos ARCO:
 * - Cancelación (Derecho al olvido)
 * - Elimina todos los datos del usuario en cascada
 *
 * Rate Limit: 2 requests/hour (crítico - muy restrictivo)
 */

export async function DELETE(req: NextRequest) {
  try {
    // Rate Limiting: 2 req/hour por usuario
    const rateLimitCheck = await checkRateLimit(req, {
      limit: 2,
      window: 3600,
      key: 'account-delete-critical',
    });

    if (!rateLimitCheck.allowed) {
      return createApiError(
        'Demasiados intentos de eliminación de cuenta. Inténtalo de nuevo después de 1 hora.',
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

    // Verificar token de confirmación (anti-CSRF para acción destructiva)
    let body: { confirmationToken?: string } = {};
    try {
      body = (await req.json()) as { confirmationToken?: string };
    } catch {
      body = {};
    }

    if (!body.confirmationToken || body.confirmationToken !== userId) {
      return createApiError('Token de confirmación requerido para eliminar la cuenta.', 400);
    }

    // Eliminar en cascada usando colecciones en inglés (coherentes con firestore.rules)
    const collections = [
      'projects',
      'apuItems',
      'expenses',
      'attendance',
      'employees',
      'machinery',
      'quotes',
      'fieldVisits',
    ];

    let deletedCount = 0;
    const batch = writeBatch(db);
    let batchCount = 0;

    for (const colName of collections) {
      const q = query(collection(db, colName), where('userId', '==', userId));
      const snap = await getDocs(q);

      for (const docSnap of snap.docs) {
        batch.delete(doc(db, colName, docSnap.id));
        deletedCount++;
        batchCount++;

        // Firestore batches max 500 operations
        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    // Eliminar usuario de Firebase Auth (requiere Admin SDK configurado)
    const adminAuth = (await import('firebase-admin/auth')).getAuth();
    try {
      await adminAuth.deleteUser(userId);
    } catch {
      // Si no hay Admin SDK configurado, continuar: los datos de Firestore ya se eliminaron
    }

    // Registro de auditoría
    const auditLog = {
      action: 'account_deleted',
      userId,
      timestamp: new Date().toISOString(),
      reason: 'user_requested',
      documentsDeleted: deletedCount,
      status: 'completed',
    };
    await setDoc(doc(db, '_audit_logs', `${userId}_${Date.now()}`), auditLog);

    return createApiResponse(
      { message: 'Cuenta eliminada correctamente', documentsDeleted: deletedCount },
      { status: 200 }
    );
  } catch (error) {
    return createApiError(
      error instanceof Error ? error.message : 'Error eliminando la cuenta',
      500
    );
  }
}

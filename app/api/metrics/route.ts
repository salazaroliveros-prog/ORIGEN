import { NextRequest, NextResponse } from 'next/server';

/**
 * API ENDPOINT: POST /api/metrics
 *
 * Recibe métricas de rendimiento del cliente (page load time, etc.)
 * enviadas mediante sendBeacon desde app/layout.tsx.
 *
 * En producción, las métricas se envían a Sentry. En desarrollo, se loguean.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Cuerpo inválido' }, { status: 400 });
    }

    const { type, duration, timestamp } = body as {
      type?: string;
      duration?: number;
      timestamp?: string;
    };

    if (type !== 'page_load' || typeof duration !== 'number') {
      return NextResponse.json({ success: false, error: 'Métrica no reconocida' }, { status: 400 });
    }

    // Enviar a Sentry como breadcrumb (si está configurado)
    try {
      const Sentry = (await import('@sentry/nextjs')).default;
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `Page load: ${duration}ms`,
        level: 'info',
        data: { type, duration, timestamp },
      });
    } catch {
      // Sentry no configurado, ignorar
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Error procesando métrica' }, { status: 500 });
  }
}

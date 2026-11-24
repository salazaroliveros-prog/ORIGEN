import { NextResponse } from 'next/server';

/**
 * ✅ API HEALTH CHECK
 * GET /api/health
 *
 * Usado para:
 * - Vercel health checks
 * - Uptime monitoring
 * - Load balancer validation
 */

export async function GET() {
  try {
    const startTime = Date.now();

    // ✅ Check básicos
    const checks = {
      status: 'healthy' as const,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        server: 'ok' as const,
        // Firebase check sería:
        // firebase: await checkFirebaseConnection() ? 'ok' : 'down'
      },
      responseTime: Date.now() - startTime,
    };

    return NextResponse.json(checks, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

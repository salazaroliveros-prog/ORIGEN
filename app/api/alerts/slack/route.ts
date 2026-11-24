import { NextRequest, NextResponse } from 'next/server';

/**
 * ✅ API ENDPOINT: POST /api/alerts/slack
 *
 * Envía alertas a Slack cuando:
 * - Salud de sistema degrada
 * - Errores críticos
 * - Performance issues
 * - Security warnings
 */

interface SlackAlert {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  app: string;
  environment: string;
}

export async function POST(req: NextRequest) {
  try {
    const alert: SlackAlert = await req.json();

    // Validar que tengamos URL de Slack
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (!slackWebhook) {
      console.warn('SLACK_WEBHOOK_URL not configured');
      return NextResponse.json({ ok: true }, { status: 200 }); // No fallar si no está configurado
    }

    // Configurar color según severidad
    const colorMap = {
      critical: '#FF0000', // Rojo
      warning: '#FFA500', // Naranja
      info: '#0099FF', // Azul
    };

    const payload = {
      text: `${alert.severity.toUpperCase()}: ${alert.message}`,
      attachments: [
        {
          color: colorMap[alert.severity],
          fields: [
            {
              title: 'Application',
              value: alert.app,
              short: true,
            },
            {
              title: 'Environment',
              value: alert.environment,
              short: true,
            },
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Timestamp',
              value: new Date(alert.timestamp).toISOString(),
              short: true,
            },
            {
              title: 'Message',
              value: alert.message,
              short: false,
            },
          ],
        },
      ],
    };

    // Enviar a Slack
    const slackResponse = await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!slackResponse.ok) {
      console.error('Slack API error:', await slackResponse.text());
      return NextResponse.json({ error: 'Failed to send Slack alert' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Alert sent to Slack' }, { status: 200 });
  } catch (error) {
    console.error('Alert endpoint error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError } from '@/lib/api';
import { requireApiUser, requireAppCheck } from '@/lib/apiAuth';
import { rateLimitMiddleware } from '@/lib/security';
import { isAllowedOriginValue, buildRequestOrigins } from '@/lib/originAllowlist';
import { createApiError, applySecurityHeaders } from '@/lib/apiMiddleware';

const WeatherPayloadSchema = z.object({
  temperatureC: z.number(),
  condition: z.enum([
    'Soleado',
    'Nublado',
    'Lluvia Moderada',
    'Tormenta Eléctrica',
    'Vientos Fuertes',
  ]),
  humidity: z.number().min(0).max(100),
  windSpeedKmH: z.number().min(0),
  rainChancePercent: z.number().min(0).max(100),
  safetyStatus: z.enum([
    'Seguro para Trabajos',
    'Precaución por Viento',
    'Suspender Trabajo en Alturas',
    'Alerta de Lluvia',
  ]),
  alerts: z.array(z.string()),
  recommendations: z.array(z.string()),
});

type WeatherPayload = z.infer<typeof WeatherPayloadSchema>;

const FALLBACK_WEATHER: WeatherPayload = {
  temperatureC: 23,
  condition: 'Nublado',
  humidity: 65,
  windSpeedKmH: 14,
  rainChancePercent: 20,
  safetyStatus: 'Seguro para Trabajos',
  alerts: [
    'Condición climática favorable para labores de fundición y trabajo en alturas.',
    'Monitorear vientos moderados en horas de la tarde.',
  ],
  recommendations: [
    'Mantener hidratación adecuada de cuadrillas de albañilería.',
    'Revisar anclajes de andamios y cubiertas temporales.',
  ],
};

function parseCoordinate(value: unknown, min: number, max: number): number | null {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return null;
  if (parsed < min || parsed > max) return null;
  return parsed;
}

async function buildResponse(params: {
  lat: number;
  lng: number;
  projectName: string;
  municipality: string;
}) {
  const { lat, lng, projectName, municipality } = params;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      success: true,
      source: 'fallback',
      degraded: true,
      weather: FALLBACK_WEATHER,
      alerts: FALLBACK_WEATHER.alerts,
      recommendations: FALLBACK_WEATHER.recommendations,
    });
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Actúa como un experto en seguridad industrial y meteorología para la construcción en Guatemala.
Para el proyecto "${projectName}" ubicado en ${municipality} (coordenadas: ${lat}, ${lng}):
Proporciona el estado del clima típico/actual y recomendaciones de seguridad para frentes de obra en formato JSON estricto:
{
  "temperatureC": number,
  "condition": "Soleado" | "Nublado" | "Lluvia Moderada" | "Tormenta Eléctrica" | "Vientos Fuertes",
  "humidity": number,
  "windSpeedKmH": number,
  "rainChancePercent": number,
  "safetyStatus": "Seguro para Trabajos" | "Precaución por Viento" | "Suspender Trabajo en Alturas" | "Alerta de Lluvia",
  "alerts": [string, string],
  "recommendations": [string, string]
}
Devuelve únicamente el JSON válido sin texto extra.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  const text = response.text || '';
  const cleanJson = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanJson);
  } catch {
    return NextResponse.json({
      success: true,
      source: 'fallback',
      degraded: true,
      weather: FALLBACK_WEATHER,
      alerts: FALLBACK_WEATHER.alerts,
      recommendations: FALLBACK_WEATHER.recommendations,
    });
  }

  // Validar con Zod: rechazar estructura inesperada
  const validated = WeatherPayloadSchema.safeParse(parsed);
  if (!validated.success) {
    return NextResponse.json({
      success: true,
      source: 'fallback',
      degraded: true,
      weather: FALLBACK_WEATHER,
      alerts: FALLBACK_WEATHER.alerts,
      recommendations: FALLBACK_WEATHER.recommendations,
    });
  }

  const weather = validated.data as WeatherPayload;

  return NextResponse.json({
    success: true,
    source: 'gemini-ai',
    weather,
    alerts: weather.alerts,
    recommendations: weather.recommendations,
  });
}

function extractParams(input: Record<string, unknown>) {
  const lat = parseCoordinate(input.lat, -90, 90);
  const lng = parseCoordinate(input.lng, -180, 180);
  if (lat === null || lng === null) {
    return null;
  }
  return {
    lat,
    lng,
    projectName:
      typeof input.projectName === 'string' && input.projectName.trim()
        ? input.projectName.slice(0, 120)
        : 'Obra',
    municipality:
      typeof input.municipality === 'string' && input.municipality.trim()
        ? input.municipality.slice(0, 120)
        : 'Guatemala',
  };
}

export async function POST(req: NextRequest) {
  try {
    // CSRF: verificar origen
    const origin = req.headers.get('origin');
    const requestOrigins = buildRequestOrigins({
      requestUrl: req.url,
      host: req.headers.get('x-forwarded-host') ?? req.headers.get('host'),
      protocol: req.headers.get('x-forwarded-proto'),
    });
    if (origin && !isAllowedOriginValue(origin, requestOrigins)) {
      return createApiError('Origen no autorizado.', 403);
    }

    const auth = await requireApiUser(req);
    if (!auth.ok) {
      return createApiError(auth.message, auth.status);
    }

    // App Check
    const appCheckResponse = await requireAppCheck(req);
    if (appCheckResponse) {
      return applySecurityHeaders(appCheckResponse);
    }

    // Rate limiting por usuario
    const rateLimitResponse = await rateLimitMiddleware(`weather:${auth.user.uid}`);
    if (rateLimitResponse) {
      return applySecurityHeaders(rateLimitResponse);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return createApiError('Solicitud inválida: se esperaba un objeto JSON.', 400);
    }

    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return createApiError('Solicitud inválida: se esperaba un objeto JSON.', 400);
    }

    const params = extractParams(body as Record<string, unknown>);
    if (!params) {
      return createApiError('Coordenadas inválidas: verifique latitud y longitud.', 400);
    }

    const response = await buildResponse(params);
    return applySecurityHeaders(response);
  } catch (error: unknown) {
    console.error('Weather safety alerts route error:', error);
    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        source: 'fallback',
        degraded: true,
        weather: FALLBACK_WEATHER,
        alerts: FALLBACK_WEATHER.alerts,
        recommendations: FALLBACK_WEATHER.recommendations,
      })
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // CSRF: verificar origen (GET también puede ser usado para CSRF en algunos escenarios)
    const origin = req.headers.get('origin');
    const requestOrigins = buildRequestOrigins({
      requestUrl: req.url,
      host: req.headers.get('x-forwarded-host') ?? req.headers.get('host'),
      protocol: req.headers.get('x-forwarded-proto'),
    });
    if (origin && !isAllowedOriginValue(origin, requestOrigins)) {
      return createApiError('Origen no autorizado.', 403);
    }

    const auth = await requireApiUser(req);
    if (!auth.ok) {
      return createApiError(auth.message, auth.status);
    }

    // Rate limiting por usuario
    const rateLimitResponse = await rateLimitMiddleware(`weather:${auth.user.uid}`);
    if (rateLimitResponse) {
      return applySecurityHeaders(rateLimitResponse);
    }

    const { searchParams } = new URL(req.url);
    const params = extractParams({
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      projectName: searchParams.get('projectName'),
      municipality: searchParams.get('municipality'),
    });

    if (!params) {
      return createApiError('Coordenadas inválidas: verifique latitud y longitud.', 400);
    }

    const response = await buildResponse(params);
    return applySecurityHeaders(response);
  } catch (error: unknown) {
    console.error('Weather safety alerts route error:', error);
    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        source: 'fallback',
        degraded: true,
        weather: FALLBACK_WEATHER,
        alerts: FALLBACK_WEATHER.alerts,
        recommendations: FALLBACK_WEATHER.recommendations,
      })
    );
  }
}

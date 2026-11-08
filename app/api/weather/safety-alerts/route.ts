import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/api';
import { rateLimitMiddleware, getClientIp } from '@/lib/security';

interface WeatherPayload {
  temperatureC: number;
  condition: string;
  humidity: number;
  windSpeedKmH: number;
  rainChancePercent: number;
  safetyStatus: string;
  alerts: string[];
  recommendations: string[];
}

const FALLBACK_WEATHER: WeatherPayload = {
  temperatureC: 23,
  condition: 'Parcialmente Nublado',
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
  const parsed = JSON.parse(cleanJson) as WeatherPayload;

  return NextResponse.json({
    success: true,
    source: 'gemini-ai',
    weather: parsed,
    alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
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
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError('Solicitud inválida: se esperaba un objeto JSON.', 400);
    }

    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return jsonError('Solicitud inválida: se esperaba un objeto JSON.', 400);
    }

    const params = extractParams(body as Record<string, unknown>);
    if (!params) {
      return jsonError('Coordenadas inválidas: verifique latitud y longitud.', 400);
    }

    return await buildResponse(params);
  } catch (error: unknown) {
    console.error('Weather safety alerts route error:', error);
    return NextResponse.json({
      success: true,
      source: 'fallback',
      degraded: true,
      weather: FALLBACK_WEATHER,
      alerts: FALLBACK_WEATHER.alerts,
      recommendations: FALLBACK_WEATHER.recommendations,
    });
  }
}

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIp(req);
  const rateLimitResponse = rateLimitMiddleware(`weather:${clientIp}`);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(req.url);
  const params = extractParams({
    lat: searchParams.get('lat'),
    lng: searchParams.get('lng'),
    projectName: searchParams.get('projectName'),
    municipality: searchParams.get('municipality'),
  });

  if (!params) {
    return jsonError('Coordenadas inválidas: verifique latitud y longitud.', 400);
  }

  try {
    return await buildResponse(params);
  } catch (error: unknown) {
    console.error('Weather safety alerts route error:', error);
    return NextResponse.json({
      success: true,
      source: 'fallback',
      degraded: true,
      weather: FALLBACK_WEATHER,
      alerts: FALLBACK_WEATHER.alerts,
      recommendations: FALLBACK_WEATHER.recommendations,
    });
  }
}

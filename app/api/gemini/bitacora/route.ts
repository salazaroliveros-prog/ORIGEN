import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { jsonError, readJsonBody, isNonEmptyString, MAX_TEXT_LENGTH } from '@/lib/api';
import { createRateLimitMiddleware, applySecurityHeaders } from '@/lib/apiMiddleware';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateLimitMiddleware = createRateLimitMiddleware({
      windowMs: 60 * 1000,
      maxRequests: 10,
      keyPrefix: 'gemini-bitacora',
    });
    const rateLimitResponse = await rateLimitMiddleware(req);
    if (rateLimitResponse) return applySecurityHeaders(rateLimitResponse);

    const body = await readJsonBody(req);
    if (!body) {
      return applySecurityHeaders(jsonError('Solicitud inválida: se esperaba un objeto JSON.', 400));
    }

    const voiceNotes = body.voiceNotes;
    if (!isNonEmptyString(voiceNotes, MAX_TEXT_LENGTH)) {
      return applySecurityHeaders(jsonError('El texto de nota de voz del capataz es requerido.', 400));
    }

    const projectName = typeof body.projectName === 'string' ? body.projectName.slice(0, 120) : '';
    const capatazName = typeof body.capatazName === 'string' ? body.capatazName.slice(0, 120) : '';
    const date =
      typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
        ? body.date
        : new Date().toISOString().split('T')[0];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return applySecurityHeaders(jsonError('El servicio de IA no está configurado.', 503));
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const currentDate = date;
    const folioRandom = Math.floor(1000 + Math.random() * 9000);

    const systemInstruction = `Eres el Ingeniero Director de Obra y Asistente Técnico de Construcción en Guatemala de ConstructERP.
Tu tarea es convertir notas de voz desestructuradas enviadas por capataces y maestros de obra en un informe técnico oficial ("Smart Bitácora de Obra") cumpliendo normativas AGIES, COGUANOR, IGSS y Ley de Contrataciones del Estado.

Organiza la información de forma profesional, clara y precisa en formato JSON. Incluye cantidades físicas registradas, clima, cuadrillas, materiales ingresados y observaciones técnicas o de seguridad.`;

    const userPrompt = `Proyecto: ${projectName || 'Proyecto General'}
Capataz / Informante: ${capatazName || 'Capataz de Campo'}
Fecha de Reporte: ${currentDate}

Transcripción de Nota de Voz del Capataz:
"${voiceNotes}"

Genera el acta/bitacora estructurada diaria.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            folioNumber: {
              type: Type.STRING,
              description: 'Número de Folio oficial (ej. BIT-2026-042)',
            },
            projectName: { type: Type.STRING },
            date: { type: Type.STRING },
            capatazName: { type: Type.STRING },
            climaYCondiciones: {
              type: Type.STRING,
              description: 'Estado del clima y horas laborables afectadas',
            },
            resumenEjecutivo: {
              type: Type.STRING,
              description: 'Resumen gerencial de 2 a 3 oraciones de la jornada',
            },
            personalEnCampo: {
              type: Type.OBJECT,
              properties: {
                cuadrillas: { type: Type.STRING },
                totalOperarios: { type: Type.INTEGER },
                detalles: { type: Type.STRING },
              },
              required: ['cuadrillas', 'totalOperarios', 'detalles'],
            },
            trabajosEjecutados: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  descripcion: { type: Type.STRING },
                  cantidadUnidad: { type: Type.STRING },
                  renglonApu: { type: Type.STRING },
                },
                required: ['item', 'descripcion', 'cantidadUnidad'],
              },
            },
            materialesRecibidos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  material: { type: Type.STRING },
                  cantidad: { type: Type.STRING },
                  proveedor: { type: Type.STRING },
                },
                required: ['material', 'cantidad'],
              },
            },
            incidentesYObservaciones: { type: Type.STRING },
            cumplimientoNormativoAgies: { type: Type.STRING },
            planificacionManana: { type: Type.STRING },
          },
          required: [
            'folioNumber',
            'projectName',
            'date',
            'capatazName',
            'climaYCondiciones',
            'resumenEjecutivo',
            'personalEnCampo',
            'trabajosEjecutados',
            'materialesRecibidos',
            'incidentesYObservaciones',
            'cumplimientoNormativoAgies',
            'planificacionManana',
          ],
        },
      },
    });

    const responseText = response.text || '';
    const parsedData = JSON.parse(responseText);

    return applySecurityHeaders(NextResponse.json({
      success: true,
      bitacora: {
        ...parsedData,
        id: `bit-${Date.now()}`,
        folioNumber: parsedData.folioNumber || `BIT-2026-${folioRandom}`,
        createdAt: new Date().toISOString(),
      },
    }));
  } catch (error: unknown) {
    console.error('Error generating Smart Bitácora with Gemini:', error);
    return applySecurityHeaders(jsonError('No se pudo generar la Bitácora con Gemini IA.', 500));
  }
}
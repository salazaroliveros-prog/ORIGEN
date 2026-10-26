import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { APIError } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { voiceNotes, projectName, capatazName, date } = await req.json();

    if (!voiceNotes || typeof voiceNotes !== 'string') {
      return NextResponse.json(
        { error: 'El texto de nota de voz del capataz es requerido.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clave API GEMINI_API_KEY no configurada en el servidor.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const currentDate = date || new Date().toISOString().split('T')[0];
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
      model: 'gemini-3.8-flash',
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

    return NextResponse.json({
      success: true,
      bitacora: {
        ...parsedData,
        id: `bit-${Date.now()}`,
        folioNumber: parsedData.folioNumber || `BIT-2026-${folioRandom}`,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error generating Smart Bitácora with Gemini:', error);
    return NextResponse.json(
      {
        error: 'No se pudo generar la Bitácora con Gemini IA.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

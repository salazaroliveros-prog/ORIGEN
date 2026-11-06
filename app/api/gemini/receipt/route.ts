import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { jsonError, readJsonBody, isDataUrlImage } from '@/lib/api';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req);
    if (!body) {
      return jsonError('Solicitud inválida: se esperaba un objeto JSON.', 400);
    }

    const image = body.image;
    if (!isDataUrlImage(image)) {
      return jsonError('Debe adjuntar una imagen de factura o recibo válida.', 400);
    }

    const matches = image.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return jsonError('Formato de imagen no válido.', 400);
    }

    const mimeType = matches[1].toLowerCase();
    const base64Data = matches[2];

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return jsonError('Tipo de imagen no soportado. Use JPG, PNG, WEBP, GIF o HEIC.', 400);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return jsonError('El servicio de lectura de facturas no está configurado.', 503);
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: "Analyze this Guatemalan commercial receipt/factura/ticket. Extract the following details in JSON format:\n- supplier (vendor company name)\n- nitSupplier (NIT number of supplier, e.g. 123456-7)\n- facturaNumber (invoice or serial number)\n- amount (total amount in Quetzales as a number)\n- category (one of: 'Materiales (Cementos, Hierro)', 'Mano de Obra', 'Maquinaria y Combustible', 'Permisos & Licencias', 'Imprevistos')\n- description (short summary of items or purchase).\nReturn ONLY valid JSON with keys: supplier, nitSupplier, facturaNumber, amount, category, description.",
        },
      ],
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return jsonError('No se pudo interpretar la factura. Intente con una imagen más clara.', 422);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return jsonError('No se pudo interpretar la factura. Intente con una imagen más clara.', 422);
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: unknown) {
    console.error('Gemini receipt analysis error:', error);
    return jsonError('No se pudo analizar la factura en este momento.', 500);
  }
}

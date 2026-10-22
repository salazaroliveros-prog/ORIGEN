import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: true,
        data: {
          supplier: "Distribuidora de Materiales de Guatemala",
          nitSupplier: "1049281-2",
          facturaNumber: "FEL-B-99214",
          amount: 4750,
          category: "Materiales (Cementos, Hierro)",
          description: "Compra de cemento y agregados para fundición",
        },
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const matches = image.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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

    const text = response.text || "{}";
    let parsed = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      parsed = { description: text };
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Gemini receipt analysis error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze receipt" }, { status: 500 });
  }
}

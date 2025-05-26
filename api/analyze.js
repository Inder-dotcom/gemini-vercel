import { GoogleGenAI, Modality } from "@google/genai";

// Main Vercel API Handler
export default async function handler(req, res) {
  // --- CORS Headers ---
  if (req.method === 'OPTIONS') {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
    return res.status(200).end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { prompt, imageBase64 } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Prepare the contents array
    const contents = [];
    if (imageBase64) {
      contents.push({
        inlineData: {
          mimeType: "image/png",
          data: imageBase64,
        },
      });
    }
    contents.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: imageBase64
        ? "gemini-2.0-flash-preview-image-generation"
        : "gemini-1.5-flash",
      contents,
      config: {
        responseModality: imageBase64 ? Modality.IMAGE : Modality.TEXT,
        responseMimeType: "image/png",
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;

    if (!parts || parts.length === 0) {
      return res.status(500).json({ error: "No response from Gemini." });
    }

    for (const part of parts) {
      if (part.inlineData?.data) {
        // Image was returned
        return res.status(200).json({ base64Image: part.inlineData.data });
      } else if (part.text) {
        // Text insight returned
        return res.status(200).json({ insights: part.text });
      }
    }

    return res.status(500).json({ error: "Unexpected Gemini response format." });
  } catch (err) {
    console.error("Gemini Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error." });
  }
}

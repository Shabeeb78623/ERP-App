
import { GoogleGenAI } from "@google/genai";

// NOTE: In a real production app, this key should be proxied through a backend or carefully managed.
// The prompt instructions dictate using process.env.API_KEY directly.
// We add a safety check for 'process' to avoid crashing in pure browser environments.
const API_KEY = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';

export const generateCommunicationDraft = async (
  topic: string,
  tone: string,
  audience: string
): Promise<string> => {
  if (!API_KEY) {
    console.warn("Gemini API Key is missing.");
    return "Error: API Key is missing. Please configure process.env.API_KEY.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    const prompt = `
      You are an assistant for a community organization in the UAE. 
      Write a ${tone} notification message about "${topic}" intended for ${audience}.
      Keep it concise, professional, and culturally appropriate for the region.
      Do not include placeholders like [Name], keep it general or use "Members".
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate content.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating content. Please try again later.";
  }
};

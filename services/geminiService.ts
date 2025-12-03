
import { GoogleGenAI } from "@google/genai";

export const generateCommunicationDraft = async (
  topic: string,
  tone: string,
  audience: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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

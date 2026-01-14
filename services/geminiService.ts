
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { ToneType } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const convertText = async (input: string, tone: ToneType): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Current Tone Context: ${tone}\n\nInput Text: ${input}`,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION, 
        temperature: 0.65, // Lower temperature for more stable polishing
      },
    });
    return response.text?.trim() || "No response received.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw new Error(error.message || "Connection to Engine failed.");
  }
};

export const getSmartVariations = async (text: string): Promise<string[]> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Base Text: ${text}\n\nTask: Generate 3 alternate versions that differ in style: 1. A bit more concise, 2. A bit more descriptive/flowy, 3. More punchy/assertive. Format: Separate versions strictly with the delimiter '---' and no other text.`,
      config: { 
        temperature: 0.85, 
        systemInstruction: "You are a variation engine. Provide ONLY the 3 variations separated by '---'."
      },
    });
    return (response.text || "").split('---').map(t => t.trim()).filter(Boolean).slice(0, 3);
  } catch {
    return [];
  }
};

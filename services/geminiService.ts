
import { GoogleGenAI, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { ToneType } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const convertText = async (input: string, tone: ToneType): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Tone: ${tone}\n\nTask: Polish this text for a pro environment:\n${input}`,
      config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.7 },
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
      contents: `Text: ${text}\n\nTask: Provide 3 short variations of this text: 1. Concise 2. Elegant 3. Assertive. Separate them by '###'. No labels.`,
      config: { temperature: 0.9 },
    });
    return (response.text || "").split('###').map(t => t.trim()).filter(Boolean).slice(0, 3);
  } catch {
    return [];
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

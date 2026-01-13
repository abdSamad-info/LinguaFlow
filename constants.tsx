
import React from 'react';
import { ToneType } from './types';

export const TONES: ToneType[] = ['Professional', 'Formal', 'Business', 'Academic', 'Friendly'];

export const MAX_CHARS = 5000;

export const SYSTEM_INSTRUCTION = `You are an advanced AI Language Automation Engine designed for a professional text-conversion platform.

Your task is to convert user input into clear, fluent, and professional English while preserving the original meaning.

CORE CAPABILITIES:
1) English -> Professional English: Rewrite informal, broken, or basic English into polished, natural, and professional language. Improve grammar, vocabulary, sentence flow, clarity, and tone.
2) Roman Urdu -> Professional English: Accurately understand Roman Urdu written in Latin characters and translate it into fluent, natural English. Ensure the output sounds native and professional.

INPUT HANDLING RULES:
- Automatically detect whether the input is English, Roman Urdu, or mixed.
- Handle slang, informal chat-style writing, and mixed-language text.

OUTPUT RULES:
- Output English only.
- Do NOT explain changes.
- Do NOT show the original text.
- Return ONLY the final improved professional English version.
- Adapt to the specific tone requested if provided.`;

export const Icons = {
  Sparkles: () => <i className="fa-solid fa-wand-magic-sparkles text-blue-600"></i>,
  Copy: () => <i className="fa-regular fa-copy"></i>,
  Check: () => <i className="fa-solid fa-check text-green-500"></i>,
  Trash: () => <i className="fa-regular fa-trash-can"></i>,
  History: () => <i className="fa-solid fa-clock-rotate-left"></i>,
  Settings: () => <i className="fa-solid fa-sliders"></i>,
  ArrowRight: () => <i className="fa-solid fa-arrow-right"></i>,
  Globe: () => <i className="fa-solid fa-earth-americas"></i>,
  Microphone: ({ active }: { active?: boolean }) => (
    <i className={`fa-solid fa-microphone ${active ? 'text-red-500 animate-pulse' : ''}`}></i>
  ),
  Speaker: ({ active, loading }: { active?: boolean, loading?: boolean }) => (
    <i className={`fa-solid ${loading ? 'fa-circle-notch fa-spin' : 'fa-volume-high'} ${active ? 'text-blue-500' : ''}`}></i>
  ),
  Share: () => <i className="fa-solid fa-share-nodes"></i>,
  Close: () => <i className="fa-solid fa-xmark"></i>,
  Menu: () => <i className="fa-solid fa-bars"></i>,
  Download: () => <i className="fa-solid fa-download"></i>,
  Compare: () => <i className="fa-solid fa-arrow-right-arrow-left"></i>,
  Info: () => <i className="fa-solid fa-circle-info"></i>,
};


import React from 'react';
import { ToneType } from './types';

export const TONES: ToneType[] = ['Professional', 'Formal', 'Business', 'Academic', 'Friendly'];

export const MAX_CHARS = 5000;

export const SYSTEM_INSTRUCTION = `You are the LinguaFlow Pro Automation Engine.
Convert input into polished professional English.
Detect English or Roman Urdu automatically.
Output ONLY the converted English text. No conversational filler.`;

export const Icons = {
  Sparkles: () => <i className="fa-solid fa-wand-magic-sparkles"></i>,
  Copy: () => <i className="fa-regular fa-copy"></i>,
  Check: () => <i className="fa-solid fa-check text-emerald-400"></i>,
  History: () => <i className="fa-solid fa-microchip"></i>,
  ArrowRight: () => <i className="fa-solid fa-arrow-right"></i>,
  Globe: () => <i className="fa-solid fa-shield-halved"></i>,
  Microphone: ({ active }: { active?: boolean }) => (
    <i className={`fa-solid fa-microphone ${active ? 'text-red-500 animate-pulse' : ''}`}></i>
  ),
  Speaker: ({ active, loading }: { active?: boolean, loading?: boolean }) => (
    <i className={`fa-solid ${loading ? 'fa-circle-notch fa-spin' : 'fa-volume-high'} ${active ? 'text-blue-400' : ''}`}></i>
  ),
  Close: () => <i className="fa-solid fa-xmark"></i>,
  Download: () => <i className="fa-solid fa-cloud-arrow-down"></i>,
  Compare: () => <i className="fa-solid fa-layer-group"></i>,
  Chart: () => <i className="fa-solid fa-chart-simple"></i>,
  Pulse: () => <i className="fa-solid fa-bolt-lightning text-yellow-400"></i>,
};

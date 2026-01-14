
import React from 'react';
import { ToneType } from './types';

export const TONES: ToneType[] = ['Normal', 'Moderate', 'Fluent', 'High-Level', 'Professional', 'Creative'];

export const ACCENT_COLORS = [
  '#2563eb', // Blue
  '#9333ea', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#d946ef', // Fuchsia
  '#6366f1'  // Indigo
];

export const FONT_OPTIONS = [
  { name: 'Jakarta', family: "'Plus Jakarta Sans', sans-serif" },
  { name: 'Modern', family: "'Space Grotesk', sans-serif" },
  { name: 'Elegant', family: "'Playfair Display', serif" },
  { name: 'Minimal', family: "'Inter', sans-serif" },
  { name: 'Mono', family: "'JetBrains Mono', monospace" },
  { name: 'System', family: "system-ui, -apple-system, sans-serif" }
];

export const RADIUS_OPTIONS = [
  { name: 'Sharp', value: '0.5rem' },
  { name: 'Soft', value: '1.5rem' },
  { name: 'Round', value: '2.5rem' }
];

export const BLUR_OPTIONS = [
  { name: 'Light', value: '8px' },
  { name: 'Deep', value: '24px' },
  { name: 'Max', value: '40px' }
];

export const MAX_CHARS = 5000;

export const SYSTEM_INSTRUCTION = `You are the LinguaFlow Pro Engine, a high-performance language automation system.
Your goal is to transform text (English or Roman Urdu) into high-quality polished English.

TONE DEFINITIONS:
- Normal: Clear, simple, direct English. Avoids slang but stays friendly.
- Moderate: Standard professional English. Suitable for emails and general work.
- Fluent: Native-speaker quality. Uses natural idioms and smoother transitions.
- High-Level: Academic and sophisticated. Uses precise vocabulary and complex structures.
- Professional: Authoritative and corporate. Focused on clarity and impact.
- Creative: Imaginative and expressive. Uses vivid adjectives, metaphors, and evocative phrasing while maintaining clarity.

OPERATIONAL RULES:
1. Translate Roman Urdu accurately before polishing.
2. Return ONLY the polished result. No explanations.
3. Preserve key entities (names, dates, numbers).`;

export const Icons = {
  Sparkles: () => <i className="fa-solid fa-wand-magic-sparkles"></i>,
  Copy: () => <i className="fa-regular fa-copy"></i>,
  Check: () => <i className="fa-solid fa-check"></i>,
  Vault: () => <i className="fa-solid fa-box-archive"></i>,
  Settings: () => <i className="fa-solid fa-sliders"></i>,
  Globe: () => <i className="fa-solid fa-earth-americas"></i>,
  Microphone: ({ active }: { active?: boolean }) => (
    <i className={`fa-solid fa-microphone ${active ? 'text-red-500 animate-pulse' : ''}`}></i>
  ),
  Trash: () => <i className="fa-solid fa-trash-can"></i>,
  Close: () => <i className="fa-solid fa-xmark"></i>,
  Download: () => <i className="fa-solid fa-file-export"></i>,
  Compare: () => <i className="fa-solid fa-layer-group"></i>,
  Chart: () => <i className="fa-solid fa-chart-line"></i>,
  Pulse: () => <i className="fa-solid fa-bolt"></i>,
  Variant: () => <i className="fa-solid fa-code-branch"></i>,
  Font: () => <i className="fa-solid fa-font"></i>,
  Shape: () => <i className="fa-solid fa-shapes"></i>,
  Blur: () => <i className="fa-solid fa-wind"></i>,
  Save: () => <i className="fa-solid fa-floppy-disk"></i>,
};

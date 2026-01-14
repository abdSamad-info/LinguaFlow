
export type ToneType = 'Normal' | 'Moderate' | 'Fluent' | 'High-Level' | 'Professional' | 'Creative';

export interface ConversionRecord {
  id: string;
  timestamp: number;
  input: string;
  output: string;
  tone: ToneType;
}

export interface GeminiResponse {
  text: string;
}


export type ToneType = 'Professional' | 'Formal' | 'Business' | 'Academic' | 'Friendly';

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

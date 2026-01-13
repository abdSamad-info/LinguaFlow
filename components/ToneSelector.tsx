
import React from 'react';
import { TONES } from '../constants';
import { ToneType } from '../types';

interface ToneSelectorProps {
  selectedTone: ToneType;
  onSelect: (tone: ToneType) => void;
}

const ToneSelector: React.FC<ToneSelectorProps> = ({ selectedTone, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {TONES.map((tone) => (
        <button
          key={tone}
          onClick={() => onSelect(tone)}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border ${
            selectedTone === tone
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
          }`}
        >
          {tone}
        </button>
      ))}
    </div>
  );
};

export default ToneSelector;

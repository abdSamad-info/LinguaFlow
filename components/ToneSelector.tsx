
import React from 'react';
import { TONES } from '../constants';
import { ToneType } from '../types';

interface ToneSelectorProps {
  selectedTone: ToneType;
  onSelect: (tone: ToneType) => void;
}

const ToneSelector: React.FC<ToneSelectorProps> = ({ selectedTone, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
      {TONES.map((tone) => (
        <button
          key={tone}
          onClick={() => onSelect(tone)}
          className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
            selectedTone === tone
              ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/10'
              : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10 hover:text-slate-300'
          }`}
        >
          {tone}
        </button>
      ))}
    </div>
  );
};

export default ToneSelector;

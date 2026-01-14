
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import ToneSelector from './components/ToneSelector';
import { convertText, getSmartVariations } from './services/geminiService';
import { ToneType, ConversionRecord } from './types';
import { Icons, MAX_CHARS, FONT_OPTIONS, RADIUS_OPTIONS, BLUR_OPTIONS, ACCENT_COLORS } from './constants';

const App: React.FC = () => {
  // Core State
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [variations, setVariations] = useState<string[]>([]);
  const [tone, setTone] = useState<ToneType>('Normal');
  const [isLoading, setIsLoading] = useState(false);
  const [isVariationsLoading, setIsVariationsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  // UI State
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<ConversionRecord[]>([]);
  
  // Design Preferences (Persisted)
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0]); 
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].family);
  const [borderRadius, setBorderRadius] = useState(RADIUS_OPTIONS[2].value);
  const [blurLevel, setBlurLevel] = useState(BLUR_OPTIONS[1].value);

  const recognitionRef = useRef<any>(null);

  // Initialize from LocalStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('linguaflow_history_v2');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedTheme = localStorage.getItem('linguaflow_theme');
    if (savedTheme) setAccentColor(savedTheme);

    const savedFont = localStorage.getItem('linguaflow_font');
    if (savedFont) setFontFamily(savedFont);

    const savedRadius = localStorage.getItem('linguaflow_radius');
    if (savedRadius) setBorderRadius(savedRadius);

    const savedBlur = localStorage.getItem('linguaflow_blur');
    if (savedBlur) setBlurLevel(savedBlur);

    // Speech Recognition Setup
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (e: any) => {
        let finalStr = '';
        let interimStr = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) finalStr += e.results[i][0].transcript;
          else interimStr += e.results[i][0].transcript;
        }
        if (finalStr) {
          setInput(prev => (prev + ' ' + finalStr).trim().slice(0, MAX_CHARS));
          setInterimTranscript('');
        } else setInterimTranscript(interimStr);
      };
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('linguaflow_history_v2', JSON.stringify(history));
    localStorage.setItem('linguaflow_theme', accentColor);
    localStorage.setItem('linguaflow_font', fontFamily);
    localStorage.setItem('linguaflow_radius', borderRadius);
    localStorage.setItem('linguaflow_blur', blurLevel);
  }, [history, accentColor, fontFamily, borderRadius, blurLevel]);

  const handleConvert = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setVariations([]);
    try {
      const result = await convertText(input, tone);
      setOutput(result);
      
      // Auto-fetch variants
      setIsVariationsLoading(true);
      const variants = await getSmartVariations(result);
      setVariations(variants);
      
      setHistory(prev => [{
        id: Date.now().toString(),
        timestamp: Date.now(),
        input,
        output: result,
        tone
      }, ...prev].slice(0, 50));
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsVariationsLoading(false);
    }
  };

  const clearAll = () => {
    setInput('');
    setOutput('');
    setVariations([]);
    setInterimTranscript('');
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) recognitionRef.current.stop();
    else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const selectVariation = (variantText: string) => {
    const oldMain = output;
    setOutput(variantText);
    setVariations(prev => prev.map(v => v === variantText ? oldMain : v));
  };

  const exportHistory = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'linguaflow_history.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <Layout 
      accentColor={accentColor} 
      fontFamily={fontFamily} 
      borderRadius={borderRadius} 
      blurLevel={blurLevel}
    >
      <div className="space-y-6 md:space-y-10 max-w-5xl mx-auto">
        
        {/* Actions Bar */}
        <div className="flex justify-between items-center px-2">
          <div className="flex gap-3">
            <button 
              onClick={() => setShowHistory(true)}
              className="px-5 py-2.5 glass text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-all flex items-center gap-3 border-white/5"
            >
              <Icons.Vault /> <span className="hidden sm:inline">History</span>
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="px-5 py-2.5 glass text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-all flex items-center gap-3 border-white/5"
            >
              <Icons.Settings /> <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
          <button 
            onClick={clearAll}
            className="px-5 py-2.5 glass text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-3 border-white/5"
          >
            <Icons.Trash /> <span className="hidden sm:inline">Clear</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Input Area */}
          <div className="glass p-6 sm:p-10 relative overflow-hidden group">
            <div 
              className="absolute top-0 left-0 w-1 h-full transition-all duration-500"
              style={{ backgroundColor: accentColor }}
            />
            <div className="flex justify-between items-center mb-8">
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
                <Icons.Globe /> Neural Processing
              </span>
              <button 
                onClick={toggleListening}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              >
                <Icons.Microphone active={isListening} />
              </button>
            </div>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste text or speak to refine..."
              className="w-full min-h-[180px] sm:min-h-[250px] bg-transparent border-none outline-none text-2xl sm:text-3xl font-bold text-white placeholder:text-slate-800 resize-none custom-scrollbar leading-relaxed"
            />
            
            {isListening && interimTranscript && (
              <div className="absolute inset-x-10 bottom-32 p-5 glass text-blue-400 text-lg italic animate-pulse border-blue-500/20">
                "{interimTranscript}..."
              </div>
            )}
            
            <div className="mt-8 flex flex-col lg:flex-row items-center justify-between gap-6 pt-8 border-t border-white/5">
              <ToneSelector selectedTone={tone} onSelect={setTone} />
              <button
                onClick={handleConvert}
                disabled={isLoading || !input.trim()}
                className="w-full lg:w-auto px-12 py-5 font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl disabled:opacity-20 flex items-center justify-center gap-4 group hover:scale-[1.02] active:scale-[0.98]"
                style={{ 
                  backgroundColor: accentColor, 
                  color: 'white', 
                  boxShadow: `0 15px 45px -15px ${accentColor}`,
                  borderRadius: borderRadius
                }}
              >
                {isLoading ? <i className="fa-solid fa-sync fa-spin"></i> : <Icons.Sparkles />}
                {isLoading ? 'Translating' : 'Execute Polish'}
              </button>
            </div>
          </div>

          {/* Results Area */}
          {output && (
            <div className="space-y-6 animate-fade-in">
              <div className="glass p-8 sm:p-12 border-white/10 relative shadow-2xl">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center gap-4">
                    <Icons.Pulse />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: accentColor }}>Refinement Record</span>
                  </div>
                  <button onClick={() => copyToClipboard(output)} className="p-4 glass rounded-2xl hover:bg-white/10 text-slate-400 hover:text-white transition-all border-white/5">
                    <Icons.Copy />
                  </button>
                </div>
                <p className="text-3xl sm:text-5xl font-bold text-white leading-[1.2] mb-4">
                  {output}
                </p>
              </div>

              {/* Variations */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4">
                  <Icons.Variant />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Synthetic Variations</span>
                  {isVariationsLoading && <i className="fa-solid fa-circle-notch fa-spin text-xs text-slate-600"></i>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {variations.length > 0 ? variations.map((variant, idx) => (
                    <div 
                      key={idx}
                      onClick={() => selectVariation(variant)}
                      className="glass p-6 cursor-pointer group hover:border-white/20 transition-all border-white/5"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Variation {idx + 1}</span>
                        <div className="w-2 h-2 rounded-full transition-colors" style={{ backgroundColor: accentColor + '33' }}></div>
                      </div>
                      <p className="text-sm text-slate-400 group-hover:text-white transition-colors leading-relaxed line-clamp-4">
                        {variant}
                      </p>
                    </div>
                  )) : !isVariationsLoading && (
                    <div className="col-span-full py-6 text-center opacity-20 text-[10px] font-bold uppercase tracking-widest">
                      Generating synthetic alternatives...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass w-full max-w-3xl p-8 sm:p-12 max-h-[85vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] border-white/5">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-lg font-black uppercase tracking-[0.3em] text-white flex items-center gap-5">
                <Icons.Vault /> Engine Archive
              </h2>
              <div className="flex gap-4">
                 <button onClick={exportHistory} className="p-4 glass rounded-2xl text-slate-400 hover:text-white transition-all"><Icons.Download /></button>
                 <button onClick={() => setShowHistory(false)} className="w-12 h-12 glass flex items-center justify-center text-slate-400 hover:text-white transition-all"><Icons.Close /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-4">
              {history.length > 0 ? history.map(item => (
                <div key={item.id} className="p-6 bg-white/5 border border-white/5 hover:border-white/20 transition-all group relative overflow-hidden glass">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/5 text-slate-400">{item.tone}</span>
                    <span className="text-[10px] text-slate-600 font-mono">{new Date(item.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-1 italic">"{item.input}"</p>
                  <p className="text-lg text-white font-bold leading-snug">{item.output}</p>
                  <button 
                    onClick={() => {setInput(item.input); setOutput(item.output); setShowHistory(false)}}
                    className="mt-6 px-6 py-2.5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10 hover:text-white"
                    style={{ borderRadius: 'calc(var(--radius) / 2)' }}
                  >
                    Restore Workspace
                  </button>
                </div>
              )) : (
                <div className="text-center py-20 opacity-20">
                   <Icons.Vault />
                   <p className="text-[11px] font-black mt-6 uppercase tracking-[0.3em]">No records archived</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Design Console */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
          <div className="glass w-full max-w-md p-10 border-white/5 shadow-2xl">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white flex items-center gap-4">
                <Icons.Settings /> Design Console
              </h2>
              <button onClick={() => setShowSettings(false)} className="w-10 h-10 glass flex items-center justify-center text-slate-400 hover:text-white transition-all"><Icons.Close /></button>
            </div>
            
            <div className="space-y-8 h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
              {/* Theme Colors */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-4">Core Accents</label>
                <div className="grid grid-cols-5 gap-3">
                  {ACCENT_COLORS.map(color => (
                    <button 
                      key={color} 
                      onClick={() => setAccentColor(color)}
                      className={`h-10 rounded-xl transition-all duration-300 ${accentColor === color ? 'ring-2 ring-white ring-offset-4 ring-offset-slate-950 scale-110' : 'opacity-40 hover:opacity-100'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Typography */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-4 flex items-center gap-2">
                  <Icons.Font /> Typography
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {FONT_OPTIONS.map(font => (
                    <button 
                      key={font.name}
                      onClick={() => setFontFamily(font.family)}
                      className={`px-5 py-4 text-left glass border transition-all flex items-center justify-between group ${fontFamily === font.family ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 opacity-60 hover:opacity-100'}`}
                    >
                      <span className="text-sm font-bold text-white" style={{ fontFamily: font.family }}>{font.name}</span>
                      {fontFamily === font.family && <Icons.Check />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Border Radius */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-4 flex items-center gap-2">
                  <Icons.Shape /> Interface Shape
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {RADIUS_OPTIONS.map(opt => (
                    <button 
                      key={opt.name}
                      onClick={() => setBorderRadius(opt.value)}
                      className={`py-3 text-[10px] font-black uppercase tracking-widest glass border transition-all ${borderRadius === opt.value ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 opacity-50'}`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blur Intensity */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-4 flex items-center gap-2">
                  <Icons.Blur /> Glass Depth
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {BLUR_OPTIONS.map(opt => (
                    <button 
                      key={opt.name}
                      onClick={() => setBlurLevel(opt.value)}
                      className={`py-3 text-[10px] font-black uppercase tracking-widest glass border transition-all ${blurLevel === opt.value ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 opacity-50'}`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-5 rounded-2xl text-white text-[11px] font-black uppercase tracking-[0.3em] mt-6 transition-all shadow-xl"
                style={{ backgroundColor: accentColor }}
              >
                Apply System Update
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </Layout>
  );
};

export default App;

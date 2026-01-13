
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Layout from './components/Layout';
import ToneSelector from './components/ToneSelector';
import { convertText, generateSpeech, getSmartVariations } from './services/geminiService';
import { ToneType, ConversionRecord } from './types';
import { Icons, MAX_CHARS } from './constants';

// PCM decoding helpers for Gemini TTS
const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
};

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [variations, setVariations] = useState<string[]>([]);
  const [tone, setTone] = useState<ToneType>('Professional');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [history, setHistory] = useState<ConversionRecord[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Stats Analytics
  const stats = useMemo(() => ({
    words: input.trim() ? input.trim().split(/\s+/).length : 0,
    time: Math.ceil((input.length / 5) / 200 * 60) || 0,
    clarity: output ? Math.min(98, 70 + (output.length / 20)) : 0
  }), [input, output]);

  useEffect(() => {
    // Load History
    const saved = localStorage.getItem('linguaflow_history');
    if (saved) setHistory(JSON.parse(saved));

    // Initialize Speech Recognition
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
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('linguaflow_history', JSON.stringify(history.slice(0, 15)));
  }, [history]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) recognitionRef.current.stop();
    else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleConvert = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await convertText(input, tone);
      setOutput(result);
      getSmartVariations(result).then(setVariations);
      setHistory(prev => [{ id: Date.now().toString(), timestamp: Date.now(), input, output: result, tone }, ...prev].slice(0, 15));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (!output || isSpeaking) {
      currentSourceRef.current?.stop();
      setIsSpeaking(false);
      return;
    }
    setIsAudioLoading(true);
    try {
      const base64 = await generateSpeech(output);
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      const buffer = await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      currentSourceRef.current = source;
      source.onended = () => setIsSpeaking(false);
      source.start();
      setIsSpeaking(true);
    } catch { setError("Speech engine failed."); } finally { setIsAudioLoading(false); }
  };

  const handleDownload = (type: 'text' | 'audio') => {
    if (type === 'text') {
      const blob = new Blob([output], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Polished_Text_${Date.now()}.txt`;
      a.click();
    }
    // Audio download logic simplified for this demo context
  };

  const handleCopy = (text: string) => navigator.clipboard.writeText(text);

  return (
    <Layout>
      <div className="perspective-container">
        <div className="card-3d-entrance grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          
          {/* Main Input/Output Cluster */}
          <div className="lg:col-span-8 space-y-6">
            <div className="glass rounded-[2.5rem] p-8 border-white/10 relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button onClick={toggleListening} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,44,44,0.4)]' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}>
                    <Icons.Microphone active={isListening} />
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Command Input</span>
                </div>
                <div className="flex gap-4 items-center">
                  <span className="mono text-[10px] text-blue-400">{stats.words} WORDS</span>
                  <button onClick={() => setInput('')} className="text-slate-600 hover:text-red-400 transition-colors"><Icons.Close /></button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                  placeholder="Type or use Voice to enter text..."
                  className="w-full min-h-[220px] bg-transparent border-none outline-none text-2xl font-medium leading-relaxed text-white placeholder:text-slate-700 resize-none custom-scrollbar"
                />
                {isListening && interimTranscript && (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-2xl flex items-center justify-center p-8 text-center animate-pulse">
                    <p className="text-xl italic text-blue-300">"{interimTranscript}..."</p>
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-white/5 pt-8">
                <ToneSelector selectedTone={tone} onSelect={setTone} />
                <button
                  onClick={handleConvert}
                  disabled={isLoading || !input.trim()}
                  className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_0_40px_rgba(37,99,235,0.3)] hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <Icons.Sparkles />}
                  {isLoading ? "PROCESING" : "POLISH CONTENT"}
                </button>
              </div>
            </div>

            {output && (
              <div className={`glass rounded-[2.5rem] p-10 border-blue-500/20 shadow-2xl animate-fade-in ${compareMode ? 'ring-2 ring-blue-500/40' : ''}`}>
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <Icons.Pulse />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Refined Result</span>
                    </div>
                    <button 
                      onClick={() => setCompareMode(!compareMode)} 
                      className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${compareMode ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500'}`}
                    >
                      Compare View
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSpeak} className={`w-11 h-11 glass rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors ${isSpeaking ? 'bg-blue-600' : ''}`}>
                      <Icons.Speaker active={isSpeaking} loading={isAudioLoading} />
                    </button>
                    <button onClick={() => handleDownload('text')} className="w-11 h-11 glass rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"><Icons.Download /></button>
                    <button onClick={() => handleCopy(output)} className="px-6 py-3 glass text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600">Copy</button>
                  </div>
                </div>

                {compareMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-600 uppercase">Original</h4>
                      <p className="text-lg text-slate-500 leading-relaxed italic">{input}</p>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-blue-400 uppercase">Polished</h4>
                      <p className="text-2xl font-bold text-white leading-tight">{output}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-white leading-tight mb-8 animate-fade-in">{output}</p>
                )}

                {variations.length > 0 && !compareMode && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-8 mt-4">
                    {['Concise', 'Elegant', 'Assertive'].map((label, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-all group" onClick={() => setOutput(variations[idx])}>
                        <p className="text-[9px] font-black uppercase text-slate-500 mb-2 group-hover:text-blue-400">{label}</p>
                        <p className="text-xs text-slate-400 line-clamp-2 italic font-medium">{variations[idx]}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel: Data Lab */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass rounded-[2rem] p-6">
               <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Icons.Chart /> Intelligence Feed
               </h3>
               <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-3">
                      <span>CLARITY SCORE</span>
                      <span className="text-blue-400">{Math.round(stats.clarity)}%</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${stats.clarity}%` }}></div>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-3">
                      <span>ENGAGEMENT</span>
                      <span className="text-emerald-400">HIGH</span>
                    </div>
                  </div>
               </div>
            </div>

            <div className="glass rounded-[2rem] p-6 h-[460px] flex flex-col">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Icons.History /> Session Activity
              </h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {history.length > 0 ? history.map(item => (
                  <div key={item.id} onClick={() => {setInput(item.input); setOutput(item.output)}} className="p-4 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/5 transition-all cursor-pointer group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[8px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded uppercase">{item.tone}</span>
                      <span className="text-[8px] text-slate-600">{new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{item.output}</p>
                  </div>
                )) : (
                  <div className="h-full flex items-center justify-center opacity-20 flex-col gap-4">
                    <i className="fa-solid fa-ghost text-4xl"></i>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Empty Void</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;

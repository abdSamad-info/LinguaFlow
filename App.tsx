
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import ToneSelector from './components/ToneSelector';
import { convertText, generateSpeech } from './services/geminiService';
import { ToneType, ConversionRecord } from './types';
import { Icons, MAX_CHARS } from './constants';

// Helper functions for audio processing
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [tone, setTone] = useState<ToneType>('Professional');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<ConversionRecord[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  
  // Voice recognition enhancements
  const [recognitionLang, setRecognitionLang] = useState('en-US');
  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('linguaflow_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript;
          } else {
            interimStr += event.results[i][0].transcript;
          }
        }
        
        if (finalStr) {
          setInput(prev => (prev + ' ' + finalStr).trim().slice(0, MAX_CHARS));
          setInterimTranscript('');
        } else {
          setInterimTranscript(interimStr);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };
    }

    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Update recognition language when state changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = recognitionLang;
    }
  }, [recognitionLang]);

  useEffect(() => {
    localStorage.setItem('linguaflow_history', JSON.stringify(history.slice(0, 15)));
  }, [history]);

  const handleConvert = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await convertText(input, tone);
      setOutput(result);
      
      const newRecord: ConversionRecord = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        input: input.trim(),
        output: result,
        tone: tone
      };
      setHistory(prev => [newRecord, ...prev].slice(0, 15));
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = useCallback((text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSpeak = async () => {
    if (!output) return;
    
    if (isSpeaking) {
      currentSourceRef.current?.stop();
      setIsSpeaking(false);
      return;
    }

    setIsAudioLoading(true);
    try {
      const base64Audio = await generateSpeech(output);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      const audioBuffer = await decodeAudioData(
        decodeBase64(base64Audio),
        ctx,
        24000,
        1
      );

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      currentSourceRef.current = source;
      setIsSpeaking(true);
      
      source.onended = () => {
        setIsSpeaking(false);
        currentSourceRef.current = null;
      };
      
      source.start();
    } catch (err) {
      console.error(err);
      setError("Failed to generate high-quality audio.");
    } finally {
      setIsAudioLoading(false);
    }
  };

  const handleDownloadAudio = async () => {
    if (!output) return;
    setIsAudioLoading(true);
    try {
      const base64Audio = await generateSpeech(output);
      const binary = decodeBase64(base64Audio);
      
      const createWavHeader = (dataLength: number) => {
        const buffer = new ArrayBuffer(44);
        const view = new DataView(buffer);
        const writeString = (offset: number, string: string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, 24000, true);
        view.setUint32(28, 24000 * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, dataLength, true);
        return buffer;
      };

      const header = createWavHeader(binary.length);
      const combined = new Uint8Array(header.byteLength + binary.length);
      combined.set(new Uint8Array(header), 0);
      combined.set(binary, header.byteLength);

      const blob = new Blob([combined], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `polished_speech_${Date.now()}.wav`;
      a.click();
    } catch (err) {
      setError("Download failed.");
    } finally {
      setIsAudioLoading(false);
    }
  };

  const useHistoryItem = (item: ConversionRecord) => {
    setInput(item.input);
    setOutput(item.output);
    setTone(item.tone);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout>
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Sidebar for History */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6 sticky top-8">
           <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm overflow-hidden backdrop-blur-xl bg-white/90">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Icons.History /> History
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {history.length > 0 ? history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => useHistoryItem(item)}
                  className="p-3 rounded-xl border border-transparent hover:border-blue-100 hover:bg-blue-50/50 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] text-blue-600 font-bold uppercase">{item.tone}</p>
                    <p className="text-[9px] text-gray-300">{new Date(item.timestamp).toLocaleDateString()}</p>
                  </div>
                  <p className="text-xs text-gray-800 line-clamp-2 leading-tight">{item.output}</p>
                </div>
              )) : (
                <p className="text-xs text-gray-400 text-center py-8">No recent activity</p>
              )}
            </div>
           </div>
        </aside>

        {/* Mobile History Toggle */}
        <div className="lg:hidden fixed bottom-6 right-6 z-50">
          <button 
            onClick={() => setShowHistory(true)}
            className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
          >
            <Icons.History />
          </button>
        </div>

        {/* Mobile History Drawer */}
        {showHistory && (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm lg:hidden flex justify-end">
            <div className="w-[85%] max-w-sm bg-white h-full shadow-2xl p-6 flex flex-col animate-slide-in-right">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <Icons.History /> History
                </h2>
                <button onClick={() => setShowHistory(false)} className="p-2 text-gray-400">
                  <Icons.Close />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4">
                {history.map((item) => (
                  <div key={item.id} onClick={() => useHistoryItem(item)} className="p-4 rounded-2xl bg-gray-50 active:bg-blue-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded uppercase">{item.tone}</span>
                      <span className="text-[10px] text-gray-400">{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-3">{item.output}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Interface */}
        <div className="lg:col-span-9 space-y-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/10 p-6 md:p-12 border border-gray-100 relative overflow-hidden">
            
            {/* Background Detail */}
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <i className="fa-solid fa-language text-9xl text-slate-900"></i>
            </div>

            <div className="flex flex-col space-y-10">
              
              {/* Input Section */}
              <div className="relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Icons.Globe /> Source Text
                  </label>
                  <div className="flex items-center gap-2 sm:gap-4 bg-gray-50 p-1.5 rounded-2xl flex-wrap">
                    <select 
                      value={recognitionLang}
                      onChange={(e) => setRecognitionLang(e.target.value)}
                      className="bg-transparent text-[10px] font-black uppercase text-gray-500 outline-none cursor-pointer border-r border-gray-200 pr-2"
                      title="Recognition Language"
                    >
                      <option value="en-US">English</option>
                      <option value="ur-PK">Urdu</option>
                      <option value="en-IN">Indian English</option>
                    </select>
                    
                    <button 
                      onClick={toggleListening}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isListening ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse-gentle' : 'text-gray-600 hover:bg-white'}`}
                    >
                      <Icons.Microphone active={isListening} />
                      {isListening ? 'Listening...' : 'Voice Input'}
                    </button>
                    <div className="hidden sm:block h-4 w-px bg-gray-200"></div>
                    <span className={`px-2 text-[10px] font-black tracking-widest ${input.length > MAX_CHARS * 0.9 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {input.length} / {MAX_CHARS}
                    </span>
                  </div>
                </div>
                <div className="relative group">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                    placeholder="Enter informal English or Roman Urdu... (e.g., 'Yaar meeting kab hai?' or 'send it over asap')"
                    className="w-full min-h-[200px] p-8 rounded-[2rem] bg-gray-50/50 border-2 border-transparent focus:bg-white focus:border-blue-400/30 focus:ring-8 focus:ring-blue-50 outline-none transition-all duration-500 text-xl leading-relaxed resize-none shadow-inner group-hover:bg-white/80 text-slate-900 font-medium"
                    maxLength={MAX_CHARS}
                    style={{ color: '#0f172a' }} // Forced deep slate color
                  />
                  
                  {/* Real-time Transcription Feedback */}
                  {isListening && interimTranscript && (
                    <div className="absolute bottom-6 left-8 right-16 p-3 bg-blue-600/90 text-white rounded-xl text-sm italic backdrop-blur-sm animate-fade-in shadow-xl">
                      <span className="opacity-70 mr-2 text-[10px] font-black uppercase">Live:</span>
                      {interimTranscript}
                    </div>
                  )}

                  {input && (
                    <button 
                      onClick={() => setInput('')}
                      className="absolute top-6 right-6 w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-full text-gray-400 hover:text-red-500 flex items-center justify-center transition-all hover:scale-110 z-10"
                    >
                      <Icons.Close />
                    </button>
                  )}
                </div>
              </div>

              {/* Tone Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Target Polish</label>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full">
                    <Icons.Info /> AI Selection
                  </div>
                </div>
                <ToneSelector selectedTone={tone} onSelect={setTone} />
              </div>

              {/* Action Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleConvert}
                  disabled={isLoading || !input.trim()}
                  className={`group relative overflow-hidden px-14 py-6 rounded-[1.5rem] font-black text-xl flex items-center justify-center gap-5 transition-all duration-500 transform ${
                    isLoading || !input.trim()
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.03] shadow-[0_20px_50px_-15px_rgba(37,99,235,0.4)] active:scale-95'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Transform Text
                      <div className="bg-white/20 p-2 rounded-xl group-hover:translate-x-1 transition-transform">
                        <Icons.ArrowRight />
                      </div>
                    </>
                  )}
                </button>
              </div>

              {/* Error State */}
              {error && (
                <div className="p-6 bg-red-50 border-2 border-red-100 rounded-3xl text-red-600 font-bold flex items-center gap-4 animate-shake">
                  <div className="bg-red-100 p-3 rounded-2xl">
                    <i className="fa-solid fa-triangle-exclamation text-xl"></i>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-wider mb-0.5">Application Error</p>
                    <p className="text-xs font-medium opacity-80">{error}</p>
                  </div>
                </div>
              )}

              {/* Result Section */}
              {(output || isLoading) && (
                <div className={`space-y-6 pt-6 animate-fade-in`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-4">
                    <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                      <label className="text-sm font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Icons.Sparkles /> Polished Result
                      </label>
                      <button 
                        onClick={() => setCompareMode(!compareMode)}
                        className={`text-[10px] font-black uppercase px-3 py-1 rounded-full transition-all flex items-center gap-2 ${compareMode ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-600'}`}
                      >
                        <Icons.Compare /> {compareMode ? 'Standard View' : 'Compare Mode'}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={handleDownloadAudio}
                        title="Download as WAV"
                        className="p-3 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                      >
                        <Icons.Download />
                      </button>
                      <button
                        onClick={handleSpeak}
                        title="High Quality Read Aloud"
                        disabled={isAudioLoading}
                        className={`p-3 rounded-2xl transition-all ${isSpeaking ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-200' : 'bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                      >
                        <Icons.Speaker active={isSpeaking} loading={isAudioLoading} />
                      </button>
                      <div className="h-6 w-px bg-gray-100 mx-2"></div>
                      <button
                        onClick={() => handleCopy(output)}
                        className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                          copied ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'bg-gray-900 text-white hover:bg-blue-600 active:scale-95'
                        }`}
                      >
                        {copied ? 'Copied!' : 'Copy Text'}
                      </button>
                    </div>
                  </div>

                  {compareMode ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-6 rounded-3xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Original</p>
                        <p className="text-gray-500 italic text-lg leading-relaxed">{input}</p>
                      </div>
                      <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Refined</p>
                        <p className="text-slate-900 text-lg leading-relaxed font-medium">{output}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <div className="w-full min-h-[160px] p-10 rounded-[2.5rem] bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-2 border-blue-100 text-slate-900 text-2xl leading-[1.6] shadow-sm selection:bg-blue-200 font-medium">
                        {isLoading ? (
                          <div className="space-y-6">
                            <div className="h-6 bg-blue-100/40 rounded-full w-11/12 animate-pulse"></div>
                            <div className="h-6 bg-blue-100/40 rounded-full w-full animate-pulse"></div>
                            <div className="h-6 bg-blue-100/40 rounded-full w-3/4 animate-pulse"></div>
                          </div>
                        ) : (
                          output
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* New Advanced Features Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
               <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                 <i className="fa-solid fa-microphone-lines text-xl"></i>
               </div>
               <h3 className="font-black text-gray-900 mb-3 tracking-tight">Audio Capture</h3>
               <p className="text-sm text-gray-400 leading-relaxed font-medium">
                 Integrated multi-lingual recognition for English & Urdu speech patterns.
               </p>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
               <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                 <i className="fa-solid fa-brain text-xl"></i>
               </div>
               <h3 className="font-black text-gray-900 mb-3 tracking-tight">Smart Context</h3>
               <p className="text-sm text-gray-400 leading-relaxed font-medium">
                 Detects intent and preserves emotional nuance while fixing technical grammar errors.
               </p>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
               <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                 <i className="fa-solid fa-file-export text-xl"></i>
               </div>
               <h3 className="font-black text-gray-900 mb-3 tracking-tight">Export Suite</h3>
               <p className="text-sm text-gray-400 leading-relaxed font-medium">
                 High-fidelity WAV audio export and one-tap clipboard distribution for professional use.
               </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        @keyframes pulse-gentle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .animate-slide-in-right { animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .animate-pulse-gentle { animation: pulse-gentle 2s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        textarea::placeholder { color: #94a3b8; font-weight: 400; }
        textarea { color: #0f172a !important; } /* Force deep slate color */
      `}</style>
    </Layout>
  );
};

export default App;

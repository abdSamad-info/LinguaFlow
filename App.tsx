
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import ToneSelector from './components/ToneSelector';
import { convertText, generateSpeech } from './services/geminiService';
import { ToneType, ConversionRecord } from './types';
import { Icons, MAX_CHARS } from './constants';

// PCM decoding for Gemini TTS
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
        if (event.error === 'not-allowed') {
          setError("Microphone access denied. Please check your browser permissions.");
        }
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
    if (!process.env.API_KEY) {
      setError("API Key is missing. Please set the API_KEY environment variable in Vercel.");
      return;
    }

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
      setError(null);
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
      a.download = `linguaflow_speech_${Date.now()}.wav`;
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
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl mx-auto">
        
        {/* Sidebar for History */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6 sticky top-8">
           <div className="bg-white rounded-[2rem] p-6 border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden backdrop-blur-xl bg-white/95">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
              <Icons.History /> Activity
            </h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {history.length > 0 ? history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => useHistoryItem(item)}
                  className="p-4 rounded-2xl border border-transparent hover:border-blue-100 hover:bg-blue-50/40 transition-all cursor-pointer group animate-fade-in"
                >
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-tighter">{item.tone}</p>
                    <p className="text-[9px] text-slate-300 font-bold">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">{item.output}</p>
                </div>
              )) : (
                <div className="text-center py-12 opacity-30">
                  <i className="fa-solid fa-ghost text-4xl mb-3 block"></i>
                  <p className="text-xs font-bold uppercase tracking-widest">No history yet</p>
                </div>
              )}
            </div>
           </div>
        </aside>

        {/* Mobile History Toggle */}
        <div className="lg:hidden fixed bottom-6 right-6 z-[60]">
          <button 
            onClick={() => setShowHistory(true)}
            className="w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all ring-4 ring-white"
          >
            <Icons.History />
          </button>
        </div>

        {/* Mobile History Drawer */}
        {showHistory && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md lg:hidden flex justify-end">
            <div className="w-[85%] max-w-sm bg-white h-full shadow-2xl p-8 flex flex-col animate-slide-in-right">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <Icons.History /> History
                </h2>
                <button onClick={() => setShowHistory(false)} className="w-10 h-10 bg-slate-100 rounded-xl text-slate-400 flex items-center justify-center">
                  <Icons.Close />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar">
                {history.map((item) => (
                  <div key={item.id} onClick={() => useHistoryItem(item)} className="p-5 rounded-[1.5rem] bg-slate-50 active:bg-blue-50 transition-colors">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-full uppercase tracking-widest">{item.tone}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed line-clamp-3">{item.output}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Interface */}
        <div className="lg:col-span-9 space-y-8">
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-blue-900/10 p-6 md:p-14 border border-white/50 relative overflow-hidden ring-1 ring-slate-200/40">
            
            {/* Background Accent */}
            <div className="absolute -top-10 -right-10 opacity-[0.03] pointer-events-none select-none">
              <i className="fa-solid fa-wand-magic-sparkles text-[20rem] text-slate-900"></i>
            </div>

            <div className="flex flex-col space-y-12">
              
              {/* Input Section */}
              <div className="relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                    <Icons.Globe /> Source Input
                  </label>
                  <div className="flex items-center gap-2 sm:gap-4 bg-slate-100/80 p-2 rounded-[1.25rem] flex-wrap ring-1 ring-slate-200/50">
                    <select 
                      value={recognitionLang}
                      onChange={(e) => setRecognitionLang(e.target.value)}
                      className="bg-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-slate-600 outline-none cursor-pointer border border-slate-200 shadow-sm"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="ur-PK">Urdu (Pakistan)</option>
                      <option value="en-IN">English (India)</option>
                    </select>
                    
                    <button 
                      onClick={toggleListening}
                      className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all transform active:scale-95 ${isListening ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm'}`}
                    >
                      <Icons.Microphone active={isListening} />
                      {isListening ? 'LISTENING...' : 'VOICE'}
                    </button>
                    <div className="hidden sm:block h-5 w-px bg-slate-200"></div>
                    <span className={`px-3 text-[10px] font-black tracking-[0.1em] ${input.length > MAX_CHARS * 0.9 ? 'text-orange-500' : 'text-slate-400'}`}>
                      {input.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="relative group">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
                    placeholder="E.g., 'Yaar meeting 5 baje hogi?' or 'Can u check this file asap?'"
                    className="w-full min-h-[220px] p-10 rounded-[2.5rem] bg-slate-50/50 border-2 border-transparent focus:bg-white focus:border-blue-500/20 focus:ring-[1rem] focus:ring-blue-500/5 outline-none transition-all duration-500 text-2xl leading-relaxed resize-none shadow-inner group-hover:bg-white/80 text-slate-900 font-semibold placeholder:text-slate-300"
                    maxLength={MAX_CHARS}
                    spellCheck={false}
                    style={{ color: '#0f172a', caretColor: '#2563eb' }}
                  />
                  
                  {/* Real-time Transcription Feedback */}
                  {isListening && interimTranscript && (
                    <div className="absolute bottom-8 left-10 right-10 p-5 bg-blue-600 text-white rounded-[1.5rem] text-lg font-medium italic backdrop-blur-xl shadow-2xl animate-fade-in z-20 flex items-center gap-4">
                      <div className="w-2 h-2 bg-white rounded-full animate-ping shrink-0"></div>
                      <span className="line-clamp-1">{interimTranscript}</span>
                    </div>
                  )}

                  {input && (
                    <button 
                      onClick={() => setInput('')}
                      className="absolute top-8 right-8 w-12 h-12 bg-white shadow-md border border-slate-100 rounded-2xl text-slate-400 hover:text-red-500 flex items-center justify-center transition-all hover:scale-110 active:scale-90 z-30"
                    >
                      <Icons.Close />
                    </button>
                  )}
                </div>
              </div>

              {/* Tone Selection */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Target Polish</label>
                  <div className="flex items-center gap-2 text-[10px] font-black text-blue-500 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">
                    <Icons.Info /> AI ASSISTED
                  </div>
                </div>
                <ToneSelector selectedTone={tone} onSelect={setTone} />
              </div>

              {/* Action Button */}
              <div className="flex justify-center pt-6">
                <button
                  onClick={handleConvert}
                  disabled={isLoading || !input.trim()}
                  className={`group relative overflow-hidden px-16 py-7 rounded-[2rem] font-black text-2xl flex items-center justify-center gap-6 transition-all duration-500 transform active:scale-95 ${
                    isLoading || !input.trim()
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-inner'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] shadow-[0_30px_60px_-15px_rgba(37,99,235,0.45)]'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                      POLISHING...
                    </>
                  ) : (
                    <>
                      Refine Now
                      <div className="bg-white/10 p-3 rounded-2xl group-hover:translate-x-2 transition-transform duration-500">
                        <Icons.ArrowRight />
                      </div>
                    </>
                  )}
                </button>
              </div>

              {/* Error State */}
              {error && (
                <div className="p-8 bg-red-50 border-2 border-red-100 rounded-[2rem] text-red-600 font-bold flex items-center gap-6 animate-shake shadow-lg shadow-red-100/50">
                  <div className="bg-white p-4 rounded-2xl shadow-sm text-red-500">
                    <i className="fa-solid fa-circle-exclamation text-2xl"></i>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-1 opacity-60">System Notification</p>
                    <p className="text-lg font-black leading-tight">{error}</p>
                  </div>
                </div>
              )}

              {/* Result Section */}
              {(output || isLoading) && (
                <div className="space-y-8 pt-10 animate-fade-in border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-5 flex-wrap">
                      <label className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl">
                        <Icons.Sparkles /> Polished Result
                      </label>
                      <button 
                        onClick={() => setCompareMode(!compareMode)}
                        className={`text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all flex items-center gap-2 border ${compareMode ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-400 hover:text-blue-600'}`}
                      >
                        <Icons.Compare /> {compareMode ? 'SOLO VIEW' : 'COMPARE'}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <button
                        onClick={handleDownloadAudio}
                        title="Download WAV"
                        className="w-12 h-12 bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-white border border-transparent hover:border-blue-200 rounded-2xl transition-all flex items-center justify-center shadow-sm"
                      >
                        <Icons.Download />
                      </button>
                      <button
                        onClick={handleSpeak}
                        title="Read Aloud"
                        disabled={isAudioLoading}
                        className={`w-12 h-12 rounded-2xl transition-all border flex items-center justify-center shadow-sm ${isSpeaking ? 'bg-blue-600 text-white border-blue-600 animate-pulse' : 'bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-white border-transparent hover:border-blue-200'}`}
                      >
                        <Icons.Speaker active={isSpeaking} loading={isAudioLoading} />
                      </button>
                      <div className="h-8 w-px bg-slate-200 mx-2"></div>
                      <button
                        onClick={() => handleCopy(output)}
                        className={`px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all transform active:scale-95 ${
                          copied ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-xl shadow-slate-200'
                        }`}
                      >
                        {copied ? 'COPIED!' : 'COPY TEXT'}
                      </button>
                    </div>
                  </div>

                  {compareMode ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-200 shadow-inner group">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">Draft</p>
                        <p className="text-slate-500 italic text-xl leading-relaxed font-medium">{input}</p>
                      </div>
                      <div className="p-10 rounded-[2.5rem] bg-white border-2 border-blue-100 shadow-2xl shadow-blue-100/50">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6 border-b border-blue-100 pb-2">Refined</p>
                        <p className="text-slate-900 text-xl leading-relaxed font-bold">{output}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full min-h-[180px] p-12 rounded-[3rem] bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 text-slate-900 text-2xl leading-[1.6] shadow-xl shadow-blue-50 font-bold selection:bg-blue-200">
                      {isLoading ? (
                        <div className="space-y-6">
                          <div className="h-8 bg-blue-100/50 rounded-full w-11/12 animate-pulse"></div>
                          <div className="h-8 bg-blue-100/50 rounded-full w-full animate-pulse"></div>
                          <div className="h-8 bg-blue-100/50 rounded-full w-4/5 animate-pulse"></div>
                        </div>
                      ) : (
                        output
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Value Props Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group">
               <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mb-8 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                 <i className="fa-solid fa-microphone-lines text-2xl"></i>
               </div>
               <h3 className="font-black text-xl text-slate-900 mb-4 tracking-tight">Audio Capture</h3>
               <p className="text-slate-500 leading-relaxed font-medium">
                 High-fidelity recognition for English and Urdu dialects. Just speak naturally.
               </p>
            </div>
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group">
               <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mb-8 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                 <i className="fa-solid fa-shield-halved text-2xl"></i>
               </div>
               <h3 className="font-black text-xl text-slate-900 mb-4 tracking-tight">Enterprise Privacy</h3>
               <p className="text-slate-500 leading-relaxed font-medium">
                 Secure API processing. Your professional communication remains private and protected.
               </p>
            </div>
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group">
               <div className="w-16 h-16 bg-purple-50 rounded-3xl flex items-center justify-center text-purple-600 mb-8 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-500">
                 <i className="fa-solid fa-bolt text-2xl"></i>
               </div>
               <h3 className="font-black text-xl text-slate-900 mb-4 tracking-tight">Instant Export</h3>
               <p className="text-slate-500 leading-relaxed font-medium">
                 Export text to clipboard or high-quality WAV audio with a single tap.
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
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-slide-in-right { animation: slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in { animation: fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </Layout>
  );
};

export default App;

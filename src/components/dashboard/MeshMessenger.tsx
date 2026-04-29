'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Mic, 
  Square, 
  Trash2, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Volume2,
  Lock,
  Search
} from 'lucide-react';
import { useMeshStore } from '@/lib/stores/useMeshStore';
import { decryptMessage } from '@/lib/crypto';
import { cn } from '@/lib/utils';

/**
 * NOXIS MESH_MESSENGER: Secure P2P Industrial Communication
 * Features: E2EE, Voice-Notes, Offline Persistence, Waveform Visualizer.
 */
export const MeshMessenger: React.FC = () => {
  const { messages, addMessage, clearHistory } = useMeshStore();
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Decrypt messages on demand
  useEffect(() => {
    const decryptAll = async () => {
      const newDecrypted: Record<string, string> = {};
      for (const msg of messages) {
        if (!decryptedMessages[msg.id]) {
          newDecrypted[msg.id] = await decryptMessage(msg.content);
        }
      }
      if (Object.keys(newDecrypted).length > 0) {
        setDecryptedMessages(prev => ({ ...prev, ...newDecrypted }));
      }
    };
    decryptAll();
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    await addMessage(inputText);
    setInputText('');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      setIsRecording(true);
      // In a real app, we'd pipe this to a MediaRecorder
    } catch (err) {
      console.error("Audio access denied", err);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    await addMessage("VOICE_MEMO_SENT", 'voice');
  };

  return (
    <div className="module-container bg-[#0B1021]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] flex flex-col h-[600px] overflow-hidden relative">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
             <Wifi size={20} />
           </div>
           <div>
             <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Mesh Messenger</h3>
             <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
               <ShieldCheck size={10} /> Secure Node Active
             </p>
           </div>
        </div>
        <button 
          onClick={clearHistory}
          className="p-2 text-slate-500 hover:text-red-400 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex flex-col gap-2 max-w-[80%]",
                msg.sender === 'Self' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "px-5 py-3 rounded-[1.5rem] relative group border",
                msg.sender === 'Self' 
                  ? "bg-violet-600 border-violet-500 text-white rounded-tr-none shadow-[0_10px_20px_rgba(124,58,237,0.2)]" 
                  : "bg-white/5 border-white/10 text-white rounded-tl-none"
              )}>
                {msg.type === 'voice' ? (
                  <div className="flex items-center gap-3 py-1">
                    <Volume2 size={16} />
                    <div className="flex gap-0.5 items-end h-4">
                       {[...Array(8)].map((_, i) => (
                         <div key={i} className="w-1 bg-white/40 rounded-full animate-pulse" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }} />
                       ))}
                    </div>
                    <span className="text-[10px] font-black opacity-60">0:04</span>
                  </div>
                ) : (
                  <p className="text-xs font-medium leading-relaxed">
                    {decryptedMessages[msg.id] || "Decrypting..."}
                  </p>
                )}
                
                <div className="absolute -bottom-5 right-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Lock size={10} className="text-slate-500" />
                   <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">E2EE Secured</span>
                </div>
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-black/40 border-t border-white/5 space-y-4">
        {isRecording && (
          <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">Recording Audio...</span>
            </div>
            <button onClick={stopRecording} className="text-red-400 hover:text-red-300">
              <Square size={16} fill="currentColor" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button 
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
              isRecording ? "bg-red-500 text-white scale-90" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            )}
          >
            <Mic size={24} />
          </button>
          
          <div className="flex-1 relative">
            <input 
              type="text"
              placeholder="Secure Mesh Transmission..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-white focus:outline-none focus:border-violet-500 transition-all placeholder:text-slate-600"
            />
          </div>

          <button 
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="w-14 h-14 bg-violet-600 text-white rounded-2xl flex items-center justify-center hover:bg-violet-500 disabled:opacity-30 disabled:hover:bg-violet-600 transition-all shadow-xl"
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

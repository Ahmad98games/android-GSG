'use client';

import React, { useEffect } from 'react';
import { RefreshCcw, Terminal, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * GLOBAL ERROR BOUNDARY — CORE_SYSTEM
 * 
 * Aesthetic: Deep Onyx, Red Terminal Warning, JetBrains Mono.
 * Designed to prevent Next.js default crash screens in production.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to our internal observability system (Pillar 6)
    console.error('[CRITICAL_SYSTEM_FAULT]', error);
  }, [error]);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-[#0B0D0F] p-6 font-mono overflow-hidden">
      {/* Background Error Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-2xl relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-red-500/20 bg-[#121417]/80 backdrop-blur-2xl rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-red-500/20 bg-red-500/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-red-500" size={20} />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-red-500">Kernel Panic // System Fault</h2>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500/40" />
              <div className="w-2 h-2 rounded-full bg-red-500/20" />
              <div className="w-2 h-2 rounded-full bg-red-500/10" />
            </div>
          </div>

          {/* Terminal View */}
          <div className="p-8 space-y-6">
            <div className="flex items-start gap-4">
               <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 shrink-0">
                  <Terminal size={20} />
               </div>
               <div className="space-y-2 flex-1">
                  <p className="text-[10px] text-[#4B5563] uppercase tracking-widest font-black">Error Trace Log:</p>
                  <div className="bg-black/40 border border-white/5 p-4 rounded-lg">
                    <code className="text-[11px] text-red-400/90 break-all whitespace-pre-wrap leading-relaxed">
                      {error.message || 'AN_UNIDENTIFIED_ERROR_HAS_OCCURRED'}
                      <br/>
                      <span className="text-red-500/40">--------------------------------</span>
                      <br/>
                      FAULT_ID: {error.digest || 'GS_FAULT_GENERAL'}
                      <br/>
                      TS: {new Date().toISOString()}
                    </code>
                  </div>
               </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
               <button 
                 onClick={() => reset()}
                 className="flex items-center justify-center gap-3 w-full py-4 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-[0.98]"
               >
                 <RefreshCcw size={16} /> Reload Secure Dashboard
               </button>
               <button 
                 onClick={() => window.location.href = '/dashboard'}
                 className="text-[10px] text-[#4B5563] uppercase tracking-widest font-black hover:text-[#94A3B8] transition-colors py-2"
               >
                 Return to Command Center
               </button>
            </div>
          </div>

          {/* Forensic Footer */}
          <div className="px-6 py-3 border-t border-white/5 bg-black/20 text-[8px] font-black uppercase tracking-[0.3em] text-[#4B5563] flex justify-between">
             <span>Gold She Mesh — Pillar 6</span>
             <span>Status: Quarantine</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

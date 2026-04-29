'use client';

import React, { useState, useEffect } from 'react';
import { Share2, Zap, Wifi, WifiOff, Loader2, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const MeshStatus = () => {
  const [status, setStatus] = useState<'searching' | 'connected' | 'offline'>('searching');
  const [nodeCount, setNodeCount] = useState(0);

  useEffect(() => {
    // Simulate mesh search - in reality, we'd listen to the TCP/WebSocket server events
    const timer = setTimeout(() => {
      // For now, we'll stay in "searching" unless we get a signal
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
      <AnimatePresence>
        {status === 'searching' && (
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 50, opacity: 0 }}
            className="flex items-center gap-3 bg-[#1E2126] border border-[#C5A05933] px-6 py-3 rounded-2xl shadow-xl backdrop-blur-md"
          >
            <Loader2 className="w-4 h-4 text-[#C5A059] animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C5A059]">Searching for Local Nodes...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4 bg-[#1E2126] border border-[#334155] px-4 py-2 rounded-xl shadow-lg">
        <div className="flex items-center gap-2 pr-4 border-r border-[#334155]">
          <Database className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">OFFLINE_LOCAL</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span className="text-[9px] font-black text-white">{nodeCount}</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-[#22C55E]' : 'bg-[#C5A059]'} animate-pulse`} />
        </div>
      </div>
    </div>
  );
};

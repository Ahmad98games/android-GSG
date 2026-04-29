'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Terminal, Package, Wifi } from 'lucide-react';
import { useMeshStream } from '@/lib/hooks/useMeshStream';
import { cn } from '@/lib/utils';

/**
 * LIVE ACTIVITY FEED (v1.0.0)
 * 
 * A high-fidelity industrial feed that captures real-time events 
 * from the mesh (logs, scans, syncs).
 */

interface FeedEvent {
  id: string;
  type: 'SCAN' | 'SYNC' | 'ALERT' | 'LOG';
  node: string;
  message: string;
  ts: number;
}

export default function LiveActivityFeed() {
  const { stockDeltas } = useMeshStream();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Convert mesh stream events into feed events
  const events = React.useMemo(() => {
    return stockDeltas.map((latest): FeedEvent => ({
      id: latest.id,
      type: 'SCAN',
      node: latest.fromName || latest.from,
      message: `${latest.action === 'ADD' ? 'Added' : 'Subtracted'} ${latest.amount} units`,
      ts: latest.ts
    }));
  }, [stockDeltas]);

  // Auto-scroll to top (since we prepend)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events]);

  return (
    <div className="bg-[#1C2028] border border-[#2D3441] rounded-[12px] h-full flex flex-col shadow-2xl overflow-hidden">
      <div className="p-4 border-b border-[#2D3441] flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-[#60A5FA]" />
          <h3 className="text-[10px] font-black text-[#F1F5F9] uppercase tracking-widest">Live Activity Feed</h3>
        </div>
        <div className="px-2 py-0.5 rounded bg-[#60A5FA]/10 border border-[#60A5FA]/30">
          <p className="text-[8px] font-black text-[#60A5FA] uppercase tracking-tighter animate-pulse">Streaming</p>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide"
      >
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
              <Activity size={32} className="mb-2" />
              <p className="text-[9px] font-black uppercase">No Recent Activity</p>
            </div>
          ) : (
            events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20 }}
                className="group"
              >
                <div className="flex items-start gap-3 p-3 bg-[#121417] border border-[#2D3441] rounded-[8px] hover:border-[#60A5FA]/50 transition-all">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    event.type === 'SCAN' ? "bg-green-500/10 text-green-500" : "bg-[#60A5FA]/10 text-[#60A5FA]"
                  )}>
                    {event.type === 'SCAN' ? <Package size={14} /> : <Wifi size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-[9px] font-black text-[#60A5FA] uppercase truncate">{event.node}</p>
                      <span className="text-[8px] text-zinc-600 font-bold uppercase">{new Date(event.ts).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] text-[#F1F5F9] font-medium mt-0.5 leading-snug">{event.message}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="p-3 bg-black/20 border-t border-[#2D3441] text-center">
        <p className="text-[8px] font-black text-[#2D3441] uppercase tracking-[0.3em]">Omnora_Telemetry_Subsystem</p>
      </div>
    </div>
  );
}

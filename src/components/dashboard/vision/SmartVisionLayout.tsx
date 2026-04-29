'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAITelemetry } from '@/hooks/useAITelemetry';
import { VideoCanvas } from './VideoCanvas';
import { TelemetryLog } from './TelemetryLog';
import { Activity, Cpu, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SmartVisionLayout — Pillar 3 UI
 * 
 * Cinematic dashboard for live CCTV AI telemetry.
 * Split view: Live Vision (Left) | Tactical Telemetry (Right)
 */
export function SmartVisionLayout() {
  const telemetry = useAITelemetry();

  return (
    <div className="flex h-full w-full gap-4 bg-[#0B0D0F] p-4 font-mono text-[#F1F5F9]">
      {/* 1. Primary Vision Feed (75%) */}
      <motion.div 
        animate={{
          borderColor: 
            telemetry.ai[Object.keys(telemetry.ai)[0]]?.engineStatus === 'reconnecting' ? '#FBBF24' :
            telemetry.ai[Object.keys(telemetry.ai)[0]]?.engineStatus === 'error' ? '#F87171' : '#2D3441',
          boxShadow: 
            telemetry.ai[Object.keys(telemetry.ai)[0]]?.engineStatus === 'reconnecting' ? '0 0 40px rgba(251, 191, 36, 0.15)' :
            telemetry.ai[Object.keys(telemetry.ai)[0]]?.engineStatus === 'error' ? '0 0 40px rgba(248, 113, 113, 0.15)' : 'none'
        }}
        className="relative flex flex-1 flex-col overflow-hidden rounded-xl border bg-[#121417] transition-all duration-500"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#2D3441] bg-[#1C2028]/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#60A5FA14] text-[#60A5FA]">
              <Cpu size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tighter">Live Neural Feed</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#60A5FA]">
                {telemetry.ai[Object.keys(telemetry.ai)[0]]?.engineStatus === 'reconnecting' ? 'Watchdog Recovering...' : 'Inference Active // Pillar 3'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[8px] uppercase tracking-widest text-[#94A3B8]">Buffer Status</span>
              <div className="flex items-center gap-2">
                 <span className={cn(
                   "text-xs font-bold",
                   telemetry.ai[Object.keys(telemetry.ai)[0]]?.engineStatus === 'reconnecting' ? "text-[#FBBF24]" : "text-[#34D399]"
                 )}>
                   {telemetry.ai[Object.keys(telemetry.ai)[0]]?.engineStatus === 'reconnecting' ? 'DROPPED' : '10 FPS CAP'}
                 </span>
                 <div className={cn(
                   "h-1.5 w-1.5 rounded-full",
                   telemetry.ai[Object.keys(telemetry.ai)[0]]?.engineStatus === 'reconnecting' ? "bg-[#FBBF24] animate-bounce" : "bg-[#34D399] animate-pulse"
                 )} />
              </div>
            </div>
            <div className="h-10 w-px bg-[#2D3441]" />
            <ShieldCheck size={20} className={cn(
              "transition-colors",
              telemetry.ai[Object.keys(telemetry.ai)[0]]?.engineStatus === 'reconnecting' ? "text-[#FBBF24]" : "text-[#94A3B8]"
            )} />
          </div>
        </div>

        {/* Video Canvas Container */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
           <VideoCanvas data={telemetry.ai} />
           
           {/* HUD Overlays */}
           <div className="absolute top-4 left-4 pointer-events-none space-y-1">
             <AnimatePresence mode="wait">
               {telemetry.ai[Object.keys(telemetry.ai)[0]]?.engineStatus === 'reconnecting' && (
                 <motion.div 
                   initial={{ opacity: 0, y: -10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   className="bg-[#FBBF24]/20 backdrop-blur-md border border-[#FBBF24]/30 px-3 py-1 rounded-md text-[9px] font-black flex items-center gap-2 uppercase tracking-widest text-[#FBBF24]"
                 >
                    <AlertTriangle size={10} className="animate-pulse" /> Stream Watchdog: SILENT_RECONNECT_PROTOCOL
                 </motion.div>
               )}
             </AnimatePresence>
             <div className="bg-black/60 backdrop-blur-md border border-[#2D3441] px-3 py-1 rounded-md text-[9px] font-black flex items-center gap-2 uppercase tracking-widest text-[#94A3B8]">
                <Activity size={10} className="text-[#60A5FA]" /> System Health: Nominal
             </div>
           </div>
        </div>
      </motion.div>

      {/* 2. Tactical Telemetry Terminal (25%) */}
      <div className="w-[400px] flex flex-col gap-4">
        <div className="flex-1 overflow-hidden rounded-xl border border-[#2D3441] bg-[#121417] shadow-2xl flex flex-col">
          <div className="border-b border-[#2D3441] bg-[#1C2028]/50 px-6 py-4">
            <h3 className="text-xs font-black uppercase tracking-widest">Telemetry Terminal</h3>
            <p className="text-[8px] uppercase text-[#4B5563] mt-1 tracking-widest">Raw Packet Stream // JSON</p>
          </div>
          <div className="flex-1 overflow-hidden">
            <TelemetryLog data={telemetry} />
          </div>
        </div>
      </div>
    </div>
  );
}

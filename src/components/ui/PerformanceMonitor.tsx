'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Database, Zap } from 'lucide-react';
import { useSettingsStore } from '@/lib/stores/useSettingsStore';
import { useMeshStream } from '@/lib/hooks/useMeshStream';

/**
 * AHMAD DEVELOPER MONITOR (v1.0.0)
 * 
 * Floating performance HUD for system debugging.
 * Only visible when developer_mode is active.
 */

export default function PerformanceMonitor() {
  const { developerMode } = useSettingsStore();
  const { aiTelemetry, systemTelemetry, isConnected } = useMeshStream();
  const stats = useMemo(() => {
    if (!developerMode) return { fps: 0, load: 0, mem: 0 };
    
    const avgFps = aiTelemetry.length > 0 
      ? aiTelemetry.slice(0, 5).reduce((acc, curr) => acc + curr.fps, 0) / Math.min(aiTelemetry.length, 5)
      : 0;
      
    return {
      fps: Math.round(avgFps),
      load: systemTelemetry.length > 0 ? systemTelemetry[0].signal : 0,
      mem: 64 // Placeholder for actual memory usage
    };
  }, [aiTelemetry, systemTelemetry, developerMode]);

  if (!developerMode) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 right-6 z-[9999] pointer-events-none"
    >
      <div className="bg-[#1C2028]/80 backdrop-blur-md border border-[#60A5FA]/30 rounded-xl p-4 shadow-2xl flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-[#60A5FA]" />
          <div className="text-[10px] font-black uppercase text-[#F1F5F9]">
            <span className="text-[#94A3B8]">AI_VELOCITY:</span> {stats.fps} FPS
          </div>
        </div>
        
        <div className="w-px h-6 bg-[#2D3441]" />
        
        <div className="flex items-center gap-2">
          <Cpu size={12} className="text-[#34D399]" />
          <div className="text-[10px] font-black uppercase text-[#F1F5F9]">
            <span className="text-[#94A3B8]">SIGNAL:</span> {stats.load} dBm
          </div>
        </div>

        <div className="w-px h-6 bg-[#2D3441]" />

        <div className="flex items-center gap-2">
          <Zap size={12} className={isConnected ? "text-[#60A5FA]" : "text-red-500"} />
          <div className="text-[10px] font-black uppercase text-[#F1F5F9]">
            <span className="text-[#94A3B8]">HUB_LINK:</span> {isConnected ? 'ACTIVE' : 'DOWN'}
          </div>
        </div>

        <div className="w-px h-6 bg-[#2D3441]" />

        <div className="flex items-center gap-2">
          <Database size={12} className="text-amber-500" />
          <div className="text-[10px] font-black uppercase text-amber-500">
            DEV_MODE: ACTIVE
          </div>
        </div>
      </div>
    </motion.div>
  );
}

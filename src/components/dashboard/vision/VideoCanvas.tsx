'use client';

import React from 'react';
import type { AITelemetryPayload } from '@/lib/Shared/mesh-protocol';

interface VideoCanvasProps {
  data: Record<string, AITelemetryPayload>;
}

/**
 * VideoCanvas — Zero-Lag AI Overlay
 * 
 * Draws bounding boxes using React DOM nodes for maximum performance.
 * Coordinates are mapped as relative percentages.
 */
export function VideoCanvas({ data }: VideoCanvasProps) {
  // We flatten all detections from all active AI nodes
  const activeDetections = Object.values(data).flatMap(node => 
    node.detections.map(det => ({ ...det, deviceId: node.deviceId }))
  );

  return (
    <div className="relative aspect-video w-full max-w-5xl bg-[#000] overflow-hidden rounded-lg shadow-inner">
      {/* 
        Mock Video / Static Background
        In a real scenario, this would be an <img src={mjpeg_url} /> or <video />
      */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
         <div className="text-[8px] text-[#94A3B8] uppercase tracking-[1em] text-center">
            [ SECURE_FEED_SIGNAL_IDLE ]<br/>
            WAITING_FOR_EDGE_STREAM
         </div>
      </div>

      {/* Grid Overlay for aesthetics */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#60A5FA 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }} 
      />

      {/* Bounding Box Layer */}
      {activeDetections.map((det, idx) => (
        <div 
          key={`${det.deviceId}-${idx}`}
          className="absolute border-2 transition-all duration-100 ease-linear pointer-events-none"
          style={{
            left: `${det.x * 100}%`,
            top: `${det.y * 100}%`,
            width: `${det.w * 100}%`,
            height: `${det.h * 100}%`,
            borderColor: '#60A5FA',
            boxShadow: '0 0 15px rgba(96, 165, 250, 0.4), inset 0 0 10px rgba(96, 165, 250, 0.1)',
          }}
        >
          {/* Identification Tab (Deep Onyx) */}
          <div className="absolute -top-6 left-[-2px] bg-[#0B0D0F] border-t border-x border-[#60A5FA] px-2 py-0.5 rounded-t-sm whitespace-nowrap shadow-lg">
             <span className="text-[9px] font-black uppercase text-[#F1F5F9] font-mono tracking-tighter" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
               {det.label} <span className="text-[#60A5FA] ml-1">{Math.round(det.confidence * 100)}%</span>
             </span>
          </div>

          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#F1F5F9] opacity-40" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#F1F5F9] opacity-40" />
        </div>
      ))}

      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-white/[0.02] to-transparent h-[10%] animate-scanline" />
    </div>
  );
}

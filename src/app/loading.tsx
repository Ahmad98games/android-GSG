'use client';
import React from 'react';
import Image from 'next/image';


/**
 * NOXIS INDUSTRIAL LOADER — Pillar 4: Apple-Grade Dashboard
 * Cinematic loading sequence for the Sentinel Hub.
 */
export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] bg-[#121417] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Glowing Logo Container */}
        <div className="relative w-48 h-48 mb-8 animate-in fade-in zoom-in duration-1000">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
          <Image 
            src="/noxis.png" 
            alt="Noxis Logo" 
            width={192} 
            height={192} 
            className="relative z-10 object-contain drop-shadow-[0_0_20px_rgba(96,165,250,0.5)]"
          />
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2">
          <h2 className="text-sm font-black text-white uppercase tracking-[0.4em] animate-pulse">
            Initializing Noxis
          </h2>
          <div className="flex items-center gap-2 justify-center">
            <span className="h-0.5 w-12 bg-white/10" />
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              v9.0 Bridge Protocol
            </p>
            <span className="h-0.5 w-12 bg-white/10" />
          </div>
        </div>

        {/* Industrial Progress Bar */}
        <div className="mt-12 w-64 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 w-1/3 animate-[loading_2s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* Footer Telemetry */}
      <div className="absolute bottom-12 flex gap-8">
        {['CORE_INIT', 'MESH_SYNC', 'VISION_BOOT'].map((service, i) => (
          <div key={i} className="flex flex-col items-center opacity-30">
            <div className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">{service}</div>
            <div className="text-[9px] font-mono text-blue-400 font-bold tracking-tighter">OK</div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

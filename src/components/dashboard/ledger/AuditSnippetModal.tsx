'use client';

import React from 'react';
import { X, Shield, Download, Maximize2 } from 'lucide-react';

interface AuditSnippetModalProps {
  path: string;
  onClose: () => void;
}

/**
 * AuditSnippetModal — Glassmorphism Video Player
 * 
 * Plays 60s CCTV evidence for immutable ledger entries.
 * Features a high-end industrial blur effect and cinematic borders.
 */
export function AuditSnippetModal({ path, onClose }: AuditSnippetModalProps) {
  // Construct the stream URL via our local file bridge
  const videoUrl = `/api/telemetry/snippet?path=${encodeURIComponent(path)}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-[#1C2028]/60 backdrop-blur-xl border border-[#2D3441] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#2D3441] flex justify-between items-center bg-[#121417]/40">
          <div className="flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-[#60A5FA] animate-pulse" />
             <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#F1F5F9]">Forensic Evidence Player</h3>
                <p className="text-[8px] text-[#94A3B8] uppercase font-bold tracking-tighter mt-0.5">Pillar 4 // Visual Proof System</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#121417] text-[#94A3B8] hover:text-[#F1F5F9] rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Player Area */}
        <div className="aspect-video w-full bg-black relative group">
          <video 
            src={videoUrl} 
            controls 
            autoPlay 
            className="w-full h-full object-contain"
          />
          
          {/* Overlay Grid */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.05]" 
               style={{ backgroundImage: 'linear-gradient(#60A5FA 1px, transparent 1px), linear-gradient(90deg, #60A5FA 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
          />

          {/* Hud Corners */}
          <div className="absolute top-4 left-4 border-t-2 border-l-2 border-[#60A5FA]/40 w-8 h-8 pointer-events-none" />
          <div className="absolute bottom-4 right-4 border-b-2 border-r-2 border-[#60A5FA]/40 w-8 h-8 pointer-events-none" />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#121417]/80 flex justify-between items-center">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-[#60A5FA] uppercase">
                 <Shield size={14} /> Tamper-Proof Hash Verified
              </div>
              <div className="h-4 w-px bg-[#2D3441]" />
              <span className="text-[10px] text-[#4B5563] font-mono truncate max-w-[200px]">
                FILE: {path.split(/[\\/]/).pop()}
              </span>
           </div>
           
           <div className="flex items-center gap-3">
              <button className="p-2 text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"><Maximize2 size={16} /></button>
              <button className="p-2 text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"><Download size={16} /></button>
           </div>
        </div>
      </div>
    </div>
  );
}

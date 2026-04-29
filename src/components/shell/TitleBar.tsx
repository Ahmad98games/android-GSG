'use client';

import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy, Monitor } from 'lucide-react';
import { useBranding } from '@/providers/BrandingProvider';

interface TitleBarProps {
  title?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ title }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { businessName, businessLogo } = useBranding();

  useEffect(() => {
    const checkMaximized = async () => {
      if (typeof window !== 'undefined' && window.noxis) {
        const maximized = await window.noxis.window.isMaximized();
        setIsMaximized(maximized);
      }
    };

    checkMaximized();
  }, []);

  const handleMinimize = () => window.noxis?.window.minimize();
  const handleMaximize = () => {
    window.noxis?.window.maximize();
    setIsMaximized(!isMaximized);
  };
  const handleClose = () => window.noxis?.window.close();

  return (
    <div className="h-10 w-full flex items-center justify-between bg-[#121417] border-b border-white/5 select-none z-[1000] relative">
      {/* Draggable Region */}
      <div className="absolute inset-0 z-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      {/* Left: Branding */}
      <div className="flex items-center gap-3 px-4 relative z-10 pointer-events-none">
        <div className="w-5 h-5 bg-white/5 rounded-md flex items-center justify-center p-0.5 border border-white/10 overflow-hidden">
          {businessLogo ? (
            <img src={businessLogo} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <Monitor className="w-3 h-3 text-[#60A5FA]" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black tracking-[0.2em] text-[#C5A059] uppercase">{businessName}</span>
          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">v9.0</span>
        </div>
      </div>

      {/* Center: Page Title */}
      <div className="flex-1 flex justify-center relative z-10 pointer-events-none">
        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500">
          {title || businessName}
        </span>
      </div>

      {/* Right: Controls */}
      <div className="flex h-full relative z-10" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button 
          onClick={handleMinimize}
          className="w-12 h-full flex items-center justify-center text-zinc-500 hover:bg-white/5 hover:text-white transition-all"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button 
          onClick={handleMaximize}
          className="w-12 h-full flex items-center justify-center text-zinc-500 hover:bg-white/5 hover:text-white transition-all"
        >
          {isMaximized ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
        </button>
        <button 
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center text-zinc-500 hover:bg-red-500 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

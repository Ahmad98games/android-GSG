'use client';

import React, { useState, useEffect } from 'react';
import { Command, Calculator, X, ArrowRight, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IndustrialMath } from '@/lib/industrial-math';
import Decimal from 'decimal.js';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isPreShrunk, setIsPreShrunk] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle with ALT+K
      if (e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleCalculate = async () => {
    const query = inputValue.toLowerCase().trim();
    if (!query) return;

    setIsCalculating(true);
    
    try {
      // Command: "Gaz to Suit" (e.g. "100 g")
      const gazMatch = query.match(/(\d+\.?\d*)\s*g/);
      if (gazMatch) {
        const value = new Decimal(gazMatch[1]);
        // Simple yield: 1 suit ≈ 2.75 gaz (typical)
        // Or we use IndustrialMath if it has a direct suites function. 
        // For now, let's use the standard industrial conversion logic.
        const yieldPerSuit = isPreShrunk ? new Decimal('2.85') : new Decimal('2.75');
        const suits = value.div(yieldPerSuit).floor();
        const consumed = suits.times(yieldPerSuit);
        const remnant = value.minus(consumed);
        
        setResult(`${suits.toNumber()} SUITS (+${remnant.toFixed(2)} GAZ REMNANT)`);
        return;
      }

      // Command: "Suit to Gaz" (e.g. "100 s")
      const suitMatch = query.match(/(\d+)\s*s/);
      if (suitMatch) {
        const suits = new Decimal(suitMatch[1]);
        const baseGaz = suits.times(new Decimal('2.75'));
        // Apply wastage and shrinkage via IndustrialMath if available
        const totalGaz = IndustrialMath.calculateRequiredGaz(baseGaz);
        setResult(`${totalGaz.toString()} GAZ REQUIRED`);
        return;
      }

      setResult("INVALID_CMD // TRY: '100 g' or '100 s'");
    } catch {
      setResult("CALCULATION_ERROR");
    } finally {
      setIsCalculating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-[#121417] border border-white/10 rounded-lg shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header/Input */}
        <div className="p-5 flex items-center gap-4 border-b border-white/5 bg-[#1C2028]/50">
          <Command className="w-5 h-5 text-[#60A5FA]" />
          <input 
            autoFocus
            placeholder="Command Interface (e.g. '500 g' for yield...)"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setResult(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
            className="flex-1 bg-transparent border-none text-zinc-100 text-sm font-mono focus:outline-none placeholder:text-zinc-700"
          />
          <div className="flex items-center gap-3">
             <kbd className="hidden md:block px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] text-zinc-500 font-mono tracking-tighter">ENTER</kbd>
             <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/5 rounded-md transition-colors"
             >
               <X className="w-5 h-5 text-zinc-600 hover:text-white" />
             </button>
          </div>
        </div>

        {/* Processing Mode Selection */}
        <div className="px-5 py-2.5 bg-[#0A0C10] border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  !isPreShrunk ? "bg-[#60A5FA] shadow-[0_0_8px_#60A5FA]" : "bg-zinc-800"
                )} />
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-[0.2em] transition-all",
                  !isPreShrunk ? "text-[#60A5FA]" : "text-zinc-700"
                )}>Standard_Yield</span>
             </div>
             
             <button 
               onClick={() => {
                 setIsPreShrunk(!isPreShrunk);
                 setResult(null);
               }}
               className="w-9 h-4 bg-[#1C2028] border border-white/10 rounded-full relative p-0.5 transition-all hover:border-[#60A5FA33]"
             >
               <div className={cn(
                 "w-2.5 h-2.5 rounded-full transition-all flex items-center justify-center",
                 isPreShrunk ? "translate-x-5 bg-[#60A5FA]" : "translate-x-0 bg-zinc-600"
               )} />
             </button>

             <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-[0.2em] transition-all",
                  isPreShrunk ? "text-[#C5A059]" : "text-zinc-700"
                )}>Pre_Shrunk_Adjust</span>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  isPreShrunk ? "bg-[#C5A059] shadow-[0_0_8px_#C5A059]" : "bg-zinc-800"
                )} />
             </div>
          </div>
          
          <div className="flex items-center gap-2 text-[7px] font-mono text-zinc-800 uppercase italic tracking-widest">
            {isCalculating && <Activity className="w-3 h-3 animate-spin text-[#60A5FA]" />}
            Industrial_OS_v9.2 Active
          </div>
        </div>

        {/* Result Area */}
        {result ? (
          <div className="p-10 bg-[#60A5FA]/[0.02] flex flex-col items-center justify-center space-y-5 animate-in slide-in-from-top-4 duration-500">
             <div className="flex items-center gap-3 text-zinc-600 text-[10px] uppercase font-black tracking-[0.3em] font-mono">
                <div className="p-1 bg-[#60A5FA]/10 rounded shadow-[0_0_10px_rgba(96,165,250,0.1)]">
                  <Calculator className="w-3 h-3 text-[#60A5FA]" />
                </div>
                Computation Engine Result
             </div>
             <div className="flex items-center gap-6">
                <span className="text-zinc-700 font-mono text-xl tracking-tight">{inputValue.toUpperCase()}</span>
                <ArrowRight className="w-5 h-5 text-[#60A5FA] opacity-50" />
                <span className="text-[#60A5FA] font-mono text-2xl md:text-3xl font-black tracking-tighter drop-shadow-[0_0_20px_rgba(96,165,250,0.4)] text-center">
                  {result}
                </span>
             </div>
          </div>
        ) : (
          <div className="p-5 bg-black/20">
            <div className="grid grid-cols-2 gap-3 text-[9px] font-bold uppercase tracking-widest text-zinc-600 font-mono">
               <div className="p-3 border border-white/5 rounded-sm bg-white/[0.02] flex flex-col gap-1">
                 <span className="text-zinc-400">Gaz to Suit</span>
                 <span className="text-[11px] text-[#60A5FA]">500 G</span>
                 <p className="text-[7px] font-normal lowercase tracking-normal text-zinc-700 mt-1">Estimates suits based on current fabric yield.</p>
               </div>
               <div className="p-3 border border-white/5 rounded-sm bg-white/[0.02] flex flex-col gap-1">
                 <span className="text-zinc-400">Suit to Gaz</span>
                 <span className="text-[11px] text-[#C5A059]">200 S</span>
                 <p className="text-[7px] font-normal lowercase tracking-normal text-zinc-700 mt-1">Calculates total gaz required with waste factor.</p>
               </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[8px] font-mono text-zinc-800 uppercase tracking-widest">
              <span>Shortcuts: ALT+K (Toggle)</span>
              <span>ESC (Close)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
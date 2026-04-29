'use client';

import React from 'react';
import { Search, X, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DataTableSearch({ 
  value, 
  onChange, 
  placeholder = "SEARCH_REGISTRY...", 
  className 
}: DataTableSearchProps) {
  return (
    <div className={cn("relative group w-full max-w-xl", className)}>
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <Search size={16} className="text-zinc-600 group-focus-within:text-[#60A5FA] transition-colors" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 bg-[#1C2028] border border-white/5 rounded-[8px] pl-12 pr-12 text-[11px] font-mono text-zinc-100 placeholder:text-zinc-700 outline-none focus:border-[#60A5FA33] focus:bg-[#242933] transition-all"
        placeholder={placeholder}
      />
      <div className="absolute inset-y-0 right-4 flex items-center gap-2">
        {value ? (
          <button 
            onClick={() => onChange('')}
            className="p-1 hover:bg-white/5 rounded-full text-zinc-600 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        ) : (
          <div className="flex items-center gap-1 px-2 py-1 rounded-[4px] bg-white/[0.03] border border-white/5 text-[8px] font-black text-zinc-700 tracking-tighter">
             <Command size={10} />
             <span>F</span>
          </div>
        )}
      </div>
    </div>
  );
}

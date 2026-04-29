'use client';

import React from 'react';
import { KhataLedgerBoard } from '@/components/dashboard/ledger/KhataLedgerBoard';
import { BookOpen, ShieldCheck, Download, Filter } from 'lucide-react';

/**
 * PAGE: /dashboard/ledger
 * 
 * Pillar 4 & 5 — The Immutable Khata Dashboard
 * Operational headquarters for visual financial auditing.
 */
export default function LedgerPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#0B0D0F] selection:bg-[#C5A059] selection:text-black">
      {/* Header Section */}
      <div className="px-8 py-8 border-b border-[#2D3441] bg-[#121417] flex justify-between items-end">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C5A05914] text-[#C5A059] border border-[#C5A05933]">
                 <BookOpen size={20} />
              </div>
              <div>
                 <h1 className="text-3xl font-black uppercase tracking-tighter text-[#F1F5F9]">
                    Immutable <span className="text-[#C5A059]">Ledger</span>
                 </h1>
                 <p className="text-[10px] text-[#94A3B8] uppercase tracking-[0.3em]">Local Source of Truth // Pillar 5</p>
              </div>
           </div>
        </div>

        <div className="flex gap-4 mb-1">
           <button className="flex items-center gap-2 px-6 py-3 bg-[#1C2028] border border-[#2D3441] rounded-lg text-[10px] font-black uppercase text-[#94A3B8] hover:text-[#F1F5F9] transition-all">
              <Filter size={14} /> Advanced Filter
           </button>
           <button className="flex items-center gap-2 px-6 py-3 bg-[#C5A059] text-[#121417] rounded-lg text-[10px] font-black uppercase hover:bg-[#B48F48] transition-all shadow-lg shadow-[#C5A059]/10">
              <Download size={14} /> Export Report
           </button>
        </div>
      </div>

      {/* Main Board Container */}
      <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
         <div className="max-w-6xl mx-auto space-y-8">
            {/* Status Indicators */}
            <div className="grid grid-cols-3 gap-6">
               <div className="bg-[#121417] border border-[#2D3441] p-6 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-[#4B5563] uppercase tracking-widest mb-1">Vault Integrity</p>
                    <p className="text-xl font-black text-[#34D399] tracking-tighter uppercase">Checksum_OK</p>
                  </div>
                  <ShieldCheck size={32} className="text-[#34D399] opacity-20" />
               </div>
               <div className="bg-[#121417] border border-[#2D3441] p-6 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-[#4B5563] uppercase tracking-widest mb-1">Sync Latency</p>
                    <p className="text-xl font-black text-[#60A5FA] tracking-tighter uppercase">42ms</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-[#60A5FA] animate-ping" />
               </div>
               <div className="bg-[#121417] border border-[#2D3441] p-6 rounded-2xl flex items-center justify-between border-l-4 border-l-[#C5A059]">
                  <div>
                    <p className="text-[9px] font-black text-[#4B5563] uppercase tracking-widest mb-1">Visual Evidence</p>
                    <p className="text-xl font-black text-[#F1F5F9] tracking-tighter uppercase">ACTIVE_RECORD</p>
                  </div>
                  <BookOpen size={32} className="text-[#C5A059] opacity-20" />
               </div>
            </div>

            <KhataLedgerBoard />
         </div>
      </div>
    </div>
  );
}

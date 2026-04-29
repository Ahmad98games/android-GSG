'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Play, FileText, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuditSnippetModal } from '@/components/dashboard/ledger/AuditSnippetModal';

interface LedgerEntry {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: string;
  description: string;
  workerName: string;
  workerId?: string;
  ts: string | Date;
  snippetPath?: string;
}

/**
 * KhataLedgerBoard — Pillar 4/5 Component
 * 
 * High-density tabular view of the immutable ledger.
 * Features Sandstone Gold typography and Electric Blue visual proofs.
 */
export function KhataLedgerBoard() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSnippet, setActiveSnippet] = useState<string | null>(null);

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/ecosystem/khata/list');
      const data = await res.json();
      if (data.success) setEntries(data.entries);
    } catch (err) {
      console.error('[LedgerBoard] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEntries();
    // Poll every 30s for updates
    const interval = setInterval(fetchEntries, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-[#94A3B8]">
        <Loader2 className="mr-2 animate-spin" size={20} />
        <span className="text-xs font-black uppercase tracking-widest">Accessing Ledger...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <div className="overflow-hidden rounded-xl border border-[#2D3441] bg-[#121417] shadow-2xl">
        <table className="w-full border-collapse text-left font-mono">
          <thead className="bg-[#1C2028]/80 text-[9px] font-black uppercase tracking-[0.2em] text-[#4B5563]">
            <tr>
              <th className="px-6 py-4 border-b border-[#2D3441]">Timestamp</th>
              <th className="px-6 py-4 border-b border-[#2D3441]">Action / Description</th>
              <th className="px-6 py-4 border-b border-[#2D3441]">Origin Node</th>
              <th className="px-6 py-4 border-b border-[#2D3441] text-right">Amount</th>
              <th className="px-6 py-4 border-b border-[#2D3441] text-center">Visual Proof</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2D3441]">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-[10px] text-[#4B5563] uppercase italic">
                  No immutable ledger traffic detected
                </td>
              </tr>
            ) : entries.map((entry) => (
              <tr key={entry.id} className="group hover:bg-[#1C2028]/40 transition-colors">
                <td className="px-6 py-4 text-[10px] text-[#94A3B8] whitespace-nowrap">
                  {format(new Date(entry.ts), 'yyyy-MM-dd HH:mm:ss')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-black uppercase text-[#F1F5F9] tracking-tight">
                      {entry.workerName}
                    </span>
                    <span className="text-[10px] text-[#4B5563] uppercase">
                      {entry.description}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#60A5FA]" />
                    <span className="text-[10px] font-bold text-[#94A3B8] tracking-tighter">
                      {entry.workerId || 'UNKNOWN_NODE'}
                    </span>
                  </div>
                </td>
                <td className={cn(
                  "px-6 py-4 text-right text-sm font-black tracking-tighter transition-all duration-700",
                  entry.type === 'DEBIT' ? "text-[#F87171]" : "text-[#C5A059] [text-shadow:0_0_12px_rgba(197,160,89,0.3)]",
                  "group-hover:scale-110"
                )}>
                  <span className={cn(
                    entry.type === 'CREDIT' && "animate-pulse"
                  )}>
                    {entry.type === 'DEBIT' ? '-' : '+'} {entry.amount}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {entry.snippetPath ? (
                    // Logic: Snippets older than 7 days are purged by the Janitor
                    (Date.now() - new Date(entry.ts).getTime() > 7 * 24 * 60 * 60 * 1000) ? (
                      <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase text-[#4B5563] italic">
                         <Shield size={10} className="opacity-50" /> Snippet Archived
                      </div>
                    ) : (
                      <button 
                        onClick={() => setActiveSnippet(entry.snippetPath ?? null)}
                        className="group/btn relative inline-flex items-center gap-2 px-4 py-1.5 bg-[#60A5FA14] border border-[#60A5FA33] rounded-md text-[9px] font-black uppercase text-[#60A5FA] hover:bg-[#60A5FA] hover:text-[#121417] transition-all"
                      >
                        <Play size={10} fill="currentColor" /> Play Snippet
                      </button>
                    )
                  ) : (
                    <div className="inline-flex items-center gap-2 text-[8px] font-black uppercase text-[#2D3441]">
                      <AlertCircle size={10} /> No Footage
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between px-2 text-[8px] font-black uppercase tracking-widest text-[#4B5563]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Shield size={10} /> Local Source of Truth Verified</span>
          <span className="flex items-center gap-1"><FileText size={10} /> Append-Only Ledger Active</span>
        </div>
        <span>Record Count: {entries.length}</span>
      </div>

      {activeSnippet && (
        <AuditSnippetModal 
          path={activeSnippet} 
          onClose={() => setActiveSnippet(null)} 
        />
      )}
    </div>
  );
}

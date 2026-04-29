'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ChevronDown, ChevronUp,
  Loader2, ShieldCheck, RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: string;
  level: string;
  message: string;
  context: Record<string, unknown> | null;
  url: string | null;
  created_at: string;
}

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const initialized = useRef(false);

  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const fetchLogs = useCallback(async (isInitial: boolean = false) => {
    if (!isInitial) setLoading(true);
    setErrorStatus(null);
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) {
        if (error.message.includes('relation "public.system_logs" does not exist') || 
            error.message.includes('schema cache')) {
          setErrorStatus('SCHEMA_MISSING');
        }
        throw error;
      }
      setLogs(data || []);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error('❌ LOGS_FETCH:', err.message || e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) { initialized.current = true; void fetchLogs(true); }
  }, [fetchLogs]);

  const levelFilters = ['ALL', 'ERROR', 'CRITICAL', 'WARN', 'INFO'];
  const filtered = logs.filter(l => filter === 'ALL' || l.level === filter);

  const getLevelColor = (lvl: string) => {
    switch (lvl) {
      case 'CRITICAL': return 'bg-[#F87171] text-white';
      case 'ERROR': return 'bg-[#F87171]/20 text-[#F87171]';
      case 'WARN': return 'bg-[#FBBF24]/20 text-[#FBBF24]';
      case 'INFO': return 'bg-[#2E90FF]/20 text-[#2E90FF]';
      default: return 'bg-white/10 text-zinc-500';
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#121417] min-h-screen text-[#F1F5F9] font-mono select-none selection:bg-[#60A5FA] selection:text-white">
      <div className="flex justify-between items-end border-b border-[#2D3441] pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-[#F1F5F9] uppercase">System Logs</h1>
          <p className="text-[10px] text-[#94A3B8] tracking-[0.2em] mt-2 uppercase">Industrial_Sentinel // INDUSTRIAL_CORE_v8.6.1</p>
        </div>
      </div>

      {errorStatus === 'SCHEMA_MISSING' && (
        <div className="bg-[#60A5FA]/10 border border-[#60A5FA]/30 p-8 rounded-[8px] space-y-4">
          <div className="flex items-center gap-3 text-[#60A5FA]">
            <RotateCcw size={20} />
            <p className="text-sm font-black uppercase tracking-tighter">Emergency Schema Restoration Required</p>
          </div>
          <p className="text-xs text-[#94A3B8] font-mono leading-relaxed">
            The industrial monitoring engine detected a missing <code className="text-[#F1F5F9]">public.system_logs</code> table. 
            Run the following SQL in your Supabase SQL Editor to restore functionality:
          </p>
          <pre className="bg-[#121417] p-6 text-[10px] text-[#94A3B8] overflow-x-auto border border-[#2D3441] font-mono select-all rounded-[8px]">
{`CREATE TABLE public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`}
          </pre>
          <button 
            onClick={() => void fetchLogs()}
            className="text-[10px] font-black text-[#60A5FA] uppercase hover:text-white transition-all underline underline-offset-4"
          >
            Retry Connection
          </button>
        </div>
      )}

      <div className="flex justify-between items-end">
        <button onClick={() => void fetchLogs()} className="bg-[#1C2028] border border-[#2D3441] p-3 rounded-[8px] text-[#94A3B8] hover:text-[#F1F5F9] transition-all">
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="flex gap-2">
        {levelFilters.map(lvl => (
          <button key={lvl} onClick={() => setFilter(lvl)}
            className={cn("px-4 py-2 text-[9px] font-black uppercase border rounded-[8px] transition-all",
              filter === lvl ? "bg-[#60A5FA] text-[#121417] border-[#60A5FA]" : "bg-[#1C2028] text-[#94A3B8] border-[#2D3441] hover:bg-[#242933]"
            )}>
            {lvl} {lvl !== 'ALL' && `(${logs.filter(l => l.level === lvl).length})`}
          </button>
        ))}
      </div>

      <div className="bg-[#1C2028] border border-[#2D3441] rounded-[12px] overflow-hidden divide-y divide-[#2D3441] shadow-xl">
        {loading ? (
          <div className="flex justify-center py-32"><Loader2 className="animate-spin text-[#60A5FA]" size={32} /></div>
        ) : filtered.length === 0 ? (
          <div className="py-32 text-center">
            <ShieldCheck size={32} className="mx-auto text-[#34D399] opacity-20 mb-4" />
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-black">No log entries</p>
          </div>
        ) : filtered.map(log => (
          <div key={log.id}>
            <div
              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
              className="p-6 flex items-center gap-6 cursor-pointer hover:bg-white/[0.02] transition-colors"
            >
              <span className={cn("px-2 py-0.5 text-[8px] font-black uppercase rounded-[1px]", getLevelColor(log.level))}>{log.level}</span>
              <span className="text-[10px] font-bold text-zinc-500 w-40 shrink-0">{new Date(log.created_at).toLocaleString()}</span>
              <span className="text-[10px] font-black text-zinc-300 flex-1 truncate">{log.message}</span>
              <span className="text-[9px] text-zinc-800 font-bold">{log.url}</span>
              {log.context && (expandedId === log.id ? <ChevronUp size={14} className="text-[#60A5FA]" /> : <ChevronDown size={14} className="text-zinc-800" />)}
            </div>
            {expandedId === log.id && log.context && (
              <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                <pre className="bg-[#121417] p-6 border border-[#2D3441] rounded-[8px] text-[10px] text-[#94A3B8] overflow-x-auto max-h-48">
                  {JSON.stringify(log.context, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

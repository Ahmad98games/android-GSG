'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, Database, Activity,
  ShieldCheck, AlertTriangle,
  ChevronDown, ChevronUp,
  RotateCcw, User
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * INDUSTRIAL AUDIT LEDGER (v8.6.1)
 * Forensic operational immutable history with mutation analysis.
 */

interface AuditEntry {
  id: string;
  action_type: string;
  table_name: string;
  record_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  profiles: { full_name: string; role: string } | null;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const initialized = useRef(false);

  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const fetchLogs = useCallback(async (isInitial: boolean = false) => {
    if (!isInitial) setLoading(true);
    setErrorStatus(null);
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select(`
          id, 
          action_type:action, 
          table_name, 
          record_id, 
          created_at, 
          profiles:user_id(full_name, role)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        if (error.message.includes('relation "public.audit_log" does not exist') ||
            error.message.includes('schema cache')) {
          setErrorStatus('SCHEMA_MISSING');
        }
        throw error;
      }
      setLogs((data as unknown as AuditEntry[]) || []);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error('❌ AUDIT_FETCH_FAILURE:', err.message || e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
        initialized.current = true;
        void fetchLogs(true);
    }
  }, [fetchLogs]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return "text-[#34D399]";
      case 'UPDATE': return "text-[#60A5FA]";
      case 'DELETE': return "text-[#F87171]";
      default: return "text-[#94A3B8]";
    }
  };

  const filteredLogs = logs.filter(l => 
    l.action_type.toLowerCase().includes(search.toLowerCase()) || 
    l.table_name.toLowerCase().includes(search.toLowerCase()) ||
    (l.profiles?.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 bg-[#121417] min-h-screen text-[#F1F5F9] select-none selection:bg-[#60A5FA] selection:text-[#121417] font-mono">
      {/* Module Header */}
      <div className="flex justify-between items-end border-b border-[#2D3441] pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
            <span className="text-[#60A5FA]">Activity</span> <span className="text-[#F1F5F9]">History</span>
          </h1>
          <p className="text-[10px] text-[#94A3B8] tracking-[0.2em] mt-2 uppercase">System Records and Event Logs</p>
        </div>
        <div className="flex gap-4">
           {errorStatus === 'SCHEMA_MISSING' && (
              <div className="bg-[#F87171]/10 border border-[#F87171]/30 px-6 py-3 rounded-[8px] flex items-center gap-3 animate-pulse">
                <AlertTriangle size={14} className="text-[#F87171]" />
                <p className="text-[9px] font-black text-[#F87171] uppercase tracking-widest">SCHEMA_UNAVAILABLE // AUDIT_LOG_MISSING</p>
              </div>
           )}
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={14} />
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search records..." 
                className="bg-[#1C2028] border border-[#2D3441] text-[10px] pl-10 pr-4 py-3 rounded-[8px] focus:outline-none focus:border-[#60A5FA] w-64 text-[#F1F5F9] uppercase" 
              />
           </div>
           <button onClick={() => void fetchLogs()} className="bg-[#1C2028] border border-[#2D3441] p-3 rounded-[8px] text-[#94A3B8] hover:text-[#F1F5F9] transition-all">
              <RotateCcw size={16} />
           </button>
        </div>
      </div>

      {/* Forensic Table */}
      <div className="bg-[#1C2028] border border-[#2D3441] rounded-[12px] overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-[#121417]/40 text-[9px] text-[#94A3B8] uppercase tracking-[0.2em] border-b border-[#2D3441]">
            <tr>
              <th className="p-6 font-black">Timestamp_Protocol</th>
              <th className="p-6 font-black">Identity_Vector</th>
              <th className="p-6 font-black text-center">Operation</th>
              <th className="p-6 font-black">Mutation_Target</th>
              <th className="p-6 font-black text-right">Integrity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2D3441] text-[10px]">
            {loading ? [...Array(10)].map((_, i) => (
              <tr key={i} className="animate-pulse">
                 <td colSpan={5} className="p-8 bg-white/[0.01]" />
              </tr>
            )) : filteredLogs.length === 0 ? (
               <tr>
                  <td colSpan={5} className="p-32 text-center text-[#2D3441] italic uppercase">NO_AUDIT_TRAILS_IN_VAULT</td>
               </tr>
            ) : filteredLogs.map((log) => (
              <React.Fragment key={log.id}>
                <tr 
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className="group hover:bg-[#242933] cursor-pointer transition-colors"
                >
                  <td className="p-6 text-[#94A3B8] font-bold">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                       <User size={14} className="text-[#2D3441]" />
                       <div>
                          <p className="font-black text-[#F1F5F9] uppercase leading-none">{log.profiles?.full_name || 'SYSTEM_DAEMON'}</p>
                          <p className="text-[8px] text-[#2D3441] font-black uppercase mt-1 tracking-widest">{log.profiles?.role || 'ROOT'}</p>
                       </div>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <span className={cn("px-3 py-1 bg-[#121417] border border-[#2D3441] rounded-full font-black text-[9px] uppercase", getActionColor(log.action_type))}>
                      {log.action_type}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="space-y-1">
                       <p className="font-black text-white uppercase tracking-tighter">{log.table_name}</p>
                       <p className="text-[8px] text-[#2D3441] font-black uppercase tracking-widest">UID: {log.record_id.slice(-8).toUpperCase()}</p>
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    {expandedId === log.id ? <ChevronUp size={14} className="ml-auto text-[#60A5FA]" /> : <ChevronDown size={14} className="ml-auto text-[#2D3441]" />}
                  </td>
                </tr>
                {expandedId === log.id && (
                  <tr className="bg-[#121417]/50 border-y border-[#2D3441] animate-in slide-in-from-top-2">
                    <td colSpan={5} className="p-10">
                       <div className="grid grid-cols-2 gap-10">
                          <div className="space-y-4">
                             <h4 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest flex items-center gap-2">
                                <Database size={14} /> Antecedent_State (Old)
                             </h4>
                             <pre className="bg-[#121417] p-6 border border-[#2D3441] rounded-[8px] text-[10px] text-[#94A3B8] overflow-x-auto scrollbar-hide max-h-64">
                                {JSON.stringify(log.old_data, null, 2) || '// NULL_STATE'}
                             </pre>
                          </div>
                          <div className="space-y-4">
                             <h4 className="text-[10px] font-black text-[#60A5FA] uppercase tracking-widest flex items-center gap-2">
                                <Activity size={14} /> Mutant_State (New)
                             </h4>
                             <pre className="bg-[#121417] p-6 border border-[#60A5FA]/20 rounded-[8px] text-[10px] text-[#60A5FA] overflow-x-auto scrollbar-hide max-h-64">
                                {JSON.stringify(log.new_data, null, 2) || '// NULL_STATE'}
                             </pre>
                          </div>
                       </div>
                       <div className="mt-8 flex justify-between items-center border-t border-white/5 pt-6">
                          <p className="text-[9px] text-[#2D3441] uppercase font-black tracking-widest">LOG_ID: {log.id}</p>
                          <button className="flex items-center gap-2 px-8 py-3 bg-white/5 border border-white/10 text-[9px] font-black text-white hover:bg-[#F87171] transition-all uppercase rounded-[8px]">
                             Initiate_Rollback_Protocol
                          </button>
                       </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Security Status Bar */}
      <div className="flex justify-between items-center bg-[#1C2028] p-6 border border-[#2D3441] rounded-[12px] shadow-lg">
         <div className="flex items-center gap-4">
            <ShieldCheck size={20} className="text-[#34D399]" />
            <div>
               <p className="text-[10px] font-black text-[#F1F5F9] uppercase tracking-widest leading-none mb-1">Integrity Verification Active</p>
               <p className="text-[8px] text-[#94A3B8] uppercase font-black">Forensic auditing persists across all mutation vectors.</p>
            </div>
         </div>
         <div className="flex items-center gap-6 text-right">
            <div>
               <p className="text-[8px] text-[#2D3441] uppercase font-black mb-1">Ledger_Seal</p>
               <p className="text-[10px] font-black text-[#60A5FA] uppercase">INDUSTRIAL_AUDIT_STABLE</p>
            </div>
         </div>
      </div>
    </div>
  );
}

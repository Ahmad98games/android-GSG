'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderReturn {
  id: string;
  order_id: string;
  return_reason: string;
  return_type: string;
  status: string;
  notes: string | null;
  created_at: string;
  orders: { code: string; total: number; parties: { name: string } | null } | null;
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const initialized = useRef(false);

  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const fetchReturns = useCallback(async (isInitial: boolean = false) => {
    if (!isInitial) setLoading(true);
    setErrorStatus(null);
    try {
      const { data, error } = await supabase
        .from('order_returns')
        .select('*, orders(code, total, parties(name))')
        .order('created_at', { ascending: false });
      if (error) {
        if (error.message.includes('relation "public.order_returns" does not exist') || 
            error.message.includes('schema cache')) {
          setErrorStatus('SCHEMA_MISSING');
        }
        throw error;
      }
      setReturns((data as unknown as OrderReturn[]) || []);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error('❌ RETURNS_FETCH:', err.message || e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) { initialized.current = true; void fetchReturns(true); }
  }, [fetchReturns]);

  const handleApprove = async (returnId: string) => {
    try {
      // Call the atomic approve_return_protocol RPC
      const { error } = await supabase.rpc('approve_return_protocol', {
        p_return_id: returnId,
        p_approved_by: null // In production, pass current user ID
      });
      if (error) {
        // Fallback: direct update if RPC not available
        await supabase.from('order_returns').update({ status: 'APPROVED' }).eq('id', returnId);
      }
      void fetchReturns();
    } catch (e) {
      console.error('❌ RETURN_APPROVE:', e);
      alert('Failed to approve return.');
    }
  };

  const handleReject = async (returnId: string) => {
    await supabase.from('order_returns').update({ status: 'REJECTED' }).eq('id', returnId);
    void fetchReturns();
  };

  const statusFilters = ['ALL', 'REQUESTED', 'APPROVED', 'RECEIVED', 'CREDITED', 'REJECTED'];
  const filtered = returns.filter(r => filter === 'ALL' || r.status === filter);

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'REQUESTED': return 'text-[#FBBF24] border-[#FBBF24]/20';
      case 'APPROVED': return 'text-[#34D399] border-[#34D399]/20';
      case 'RECEIVED': return 'text-[#2E90FF] border-[#2E90FF]/20';
      case 'CREDITED': return 'text-[#60A5FA] border-[#60A5FA]/20';
      case 'REJECTED': return 'text-[#F87171] border-[#F87171]/20';
      default: return 'text-[#94A3B8] border-[#2D3441]';
    }
  };

  const getTypeLabel = (t: string) => {
    switch (t) {
      case 'FULL_RETURN': return 'Full Return';
      case 'EXCHANGE': return 'Exchange';
      case 'CREDIT_NOTE': return 'Credit Note';
      default: return t;
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#121417] min-h-screen text-[#F1F5F9] font-mono select-none selection:bg-[#60A5FA] selection:text-white">
      <div className="flex justify-between items-end border-b border-[#2D3441] pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">
            <span className="text-[#60A5FA]">Returns</span> <span className="text-[#60A5FA]">& Exchanges</span>
          </h1>
          <p className="text-[10px] text-[#94A3B8] tracking-[0.2em] mt-2 uppercase">Reverse_Logistics // INDUSTRIAL_CORE_v8.6.1</p>
        </div>
      </div>

      {errorStatus === 'SCHEMA_MISSING' && (
        <div className="bg-[#60A5FA]/10 border border-[#60A5FA]/30 p-8 rounded-[8px] space-y-4">
          <div className="flex items-center gap-3 text-[#60A5FA]">
            <RotateCcw size={20} />
            <p className="text-sm font-black uppercase tracking-tighter">Emergency Schema Restoration Required</p>
          </div>
          <p className="text-xs text-[#94A3B8] font-mono leading-relaxed">
            The industrial returns engine detected a missing <code className="text-[#F1F5F9]">public.order_returns</code> table. 
            Run the following SQL in your Supabase SQL Editor to restore functionality:
          </p>
          <pre className="bg-[#121417] p-6 text-[10px] text-[#94A3B8] overflow-x-auto border border-[#2D3441] font-mono select-all rounded-[8px]">
{`CREATE TABLE public.order_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id),
    return_reason TEXT NOT NULL,
    return_type TEXT DEFAULT 'FULL_RETURN',
    status TEXT DEFAULT 'REQUESTED',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`}
          </pre>
          <button 
            onClick={() => void fetchReturns()}
            className="text-[10px] font-black text-[#60A5FA] uppercase hover:text-white transition-all underline underline-offset-4"
          >
            Retry Connection
          </button>
        </div>
      )}

      <div className="flex gap-2">
        {statusFilters.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn("px-4 py-2 text-[9px] font-black uppercase border rounded-[8px] transition-all",
              filter === s ? "bg-[#60A5FA] text-[#121417] border-[#60A5FA]" : "bg-[#1C2028] text-[#94A3B8] border-[#2D3441] hover:bg-[#242933]"
            )}>
            {s} {s !== 'ALL' && `(${returns.filter(r => r.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="bg-[#1C2028] border border-[#2D3441] rounded-[12px] overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-[#121417]/40 text-[9px] text-[#94A3B8] uppercase tracking-[0.2em] border-b border-[#2D3441]">
            <tr>
              <th className="p-6 font-black">Order</th>
              <th className="p-6 font-black">Party</th>
              <th className="p-6 font-black">Type</th>
              <th className="p-6 font-black">Reason</th>
              <th className="p-6 font-black text-center">Status</th>
              <th className="p-6 font-black text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2D3441] text-[10px]">
            {loading ? <tr><td colSpan={6} className="p-16 text-center animate-pulse text-[#2D3441]">Loading...</td></tr>
            : filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-32 text-center">
                <RotateCcw size={32} className="mx-auto text-[#2D3441] mb-4" />
                <p className="text-[#94A3B8] uppercase tracking-widest font-black text-[10px]">No returns registered</p>
              </td></tr>
            ) : filtered.map(ret => (
              <tr key={ret.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-6 font-black text-[#60A5FA]">{ret.orders?.code}</td>
                <td className="p-6 font-black text-white uppercase">{ret.orders?.parties?.name}</td>
                <td className="p-6 text-[#94A3B8] uppercase">{getTypeLabel(ret.return_type)}</td>
                <td className="p-6 text-[#94A3B8] max-w-xs truncate">{ret.return_reason}</td>
                <td className="p-6 text-center">
                  <span className={cn("px-3 py-1 border rounded-full text-[9px] font-black uppercase", getStatusColor(ret.status))}>{ret.status}</span>
                </td>
                <td className="p-6 text-right">
                  {ret.status === 'REQUESTED' && (
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => handleApprove(ret.id)}
                        className="px-4 py-2 bg-[#34D399]/10 border border-[#34D399]/20 text-[9px] font-black text-[#34D399] uppercase hover:bg-[#34D399]/20 transition-all rounded-[8px]">
                        Approve
                      </button>
                      <button onClick={() => handleReject(ret.id)}
                        className="px-4 py-2 bg-[#F87171]/10 border border-[#F87171]/20 text-[9px] font-black text-[#F87171] uppercase hover:bg-[#F87171]/20 transition-all rounded-[8px]">
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


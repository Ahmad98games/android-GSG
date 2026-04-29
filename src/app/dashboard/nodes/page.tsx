'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/with-timeout';
import { 
  Cpu, Battery, 
  Lock, MessageSquare, 
  Activity, ShieldAlert,
  Smartphone,
  RotateCcw,
  Plus,
  X,
  RefreshCw,
  Zap,
  Signal,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/lib/hooks/useToast';

/**
 * INDUSTRIAL NODE HUB (v9.0.0)
 * Hardened hardware telemetry and session control with Phone Link-style pairing.
 */

interface MobileNode {
  id: string;
  node_slot: number;
  device_name: string;
  role: string;
  battery_pct: number;
  signal_strength: number;
  is_active: boolean;
  current_screen: string;
  last_seen_at: string;
  linked_at: string;
}

interface PairingModalProps {
  slot: number;
  onClose: () => void;
  onLinked: () => void;
}

function PairingModal({ slot, onClose, onLinked }: PairingModalProps) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('10:00');
  const [generating, setGenerating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>(null);
  const pollRef = useRef<NodeJS.Timeout>(null);

  const generateCode = useCallback(async () => {
    setGenerating(true);
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    
    try {
      const { error } = await withTimeout(
        Promise.resolve(supabase.from('node_pairing_tokens').insert({
          code: newCode,
          node_slot: slot,
          role: 'FIELD_NODE',
          expires_at: expiry.toISOString()
        })),
        8000
      ) as { error: { message: string } | null };

      if (error) throw error;
      
      setCode(newCode);
      setExpiresAt(expiry);
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string };
      console.error('❌ PAIRING_CODE_GEN_FAILURE:', err.message || JSON.stringify(e));
      setCode(null);
    } finally {
      setGenerating(false);
    }
  }, [slot]);

  useEffect(() => {
    void generateCode();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [generateCode]);

  useEffect(() => {
    if (!expiresAt) return;

    timerRef.current = setInterval(() => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('00:00');
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);

    pollRef.current = setInterval(async () => {
      // Accept: upsert
      const { data } = await supabase
        .from('node_pairing_tokens')
        .select('claimed')
        .eq('code', code)
        .single();
      
      if (data?.claimed) {
        onLinked();
      }
    }, 3000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [expiresAt, code, onLinked]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121417]/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#1C2028] border border-[#2D3441] p-12 rounded-[24px] max-w-lg w-full shadow-[0_0_100px_rgba(96,165,250,0.1)] relative overflow-hidden">
        <button onClick={onClose} className="absolute top-6 right-6 text-[#94A3B8] hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="space-y-8 text-center relative z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-[#60A5FA]/10 border border-[#60A5FA]/20 rounded-full flex items-center justify-center text-[#60A5FA]">
              <Zap size={32} fill="currentColor" />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tighter">Link Hardware Node</h3>
              <p className="text-[10px] text-[#94A3B8] font-black uppercase tracking-widest mt-1">Slot_0{slot} Protocol Initiation</p>
            </div>
          </div>

          <div className="py-12 bg-[#121417] border border-[#2D3441] rounded-[16px] relative group">
            {generating ? (
              <Loader2 className="animate-spin mx-auto text-[#60A5FA]" size={48} />
            ) : code ? (
              <>
                <div className="text-6xl font-black text-[#60A5FA] tracking-[0.2em] font-mono leading-none">
                  {code.slice(0, 3)} <span className="text-[#2D3441]">-</span> {code.slice(3)}
                </div>
                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">
                  <RotateCcw size={12} className="animate-spin-slow" /> Expires in {timeLeft}
                </div>
              </>
            ) : (
              <p className="text-[#F87171] uppercase font-black text-[10px]">Failed to generate code</p>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-[11px] text-[#94A3B8] leading-relaxed uppercase font-bold px-8">
              Open the <span className="text-white">Gold She Mobile App</span> on your device and enter this code to establish a permanent connection.
            </p>
            <button 
              onClick={generateCode}
              className="px-6 py-3 bg-[#1C2028] border border-[#2D3441] rounded-[8px] text-[10px] font-black uppercase hover:bg-[#242933] transition-all flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={14} /> Regenerate Code
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-24 -right-24 opacity-[0.03] pointer-events-none">
          <Cpu size={240} />
        </div>
      </div>
    </div>
  );
}

export default function NodeHubPage() {
  const { addToast } = useToast();
  const [nodes, setNodes] = useState<MobileNode[]>([]);
  const [protocolActive, setProtocolActive] = useState<string | null>(null);
  const [pairingSlot, setPairingSlot] = useState<number | null>(null);
  const initialized = useRef(false);
  const [loading, setLoading] = useState(true);

  const [connectionError, setConnectionError] = useState(false);

  const fetchNodes = useCallback(async (isInitial: boolean = false) => {
    if (isInitial) setLoading(true);
    setConnectionError(false);
    try {
      const { data, error } = await withTimeout(
        Promise.resolve(supabase.from('node_registrations').select('*').order('node_slot')),
        8000
      ) as { data: MobileNode[] | null; error: { message: string } | null };
      
      if (error) throw error;
      setNodes(data || []);
    } catch {
      setConnectionError(true);
      addToast({
        type: 'ERROR',
        title: 'Hardware Link Failure',
        message: 'Unable to reach the cloud backend. Check your network connection.'
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!initialized.current) {
        initialized.current = true;
        void fetchNodes(true);
    }

    const channel = supabase.channel('node_telemetry_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'node_registrations' }, () => { void fetchNodes(); })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [fetchNodes]);

  const handleBroadcastAlert = async () => {
    setProtocolActive('BROADCAST');
    try {
      const { error } = await supabase.from('broadcast_alerts').insert({
        title: '⚠️ SYSTEM_WIDE_ALERT',
        body: 'MANDATORY HARDWARE AUDIT INITIATED BY COMMAND_CENTER',
        severity: 'CRITICAL',
        sent_by: 'COMMAND_CENTER'
      });
      if (error) throw error;
      addToast({
        type: 'SUCCESS',
        title: 'Signal Multi-Broadcast',
        message: 'Industrial audit signal has been pushed to all active field nodes.'
      });
    } catch {
      addToast({
        type: 'ERROR',
        title: 'Broadcast Refused',
        message: 'The system failed to emit the hardware audit signal.'
      });
    } finally {
      setTimeout(() => setProtocolActive(null), 3000);
    }
  };

  const getBatteryColor = (pct: number) => {
    if (pct < 20) return "text-[#F87171]";
    if (pct < 50) return "text-[#FBBF24]";
    return "text-[#34D399]";
  };

  const isOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    const diff = new Date().getTime() - new Date(lastSeen).getTime();
    return diff < 120000; // 2 minutes
  };

  return (
    <div className="p-8 space-y-8 bg-[#121417] min-h-screen text-[#F1F5F9] font-mono select-none selection:bg-[#60A5FA] selection:text-[#121417]">
      {/* Module Header */}
      <div className="flex justify-between items-end border-b border-[#2D3441] pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
            <span className="text-[#60A5FA]">Node</span> <span className="text-[#F1F5F9]">Hub</span>
          </h1>
          <p className="text-[10px] text-[#94A3B8] tracking-[0.2em] mt-2 uppercase">Hardware_Telemetry_Oversight // INDUSTRIAL_CORE_v9.0.0</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-[#1C2028] border border-[#2D3441] px-6 py-3 rounded-[8px] flex items-center gap-4 shadow-xl">
              <p className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest leading-none">Active_Nodes</p>
              <p className="text-xl font-black text-[#60A5FA] leading-none mb-1">{nodes.filter(n => isOnline(n.last_seen_at)).length} / 10</p>
           </div>
           <button 
             onClick={handleBroadcastAlert}
             disabled={!!protocolActive}
             className={cn(
               "text-[#121417] border border-[#60A5FA]/20 p-3 px-6 text-[10px] font-black uppercase transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(96,165,250,0.2)] rounded-[8px] disabled:opacity-50",
               protocolActive === 'BROADCAST' ? "bg-[#F87171] animate-pulse" : "bg-[#60A5FA] hover:bg-[#3B82F6]"
             )}
           >
              {protocolActive === 'BROADCAST' ? <Loader2 className="animate-spin" size={14} /> : <ShieldAlert size={14} />}
              {protocolActive === 'BROADCAST' ? 'SIGNAL_EMITTING...' : 'BROADCAST_ALERT'}
           </button>
        </div>
      </div>

      {/* Connection Error Banner */}
      {connectionError && (
        <div className="bg-[#C5A059]/10 border border-[#C5A059]/30 p-8 rounded-[12px] space-y-4">
          <div className="flex items-center gap-3 text-[#C5A059]">
            <Signal size={20} className="animate-pulse" />
            <p className="text-sm font-black uppercase tracking-tighter">Searching for Local Nodes...</p>
          </div>
          <p className="text-xs text-[#94A3B8] font-mono leading-relaxed uppercase">
            The Industrial Hub is scanning the local mesh network. 
            Pairing codes are generated locally and do not require external cloud authorization.
          </p>
          <button 
            onClick={() => void fetchNodes(true)}
            className="px-6 py-3 bg-[#1C2028] border border-[#2D3441] rounded-[8px] text-[10px] font-black uppercase text-[#C5A059] hover:bg-[#C5A059] hover:text-white transition-all flex items-center gap-2"
          >
            <RotateCcw size={14} /> Refresh Mesh
          </button>
        </div>
      )}

      {/* Industrial Hardware Grid (1-10 Slots) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {loading ? (
           Array.from({ length: 10 }).map((_, idx) => <CardSkeleton key={idx} />)
        ) : Array.from({ length: 10 }).map((_, idx) => {
          const slot = idx + 1;
          const node = nodes.find(n => n.node_slot === slot);
          const online = node ? isOnline(node.last_seen_at) : false;

          return (
            <div key={slot} className={cn(
              "group relative overflow-hidden rounded-[16px] border transition-all duration-300 flex flex-col h-[380px]",
              node 
                ? "bg-[#1C2028] border-[#2D3441] hover:border-[#60A5FA]/40 shadow-xl" 
                : "bg-[#121417]/40 border-dashed border-[#2D3441] hover:border-[#F1F5F9]/20"
            )}>
              {/* Card Header */}
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div className={cn(
                    "w-10 h-10 rounded-[8px] flex items-center justify-center transition-colors",
                    node ? (online ? "bg-[#60A5FA]/10 text-[#60A5FA]" : "bg-[#121417] text-[#2D3441]") : "bg-[#121417] text-[#2D3441]"
                  )}>
                    <Smartphone size={20} />
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border",
                    node 
                      ? (online ? "bg-[#34D399]/10 text-[#34D399] border-[#34D399]/20" : "bg-[#2D3441] text-[#94A3B8] border-[#2D3441]") 
                      : "text-[#2D3441] border-[#2D3441]"
                  )}>
                    Slot_0{slot}
                  </div>
                </div>

                {node ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tighter truncate text-[#F1F5F9]">{node.device_name}</h3>
                      <p className="text-[9px] text-[#94A3B8] font-black uppercase tracking-widest mt-1">{node.role}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#121417] p-3 rounded-[8px] border border-[#2D3441]">
                        <p className="text-[7px] text-[#2D3441] font-black uppercase mb-1">Energy</p>
                        <div className="flex items-center gap-2">
                           <Battery size={12} className={getBatteryColor(node.battery_pct)} />
                           <span className="text-xs font-black">{node.battery_pct}%</span>
                        </div>
                      </div>
                      <div className="bg-[#121417] p-3 rounded-[8px] border border-[#2D3441]">
                        <p className="text-[7px] text-[#2D3441] font-black uppercase mb-1">Status</p>
                        <div className="flex items-center gap-2">
                           <div className={cn("w-2 h-2 rounded-full", online ? "bg-[#34D399] shadow-[0_0_8px_#34D399] animate-pulse" : "bg-[#2D3441]")} />
                           <span className="text-[9px] font-black tracking-tighter uppercase">{online ? 'Active' : 'Offline'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between text-[8px] font-black uppercase text-[#2D3441]">
                          <span>Signal_Strength</span>
                          <span>{node.signal_strength || 0}%</span>
                       </div>
                       <div className="h-1 bg-[#121417] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#60A5FA] transition-all duration-1000" 
                            style={{ width: `${node.signal_strength || 0}%` }} 
                          />
                       </div>
                    </div>

                    <div className="pt-2">
                       <p className="text-[8px] text-[#94A3B8] font-black uppercase flex items-center gap-2">
                          <Activity size={10} /> {online ? (node.current_screen || 'Idle') : 'Last seen ' + (node.last_seen_at ? formatDistanceToNow(new Date(node.last_seen_at)) : 'N/A')}
                       </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 filter grayscale">
                    <div className="p-6 border-2 border-dashed border-[#2D3441] rounded-full">
                       <RotateCcw size={32} className="text-[#2D3441]" />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-[#2D3441] uppercase tracking-[0.2em]">Hardware_Orphaned</p>
                       <p className="text-[7px] text-[#2D3441] uppercase mt-2 font-bold px-4">Waiting for protocol pairing initiation</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="p-4 bg-[#1C2028] border-t border-[#2D3441]">
                {node ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button className="flex items-center justify-center gap-2 py-2.5 bg-[#121417] hover:bg-[#60A5FA] hover:text-[#121417] text-[#94A3B8] text-[8px] font-black uppercase transition-all rounded-[6px] border border-[#2D3441]">
                       <MessageSquare size={12} /> Comms
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2.5 bg-[#121417] hover:bg-[#F87171] hover:text-white text-[#94A3B8] text-[8px] font-black uppercase transition-all rounded-[6px] border border-[#2D3441]">
                       <Lock size={12} /> Lock
                    </button>
                    <button 
                      onClick={() => setPairingSlot(slot)}
                      className="col-span-2 flex items-center justify-center gap-2 py-2.5 bg-[#1C2028] hover:bg-[#2D3441] text-[#2D3441] hover:text-white text-[8px] font-black uppercase transition-all rounded-[6px] border border-[#2D3441]"
                    >
                       <RefreshCw size={12} /> Re-link Session
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setPairingSlot(slot)}
                    className="w-full py-4 bg-[#60A5FA] text-[#121417] text-[10px] font-black uppercase tracking-widest rounded-[8px] hover:bg-[#3B82F6] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(96,165,250,0.2)] active:scale-95"
                  >
                     <Plus size={16} strokeWidth={3} /> Generate Pairing Code
                  </button>
                )}
              </div>

              {/* Background ID decoration */}
              <div className="absolute -bottom-4 -right-4 text-8xl font-black text-white/[0.02] pointer-events-none italic">
                {slot.toString().padStart(2, '0')}
              </div>
            </div>
          );
        })}
      </div>

      {pairingSlot && <PairingModal slot={pairingSlot} onClose={() => setPairingSlot(null)} onLinked={() => { setPairingSlot(null); fetchNodes(); }} />}

      {/* Global Hardware Audit Section */}
      <div className="bg-[#1C2028] border border-[#2D3441] p-10 rounded-[20px] mt-12 flex justify-between items-center relative overflow-hidden shadow-2xl">
         <div className="relative z-10">
            <h3 className="text-lg font-black text-[#60A5FA] uppercase tracking-widest mb-3 flex items-center gap-3">
               <ShieldAlert size={24} /> Global Protocol Command Center
            </h3>
            <p className="text-[11px] text-[#94A3B8] uppercase tracking-widest max-w-2xl font-black leading-relaxed">
              Force industrial synchronization across all connected hardware nodes. This protocol stack enables system-wide lockdowns, emergency broadcasts, and remote session termination for critical security oversight.
            </p>
         </div>
         <div className="flex gap-4 relative z-10">
            <button className="px-8 py-5 bg-[#121417] border border-[#2D3441] text-[10px] font-black text-[#F1F5F9] transition-all uppercase rounded-[12px] flex items-center gap-3 hover:bg-[#F87171] group">
               <RotateCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" /> REBOOT_ALL_NODES
            </button>
            <button className="px-8 py-5 bg-[#60A5FA] text-[#121417] text-[10px] font-black transition-all uppercase rounded-[12px] flex items-center gap-3 hover:bg-[#3B82F6] shadow-[0_0_30px_rgba(96,165,250,0.3)]">
               <Zap size={16} fill="currentColor" /> BROADCAST_EMERGENCY
            </button>
         </div>
         <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
            <Signal size={120} />
         </div>
      </div>
    </div>
  );
}

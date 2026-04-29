'use client';

import React from 'react';
import { VisionSentinel } from '@/components/dashboard/VisionSentinel';
import { PulseEngine } from '@/components/dashboard/PulseEngine';
import { MeshMessenger } from '@/components/dashboard/MeshMessenger';
import { 
  Cpu, 
  ShieldCheck, 
  Database, 
  Truck,
  MessageSquare,
  Clock,
  Send,
  LucideIcon
} from 'lucide-react';
import { useCommStore } from '@/lib/stores/useCommStore';
import { cn } from '@/lib/utils';
import { useBranding } from '@/providers/BrandingProvider';

/**
 * NOXIS v9.0 INDUSTRIAL COMMAND CENTER
 * High-fidelity, real-time orchestration dashboard for air-gapped industrial rigs.
 */
export default function DashboardPage() {
  useBranding();

  return (
    <div className="min-h-screen space-y-8 animate-in fade-in duration-1000 pb-20">
      {/* 🚀 Tactical Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
            Tactical Command <span className="text-blue-500">Center</span>
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" /> System Integrity: Nominal • Local Mesh: Active
          </p>
        </div>

        <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/5 backdrop-blur-xl">
           <StatusBadge icon={Cpu} label="Neural Load" value="24.2%" color="blue" />
           <div className="w-px h-8 bg-white/5" />
           <StatusBadge icon={Database} label="Sync Offset" value="0.02ms" color="emerald" />
        </div>
      </div>

      {/* 📊 The Main Command Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Vision & Telemetry (Primary Ops) */}
        <div className="xl:col-span-8 space-y-8">
           {/* Module 1: Vision Sentinel (Inference Engine) */}
           <VisionSentinel />

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Module 2: Pulse Engine (Real-time Telemetry) */}
              <PulseEngine />

              {/* Module 3: Logistics Hub (Chameleon-Aware) */}
              <div className="module-container bg-[#0B1021]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="space-y-1">
                       <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Logistics Matrix</h3>
                       <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Supply Chain & Inventory Flux</p>
                    </div>
                    <Truck size={20} className="text-violet-400" />
                 </div>

                 <div className="space-y-4">
                    <InventoryMetric label="Raw Cotton Bales" value="1,240" delta="+12" />
                    <InventoryMetric label="Finished Fabric" value="8,420m" delta="-140" danger />
                    <InventoryMetric label="Export Ready" value="42 crates" delta="0" />
                 </div>

                 <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 hover:text-white transition-all">
                    Full Inventory Audit
                 </button>
              </div>
           </div>
        </div>

        {/* Right Column: Communication & Logs (Support Ops) */}
        <div className="xl:col-span-4 space-y-8">
           {/* Module 4: Mesh Messenger (E2EE P2P) */}
           <MeshMessenger />

           {/* Module 5: Communications Log (WhatsApp Tracking) */}
           <div className="module-container bg-[#0B1021]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Communications Log</h3>
                <MessageSquare size={14} className="text-[#25D366]" />
              </div>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                <CommLogList />
              </div>
           </div>

           {/* Module 6: Node Activity Feed */}
           <div className="module-container bg-[#0B1021]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Live Mesh Activity</h3>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              </div>
              
              <div className="space-y-4">
                {[
                  { time: '12:44:02', node: 'HUB_A', event: 'REPL_SYNC_COMPLETE' },
                  { time: '12:42:12', node: 'MOBILE_02', event: 'BARCODE_SCAN_SUCCESS' },
                  { time: '12:40:01', node: 'AI_CORE', event: 'WEIGHT_MISMATCH_ALERT', danger: true },
                  { time: '12:38:55', node: 'HUB_A', event: 'DAILY_BACKUP_INIT' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start group">
                    <span className="text-[9px] font-mono text-slate-600 mt-0.5">{item.time}</span>
                    <div className="space-y-1">
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-tight",
                        item.danger ? "text-red-500" : "text-white"
                      )}>
                        {item.event}
                      </p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{item.node}</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const CommLogList = () => {
  const { logs } = useCommStore();

  if (logs.length === 0) {
    return (
      <div className="py-8 text-center space-y-2 opacity-30">
        <Clock size={24} className="mx-auto mb-2" />
        <p className="text-[10px] font-black uppercase tracking-widest">No Recent Transmissions</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-4 items-start group border-b border-white/5 pb-4 last:border-0">
          <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 flex items-center justify-center text-[#25D366] shrink-0">
            <Send size={14} />
          </div>
          <div className="space-y-1 overflow-hidden">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black text-white uppercase tracking-tight">{log.recipient}</p>
              <span className="text-[8px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 truncate group-hover:text-slate-300 transition-colors">
              {log.message}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

interface StatusBadgeProps {
  icon: LucideIcon;
  label: string;
  value: string;
  color: 'blue' | 'emerald';
}

const StatusBadge = ({ icon: Icon, label, value, color }: StatusBadgeProps) => (
  <div className="flex items-center gap-3 px-4 py-1">
    <Icon size={16} className={cn(color === 'blue' ? "text-blue-400" : "text-emerald-400")} />
    <div>
      <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter leading-none mb-1">{label}</p>
      <p className="text-xs font-black text-white leading-none tracking-widest">{value}</p>
    </div>
  </div>
);

interface InventoryMetricProps {
  label: string;
  value: string;
  delta: string;
  danger?: boolean;
}

const InventoryMetric = ({ label, value, delta, danger }: InventoryMetricProps) => (
  <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
    <div className="space-y-1">
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
      <p className="text-lg font-black text-white tracking-tight">{value}</p>
    </div>
    <div className={cn(
      "text-[10px] font-black px-2 py-1 rounded-lg border",
      danger ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
    )}>
      {delta}
    </div>
  </div>
);

'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Cpu, 
  Activity, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Battery, 
  Signal,
  Terminal,
  ShieldCheck,
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { useMeshOrchestrator } from '@/lib/hooks/useMeshOrchestrator';
import '@/app/admin.css';

export default function AdminDashboard() {
  const { telemetry, logs, approvals, isConnected, approveKhata, rejectKhata } = useMeshOrchestrator();

  return (
    <div className="admin-dashboard">
      <div className="admin-grid min-h-screen">
        
        {/* ═══ SIDEBAR ═══ */}
        <aside className="grid-col-sidebar flex flex-col gap-6">
          <div className="admin-card p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <ShieldCheck className="text-blue-500" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter uppercase italic">Gold She<br/>Mesh</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'} animate-pulse`} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{isConnected ? 'System Live' : 'Link Lost'}</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {[
              { icon: LayoutDashboard, label: 'Overview', active: true },
              { icon: Cpu, label: 'Network Hub', active: false },
              { icon: Activity, label: 'Analytics', active: false },
              { icon: Clock, label: 'Audit Logs', active: false },
            ].map((item, i) => (
              <button key={i} className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${item.active ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'text-slate-500 hover:bg-white/5'}`}>
                <div className="flex items-center gap-3">
                  <item.icon size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest">{item.label}</span>
                </div>
                {item.active && <ChevronRight size={14} />}
              </button>
            ))}
          </nav>

          <div className="admin-card p-4 bg-gradient-to-br from-blue-500/5 to-transparent">
            <p className="text-[10px] font-black text-blue-500/50 uppercase tracking-[0.2em] mb-2">Node Capacity</p>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="w-[65%] h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[9px] font-bold text-slate-600">14 Active Nodes</span>
              <span className="text-[9px] font-bold text-blue-400">65%</span>
            </div>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <main className="grid-col-main space-y-6">
          
          {/* Telemetry Grid */}
          <div className="grid grid-cols-4 gap-4">
            {Object.values(telemetry).length > 0 ? Object.values(telemetry).map((node) => (
              <div key={node.deviceId} className="admin-card p-4 group">
                <div className="bloom-accent" />
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 rounded-lg bg-white/5 group-hover:bg-blue-500/10 transition-colors">
                    <Smartphone size={20} className="text-slate-400 group-hover:text-blue-400" />
                  </div>
                  <div className={`status-pill ${node.status === 'online' ? 'status-online' : 'status-offline'}`}>
                    {node.status}
                  </div>
                </div>
                <h3 className="text-xs font-black uppercase tracking-tight text-slate-200">ID: {node.deviceId}</h3>
                <div className="flex gap-4 mt-4">
                  <div className="flex items-center gap-1.5">
                    <Battery size={14} className={node.battery < 20 ? 'text-red-500' : 'text-emerald-500'} />
                    <span className="text-[10px] font-mono">{node.battery}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Signal size={14} className="text-blue-500" />
                    <span className="text-[10px] font-mono">-{node.signal} dBm</span>
                  </div>
                </div>
              </div>
            )) : (
              [1,2,3,4].map(i => (
                <div key={i} className="admin-card p-4 opacity-50 border-dashed">
                  <div className="h-20 flex flex-col items-center justify-center gap-2">
                    <Activity size={24} className="text-slate-800 animate-pulse" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-700">Awaiting Node {i}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-2 gap-6 h-[500px]">
            
            {/* Live Event Feed (Terminal Style) */}
            <div className="admin-card flex flex-col">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Live Telemetry Stream</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-1 h-1 rounded-full bg-slate-700" />
                  <div className="w-1 h-1 rounded-full bg-slate-700" />
                  <div className="w-1 h-1 rounded-full bg-slate-700" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 terminal-feed space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className={`terminal-line ${log.type === 'KHATA_PENDING' ? 'info' : log.type === 'STOCK_DELTA' ? 'success' : ''}`}>
                    <span className="terminal-timestamp">[{new Date(log.ts).toLocaleTimeString()}]</span>
                    <span className="opacity-50">[{log.type}]</span> {log.message}
                  </div>
                ))}
                {logs.length === 0 && <div className="text-slate-700 italic">No incoming events detected...</div>}
              </div>
            </div>

            {/* Approval Queue (Maker-Checker) */}
            <div className="admin-card flex flex-col">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Approval Queue (Maker-Checker)</span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-md">{approvals.length} PENDING</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {approvals.map((item) => (
                  <div key={item.id} className="p-4 bg-white/5 border border-white/5 rounded-xl hover:border-emerald-500/30 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Worker: {item.workerName}</p>
                        <h4 className="text-sm font-black text-slate-200">Amount: {item.amount} PKR</h4>
                      </div>
                      <div className="text-[8px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded uppercase">{item.type}</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => approveKhata(item.id)}
                        className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={12} /> Approve
                      </button>
                      <button 
                        onClick={() => rejectKhata(item.id)}
                        className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
                {approvals.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                    <ShieldCheck size={48} />
                    <p className="text-[10px] font-black uppercase mt-4">All transactions verified</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}

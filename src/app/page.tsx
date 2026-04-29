import Link from 'next/link';
import NextImage from 'next/image';
import { Command, Activity, Zap } from 'lucide-react';

/**
 * SOVEREIGN ERP ENTRY PORTAL (v9.0.0)
 * The industrial gateway to the Sovereign Ecosystem.
 */

export default function Home() {
  return (
    <div className="min-h-screen bg-[#121417] flex flex-col items-center justify-center p-8 font-sans selection:bg-accent selection:text-white">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent opacity-[0.05] blur-[120px] rounded-full" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center text-center max-w-2xl">
        {/* Unit Identifier */}
        <div className="flex items-center gap-3 mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="w-12 h-12 bg-white flex items-center justify-center rounded-[2px] overflow-hidden">
            <NextImage src="/noxis.png" alt="Noxis Logo" width={48} height={48} className="object-contain" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-[0.3em] leading-none mb-1">Industrial Intelligence</p>
            <h2 className="text-xl font-mono font-black text-white uppercase tracking-tighter leading-none">NOXIS HUB</h2>
          </div>
        </div>


        {/* Hero Hook */}
        <h1 className="text-4xl md:text-6xl font-mono font-black text-white tracking-tighter mb-6 uppercase leading-tight">
          Hardened <span className="text-accent">Industrial</span> <br /> 
          Operations Hub.
        </h1>
        
        <p className="text-sm md:text-base font-mono text-zinc-400 mb-12 max-w-lg leading-relaxed uppercase tracking-wide opacity-80">
          INDUSTRIAL_CORE_v9.0.0 // High-Density Analytics // Real-Time Node Control // Security Guard Enabled.
        </p>

        {/* Tactical Actions */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link 
            href="/dashboard"
            className="group relative flex items-center justify-center gap-3 bg-accent hover:bg-accent/90 text-white font-mono font-black text-xs uppercase px-10 py-5 rounded-[2px] transition-all overflow-hidden"
          >
            <div className="absolute inset-y-0 left-0 w-0 group-hover:w-full bg-white/20 transition-all duration-300" />
            <Command size={16} />
            <span>Enter Command Center</span>
          </Link>

          <Link 
            href="/dashboard/nodes"
            className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white font-mono font-bold text-xs uppercase px-10 py-5 rounded-[2px] border border-white/5 transition-all"
          >
            <Activity size={16} className="text-accent" />
            <span>Node Status</span>
          </Link>
        </div>

        {/* System Telemetry Stub */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-3 gap-12 border-t border-white/5 pt-12">
          {[
            { label: 'Security', val: 'AES-256 GCM', icon: Zap },
            { label: 'Latency', val: '12ms', icon: Activity },
            { label: 'Engine', val: 'Next.js 16', icon: Command }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center">
              <stat.icon size={14} className="text-zinc-700 mb-3" />
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-[10px] font-mono font-black text-zinc-300 uppercase">{stat.val}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer Industrial Disclaimer */}
      <footer className="absolute bottom-8 text-[9px] font-mono text-zinc-700 uppercase tracking-[0.4em] opacity-50">
        NOXIS_CORE_SYSTEM // v9.0.0 BRIDGE PROTOCOL
      </footer>

    </div>
  );
}

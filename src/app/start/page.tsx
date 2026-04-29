'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Shield, Cpu, Database, Wifi, 
  ChevronRight, 
  Zap, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * OMNORA LAUNCHPAD (v1.0.0)
 * 
 * Cinematic entry point for the Omnora Command Center.
 * Performs real-time pre-flight diagnostics on industrial modules.
 */

interface DiagnosticModule {
  status: 'ONLINE' | 'OFFLINE' | 'HEALTHY' | 'STRESSED' | 'ERROR';
  label: string;
}

interface DiagnosticResponse {
  modules: Record<string, DiagnosticModule>;
  ready: boolean;
}

export default function LaunchpadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DiagnosticResponse | null>(null);
  const [booting, setBooting] = useState(false);

  const runDiagnostics = async () => {
    try {
      const res = await fetch('/api/system/diagnostic');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('[Launchpad] Diagnostic fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(runDiagnostics, 2000); // Cinematic delay
    return () => clearTimeout(timer);
  }, []);

  const handleEnter = () => {
    setBooting(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-[#F1F5F9] font-mono flex items-center justify-center p-6 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1C2028] via-[#0A0B0D] to-[#0A0B0D] opacity-50" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="inline-block"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(96,165,250,0.3)] mx-auto group">
              <Shield size={40} className="text-white group-hover:scale-110 transition-transform" />
            </div>
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-5xl font-black tracking-tighter uppercase mb-2"
          >
            OMNORA
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-[10px] text-[#94A3B8] tracking-[0.4em] uppercase"
          >
            Industrial Hub Ecosystem // Pillar 1 Standard
          </motion.p>
        </div>

        {/* Diagnostic Board */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          className="bg-[#1C2028]/40 backdrop-blur-xl border border-[#2D3441] rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-8 border-b border-[#2D3441] pb-6">
            <div className="flex items-center gap-3">
              <Zap size={16} className="text-[#60A5FA]" />
              <h2 className="text-xs font-black uppercase tracking-widest text-[#F1F5F9]">System Diagnostic Board</h2>
            </div>
            <div className="flex items-center gap-2">
               <div className={cn("w-1.5 h-1.5 rounded-full", loading ? "bg-amber-500 animate-pulse" : "bg-[#34D399]")} />
               <span className="text-[9px] font-black uppercase text-zinc-500">{loading ? 'Scanning...' : 'Protocol Ready'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['database', 'bridge', 'vision', 'hardware'].map((key, i) => {
              const modData = data?.modules[key];
              const isOnline = modData?.status === 'ONLINE' || modData?.status === 'HEALTHY';
              const isError = modData?.status === 'ERROR' || modData?.status === 'OFFLINE';

              return (
                <motion.div
                  key={key}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.2 + (i * 0.1) }}
                  className="bg-black/20 border border-[#2D3441] p-4 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg bg-white/5",
                      isOnline ? "text-[#34D399]" : isError ? "text-red-500" : "text-zinc-500"
                    )}>
                      {key === 'database' && <Database size={14} />}
                      {key === 'bridge' && <Wifi size={14} />}
                      {key === 'vision' && <Cpu size={14} />}
                      {key === 'hardware' && <Zap size={14} />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#F1F5F9] uppercase tracking-tighter">{modData?.label || key.toUpperCase()}</p>
                      <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">Module_ID: GS-{key.slice(0, 3).toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {loading ? (
                      <Loader2 size={12} className="animate-spin text-zinc-700" />
                    ) : (
                      <span className={cn(
                        "text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest",
                        isOnline ? "bg-[#34D399]/10 text-[#34D399]" : "bg-red-500/10 text-red-500"
                      )}>
                        {modData?.status || 'PENDING'}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-10">
            <button
              onClick={handleEnter}
              disabled={loading || !data?.ready || booting}
              className={cn(
                "w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-500 font-black uppercase tracking-[0.2em] text-xs relative overflow-hidden group",
                data?.ready && !booting 
                  ? "bg-[#60A5FA] text-[#0A0B0D] hover:shadow-[0_0_40px_rgba(96,165,250,0.4)] hover:-translate-y-0.5 active:scale-95" 
                  : "bg-[#2D3441] text-zinc-600 cursor-not-allowed opacity-50"
              )}
            >
              <AnimatePresence mode="wait">
                {booting ? (
                  <motion.div
                    key="booting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3"
                  >
                    <Loader2 size={16} className="animate-spin" /> Initializing Dashboard...
                  </motion.div>
                ) : (
                  <motion.div
                    key="ready"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3"
                  >
                    Enter Command Center <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </motion.div>

        {/* Footer Info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="mt-8 text-center"
        >
          <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-[0.4em]">
            Authorized Access Only // Secure SOV-BRIDGE Encrypted
          </p>
        </motion.div>
      </div>
    </div>
  );
}

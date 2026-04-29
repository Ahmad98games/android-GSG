'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * GLOBAL ERROR BOUNDARY (v1.0.0)
 * 
 * Catch-all for industrial module crashes.
 * Implements "Self-Healer" logic to prevent full app reboots.
 */

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorCount: number;
  recovering: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorCount: 0,
    recovering: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true, errorCount: 0, recovering: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[GlobalErrorBoundary] Industrial Fault Detected:", error, errorInfo);
    
    // Self-Healer: Attempt automatic recovery after 3 seconds
    this.attemptRecovery();
  }

  private attemptRecovery = () => {
    this.setState({ recovering: true });
    
    setTimeout(() => {
      this.setState({ 
        hasError: false, 
        recovering: false,
        errorCount: this.state.errorCount + 1 
      });
      console.info("[GlobalErrorBoundary] Recovery attempt sequence complete.");
    }, 3000);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0B0D] flex items-center justify-center p-8 font-mono">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1C2028] border border-red-500/30 rounded-3xl p-12 max-w-lg w-full text-center shadow-2xl relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute inset-0 bg-red-500/5 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                <AlertTriangle className="text-red-500" size={32} />
              </div>

              <h2 className="text-xl font-black text-[#F1F5F9] uppercase tracking-tighter mb-4">
                Module Critical Fault
              </h2>
              
              <div className="space-y-4 mb-10">
                <p className="text-xs text-[#94A3B8] uppercase leading-relaxed font-bold">
                  An internal component has experienced an industrial collision. 
                  Sovereign integrity is maintained.
                </p>
                
                <div className="flex items-center justify-center gap-3 bg-black/40 py-4 rounded-xl border border-white/5">
                  <Loader2 size={16} className="animate-spin text-[#60A5FA]" />
                  <span className="text-[10px] font-black text-[#60A5FA] uppercase tracking-widest">
                    Module Restarting (Self-Healer v1.0)...
                  </span>
                </div>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-[#94A3B8] hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-3"
              >
                <RotateCcw size={14} /> Forced System Reboot
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

'use client';

import React from 'react';
import {
  Bell,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  X,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMeshStream, type StockDeltaEvent } from '@/lib/hooks/useMeshStream';

/**
 * OPERATIONAL ALARMS PANEL (v9.5.1)
 *
 * Dual-source alarm panel:
 *   1. Database alarms (from Supabase audit_alerts — passed in as props)
 *   2. Real-time stock delta events (from SSE via useMeshStream)
 *
 * Stock delta events are displayed as styled notifications.
 * Only the latest 5 delta alarms are kept to prevent UI clutter.
 */

// ─── Types ────────────────────────────────────────────────────

interface DbAlarm {
  id: string;
  type: string;
  message: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  created_at: string;
}

interface OperationalAlarmsProps {
  /** Database-sourced alarms (from parent) */
  dbAlarms: DbAlarm[];
  /** Loading state from parent */
  loading: boolean;
  /** Callback to dismiss a single DB alarm */
  onDismiss: (id: string) => void;
  /** Callback to purge all DB alarms */
  onPurgeAll: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatDeltaMessage(delta: StockDeltaEvent): string {
  if (delta.status === 'APPLIED') {
    const verb = delta.action === 'ADD' ? 'Added' : 'Removed';
    return `${verb} ${delta.amount} units → Stock: ${delta.previousValue} → ${delta.newValue}`;
  }
  if (delta.status === 'DUPLICATE') {
    return 'Duplicate delta rejected (idempotent)';
  }
  return `Delta rejected: ${delta.status}`;
}

function getDeltaSeverityColor(delta: StockDeltaEvent): string {
  if (delta.status === 'REJECTED') return 'bg-[#F87171]';
  if (delta.status === 'DUPLICATE') return 'bg-[#FBBF24]';
  if (delta.action === 'SUBTRACT') return 'bg-[#FBBF24]';
  return 'bg-[#34D399]';
}

// ─── Component ────────────────────────────────────────────────

const MAX_DELTA_ALARMS = 5;

export default function OperationalAlarms({
  dbAlarms,
  loading,
  onDismiss,
  onPurgeAll,
}: OperationalAlarmsProps) {
  const { stockDeltas, isConnected } = useMeshStream();

  // Take only the latest 5 delta events for the alarm list
  const recentDeltas = stockDeltas.slice(0, MAX_DELTA_ALARMS);

  const totalAlarms = dbAlarms.length + recentDeltas.length;

  return (
    <div className="bg-[#1C2028] border border-[#2D3441] p-6 rounded-[12px] flex flex-col h-full max-h-[850px] shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#2D3441]">
        <h3 className="text-[10px] font-black text-[#60A5FA] uppercase tracking-widest flex items-center gap-2">
          <Bell size={14} />
          Operational Alarms
          {totalAlarms > 0 && (
            <span className="ml-1 bg-[#F87171] text-[#121417] text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
              {totalAlarms}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isConnected ? 'bg-[#34D399] animate-pulse' : 'bg-[#2D3441]'
              )}
            />
            <span className="text-[7px] font-black text-[#2D3441] uppercase">
              {isConnected ? 'SSE_LIVE' : 'SSE_OFF'}
            </span>
          </div>
          {dbAlarms.length > 0 && (
            <button
              onClick={onPurgeAll}
              className="text-[9px] text-[#94A3B8] hover:text-white transition-colors uppercase font-black bg-white/5 px-2 py-1 rounded-[4px]"
            >
              Purge_All
            </button>
          )}
        </div>
      </div>

      {/* Alarm List */}
      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
        {loading ? (
          Array(4)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="h-20 bg-[#121417] rounded-[8px] animate-pulse border border-[#2D3441]"
              />
            ))
        ) : totalAlarms === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#2D3441]">
            <ShieldCheck size={32} className="opacity-20 mb-4" />
            <p className="text-[10px] uppercase tracking-[0.2em] font-black italic">
              Systems Nominal
            </p>
          </div>
        ) : (
          <>
            {/* ── Real-time Stock Delta Alarms ──────────────────── */}
            {recentDeltas.map((delta) => (
              <div
                key={delta.id}
                className="group bg-[#121417]/60 border border-[#60A5FA]/10 p-4 rounded-[8px] relative animate-in slide-in-from-top-2 duration-300 hover:border-[#60A5FA]/30 transition-all"
              >
                {/* Live badge */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-[#60A5FA] animate-pulse" />
                  <span className="text-[6px] font-black text-[#60A5FA] uppercase">Live</span>
                </div>

                <div className="flex gap-4">
                  {/* Severity stripe */}
                  <div
                    className={cn(
                      'w-1 h-12 rounded-full mt-0.5 shrink-0',
                      getDeltaSeverityColor(delta)
                    )}
                  />

                  <div className="flex-1">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-1">
                      {delta.action === 'ADD' ? (
                        <ArrowUpRight size={10} className="text-[#34D399]" />
                      ) : (
                        <ArrowDownRight size={10} className="text-[#FBBF24]" />
                      )}
                      <p className="text-[10px] font-black text-[#F1F5F9] uppercase leading-tight">
                        Stock_Delta
                      </p>
                      <span
                        className={cn(
                          'text-[7px] font-black uppercase px-1.5 py-0.5 rounded-[3px]',
                          delta.action === 'ADD'
                            ? 'bg-[#34D399]/10 text-[#34D399]'
                            : 'bg-[#FBBF24]/10 text-[#FBBF24]'
                        )}
                      >
                        {delta.action}
                      </span>
                    </div>

                    {/* Message */}
                    <p className="text-[10px] text-[#94A3B8] leading-relaxed uppercase">
                      {formatDeltaMessage(delta)}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-[8px] text-[#2D3441] font-black uppercase flex items-center gap-1">
                        <Package size={8} />
                        {delta.fromName || delta.from?.slice(0, 8)}
                      </p>
                      <p className="text-[8px] text-[#2D3441] font-black uppercase">
                        {new Date(delta.ts).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* ── Database Alarms ────────────────────────────────── */}
            {dbAlarms.map((a) => (
              <div
                key={a.id}
                className="group bg-[#121417]/40 border border-[#2D3441] p-4 rounded-[8px] relative hover:border-[#F1F5F9]/10 transition-all animate-in slide-in-from-right-4 duration-300"
              >
                <button
                  onClick={() => onDismiss(a.id)}
                  className="absolute top-2 right-2 text-[#2D3441] hover:text-[#F1F5F9] opacity-0 group-hover:opacity-100 transition-all text-sm h-6 w-6 flex items-center justify-center"
                >
                  <X size={12} />
                </button>

                <div className="flex gap-4">
                  <div
                    className={cn(
                      'w-1 h-10 rounded-full mt-1 shrink-0',
                      a.severity === 'CRITICAL'
                        ? 'bg-[#F87171]'
                        : a.severity === 'WARNING'
                          ? 'bg-[#FBBF24]'
                          : 'bg-[#60A5FA]'
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {a.severity === 'CRITICAL' && (
                        <AlertTriangle size={10} className="text-[#F87171]" />
                      )}
                      <p className="text-[10px] font-black text-[#F1F5F9] uppercase leading-tight">
                        {a.type}
                      </p>
                    </div>
                    <p className="text-[10px] text-[#94A3B8] leading-relaxed uppercase">
                      {a.message}
                    </p>
                    <p className="text-[8px] text-[#2D3441] mt-2 font-black uppercase">
                      {new Date(a.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

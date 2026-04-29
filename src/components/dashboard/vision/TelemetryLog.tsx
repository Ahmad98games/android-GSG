'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { TelemetryState } from '@/hooks/useAITelemetry';

interface TelemetryLogProps {
  data: TelemetryState;
}

/**
 * TelemetryLog — Raw Tactical Stream
 * 
 * Prints incoming JSON packets in a scrolling terminal.
 */
export function TelemetryLog({ data }: TelemetryLogProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Buffer new data into the log list
  useEffect(() => {
    if (data.lastUpdate === 0) return;

    const newLog = JSON.stringify({
      ts: new Date(data.lastUpdate).toLocaleTimeString(),
      ai_nodes: Object.keys(data.ai).length,
      sensor_nodes: Object.keys(data.sensor).length,
      latency: Date.now() - data.lastUpdate
    }, null, 2);

    setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50 entries
  }, [data.lastUpdate, data.ai, data.sensor]);

  return (
    <div className="h-full w-full bg-black p-4 font-mono text-[10px] leading-relaxed text-[#34D399]/80 overflow-y-auto scrollbar-hide">
      <div className="space-y-4">
        {logs.length === 0 ? (
          <div className="animate-pulse text-[#4B5563] uppercase tracking-widest">
            _WAITING_FOR_UPLINK...
          </div>
        ) : logs.map((log, i) => (
          <div key={i} className="border-l-2 border-[#34D399]/20 pl-3 py-1 bg-[#34D399]/5 animate-in fade-in slide-in-from-left-2 duration-300">
             <pre className="whitespace-pre-wrap break-all uppercase">
               {log}
             </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

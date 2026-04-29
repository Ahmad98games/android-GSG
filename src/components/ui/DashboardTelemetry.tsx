'use client';

import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, 
  XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { Cpu, Zap } from 'lucide-react';
import { useMeshStream } from '@/lib/hooks/useMeshStream';

/**
 * DASHBOARD TELEMETRY (v1.0.0)
 * 
 * Real-time graphical visualization of AI Inference Speed 
 * and Node System Load (Battery/Signal).
 */

export default function DashboardTelemetry() {
  const { aiTelemetry, systemTelemetry } = useMeshStream();

  // Format AI Telemetry for Recharts
  const aiData = useMemo(() => {
    return [...aiTelemetry].reverse().map(t => ({
      time: new Date(t.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      fps: t.fps,
      latency: Math.round(1000 / t.fps)
    }));
  }, [aiTelemetry]);

  // Format System Load (using battery/signal as proxy for "load" for now)
  const systemData = useMemo(() => {
    return [...systemTelemetry].reverse().map(t => ({
      time: new Date(t.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      battery: t.battery,
      signal: Math.abs(t.signal) // dBm usually negative, use absolute for graph
    }));
  }, [systemTelemetry]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* AI Inference Speed Graph */}
      <div className="bg-[#1C2028] border border-[#2D3441] p-6 rounded-[12px] shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#60A5FA]/10 rounded-lg text-[#60A5FA]">
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-[#F1F5F9] uppercase tracking-widest">Inference Velocity</h3>
              <p className="text-[8px] text-[#94A3B8] uppercase font-bold">Real-time FPS / Latency (ms)</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-[#60A5FA]">{aiTelemetry[0]?.fps || 0} <span className="text-[10px]">FPS</span></p>
          </div>
        </div>

        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={aiData}>
              <defs>
                <linearGradient id="colorFps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D3441" vertical={false} />
              <XAxis 
                dataKey="time" 
                hide 
              />
              <YAxis 
                stroke="#2D3441" 
                fontSize={8} 
                fontFamily="JetBrains Mono"
                tickFormatter={(val) => `${val}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#121417', border: '1px solid #2D3441', fontSize: '10px', fontFamily: 'JetBrains Mono', borderRadius: '8px' }}
                itemStyle={{ color: '#60A5FA' }}
              />
              <Area 
                type="monotone" 
                dataKey="fps" 
                stroke="#60A5FA" 
                fillOpacity={1} 
                fill="url(#colorFps)" 
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Load / Signal Graph */}
      <div className="bg-[#1C2028] border border-[#2D3441] p-6 rounded-[12px] shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FBBF24]/10 rounded-lg text-[#FBBF24]">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-[#F1F5F9] uppercase tracking-widest">Mesh Network Load</h3>
              <p className="text-[8px] text-[#94A3B8] uppercase font-bold">Signal Strength (-dBm) / Efficiency</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-[#FBBF24]">{systemTelemetry[0]?.signal || 0} <span className="text-[10px]">dBm</span></p>
          </div>
        </div>

        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={systemData}>
              <defs>
                <linearGradient id="colorSignal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FBBF24" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D3441" vertical={false} />
              <XAxis 
                dataKey="time" 
                hide 
              />
              <YAxis 
                stroke="#2D3441" 
                fontSize={8} 
                fontFamily="JetBrains Mono"
                reversed
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#121417', border: '1px solid #2D3441', fontSize: '10px', fontFamily: 'JetBrains Mono', borderRadius: '8px' }}
                itemStyle={{ color: '#FBBF24' }}
              />
              <Area 
                type="monotone" 
                dataKey="signal" 
                stroke="#FBBF24" 
                fillOpacity={1} 
                fill="url(#colorSignal)" 
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

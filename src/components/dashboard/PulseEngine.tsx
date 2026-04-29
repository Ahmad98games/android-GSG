'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Zap, Activity, Thermometer, Wind, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TelemetryPoint {
  timestamp: number;
  yarn_tension: number;
  loom_speed: number;
  power_draw: number;
  vibration_index: number;
  thermal_load: number;
}

const MAX_POINTS = 50;

/**
 * NOXIS PULSE_ENGINE: Industrial Telemetry Center
 * Real-time high-frequency visualization with glow shaders and threshold detection.
 */
export const PulseEngine: React.FC = () => {
  const [data, setData] = useState<TelemetryPoint[]>([]);
  const [isAlert, setIsAlert] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../../workers/telemetry.worker.ts', import.meta.url));
    
    workerRef.current.onmessage = (e) => {
      const payload = e.data;
      const point: any = { timestamp: payload[0].timestamp };
      payload.forEach((p: any) => {
        point[p.metric] = p.value;
      });

      setData(prev => {
        const next = [...prev, point];
        if (next.length > MAX_POINTS) return next.slice(1);
        return next;
      });

      // Threshold Logic: Loom Speed Drop
      if (point.loom_speed < 835) setIsAlert(true);
      else setIsAlert(false);
    };

    workerRef.current.postMessage('START');

    return () => {
      workerRef.current?.postMessage('STOP');
      workerRef.current?.terminate();
    };
  }, []);

  const currentMetrics = useMemo(() => data[data.length - 1] || {}, [data]);

  return (
    <div className="module-container bg-[#0B1021]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 space-y-8 overflow-hidden relative">
      {/* Alert Glow Overlay */}
      {isAlert && (
        <div className="absolute inset-0 bg-red-600/5 animate-pulse pointer-events-none" />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className={cn(
               "w-3 h-3 rounded-full animate-ping",
               isAlert ? "bg-red-500" : "bg-emerald-500"
             )} />
             <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">System Pulse Engine</h3>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Real-time Telemetry • 100Hz Frequency</p>
        </div>

        <div className="flex gap-4">
           <MetricMiniCard 
             icon={Activity} 
             label="Tension" 
             value={currentMetrics.yarn_tension?.toFixed(1) || '0'} 
             unit="cN"
             alert={currentMetrics.yarn_tension > 48}
           />
           <MetricMiniCard 
             icon={Zap} 
             label="Power" 
             value={currentMetrics.power_draw?.toFixed(2) || '0'} 
             unit="kW"
           />
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="h-[300px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="glowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isAlert ? "#ef4444" : "#06b6d4"} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={isAlert ? "#ef4444" : "#06b6d4"} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
            <XAxis hide dataKey="timestamp" />
            <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="loom_speed" 
              stroke={isAlert ? "#ef4444" : "#06b6d4"} 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#glowGradient)"
              animationDuration={0}
            />
          </AreaChart>
        </ResponsiveContainer>

        {isAlert && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full animate-bounce">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-[9px] font-black text-red-400 uppercase tracking-tighter text-shadow-glow-red">RPM_DROP_DETECTED</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
         <MetricDetail label="Thermal" value={`${currentMetrics.thermal_load?.toFixed(1) || 0}°C`} />
         <MetricDetail label="Vibration" value={currentMetrics.vibration_index?.toFixed(3) || 0} />
         <MetricDetail label="Efficiency" value="98.4%" />
         <MetricDetail label="Uptime" value="142h" />
      </div>
    </div>
  );
};

const MetricMiniCard = ({ icon: Icon, label, value, unit, alert }: any) => (
  <div className={cn(
    "flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border transition-colors",
    alert ? "border-red-500/50 bg-red-500/5" : "border-white/10"
  )}>
    <Icon size={16} className={alert ? "text-red-400" : "text-blue-400"} />
    <div>
      <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter leading-none mb-1">{label}</p>
      <p className="text-xs font-black text-white leading-none tracking-tight">
        {value}<span className="text-[10px] text-slate-500 ml-1">{unit}</span>
      </p>
    </div>
  </div>
);

const MetricDetail = ({ label, value }: any) => (
  <div className="space-y-1">
    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">{label}</p>
    <p className="text-sm font-black text-white tracking-widest">{value}</p>
  </div>
);

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0B1021]/90 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl">
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Real-time Snapshot</p>
        <div className="space-y-1">
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex items-center justify-between gap-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase">{p.dataKey.replace('_', ' ')}</span>
              <span className="text-xs font-black text-white">{p.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ShieldAlert, Target, Eye, Maximize2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Detection {
  id: string;
  label: 'PERSON' | 'INTRUDER' | 'MACHINE_ERR' | 'FORKLIFT';
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, w, h]
  timestamp: number;
}

/**
 * NOXIS VISION_SENTINEL: Simulated YOLOv8 Inference Center
 * Canvas-based CCTV grid with dynamic SVG bounding boxes and real-time metadata.
 */
export const VisionSentinel: React.FC = () => {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [activeCamera, setActiveCamera] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Simulate CCTV Noise Effect
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      ctx.fillStyle = '#030303';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw scanlines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.height; i += 4) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw random noise
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (Math.random() > 0.99) {
          const v = Math.random() * 20;
          data[i] = v;
          data[i+1] = v;
          data[i+2] = v;
          data[i+3] = 10;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    // Simulate AI Inference logic
    const interval = setInterval(() => {
      const labels: any[] = ['PERSON', 'INTRUDER', 'FORKLIFT'];
      const newDetections: Detection[] = Array.from({ length: Math.floor(Math.random() * 3) }).map((_, i) => ({
        id: Math.random().toString(36).substr(2, 9),
        label: labels[Math.floor(Math.random() * labels.length)],
        confidence: 0.85 + Math.random() * 0.14,
        bbox: [
          10 + Math.random() * 60,
          10 + Math.random() * 60,
          20 + Math.random() * 20,
          30 + Math.random() * 30
        ],
        timestamp: Date.now()
      }));
      setDetections(newDetections);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="module-container bg-[#0B1021]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 flex flex-col gap-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 rounded-2xl text-red-400">
            <Eye size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Vision Sentinel Core</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Neural Inference Grid • YOLOv8 Engine</p>
          </div>
        </div>

        <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
           {[1, 2, 3, 4].map(num => (
             <button 
               key={num}
               onClick={() => setActiveCamera(num)}
               className={cn(
                 "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                 activeCamera === num ? "bg-white text-black shadow-lg" : "text-slate-500 hover:text-white"
               )}
             >
               CAM_{num.toString().padStart(2, '0')}
             </button>
           ))}
        </div>
      </div>

      {/* CCTV Viewport */}
      <div className="relative aspect-video bg-black rounded-[1.5rem] overflow-hidden border border-white/10 group shadow-2xl">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={450} 
          className="w-full h-full object-cover opacity-50"
        />
        
        {/* Inference Overlays (SVG) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <AnimatePresence>
            {detections.map((det) => (
              <motion.g
                key={det.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Bounding Box */}
                <rect 
                  x={`${det.bbox[0]}%`} 
                  y={`${det.bbox[1]}%`} 
                  width={`${det.bbox[2]}%`} 
                  height={`${det.bbox[3]}%`}
                  fill="none"
                  stroke={det.label === 'INTRUDER' ? '#ef4444' : '#60A5FA'}
                  strokeWidth="2"
                  className={cn(det.label === 'INTRUDER' && "animate-pulse")}
                />
                
                {/* Metadata Tag */}
                <foreignObject 
                  x={`${det.bbox[0]}%`} 
                  y={`${det.bbox[1] - 8}%`} 
                  width="150" 
                  height="30"
                >
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter inline-flex items-center gap-1.5 whitespace-nowrap backdrop-blur-md border",
                    det.label === 'INTRUDER' ? "bg-red-500/80 border-red-400 text-white" : "bg-blue-600/80 border-blue-400 text-white"
                  )}>
                    <Target size={10} />
                    {det.label} [{(det.confidence * 100).toFixed(1)}%]
                  </div>
                </foreignObject>
              </motion.g>
            ))}
          </AnimatePresence>
        </svg>

        {/* UI HUD Overlays */}
        <div className="absolute top-6 left-6 flex flex-col gap-4">
           <div className="px-3 py-1.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-lg flex items-center gap-2">
             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
             <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Cam_{activeCamera.toString().padStart(2, '0')}</span>
           </div>
           <div className="px-3 py-1.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-lg flex items-center gap-2">
             <Activity size={12} className="text-emerald-400" />
             <span className="text-[10px] font-black text-white uppercase tracking-widest">34.2 FPS • 4.2ms LATENCY</span>
           </div>
        </div>

        <button className="absolute bottom-6 right-6 p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100">
           <Maximize2 size={18} />
        </button>

        {/* Crosshair Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
           <div className="w-12 h-[1px] bg-white" />
           <div className="h-12 w-[1px] bg-white absolute" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
         <DetectionLog label="Threat Level" value={detections.some(d => d.label === 'INTRUDER') ? 'CRITICAL' : 'MINIMAL'} danger={detections.some(d => d.label === 'INTRUDER')} />
         <DetectionLog label="Active Tracks" value={detections.length} />
         <DetectionLog label="AI Engine" value="YOLOv8x" />
      </div>
    </div>
  );
};

const DetectionLog = ({ label, value, danger }: any) => (
  <div className="space-y-1.5 p-4 bg-white/5 rounded-2xl border border-white/5">
    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
    <p className={cn(
      "text-sm font-black tracking-widest",
      danger ? "text-red-500 animate-pulse" : "text-white"
    )}>{value}</p>
  </div>
);

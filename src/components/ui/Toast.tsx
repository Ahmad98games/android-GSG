'use client';

import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast, Toast as ToastType } from '@/lib/hooks/useToast';

const TOAST_VARIANTS = {
  SUCCESS: { 
    icon: CheckCircle2, 
    color: 'text-[#34D399]', 
    bg: 'bg-[#34D3991A]', 
    border: 'border-[#34D39933]' 
  },
  ERROR: { 
    icon: AlertCircle, 
    color: 'text-[#F87171]', 
    bg: 'bg-[#F871711A]', 
    border: 'border-[#F8717133]' 
  },
  WARNING: { 
    icon: AlertTriangle, 
    color: 'text-[#FBBC05]', 
    bg: 'bg-[#FBBC051A]', 
    border: 'border-[#FBBC0533]' 
  },
  INFO: { 
    icon: Info, 
    color: 'text-[#60A5FA]', 
    bg: 'bg-[#60A5FA1A]', 
    border: 'border-[#60A5FA33]' 
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastType; onClose: () => void }) {
  const variant = TOAST_VARIANTS[toast.type];
  const Icon = variant.icon;

  return (
    <div 
      className={cn(
        "pointer-events-auto flex gap-4 p-4 rounded-[2px] border bg-[#1C2028] shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in slide-in-from-right-full transition-all duration-300",
        variant.border
      )}
    >
      <div className={cn("mt-0.5", variant.color)}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[11px] font-black uppercase tracking-wider text-white mb-1">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-[10px] font-medium text-zinc-400 leading-relaxed">
            {toast.message}
          </p>
        )}
      </div>
      <button 
        onClick={onClose}
        className="shrink-0 text-zinc-600 hover:text-white transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

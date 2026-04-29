'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Smartphone, CheckCircle2 } from 'lucide-react';
import { waService } from '@/services/WhatsAppService';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const WhatsAppStatusWidget = () => {
  const [isLinked, setIsLinked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [number, setNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const checkStatus = async () => {
    const linked = await waService.isLinked();
    setIsLinked(linked);
    if (linked && typeof window !== 'undefined' && window.noxis) {
      const savedNumber = await window.noxis.store.get('whatsappBusinessNumber');
      setNumber(savedNumber || '');
    }
  };

  useEffect(() => {
    let active = true;
    const init = async () => {
      const linked = await waService.isLinked();
      if (!active) return;
      setIsLinked(linked);
      if (linked && typeof window !== 'undefined' && window.noxis) {
        const savedNumber = await window.noxis.store.get('whatsappBusinessNumber');
        if (!active) return;
        setNumber(savedNumber || '');
      }
    };
    init();
    return () => { active = false; };
  }, []);

  const handleSave = async () => {
    const cleaned = waService.validatePhone(number);
    if (!cleaned) return;

    setSaving(true);
    if (typeof window !== 'undefined' && window.noxis) {
      await window.noxis.store.set('whatsappBusinessNumber', cleaned);
      await checkStatus();
      setSaving(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <div 
        onClick={() => setShowModal(true)}
        className={cn(
          "fixed bottom-6 left-6 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all z-[100] group",
          isLinked 
            ? "bg-[#25D366] shadow-[0_0_20px_rgba(37,211,102,0.4)]" 
            : "bg-zinc-800 border border-zinc-700"
        )}
        title={isLinked ? "Business number linked" : "Tap to link your WhatsApp number"}
      >
        <MessageSquare className={cn("w-6 h-6", isLinked ? "text-white" : "text-zinc-500")} />
        {isLinked && (
          <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#1E2126] border border-[#334155] rounded-[2.5rem] p-10 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-8">
                <div className="w-16 h-16 bg-[#25D36611] rounded-2xl flex items-center justify-center mb-6">
                  <MessageSquare className="w-8 h-8 text-[#25D366]" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-widest text-white mb-2">LINK WHATSAPP</h3>
                <p className="text-xs text-zinc-400">Receive critical AI alerts and share invoices instantly via WhatsApp Web/Desktop.</p>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="923001234567"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full bg-[#121417] border border-[#334155] rounded-2xl pl-12 pr-4 py-4 text-sm font-mono focus:outline-none focus:border-[#25D366] transition-all"
                  />
                  {waService.validatePhone(number) && (
                    <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#25D366]" />
                  )}
                </div>

                <button 
                  onClick={handleSave}
                  disabled={!waService.validatePhone(number) || saving}
                  className={cn(
                    "w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                    waService.validatePhone(number)
                      ? "bg-[#25D366] text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#25D36633]"
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  )}
                >
                  {saving ? 'SAVING...' : 'VERIFY & SAVE'}
                </button>

                <p className="text-[10px] text-zinc-500 text-center uppercase tracking-widest">
                  International format only (no + or spaces)
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Bell, CreditCard, Eye, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const WhatsAppSettingsPanel = () => {
  const [number, setNumber] = useState('');
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [khataEnabled, setKhataEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (typeof window !== 'undefined' && window.noxis) {
        const n = await window.noxis.store.get('whatsappBusinessNumber');
        const a = await window.noxis.store.get('whatsappAlertsEnabled');
        const k = await window.noxis.store.get('khataWhatsappEnabled');
        setNumber((n as string) || '');
        setAlertsEnabled(!!a);
        setKhataEnabled(!!k);
      }
      setLoading(false);
    }
    load();
  }, []);

  const updateSetting = async (key: string, value: unknown) => {
    if (typeof window !== 'undefined' && window.noxis) {
      await window.noxis.store.set(key, value);
    }
  };

  if (loading) return <div className="h-40 flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-[#60A5FA]" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#60A5FA] mb-6 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> WhatsApp Communication
        </h3>
        
        <div className="grid gap-6">
          {/* Number Setting */}
          <div className="bg-[#1E2126] border border-[#334155] rounded-3xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-[#C5A059] uppercase tracking-widest mb-1">WhatsApp Business Number</p>
                <p className="text-xs text-zinc-400">The primary number for sending/receiving industrial alerts.</p>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="923001234567"
                  className="bg-[#121417] border border-[#334155] rounded-xl px-4 py-2 text-xs font-mono focus:outline-none focus:border-[#60A5FA] w-48"
                />
                <button 
                  onClick={() => updateSetting('whatsappBusinessNumber', number)}
                  className="bg-[#60A5FA] text-[#121417] px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:scale-105 transition-all"
                >
                  UPDATE
                </button>
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#1E2126] border border-[#334155] rounded-3xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#60A5FA11] flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-[#60A5FA]" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-wider mb-1">Critical AI Alerts</p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">Idle machine or unusual activity alerts go directly to your WhatsApp.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setAlertsEnabled(!alertsEnabled);
                    updateSetting('whatsappAlertsEnabled', !alertsEnabled);
                  }}
                  className={cn(
                    "w-10 h-6 rounded-full p-1 transition-all",
                    alertsEnabled ? "bg-[#60A5FA]" : "bg-zinc-700"
                  )}
                >
                  <div className={cn("w-4 h-4 rounded-full bg-white transition-all", alertsEnabled ? "translate-x-4" : "translate-x-0")} />
                </button>
              </div>
            </div>

            <div className="bg-[#1E2126] border border-[#334155] rounded-3xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#22C55E11] flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-[#22C55E]" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-wider mb-1">Khata Auto-Notifications</p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">Automatically send confirmation to clients for every ledger entry.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setKhataEnabled(!khataEnabled);
                    updateSetting('khataWhatsappEnabled', !khataEnabled);
                  }}
                  className={cn(
                    "w-10 h-6 rounded-full p-1 transition-all",
                    khataEnabled ? "bg-[#22C55E]" : "bg-zinc-700"
                  )}
                >
                  <div className={cn("w-4 h-4 rounded-full bg-white transition-all", khataEnabled ? "translate-x-4" : "translate-x-0")} />
                </button>
              </div>
            </div>
          </div>

          {/* Template Preview */}
          <div className="bg-[#1E2126] border border-[#334155] rounded-3xl p-8">
            <h4 className="text-[10px] font-black text-[#C5A059] uppercase tracking-widest mb-6 flex items-center gap-2">
              <Eye className="w-4 h-4" /> Message Template Preview
            </h4>
            <div className="bg-[#121417] rounded-2xl p-6 border border-[#334155] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2">
                <div className="w-2 h-2 rounded-full bg-[#25D366] shadow-[0_0_8px_#25D366]" />
              </div>
              <pre className="text-[10px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed">
{`Omnora Noxis Alert 🔔
Rs. 15,000 credited to your account.
Party: Mian Textile Mill
Current Balance: Rs. 240,000
Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
System: Stable ✅`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

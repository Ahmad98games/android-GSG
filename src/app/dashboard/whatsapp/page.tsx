'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  MessageCircle, Search, 
  Truck, ExternalLink, Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * INDUSTRIAL WHATSAPP DISPATCH HUB (v8.6.1)
 * Centralized logistics communication orchestration.
 */

interface DispatchOrder {
  id: string;
  code: string;
  status: string;
  total: number;
  created_at: string;
  party: { name: string; phone: string } | null;
}

export default function WhatsAppDispatchHub() {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const initialized = useRef(false);

  const fetchDispatchOrders = useCallback(async (isInitial: boolean = false) => {
    if (!isInitial) setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        party:parties(name, phone)
      `)
      .in('status', ['CONFIRMED', 'PACKED', 'DISPATCHED'])
      .order('created_at', { ascending: false });
    
    setOrders(data as unknown as DispatchOrder[] || []);
    setLoading(false);
  }, []);

   useEffect(() => {
    const init = async () => {
      if (!initialized.current) {
        initialized.current = true;
        setTimeout(() => {
          void fetchDispatchOrders(true);
        }, 0);
      }
    };
    void init();
  }, [fetchDispatchOrders]);

  useEffect(() => {
    const timer = setInterval(() => {
        void fetchDispatchOrders(true);
    }, 60000);
    return () => clearInterval(timer);
  }, [fetchDispatchOrders]);

  const sendWhatsApp = (order: DispatchOrder) => {
    if (!order.party?.phone) {
      alert('⚠️ NO_PHONE_DETECTED // ABORTING_COMMS');
      return;
    }

    const portalUrl = `${window.location.origin}/portal/${order.id}`;
    const message = `*INDUSTRIAL ERP - DISPATCH UPDATE*\n\nOrder ID: #${order.code}\nStatus: ${order.status}\nCustomer: ${order.party.name}\n\nTrack your order in real-time here:\n${portalUrl}\n\nThank you for choosing Gold She.`;
    
    const encoded = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${order.party.phone}?text=${encoded}`;
    window.open(whatsappUrl, '_blank');
  };

  const filteredOrders = orders.filter(o => 
    o.code.toLowerCase().includes(search.toLowerCase()) || 
    (o.party?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 bg-[#121417] min-h-screen text-[#F1F5F9] font-mono select-none selection:bg-[#60A5FA] selection:text-[#121417]">
      {/* Header Pipeline */}
      <div className="flex justify-between items-end border-b border-[#2D3441] pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
            <span className="text-[#60A5FA]">WhatsApp</span> <span className="text-[#F1F5F9]">Hub</span>
          </h1>
          <p className="text-[10px] text-[#94A3B8] tracking-[0.2em] mt-2 uppercase">Logistics_Comms_Sync // INDUSTRIAL_CORE_v8.6.1</p>
        </div>
        <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={14} />
           <input 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             placeholder="SEARCH_BY_ORDER_OR_PARTY" 
             className="bg-[#1C2028] border border-[#2D3441] text-[10px] pl-10 pr-4 py-3 rounded-[8px] focus:outline-none focus:border-[#60A5FA] w-80 uppercase text-[#F1F5F9]" 
           />
        </div>
      </div>

      {/* Dispatch Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         <div className="lg:col-span-3 space-y-4">
            {loading ? [...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-[#1C2028] border border-[#2D3441] animate-pulse rounded-[12px]" />
            )) : filteredOrders.length === 0 ? (
              <div className="py-32 text-center border border-dashed border-[#2D3441] text-[#94A3B8] italic uppercase rounded-[12px]">
                 <MessageCircle size={48} className="mx-auto mb-4 opacity-10" />
                 NO_ACTIVE_DISPATCH_TRAFFIC
              </div>
            ) : (
              <div className="space-y-4">
                 {filteredOrders.map(order => (
                    <div key={order.id} className="group bg-[#1C2028] border border-[#2D3441] p-6 rounded-[12px] hover:border-[#60A5FA]/30 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
                       <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-[#121417] flex items-center justify-center border border-[#2D3441] rounded-[8px] group-hover:border-[#60A5FA]/40 transition-colors">
                             <Truck size={20} className={cn("transition-colors", order.status === 'DISPATCHED' ? "text-[#60A5FA]" : "text-[#4B5563]")} />
                          </div>
                         <div>
                            <div className="flex items-center gap-3 mb-1">
                               <p className="text-sm font-black text-[#F1F5F9] uppercase tracking-tight">#{order.code}</p>
                                <span className={cn(
                                  "px-2 py-0.5 text-[7px] font-black uppercase rounded-[4px] border",
                                  order.status === 'CONFIRMED' ? "text-[#94A3B8] border-[#2D3441]" : "text-[#60A5FA] border-[#60A5FA]/20"
                                )}>
                                  {order.status}
                               </span>
                            </div>
                            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest">{order.party?.name} • {order.party?.phone || 'NO_PHONE'}</p>
                         </div>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto">
                         <button 
                           onClick={() => window.open(`/portal/${order.id}`, '_blank')}
                           className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#121417] text-[#94A3B8] text-[9px] font-black uppercase hover:bg-[#242933] transition-colors rounded-[8px] border border-[#2D3441]"
                         >
                            <ExternalLink size={12} /> Portal_View
                         </button>
                         <button 
                           onClick={() => sendWhatsApp(order)}
                           className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-2 bg-[#34D399] text-[#121417] text-[9px] font-black uppercase hover:bg-[#2EB886] transition-colors shadow-[0_0_15px_rgba(52,211,153,0.15)] rounded-[8px]"
                         >
                            <MessageCircle size={14} /> Send_WhatsApp
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
            )}
         </div>

         {/* Stats Sidebar */}
         <aside className="space-y-6">
             <div className="bg-[#1C2028] border border-[#2D3441] p-6 rounded-[12px] space-y-6 shadow-xl">
                <h3 className="text-[10px] font-black text-[#60A5FA] uppercase tracking-[0.2em] border-b border-[#2D3441] pb-4">Real-time Intel</h3>
               
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <p className="text-[9px] text-[#94A3B8] uppercase font-black">Active Dispatches</p>
                     <p className="text-xl font-black text-[#F1F5F9]">{orders.filter(o => o.status === 'DISPATCHED').length}</p>
                  </div>
                  <div className="flex justify-between items-center">
                     <p className="text-[9px] text-[#94A3B8] uppercase font-black">Ready for Comms</p>
                     <p className="text-xl font-black text-[#34D399]">{orders.length}</p>
                  </div>
               </div>

               <div className="pt-6 border-t border-[#2D3441]">
                  <div className="bg-[#121417]/40 p-4 border border-[#2D3441] rounded-[8px] space-y-3">
                     <p className="text-[8px] text-[#2D3441] uppercase italic">Latest_Log:</p>
                     <p className="text-[9px] leading-relaxed text-[#94A3B8]">
                        COMMUNICATION_LINK_ESTABLISHED // PORTAL_SYNDICATION_ACTIVE
                     </p>
                  </div>
               </div>
            </div>

             <div className="bg-[#60A5FA]/5 border border-[#60A5FA]/10 p-6 rounded-[12px] shadow-lg">
                <div className="flex items-start gap-4 mb-4">
                   <Share2 size={24} className="text-[#60A5FA] opacity-50" />
                  <p className="text-[10px] text-[#94A3B8] uppercase leading-relaxed font-bold">
                     All messages include a secure end-to-end tracking link for client transparency.
                  </p>
               </div>
                <button className="w-full py-3 bg-[#60A5FA] text-[#121417] text-[9px] font-black uppercase hover:bg-[#3B82F6] transition-all shadow-[0_0_20px_rgba(96,165,250,0.3)] rounded-[8px]">
                   Configure_Auto_Comms
                </button>
            </div>
         </aside>
      </div>
    </div>
  );
}

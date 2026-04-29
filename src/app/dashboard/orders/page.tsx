'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Receipt, Search, PlusCircle, 
  X, ShoppingBag,
  LayoutGrid, List, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IndustrialMath } from '@/lib/math';
import Decimal from 'decimal.js';

/**
 * INDUSTRIAL ORDERS & BILLING (v8.6.1)
 * High-performance transaction orchestration and automated billing.
 */

interface OrderItem {
  id: string;
  article_code: string;
  batch_code: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  batch_id: string;
}

interface Order {
  id: string;
  code: string;
  party_id: string;
  status: string;
  total: number;
  amount_paid: number;
  created_at: string;
  party: { name: string; phone: string };
  items?: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');
  const [showWizard, setShowWizard] = useState(false);
  const [search, setSearch] = useState('');
  const initialized = useRef(false);

  const fetchOrders = useCallback(async (isInitial: boolean = false) => {
    if (!isInitial) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          party:parties(name, phone)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data as Order[] || []);
    } catch (e) {
      console.error('❌ ORDERS_FETCH_FAILURE:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
        initialized.current = true;
        void fetchOrders(true);
    }
  }, [fetchOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return "text-[#94A3B8] border-[#2D3441]";
      case 'CONFIRMED': return "text-[#60A5FA] border-[#60A5FA]/20";
      case 'PACKED': return "text-[#2E90FF] border-[#2E90FF]/20";
      case 'DISPATCHED': return "text-[#C5A059] border-[#C5A059]/20";
      case 'DELIVERED': return "text-[#34D399] border-[#34D399]/20";
      default: return "text-[#94A3B8] border-[#2D3441]";
    }
  };

  const filteredOrders = orders.filter(o => 
    o.code.toLowerCase().includes(search.toLowerCase()) || 
    o.party?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#121417] font-mono selection:bg-[#60A5FA] selection:text-white">
      <div className={cn("p-8 space-y-8 flex-1 overflow-y-auto transition-all bg-[#121417]", selectedOrder ? "mr-[480px]" : "")}>
        {/* Header Pipeline */}
        <div className="flex justify-between items-end border-b border-[#2D3441] pb-8 font-mono">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">
               <span className="text-[#60A5FA]">Orders</span> <span className="text-[#60A5FA]">& Billing</span>
            </h1>
            <p className="text-[10px] text-[#94A3B8] tracking-[0.2em] mt-2 uppercase">Wholesale_Control_Sync // INDUSTRIAL_CORE_v8.6.1</p>
          </div>
          <div className="flex gap-4">
             <div className="flex bg-[#1C2028] p-1 border border-[#2D3441] rounded-[8px]">
                <button onClick={() => setViewMode('LIST')} className={cn("p-2 transition-all rounded-[6px]", viewMode === 'LIST' ? "bg-[#242933] text-[#60A5FA]" : "text-[#94A3B8]")}><List size={16} /></button>
                <button onClick={() => setViewMode('GRID')} className={cn("p-2 transition-all rounded-[6px]", viewMode === 'GRID' ? "bg-[#242933] text-[#60A5FA]" : "text-[#94A3B8]")}><LayoutGrid size={16} /></button>
             </div>
             <button 
               onClick={() => setShowWizard(true)}
               className="bg-[#60A5FA] text-[#121417] px-6 py-3 rounded-[8px] text-[10px] font-black uppercase flex flex-col items-center hover:bg-[#3B82F6] transition-all shadow-[0_0_20px_rgba(96,165,250,0.15)]"
             >
                <div className="flex items-center gap-2">
                  <PlusCircle size={14} /> NEW ORDER
                </div>
                <span className="text-[7px] opacity-70 mt-0.5 font-bold tracking-widest">(NAYA BILL)</span>
             </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-4">
           <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={14} />
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="SEARCH_BY_ORDER_OR_PARTY" 
                className="w-full bg-[#1C2028] border border-[#2D3441] text-[10px] font-mono pl-10 pr-4 py-3 rounded-[8px] focus:outline-none focus:border-[#60A5FA]/50 uppercase text-[#F1F5F9]" 
              />
           </div>
           <div className="flex gap-2">
             {['ALL', 'CONFIRMED', 'DISPATCHED', 'UNPAID'].map(f => (
               <button key={f} className="px-4 py-3 bg-[#1C2028] border border-[#2D3441] text-[8px] font-mono font-black text-[#94A3B8] hover:text-[#F1F5F9] uppercase transition-all rounded-[8px]">{f}</button>
             ))}
           </div>
        </div>

        {/* Orders Feed */}
        <div className={cn("grid gap-4", viewMode === 'GRID' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
          {loading ? [...Array(4)].map((_, i) => (
             <div key={i} className="h-24 bg-[#1C2028] border border-[#2D3441] animate-pulse rounded-[12px]" />
          )) : filteredOrders.length === 0 ? (
            <div className="py-32 text-center border border-dashed border-[#2D3441] text-[#2D3441] italic uppercase rounded-[12px]">
               <Receipt size={48} className="mx-auto mb-4 opacity-10" />
               NO_ACTIVE_ORDER_TRAFFIC
            </div>
          ) : filteredOrders.map((order) => (
            <div 
              key={order.id} 
              onClick={() => setSelectedOrder(order)}
              className={cn(
                "bg-[#1C2028] border p-6 rounded-[12px] transition-all group cursor-pointer relative overflow-hidden shadow-sm",
                selectedOrder?.id === order.id ? "border-[#60A5FA] bg-[#60A5FA]/5" : "border-[#2D3441] hover:border-[#3D4757]"
              )}
            >
               <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-black flex items-center justify-center border border-white/5 rounded-[2px]">
                        <Receipt size={18} className={cn("transition-colors", selectedOrder?.id === order.id ? "text-brand-primary" : "text-zinc-700")} />
                     </div>
                     <div>
                        <p className="text-sm font-mono font-black text-white group-hover:text-brand-primary transition-colors leading-none mb-1">#{order.code}</p>
                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{order.party?.name}</p>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-8 font-mono text-right">
                     <div>
                        <p className="text-[8px] text-zinc-700 uppercase font-bold mb-1">Total</p>
                        <p className="text-[10px] font-bold text-brand-primary">{IndustrialMath.formatPKR(order.total)}</p>
                     </div>
                     <div className="flex flex-col items-end gap-1">
                        <div className={cn("px-3 py-1 border text-[9px] font-black uppercase rounded-full flex items-center gap-2", getStatusColor(order.status))}>
                           <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
                              order.status === 'DRAFT' ? 'bg-[#94A3B8]' :
                              order.status === 'CONFIRMED' ? 'bg-[#60A5FA]' :
                              order.status === 'PACKED' ? 'bg-[#2E90FF]' :
                              order.status === 'DISPATCHED' ? 'bg-[#C5A059]' :
                              order.status === 'DELIVERED' ? 'bg-[#34D399]' : 'bg-[#94A3B8]'
                           )} />
                           {order.status}
                        </div>
                        <span className="text-[7px] font-black text-zinc-600 uppercase tracking-tighter mr-2">
                           {order.status === 'DRAFT' ? 'Kacha Bill' :
                            order.status === 'CONFIRMED' ? 'Pakka Bill' :
                            order.status === 'PACKED' ? 'Maal Pack' :
                            order.status === 'DISPATCHED' ? 'Raste Mein' :
                            order.status === 'DELIVERED' ? 'Mil Gaya' : ''}
                        </span>
                     </div>
                  </div>
               </div>
               <div className="absolute right-0 top-0 bottom-0 w-1 bg-brand-primary/10" />
            </div>
          ))}
        </div>
      </div>

      {/* ORDER DETAIL DRAWER */}
      <aside className={cn(
        "fixed right-0 top-16 bottom-0 w-[480px] bg-[#1C2028] border-l border-[#2D3441] transition-transform duration-300 z-50 shadow-2xl",
        selectedOrder ? "translate-x-0" : "translate-x-full"
      )}>
        {selectedOrder && <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      </aside>

      {/* NEW ORDER WIZARD */}
      {showWizard && <OrderWizard onClose={() => setShowWizard(false)} onComplete={() => { setShowWizard(false); void fetchOrders(); }} />}
    </div>
  );
}

/**
 * SUB-COMPONENT: ORDER DETAIL
 */
function OrderDetail({ order, onClose }: { order: Order, onClose: () => void }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase
        .from('order_items')
        .select(`
          *,
          batch:batches(code, article:articles(name, code))
        `)
        .eq('order_id', order.id);
      
      setItems((data || []).map(i => {
          const typedBatch = i.batch as unknown as { code: string; article: { code: string; name: string } };
          return {
            ...i,
            article_code: typedBatch?.article?.code,
            batch_code: typedBatch?.code
          };
      }));
      setLoading(false);
    };
    fetchItems();
  }, [order.id]);

  return (
    <div className="h-full flex flex-col p-8 space-y-8 overflow-y-auto scrollbar-hide font-mono">
       <div className="flex justify-between items-start text-[#F1F5F9]">
         <div>
            <h2 className="text-2xl font-black text-[#60A5FA] tracking-tighter uppercase">{order.code}</h2>
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold mt-1">Industrial Invoice Ledger</p>
         </div>
         <button onClick={onClose} className="p-2 text-[#94A3B8] hover:text-white"><X size={16} /></button>
      </div>

      <div className="flex justify-between items-center bg-[#121417]/40 p-4 border border-[#2D3441] rounded-[8px]">
         {['DRAFT', 'CONFIRMED', 'DISPATCHED', 'CLOSED'].map((s, i) => (
           <React.Fragment key={s}>
             <div className="flex flex-col items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", order.status === s ? "bg-[#60A5FA] shadow-[0_0_8px_rgba(96,165,250,0.4)]" : "bg-[#2D3441]")} />
                <span className={cn("text-[7px] font-black uppercase", order.status === s ? "text-[#60A5FA]" : "text-[#2D3441]")}>{s}</span>
             </div>
             {i < 3 && <div className="h-px flex-1 bg-[#2D3441]" />}
           </React.Fragment>
         ))}
      </div>

      <div className="flex-1 space-y-6">
         <h3 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest flex items-center gap-2 border-b border-[#2D3441] pb-4">
            <ShoppingBag size={14} className="text-[#60A5FA]" /> Items Payload
         </h3>
         {loading ? <div className="h-24 bg-white/[0.02] animate-pulse" /> : (
           <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-center p-4 bg-black/40 border border-white/5 rounded-[1px]">
                   <div>
                      <p className="text-[10px] font-black text-white uppercase tracking-tight">{item.article_code}</p>
                      <p className="text-[8px] text-zinc-600 uppercase mt-1">Batch: {item.batch_code}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-bold text-zinc-300">{item.quantity} Sets</p>
                      <p className="text-[10px] font-bold text-brand-primary">Rs. {item.line_total.toLocaleString()}</p>
                   </div>
                </div>
              ))}
           </div>
         )}
      </div>

      <div className="bg-[#C5A059]/5 border border-[#C5A059]/30 p-6 rounded-[12px] flex justify-between items-center">
         <div>
            <p className="text-[8px] font-black text-[#C5A059] uppercase tracking-[0.2em] mb-1">Outstanding Balance</p>
            <p className="text-2xl font-black text-[#C5A059] tracking-tighter">Rs. {IndustrialMath.formatPKR(order.total - order.amount_paid).replace('PKR ', '')}</p>
         </div>
      </div>
    </div>
  );
}

/**
 * SUB-COMPONENT: ORDER WIZARD
 */
function OrderWizard({ onClose, onComplete }: { onClose: () => void, onComplete: () => void }) {
  const [parties, setParties] = useState<{ id: string; name: string; type: string; phone: string }[]>([]);
  const [articles, setArticles] = useState<{ id: string; code: string; name: string; price_per_set: number }[]>([]);
  const [batches, setBatches] = useState<{ id: string; code: string; suits_count: number }[]>([]);
  
  const [selectedParty, setSelectedParty] = useState<{ id: string; name: string; type: string; phone: string } | null>(null);
  const [step, setStep] = useState(1);
  const [lineItems, setLineItems] = useState<{
    article_id: string;
    article_code: string;
    batch_id: string;
    batch_code: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[]>([]);
  const [amountPaid, setAmountPaid] = useState(0);

  useEffect(() => {
    const loadCore = async () => {
      const [{ data: p }, { data: a }] = await Promise.all([
        supabase.from('parties').select('*').order('name'),
        supabase.from('articles').select('*').order('name')
      ]);
      setParties(p || []);
      setArticles(a || []);
    };
    loadCore();
  }, []);

  const addLineItem = (article: { id: string; code: string; price_per_set: number }, batch: { id: string; code: string }, qty: number) => {
    const total = new Decimal(qty).mul(article.price_per_set).toNumber();
    setLineItems([...lineItems, { 
      article_id: article.id, 
      article_code: article.code,
      batch_id: batch.id, 
      batch_code: batch.code,
      quantity: qty, 
      unit_price: article.price_per_set,
      line_total: total
    }]);
  };

  const calculateTotal = () => {
    const subtotal = lineItems.reduce((acc, curr) => acc + curr.line_total, 0);
    const totalSets = lineItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const discount = totalSets > 50 ? 0.05 : 0;
    return new Decimal(subtotal).mul(1 - discount).toDecimalPlaces(0).toNumber();
  };

  const handleSubmit = async (status: string) => {
    if (!selectedParty || lineItems.length === 0) return;
    try {
      const total = calculateTotal();
      const code = `INV-${Date.now().toString().slice(-6)}`;
      
      // 1. Insert Order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert([{
          code,
          party_id: selectedParty.id,
          status,
          total,
          amount_paid: amountPaid,
          subtotal: total // simplified
        }])
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 2. Insert Items & Move Stock
      for (const item of lineItems) {
        await supabase.from('order_items').insert([{
           order_id: order.id,
           batch_id: item.batch_id,
           quantity: item.quantity,
           unit_price: item.unit_price,
           line_total: item.line_total
        }]);

        await supabase.from('stock_movements').insert([{
           batch_id: item.batch_id,
           movement_type: 'OUT',
           quantity: item.quantity,
           reference_id: order.id,
           note: `Order ${code}`
        }]);

        // Decoupled batch update (Industrial sync)
        const { data: b } = await supabase.from('batches').select('suits_count').eq('id', item.batch_id).single();
        await supabase.from('batches').update({ suits_count: (b?.suits_count || 0) - item.quantity }).eq('id', item.batch_id);
      }

      // 3. Khata Entry
      await supabase.from('khata_entries').insert([{
         party_id: selectedParty.id,
         entry_type: 'DEBIT',
         amount: total,
         reference_id: order.id,
         note: `Order ${code} created`
      }]);

      onComplete();
    } catch (e) {
      console.error('❌ ORDER_WIZARD_FAILURE:', e);
      alert('FAILED_TO_SYNC_ORDER_PIPELINE');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
       <div className="bg-[#1C2028] border border-[#2D3441] w-full max-w-4xl h-[700px] flex rounded-[12px] overflow-hidden relative shadow-2xl">
          {/* Sidebar Protocol */}
          <aside className="w-64 bg-[#121417]/40 border-r border-[#2D3441] p-8 flex flex-col justify-between">
             <div className="space-y-8">
                <div className="flex items-center gap-3">
                   <Receipt size={24} className="text-[#60A5FA]" />
                   <h2 className="text-xs font-black text-[#F1F5F9] uppercase tracking-widest">Order Wizard</h2>
                </div>
                <div className="space-y-4">
                   {[1, 2, 3].map(n => (
                     <div key={n} className="flex items-center gap-4">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black border",
                          step === n ? "bg-[#60A5FA] text-[#121417] border-[#60A5FA]" : n < step ? "bg-[#34D399] text-[#121417] border-[#34D399]" : "border-[#2D3441] text-[#2D3441]"
                        )}>{n}</div>
                        <span className={cn("text-[9px] font-black uppercase tracking-widest", step === n ? "text-[#F1F5F9]" : "text-[#2D3441]")}>
                          {n === 1 ? 'Party Select' : n === 2 ? 'Items Payload' : 'Finalize'}
                        </span>
                     </div>
                   ))}
                </div>
             </div>
             <button onClick={onClose} className="text-[9px] font-black text-[#94A3B8] uppercase hover:text-[#F1F5F9] transition-all">Abort_Transaction</button>
          </aside>

          {/* Wizard Content Area */}
          <main className="flex-1 p-12 overflow-y-auto scrollbar-hide relative text-[#F1F5F9]">
             {step === 1 && (
               <div className="space-y-8 animate-in slide-in-from-right-4">
                  <h3 className="text-xl font-black text-[#F1F5F9] uppercase tracking-tighter">Step 01 // Select Party</h3>
                  <div className="grid grid-cols-1 gap-4">
                     {parties.map(p => (
                       <button 
                         key={p.id}
                         onClick={() => { setSelectedParty(p); setStep(2); }}
                         className={cn(
                           "flex justify-between items-center p-6 bg-[#121417]/40 border transition-all text-left rounded-[8px]",
                           selectedParty?.id === p.id ? "border-[#60A5FA]" : "border-[#2D3441] hover:border-[#3D4757]"
                         )}
                       >
                          <div>
                             <p className="text-[10px] font-black text-[#F1F5F9] uppercase">{p.name}</p>
                             <p className="text-[8px] text-[#94A3B8] uppercase mt-1">{p.type} • {p.phone}</p>
                          </div>
                          <ChevronRight size={14} className="text-[#2D3441]" />
                       </button>
                     ))}
                  </div>
               </div>
             )}

             {step === 2 && (
               <div className="space-y-8 animate-in slide-in-from-right-4 text-[#F1F5F9]">
                  <div className="flex justify-between items-center">
                     <h3 className="text-xl font-black uppercase tracking-tighter text-[#F1F5F9]">Step 02 // Items Payload</h3>
                     <button onClick={() => setStep(3)} className="bg-[#60A5FA] text-[#121417] px-6 py-2 text-[10px] font-black uppercase rounded-[8px]">Next Protocol</button>
                  </div>
                  
                  <div className="bg-[#121417]/60 border border-[#2D3441] p-6 rounded-[12px] space-y-6">
                     <div className="grid grid-cols-2 gap-6">
                        <select 
                          className="bg-[#121417] border border-[#2D3441] p-3 text-[10px] font-black text-[#F1F5F9] uppercase rounded-[8px]"
                          onChange={async (e) => {
                             const id = e.target.value;
                             const { data } = await supabase.from('batches').select('*').eq('article_id', id).gt('suits_count', 0);
                             setBatches(data || []);
                          }}
                        >
                           <option>SELECT ARTICLE</option>
                           {articles.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                        <select className="bg-[#121417] border border-[#2D3441] p-3 text-[10px] font-black text-[#F1F5F9] uppercase rounded-[8px]" id="batch_select">
                           <option>SELECT BATCH</option>
                           {batches.map(b => <option key={b.id} value={b.id}>{b.code} ({b.suits_count} sets)</option>)}
                        </select>
                     </div>
                     <div className="flex gap-4">
                        <input id="qty_input" type="number" placeholder="QTY" className="flex-1 bg-[#121417] border border-[#2D3441] p-3 text-[10px] font-black text-[#F1F5F9] rounded-[8px]" />
                        <button 
                          onClick={() => {
                             const artId = (document.querySelector('select') as HTMLSelectElement).value;
                             const batchId = (document.getElementById('batch_select') as HTMLSelectElement).value;
                             const qty = (document.getElementById('qty_input') as HTMLInputElement).value;
                             const article = articles.find(a => a.id === artId);
                             const batch = batches.find(b => b.id === batchId);
                             if (article && batch && Number(qty) > 0) addLineItem(article, batch, Number(qty));
                          }}
                          className="bg-[#242933] border border-[#2D3441] px-8 text-[10px] font-black uppercase text-[#F1F5F9] hover:bg-[#3D4757] rounded-[8px]"
                        >Add</button>
                     </div>
                  </div>

                  <div className="space-y-4">
                     {lineItems.map((item, idx) => (
                       <div key={idx} className="flex justify-between items-center p-4 bg-[#121417]/40 border border-[#2D3441] rounded-[8px]">
                          <p className="text-[10px] font-black uppercase text-[#F1F5F9]">{item.article_code} • {item.batch_code}</p>
                          <p className="text-[10px] font-black text-[#C5A059]">Rs. {item.line_total.toLocaleString()}</p>
                       </div>
                     ))}
                  </div>
               </div>
             )}

             {step === 3 && (
               <div className="space-y-12 animate-in slide-in-from-right-4 text-white">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Step 03 // Finalize Ledger</h3>
                  
                  <div className="space-y-6">
                     <div className="flex justify-between items-end border-b border-white/5 pb-4">
                        <p className="text-[10px] text-zinc-600 uppercase font-black">Gross Transaction Total</p>
                        <p className="text-4xl font-black text-brand-primary tracking-tighter">Rs. {calculateTotal().toLocaleString()}</p>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[8px] text-zinc-800 uppercase font-black tracking-widest block">Amount Paid (PKR)</label>
                        <input 
                          type="number"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(Number(e.target.value))}
                          className="w-full bg-black/40 border border-white/5 p-4 text-xl font-black text-[#34D399] focus:border-brand-primary outline-none" 
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-12">
                     <button onClick={() => handleSubmit('DRAFT')} className="py-4 border border-white/5 text-[10px] font-black uppercase hover:bg-white/5">Save as Draft</button>
                     <button 
                       onClick={() => handleSubmit('CONFIRMED')}
                       className="py-4 bg-brand-primary text-white text-[10px] font-black uppercase hover:bg-brand-primary/80 transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(230,46,107,0.3)]"
                     >Confirm_Order_Sync</button>
                  </div>
               </div>
             )}
          </main>
       </div>
    </div>
  );
}


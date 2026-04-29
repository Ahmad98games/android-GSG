'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, 
  MapPin, Box,
  TrendingUp, AlertCircle, X,
  History, Printer, Move,
  Activity, PlusCircle, CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Decimal from 'decimal.js';

/**
 * INDUSTRIAL BATCH VAULT (v8.6.1)
 * High-density inventory management with visual stock mapping and live valuation.
 */

interface Batch {
  id: string;
  code: string;
  article_id: string;
  suits_count: number;
  unit_cost: number;
  overhead_pct: number;
  location: string;
  status: 'STORAGE' | 'TRANSIT' | 'DAMAGED' | 'RESERVED';
  article: { name: string; code: string; price_per_set: number };
  created_at: string;
}

export default function VaultPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const initialized = useRef(false);

  const fetchBatches = useCallback(async (isInitial: boolean = false) => {
    if (!isInitial) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          article:articles(name, code, price_per_set)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBatches(data as unknown as Batch[] || []);
    } catch (e) {
      console.error('❌ BATCHES_FETCH_FAILURE:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
       initialized.current = true;
       void fetchBatches(true);
    }
  }, [fetchBatches]);

  const calculateTotalValuation = () => {
    try {
      let total = new Decimal(0);
      batches.forEach(b => {
        const base = new Decimal(b.suits_count || 0).mul(b.unit_cost || 0);
        const overhead = base.mul(new Decimal(b.overhead_pct || 0).div(100));
        total = total.plus(base).plus(overhead);
      });
      return total.toFixed(2);
    } catch { return '0.00'; }
  };

  const getStockColor = (count: number) => {
    if (count < 10) return "bg-[#F87171]";
    if (count < 30) return "bg-[#FBBF24]";
    return "bg-[#34D399]";
  };

  const filteredBatches = batches.filter(b => 
    b.code.toLowerCase().includes(search.toLowerCase()) || 
    b.article?.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#121417] font-mono selection:bg-[#60A5FA] selection:text-black">
      {/* Module Content */}
      <div className={cn("p-8 space-y-8 flex-1 overflow-y-auto transition-all", selectedBatch ? "mr-[480px]" : "")}>
        <div className="flex justify-between items-end border-b border-[#2D3441] pb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">
               <span className="text-[#60A5FA]">The</span> <span className="text-[#60A5FA]">Vault</span>
            </h1>
            <p className="text-[10px] text-[#94A3B8] tracking-[0.2em] mt-2 uppercase">Physical_Inventory_Oversight // INDUSTRIAL_CORE_v8.6.1</p>
          </div>
          <div className="flex gap-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={14} />
                <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="SEARCH_BY_BATCH_OR_LOC" 
                  className="bg-[#121417] border border-[#2D3441] text-[10px] pl-10 pr-4 py-3 rounded-[8px] focus:outline-none focus:border-[#60A5FA] w-64 uppercase text-[#F1F5F9]"
                />
             </div>
             <button 
               onClick={() => setShowModal(true)}
               className="bg-[#60A5FA] text-[#121417] px-6 py-3 rounded-[8px] text-[10px] font-black uppercase flex items-center gap-2 hover:bg-[#3B82F6] transition-all shadow-[0_0_20px_rgba(96,165,250,0.15)]"
             >
                <PlusCircle size={14} /> ADD INVENTORY
             </button>
          </div>
        </div>

        {/* Global Stock Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-[#1C2028] border border-[#2D3441] p-6 rounded-[12px] group hover:border-[#60A5FA]/30 transition-all shadow-xl">
              <div className="flex justify-between items-start mb-4">
                 <Box size={20} className="text-[#60A5FA]" />
                 <TrendingUp size={14} className="text-[#34D399]" />
              </div>
              <p className="text-[9px] text-[#94A3B8] uppercase tracking-widest font-black">Total Vault Inventory</p>
              <p className="text-2xl font-black text-[#F1F5F9] mt-1 uppercase">
                {batches.reduce((acc, b) => acc + (b.suits_count || 0), 0)} <span className="text-[10px] text-[#94A3B8]">Suits</span>
              </p>
           </div>
           <div className="bg-[#1C2028] border border-[#2D3441] p-6 rounded-[12px] group hover:border-[#60A5FA]/30 transition-all shadow-xl">
              <div className="flex justify-between items-start mb-4">
                 <TrendingUp size={20} className="text-[#60A5FA]" />
                 <Box size={14} className="text-[#2D3441]" />
              </div>
              <p className="text-[9px] text-[#94A3B8] uppercase tracking-widest font-black">Refined Valuation (Cost)</p>
              <p className="text-2xl font-black text-[#C5A059] mt-1 uppercase">
                Rs. {parseFloat(calculateTotalValuation()).toLocaleString()}
              </p>
           </div>
           <div className="bg-[#1C2028] border border-[#2D3441] p-6 rounded-[12px] shadow-xl">
              <div className="flex justify-between items-start mb-4">
                 <AlertCircle size={20} className="text-[#F87171]" />
                 <Activity size={14} className="text-[#2D3441]" />
              </div>
              <p className="text-[9px] text-[#94A3B8] uppercase tracking-widest font-black">Critical Stock Nodes</p>
              <p className="text-2xl font-black text-[#F87171] mt-1 uppercase">
                {batches.filter(b => b.suits_count < 10).length} <span className="text-[10px] text-[#94A3B8]">Units</span>
              </p>
           </div>
        </div>

        {/* Batch Inventory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
           {loading ? [...Array(8)].map((_, i) => (
             <div key={i} className="h-48 bg-[#242933] border border-[#2D3441] animate-pulse rounded-[12px]" />
           )) : filteredBatches.length === 0 ? (
             <div className="col-span-full py-32 text-center border border-dashed border-[#2D3441] text-[#2D3441] uppercase italic rounded-[12px]">
                VAULT_SECTION_EMPTY // NO_RECORDS
             </div>
           ) : filteredBatches.map(batch => (
              <div 
                key={batch.id} 
                onClick={() => setSelectedBatch(batch)}
                className={cn(
                   "bg-[#1C2028] border p-5 rounded-[12px] cursor-pointer transition-all hover:border-[#60A5FA]/40 group relative overflow-hidden shadow-lg",
                   selectedBatch?.id === batch.id ? "border-[#60A5FA] ring-1 ring-[#60A5FA]/20 bg-[#121417]/40" : "border-[#2D3441]"
                )}
              >
                <div className="flex justify-between items-start mb-6">
                   <div className="space-y-1">
                      <p className="text-[8px] text-zinc-600 font-black uppercase tracking-tighter">BATCH_ID</p>
                      <p className="text-[13px] font-black text-white uppercase tracking-tighter">#{batch.code}</p>
                   </div>
                   <div className={cn("px-2 py-0.5 text-[8px] font-black rounded-[1px] uppercase text-black", getStockColor(batch.suits_count))}>
                      {batch.suits_count} UNITS
                   </div>
                </div>

                <div className="space-y-2 mb-6">
                   <p className="text-[10px] font-black text-zinc-400 uppercase truncate">{batch.article?.name || 'UNKNOWN_ARTICLE'}</p>
                   <div className="flex items-center gap-2 text-[9px] text-zinc-600 uppercase font-black">
                      <MapPin size={10} /> {batch.location || 'UNMAPPED'}
                   </div>
                </div>

                 <div className="flex justify-between items-end border-t border-[#2D3441] pt-4">
                    <p className="text-[10px] font-black text-[#C5A059]">Rs. {batch.unit_cost.toLocaleString()}</p>
                    <div className="h-1.5 w-1.5 rounded-full bg-[#121417] group-hover:bg-[#60A5FA] transition-colors" />
                 </div>
            </div>
           ))}
        </div>
      </div>

      {/* Industrial Detail Overlay */}
      <aside 
        className={cn(
          "fixed top-16 right-0 w-[480px] h-[calc(100vh-64px)] bg-[#1C2028] border-l border-[#2D3441] transition-transform duration-500 z-40 flex flex-col font-mono shadow-2xl",
          selectedBatch ? "translate-x-0" : "translate-x-full"
        )}
      >
         {selectedBatch && (
           <>
             <div className="p-8 border-b border-[#2D3441] flex justify-between items-center bg-[#121417]/50">
                <div>
                   <h2 className="text-xl font-black text-[#F1F5F9] uppercase tracking-tighter">Batch Analysis</h2>
                   <p className="text-[9px] text-[#60A5FA] uppercase font-black tracking-widest mt-1">Ref: {selectedBatch.code}</p>
                </div>
                <button onClick={() => setSelectedBatch(null)} className="p-2 hover:bg-[#242933] transition-colors group rounded-[4px]">
                   <X size={20} className="text-[#94A3B8] group-hover:text-[#F1F5F9]" />
                </button>
             </div>

             <div className="p-8 flex-1 overflow-y-auto space-y-10 scrollbar-hide">
                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#121417]/50 p-4 border border-[#2D3441] rounded-[8px]">
                         <p className="text-[8px] text-[#94A3B8] uppercase font-black mb-2 tracking-widest">Location_Node</p>
                         <p className="text-[10px] font-black text-[#F1F5F9] flex items-center gap-2 uppercase">
                            <MapPin size={12} className="text-[#60A5FA]" /> {selectedBatch.location}
                         </p>
                      </div>
                      <div className="bg-[#121417]/50 p-4 border border-[#2D3441] rounded-[8px]">
                         <p className="text-[8px] text-[#94A3B8] uppercase font-black mb-2 tracking-widest">Vault_Status</p>
                         <p className="text-[10px] font-black text-[#F1F5F9] flex items-center gap-2 uppercase">
                            <Activity size={12} className="text-[#34D399]" /> {selectedBatch.status}
                         </p>
                      </div>
                   </div>

                   <div className="bg-[#121417]/50 border border-[#2D3441] p-6 rounded-[8px] space-y-4">
                      <h4 className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest border-b border-[#2D3441] pb-3">Financial Synthesis</h4>
                      <div className="space-y-3">
                         <div className="flex justify-between uppercase">
                            <span className="text-[10px] text-[#94A3B8]">Unit Cost:</span>
                            <span className="text-[10px] font-black text-[#C5A059]">Rs. {selectedBatch.unit_cost.toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between uppercase">
                            <span className="text-[10px] text-[#94A3B8]">Industrial Overhead:</span>
                            <span className="text-[10px] font-black text-[#F1F5F9]">{selectedBatch.overhead_pct}%</span>
                         </div>
                         <div className="flex justify-between pt-3 border-t border-[#2D3441] uppercase">
                            <span className="text-[10px] text-[#C5A059] font-black">Gross Valuation:</span>
                            <span className="text-[12px] font-black text-[#C5A059]">
                               Rs. {(selectedBatch.unit_cost * selectedBatch.suits_count * (1 + selectedBatch.overhead_pct/100)).toLocaleString()}
                            </span>
                         </div>
                      </div>
                   </div>

                </div>
                 <div className="space-y-4">
                    <h4 className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest">Security Protocols</h4>
                    <div className="grid grid-cols-2 gap-3">
                       <button className="flex items-center justify-center gap-3 py-4 bg-[#121417] border border-[#2D3441] text-[9px] font-black uppercase text-[#F1F5F9] hover:bg-[#242933] transition-all rounded-[8px]">
                          <History size={16} /> Audit_History
                       </button>
                       <button className="flex items-center justify-center gap-3 py-4 bg-[#121417] border border-[#2D3441] text-[9px] font-black uppercase text-[#F1F5F9] hover:bg-[#242933] transition-all rounded-[8px]">
                          <Printer size={16} /> Print_Label
                       </button>
                       <button className="flex items-center justify-center gap-3 py-4 bg-[#60A5FA] text-[#121417] text-[9px] font-black uppercase hover:bg-[#3B82F6] transition-all col-span-2 rounded-[8px]">
                          <Move size={16} /> RELOCATE_INVENTORY
                       </button>
                    </div>
                 </div>

             </div>
           </>
         )}
      </aside>

      {/* NEW BATCH MODAL */}
      {showModal && <BatchWizard onClose={() => setShowModal(false)} onComplete={() => { setShowModal(false); void fetchBatches(); }} />}
    </div>
  );
}

/**
 * SUB-COMPONENT: BATCH WIZARD
 */
interface BatchWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

function BatchWizard({ onClose, onComplete }: BatchWizardProps) {
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<{ id: string; name: string; code: string }[]>([]);
  const [formData, setFormData] = useState({
    article_id: '',
    suits_count: 0,
    unit_cost: 0,
    overhead_pct: 15,
    location: 'MAIN_FLOOR',
    status: 'STORAGE'
  });

  useEffect(() => {
    const fetchArticles = async () => {
      const { data } = await supabase.from('articles').select('id, name, code');
      setArticles(data || []);
    };
    void fetchArticles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.article_id || !formData.suits_count) return;
    setLoading(true);
    try {
      const { data: maxBatch } = await supabase.from('batches').select('code').order('code', { ascending: false }).limit(1);
      const lastCode = maxBatch?.[0]?.code || 'BAT-0000';
      const num = parseInt(lastCode.split('-')[1]) + 1;
      const code = `BAT-${num.toString().padStart(4, '0')}`;

      const { error } = await supabase.from('batches').insert([{ ...formData, code }]);
      if (error) throw error;
      onComplete();
    } catch (e) {
      console.error('❌ BATCH_CREATE_FAILURE:', e);
      alert('PROTOCOL_SYNC_FAILED');
    } finally {
      setLoading(false);
    }
  };

  return (
     <div className="fixed inset-0 bg-[#121417]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300 font-mono">
        <div className="bg-[#1C2028] border border-[#2D3441] w-full max-w-lg p-8 rounded-[12px] space-y-8 relative overflow-hidden shadow-2xl">
           <div className="flex justify-between items-center border-b border-[#2D3441] pb-6">
              <h2 className="text-sm font-black text-[#F1F5F9] uppercase tracking-[0.2em] flex items-center gap-2">
                 <Box size={16} className="text-[#60A5FA]" /> Vault Entry Protocol
              </h2>
              <button onClick={onClose} className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"><X size={20} /></button>
           </div>

           <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Article Master Reference</label>
                 <select 
                    required
                    value={formData.article_id}
                    onChange={e => setFormData(f => ({ ...f, article_id: e.target.value }))}
                    className="w-full bg-[#121417]/40 border border-[#2D3441] text-[10px] font-black text-[#F1F5F9] px-4 py-3 focus:border-[#60A5FA] outline-none uppercase rounded-[8px]"
                 >
                    <option value="">SELECT_ARTICLE</option>
                    {articles.map(a => <option key={a.id} value={a.id}>{a.code} • {a.name}</option>)}
                 </select>
              </div>

             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Unit Quantity (Suits)</label>
                   <input 
                      required type="number"
                      inputMode="numeric"
                      value={formData.suits_count}
                      onChange={e => setFormData(f => ({ ...f, suits_count: Number(e.target.value) }))}
                      className="w-full bg-[#121417]/40 border border-[#2D3441] text-[11px] font-black text-[#F1F5F9] px-4 py-3 outline-none focus:border-[#60A5FA] rounded-[8px]"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Cost Per Unit</label>
                   <input 
                      required type="number"
                      inputMode="numeric"
                      value={formData.unit_cost}
                      onChange={e => setFormData(f => ({ ...f, unit_cost: Number(e.target.value) }))}
                      className="w-full bg-[#121417]/40 border border-[#2D3441] text-[11px] font-black text-[#F1F5F9] px-4 py-3 outline-none focus:border-[#60A5FA] rounded-[8px]"
                   />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Storage Location</label>
                    <input 
                       value={formData.location}
                       onChange={e => setFormData(f => ({ ...f, location: e.target.value }))}
                       className="w-full bg-[#121417]/40 border border-[#2D3441] text-[11px] font-black text-[#F1F5F9] px-4 py-3 outline-none focus:border-[#60A5FA] rounded-[8px]"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Initial Status</label>
                    <select 
                       value={formData.status}
                       onChange={e => setFormData(f => ({ ...f, status: e.target.value as Batch['status'] }))}
                       className="w-full bg-[#121417]/40 border border-[#2D3441] text-[10px] font-black text-[#F1F5F9] px-4 py-3 outline-none focus:border-[#60A5FA] uppercase rounded-[8px]"
                    >
                       <option value="STORAGE">STORAGE</option>
                       <option value="TRANSIT">TRANSIT</option>
                       <option value="RESERVED">RESERVED</option>
                    </select>
                 </div>
              </div>

               <button 
                  disabled={loading}
                  className="w-full py-5 bg-[#60A5FA] text-[#121417] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#3B82F6] transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(96,165,250,0.3)] rounded-[8px]"
               >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  COMMENCE_VAULT_ENTRY
               </button>
          </form>
        </div>
     </div>
  );
}

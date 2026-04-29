'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users2, PlusCircle, 
  Activity, Shield, ShieldCheck, 
  ShieldAlert, User, Phone, 
  X, ChevronRight,
  CheckCircle2, Contact
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTableSearch } from '@/components/ui/DataTableSearch';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/lib/hooks/useToast';

/**
 * INDUSTRIAL KARIGAR ANALYTICS (v8.6.1)
 * Workforce monitoring with integrated industrial trust orchestration.
 */

interface Karigar {
  id: string;
  name: string;
  phone: string;
  cnic: string;
  address: string;
  is_active: boolean;
  trust_score?: 'GREEN' | 'AMBER' | 'RED';
  total_suits?: number;
  avg_variance?: string;
  created_at: string;
}

export default function KarigarsPage() {
  const { addToast } = useToast();
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [selectedKarigar, setSelectedKarigar] = useState<Karigar | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    cnic: '',
    address: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const initialized = useRef(false);

  const fetchKarigars = useCallback(async (isInitial: boolean = false) => {
    if (!isInitial) setLoading(true);
    try {
      const { data, error } = await supabase.from('karigars').select('*').order('name');
      if (error) throw error;
      
      // Sync with production telemetry
      const { data: jobs } = await supabase.from('job_orders').select('karigar_id, target_suits');
      
      const enriched = (data || []).map(k => {
        const kJobs = (jobs || []).filter(j => j.karigar_id === k.id);
        const totalSuits = kJobs.reduce((acc, curr) => acc + (curr.target_suits || 0), 0);
        return {
          ...k,
          trust_score: totalSuits > 1000 ? 'GREEN' : totalSuits > 0 ? 'AMBER' : 'RED',
          total_suits: totalSuits,
          avg_variance: '0.00' // Placeholder for future variance engine
        };
      });
      
      setKarigars(enriched as Karigar[]);
    } catch (error: unknown) {
      const err = error as { message?: string };
      addToast({
        type: 'ERROR',
        title: 'Workforce Sync Error',
        message: err.message || 'Could not fetch the industrial karigar roster.'
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!initialized.current) {
        initialized.current = true;
        void fetchKarigars(true);
    }
  }, [fetchKarigars]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('karigars').insert([formData]);
      if (error) throw error;
      setShowModal(false);
      setFormData({ name: '', phone: '', cnic: '', address: '' });
      void fetchKarigars();
      addToast({
        type: 'SUCCESS',
        title: 'Worker Registered',
        message: `${formData.name} has been enrolled in the workforce roster.`
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      addToast({
        type: 'ERROR',
        title: 'Enrollment Failure',
        message: err.message || 'The system could not commit the worker registration.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getTrustIcon = (score: string) => {
    switch (score) {
      case 'RED': return <ShieldAlert size={16} className="text-[#F87171]" />;
      case 'AMBER': return <Shield size={16} className="text-[#FBBF24]" />;
      default: return <ShieldCheck size={16} className="text-[#34D399]" />;
    }
  };

  const filteredKarigars = karigars.filter(k => k.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#121417] font-mono selection:bg-[#60A5FA] selection:text-white">
      {/* 1. Karigar Roster */}
      <aside className={cn("bg-[#1C2028] border-r border-[#2D3441] flex flex-col pt-8 transition-all shrink-0", selectedKarigar ? "w-[320px]" : "w-full overflow-y-auto")}>
         <div className="px-6 mb-8 flex justify-between items-end">
            <div>
               <h2 className="text-xl font-black uppercase tracking-tighter">
                  <span className="text-[#60A5FA]">Karigar</span> <span className="text-[#60A5FA]">Roster</span>
               </h2>
               <p className="text-[8px] text-[#94A3B8] uppercase tracking-widest font-bold mt-1">Workforce_Oversight // SECURE_AUDIT_STABLE</p>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-[#60A5FA] text-[#121417] p-3 rounded-[100px] hover:bg-[#3B82F6] transition-all shadow-[0_0_15px_rgba(96,165,250,0.15)]"
            >
               <PlusCircle size={18} />
            </button>
         </div>

         <div className="px-6 mb-6">
            <DataTableSearch 
              value={search}
              onChange={setSearch}
              placeholder="SEARCH_KARIGARS..."
            />
         </div>

         <div className={cn("flex-1 space-y-1 px-3", selectedKarigar ? "overflow-y-auto" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4")}>
            {loading ? [...Array(6)].map((_, i) => (
               <CardSkeleton key={i} />
            )) : filteredKarigars.length === 0 ? (
               <div className="col-span-full py-32 text-center opacity-10 italic uppercase border border-dashed border-[#2D3441] rounded-[8px] text-[#F1F5F9]">
                  NO_WORKFORCE_TELEMETRY
               </div>
            ) : filteredKarigars.map((k) => (
              <button 
                key={k.id}
                onClick={() => setSelectedKarigar(k)}
                className={cn(
                  "flex items-center justify-between p-6 rounded-[12px] transition-all group border shrink-0",
                  selectedKarigar?.id === k.id ? "bg-[#60A5FA]/5 border-[#60A5FA]" : "bg-[#1C2028] border-[#2D3441] hover:border-[#3D4757]"
                )}
              >
                  <div className="flex items-center gap-4 overflow-hidden text-left">
                    <div className="w-10 h-10 bg-[#121417] flex items-center justify-center border border-[#2D3441] rounded-[8px] group-hover:border-[#60A5FA]/30 transition-colors">
                       <User size={18} className={selectedKarigar?.id === k.id ? "text-[#60A5FA]" : "text-[#2D3441]"} />
                    </div>
                    <div className="overflow-hidden">
                       <p className={cn("text-xs font-black uppercase tracking-tighter truncate", selectedKarigar?.id === k.id ? "text-[#F1F5F9]" : "text-[#94A3B8]")}>{k.name}</p>
                       <div className="flex items-center gap-2 mt-1">
                          {getTrustIcon(k.trust_score || 'RED')}
                          <p className="text-[8px] text-[#2D3441] font-bold uppercase tracking-widest leading-none">{k.total_suits} Suits</p>
                       </div>
                    </div>
                  </div>
                  {!selectedKarigar && <ChevronRight size={14} className="text-[#2D3441]" />}
              </button>
            ))}
         </div>
      </aside>

      {/* 2. Performance Analysis */}
      <main className="flex-1 flex flex-col bg-[#121417]">
         {selectedKarigar ? (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
               <header className="p-8 border-b border-[#2D3441] flex justify-between items-end">
                  <div>
                     <h1 className="text-4xl font-black tracking-tighter text-[#F1F5F9] uppercase">{selectedKarigar.name}</h1>
                     <div className="flex items-center gap-6 mt-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#94A3B8] uppercase">
                           <Phone size={12} className="text-[#60A5FA]" /> {selectedKarigar.phone}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#94A3B8] uppercase">
                           <Activity size={12} className="text-[#34D399]" /> +{selectedKarigar.total_suits} Historical Suits
                        </div>
                     </div>
                  </div>
                  <button onClick={() => setSelectedKarigar(null)} className="p-3 bg-[#1C2028] border border-[#2D3441] rounded-full text-[#94A3B8] hover:text-[#F1F5F9] transition-all">
                     <X size={20} />
                  </button>
               </header>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Trust Analysis */}
                     <div className="bg-[#1C2028] border border-[#2D3441] p-8 rounded-[12px] space-y-6 shadow-xl">
                        <h3 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Fabric Trust Analysis</h3>
                        <div className={cn(
                          "flex items-center gap-6 p-6 bg-[#121417]/40 border border-[#2D3441] rounded-[8px] relative overflow-hidden",
                        )}>
                           <div className={cn(
                             "w-12 h-12 rounded-full border flex items-center justify-center relative z-10",
                             selectedKarigar.trust_score === 'GREEN' ? "border-[#34D399] text-[#34D399]" : "border-[#F87171] text-[#F87171]"
                           )}>
                              <ShieldCheck size={24} />
                           </div>
                           <div className="relative z-10">
                              <p className="text-xl font-black text-[#F1F5F9] tracking-tight uppercase leading-none">{selectedKarigar.trust_score || 'RED'}_PROTOCOL</p>
                              <p className="text-[10px] text-[#94A3B8] uppercase mt-1 tracking-widest">Current Audit Status</p>
                           </div>
                           <div className="absolute right-[-10%] top-[-20%] text-[80px] font-black text-[#F1F5F9]/[0.02] pointer-events-none select-none">TRUST</div>
                        </div>
                     </div>
                    
                     {/* Meta Data */}
                     <div className="bg-[#1C2028] border border-[#2D3441] p-8 rounded-[12px] space-y-6 shadow-xl">
                        <h3 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Worker Identity Data</h3>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center text-[10px] font-bold border-b border-[#2D3441] pb-3 uppercase">
                              <span className="text-[#94A3B8]">Government ID (CNIC)</span>
                              <span className="text-[#F1F5F9]">{selectedKarigar.cnic || 'NOT_VERIFIED'}</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] font-bold border-b border-[#2D3441] pb-3 uppercase text-right">
                              <span className="text-[#94A3B8]">Residential Anchor</span>
                              <span className="text-[#F1F5F9] max-w-[200px] truncate">{selectedKarigar.address || 'UNKNOWN'}</span>
                           </div>
                        </div>
                     </div>
                 </div>
              </div>
           </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#2D3441] opacity-20">
               <Users2 size={96} strokeWidth={1} />
               <p className="text-xl font-mono font-black uppercase tracking-[0.5em] mt-8 text-[#F1F5F9]">SELECT_KARIGAR</p>
            </div>
          )}
      </main>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#121417]/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#1C2028] border border-[#2D3441] w-full max-w-md p-8 rounded-[12px] space-y-8 relative overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center">
                 <h2 className="text-sm font-black text-[#F1F5F9] uppercase tracking-[0.2em] flex items-center gap-2">
                    <Contact size={16} className="text-[#60A5FA]" /> Workforce Registration
                 </h2>
                 <button onClick={() => setShowModal(false)} className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors">
                    <X size={18} />
                 </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Full Worker Name</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-[#121417]/40 border border-[#2D3441] text-[10px] font-black text-[#F1F5F9] px-4 py-3 focus:outline-none focus:border-[#60A5FA]/40 uppercase rounded-[8px]" 
                      placeholder="ENTER_NAME"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Primary Phone Line</label>
                    <input 
                      required
                      value={formData.phone}
                      onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                      className="w-full bg-[#121417]/40 border border-[#2D3441] text-[10px] font-black text-[#F1F5F9] px-4 py-3 focus:outline-none focus:border-[#60A5FA]/40 uppercase rounded-[8px]" 
                      placeholder="+92 XXX XXXXXXX"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">CNIC (Verification ID)</label>
                    <input 
                      value={formData.cnic}
                      onChange={e => setFormData(f => ({ ...f, cnic: e.target.value }))}
                      className="w-full bg-[#121417]/40 border border-[#2D3441] text-[10px] font-black text-[#F1F5F9] px-4 py-3 focus:outline-none focus:border-[#60A5FA]/40 uppercase rounded-[8px]" 
                      placeholder="3310X-XXXXXXX-X"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Operational Address</label>
                    <textarea 
                      value={formData.address}
                      onChange={e => setFormData(f => ({ ...f, address: e.target.value }))}
                      className="w-full bg-[#121417]/40 border border-[#2D3441] text-[10px] font-black text-[#F1F5F9] px-4 py-3 h-20 focus:outline-none focus:border-[#60A5FA]/40 uppercase resize-none rounded-[8px]" 
                      placeholder="ENTER_ADDRESS"
                    />
                 </div>

                 <button 
                   disabled={submitting}
                   className={cn(
                     "w-full py-4 bg-[#60A5FA] text-[#121417] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#3B82F6] transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(96,165,250,0.3)] rounded-[8px]",
                     submitting && "opacity-50 cursor-not-allowed"
                   )}
                 >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black animate-spin rounded-full" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    REGISTER_WORKER
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}


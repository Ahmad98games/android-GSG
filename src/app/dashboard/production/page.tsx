'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Hammer, Search, PlusCircle, 
  CheckCircle2, AlertTriangle,
  X, Printer, Scissors,
  ChevronRight, Loader2,
  Package, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Decimal from 'decimal.js';

/**
 * INDUSTRIAL PRODUCTION PIPELINE (v8.6.1)
 * High-performance manufacturing with Chori Guard Forensic Audit and Real-time Registry.
 */

interface Job {
  id: string;
  code: string;
  article_id: string;
  karigar_id: string;
  target_suits: number;
  gaz_issued: number;
  per_suit_gaz: number;
  due_date: string;
  status: 'ISSUED' | 'IN_PROGRESS' | 'RED_ALERT' | 'SUBMITTED' | 'COMPLETED';
  article: { name: string; code: string; cost_per_set: number };
  karigar: { name: string };
  created_at: string;
}

export default function ProductionPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [search, setSearch] = useState('');
  const initialized = useRef(false);

  const fetchJobs = useCallback(async (isInitial: boolean = false) => {
    if (!isInitial) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_orders')
        .select(`
          *,
          article:articles(name, code, cost_per_set),
          karigar:karigars(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setJobs(data || []);
    } catch (e) {
      const err = e as { message?: string };
      console.error('❌ JOBS_FETCH_FAILURE:', err.message || e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
        initialized.current = true;
        void fetchJobs(true);
    }

    const channel = supabase.channel('production_pipeline_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_orders' }, () => { void fetchJobs(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'job_audit_results' }, () => { void fetchJobs(); })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [fetchJobs]);

  const calculateChoriGuard = (issued: number, target: number, perSuit: number) => {
    try {
      const expected = new Decimal(target).mul(perSuit);
      const buffer = expected.mul(0.04); 
      const variance = new Decimal(issued).minus(expected).minus(buffer);
      return {
        expected: expected.toFixed(3),
        variance: variance.toFixed(3),
        isCritical: variance.lt(-1)
      };
    } catch {
      return { expected: '0.00', variance: '0.00', isCritical: false };
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ISSUED': return "bg-[#60A5FA14] text-[#60A5FA] border-[#60A5FA33]";
      case 'IN_PROGRESS': return "bg-[#3B82F614] text-[#3B82F6] border-[#3B82F633]";
      case 'RED_ALERT': return "bg-[#F8717114] text-[#F87171] border-[#F8717133] animate-pulse";
      case 'SUBMITTED': return "bg-[#34D39914] text-[#34D399] border-[#34D39933]";
      case 'COMPLETED': return "bg-[#1C2028] text-[#94A3B8] border-[#2D3441]";
      default: return "bg-[#121417] text-[#94A3B8] border-[#2D3441]";
    }
  };

  const filteredJobs = jobs.filter(j => 
    j.code.toLowerCase().includes(search.toLowerCase()) || 
    (j.article?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (j.karigar?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#121417] font-mono selection:bg-[#60A5FA] selection:text-[#121417]">
      {/* 1. Job Orders Panel */}
      <div className="flex-1 p-8 space-y-8 overflow-y-auto scrollbar-hide border-r border-[#2D3441]">
        <div className="flex justify-between items-end border-b border-[#2D3441] pb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
               <span className="text-[#60A5FA]">Production</span> <span className="text-[#F1F5F9]">Pipeline</span>
            </h1>
            <p className="text-[10px] text-[#94A3B8] tracking-[0.2em] mt-2 uppercase">Wastage Analytics // Yield Detection</p>
          </div>
          <div className="flex gap-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={14} />
                <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="SEARCH_JOBS" 
                  className="bg-[#1C2028] border border-[#2D3441] text-[10px] pl-10 pr-4 py-3 rounded-[8px] focus:outline-none focus:border-[#60A5FA] w-64 uppercase text-[#F1F5F9]"
                />
             </div>
             <button 
               onClick={() => setShowWizard(true)}
               className="bg-[#60A5FA] text-[#121417] px-6 py-3 rounded-[8px] text-[10px] font-black uppercase flex items-center gap-2 hover:bg-[#3B82F6] transition-all shadow-[0_0_20px_rgba(96,165,250,0.15)]"
             >
                <PlusCircle size={14} /> CREATE JOB ORDER
             </button>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? [...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-[#1C2028] border border-[#2D3441] animate-pulse rounded-[12px]" />
          )) : filteredJobs.length === 0 ? (
             <div className="py-32 text-center border border-dashed border-[#2D3441] text-[#2D3441] italic uppercase rounded-[12px]">
                NO_PRODUCTION_TRAFFIC_DETECTED
             </div>
          ) : filteredJobs.map((job) => (
            <div 
              key={job.id} 
              onClick={() => setSelectedJob(job)}
              className={cn(
                "bg-[#1C2028] border p-6 rounded-[12px] flex items-center justify-between group cursor-pointer transition-all shadow-xl",
                selectedJob?.id === job.id ? "border-[#60A5FA] bg-[#242933] ring-1 ring-[#60A5FA]/20" : "border-[#2D3441] hover:border-[#60A5FA]/20"
              )}
            >
               <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-[#121417] border border-[#2D3441] flex items-center justify-center rounded-[8px]">
                     <Hammer size={18} className={cn("transition-colors", selectedJob?.id === job.id ? "text-[#60A5FA]" : "text-[#4B5563]")} />
                  </div>
                  <div>
                     <p className="text-sm font-black uppercase text-[#F1F5F9] group-hover:text-[#60A5FA] transition-colors tracking-tight">#{job.code}</p>
                   <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mt-1">
                      {job.article?.name}
                   </p>
                  </div>
               </div>

               <div className="flex items-center gap-8 text-[10px] font-black">
                  <div className="text-right">
                     <p className="text-[#94A3B8] uppercase text-[8px] mb-1 tracking-widest leading-none">Target</p>
                     <p className="text-[#F1F5F9] uppercase">{job.target_suits} Suits</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[#94A3B8] uppercase text-[8px] mb-1 tracking-widest leading-none">Issued</p>
                     <p className="text-[#C5A059] uppercase">{job.gaz_issued} Gaz</p>
                  </div>
                  <div className={cn("px-4 py-1.5 border rounded-full text-[9px] font-black uppercase tracking-tighter", getStatusStyle(job.status))}>
                     {job.status}
                  </div>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Tactical Detail Sidebar */}
      <aside className={cn(
        "fixed top-16 right-0 w-[480px] h-[calc(100vh-64px)] bg-[#1C2028] border-l border-[#2D3441] transition-transform duration-500 z-40 flex flex-col font-mono shadow-2xl",
        selectedJob ? "translate-x-0" : "translate-x-full"
      )}>
        {selectedJob && (
           <div className="h-full flex flex-col">
              <div className="p-8 border-b border-[#2D3441] flex justify-between items-center bg-[#1C2028]/50 focus:outline-none">
                 <div>
                    <h2 className="text-xl font-black text-[#F1F5F9] uppercase tracking-tighter">Forensic Audit</h2>
                    <p className="text-[9px] text-[#60A5FA] uppercase font-black tracking-widest mt-1">Ref: {selectedJob.code}</p>
                 </div>
                 <button onClick={() => setSelectedJob(null)} className="p-2 hover:bg-[#121417] transition-colors group rounded-[8px]">
                    <X size={20} className="text-[#94A3B8] group-hover:text-[#F1F5F9]" />
                 </button>
              </div>

              <div className="p-8 flex-1 overflow-y-auto space-y-10 scrollbar-hide">
                 <div className="bg-[#121417]/40 border border-[#2D3441] p-6 rounded-[12px] relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6 border-b border-[#2D3441] pb-4">
                       <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[#94A3B8] tracking-widest">
                          <Scissors size={14} className="text-[#60A5FA]" /> Chori Guard Operational
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-[#121417]/20 border border-[#2D3441] rounded-[8px]">
                             <p className="text-[8px] text-[#94A3B8] uppercase mb-2 font-black">Actual Issued</p>
                             <p className="text-xl font-black text-[#C5A059]">{selectedJob.gaz_issued} Gz</p>
                          </div>
                          <div className="p-4 bg-[#121417]/20 border border-[#2D3441] rounded-[8px]">
                             <p className="text-[8px] text-[#94A3B8] uppercase mb-2 font-black">Expected Yield</p>
                             <p className="text-xl font-black text-[#60A5FA]">
                               {calculateChoriGuard(selectedJob.gaz_issued, selectedJob.target_suits, selectedJob.per_suit_gaz).expected} Gz
                             </p>
                          </div>
                       </div>

                       <div className="p-6 bg-[#121417]/40 border-y border-[#2D3441] flex justify-between items-center">
                          <div>
                            <p className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Audit Variance</p>
                            <p className={cn(
                              "text-3xl font-black tracking-tighter leading-none",
                              parseFloat(calculateChoriGuard(selectedJob.gaz_issued, selectedJob.target_suits, selectedJob.per_suit_gaz).variance) < 0 ? "text-[#F87171]" : "text-[#34D399]"
                            )}>
                              {calculateChoriGuard(selectedJob.gaz_issued, selectedJob.target_suits, selectedJob.per_suit_gaz).variance} Gaz
                            </p>
                          </div>
                          {parseFloat(calculateChoriGuard(selectedJob.gaz_issued, selectedJob.target_suits, selectedJob.per_suit_gaz).variance) < -1 ? (
                             <AlertTriangle size={32} className="text-[#F87171] animate-pulse" />
                          ) : (
                             <CheckCircle2 size={32} className="text-[#34D399] opacity-20" />
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest">Protocol Metadata</h3>
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-bold">
                       <div className="p-4 bg-[#121417]/40 border border-[#2D3441] rounded-[8px] uppercase">
                          <span className="text-[#94A3B8] block mb-1">Due Chronology</span>
                          <span className="text-[#F1F5F9]">{new Date(selectedJob.due_date).toLocaleDateString()}</span>
                       </div>
                       <div className="p-4 bg-[#121417]/40 border border-[#2D3441] rounded-[8px] uppercase">
                          <span className="text-[#94A3B8] block mb-1">Assigned Worker</span>
                          <span className="text-[#F1F5F9] truncate">{selectedJob.karigar?.name}</span>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4 pt-4">
                    <button className="w-full flex items-center justify-center gap-3 py-5 bg-[#60A5FA] text-[#121417] text-[10px] font-black uppercase hover:bg-[#3B82F6] transition-all rounded-[8px] shadow-lg shadow-[#60A5FA]/10">
                       <Printer size={16} /> PRINT JOB PROTOCOL
                    </button>
                    <button className="w-full flex items-center justify-center gap-3 py-5 bg-[#121417] border border-[#2D3441] text-[10px] font-black uppercase text-[#F1F5F9] hover:bg-[#242933] transition-all rounded-[8px]">
                       <Trash2 size={16} className="text-[#4B5563]" /> TERMINATE ORDER
                    </button>
                 </div>
              </div>
           </div>
        )}
      </aside>

      {/* NEW JOB ORDER WIZARD */}
      {showWizard && <JobWizard onClose={() => setShowWizard(false)} onComplete={() => { setShowWizard(false); void fetchJobs(); }} />}
    </div>
  );
}

/**
 * SUB-COMPONENT: JOB WIZARD
 */
interface JobWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

function JobWizard({ onClose, onComplete }: JobWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<{ id: string; name: string; code: string }[]>([]);
  const [karigars, setKarigars] = useState<{ id: string; name: string }[]>([]);
  
  const [formData, setFormData] = useState({
    article_id: '',
    karigar_id: '',
    target_suits: 50,
    per_suit_gaz: 2.5,
    gaz_issued: 0,
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchDeps = async () => {
      const [{ data: arts }, { data: kars }] = await Promise.all([
        supabase.from('articles').select('id, name, code'),
        supabase.from('karigars').select('id, name').eq('is_active', true)
      ]);
      setArticles(arts || []);
      setKarigars(kars || []);
    };
    void fetchDeps();
  }, []);

  const calculateGross = () => {
    return new Decimal(formData.target_suits).mul(formData.per_suit_gaz).mul(1.04).toFixed(2);
  };

  const handleSubmit = async () => {
    if (!formData.article_id || !formData.karigar_id || !formData.gaz_issued) return;
    setLoading(true);
    try {
      const { data: maxJob } = await supabase.from('job_orders').select('code').order('code', { ascending: false }).limit(1);
      const lastCode = maxJob?.[0]?.code || 'JO-0000';
      const num = parseInt(lastCode.split('-')[1]) + 1;
      const code = `JO-${num.toString().padStart(4, '0')}`;

      const { error } = await supabase.from('job_orders').insert([{
        code,
        ...formData,
        status: 'ISSUED'
      }]);

      if (error) throw error;
      onComplete();
    } catch (e) {
      const err = e as { message?: string };
      console.error('❌ JOB_CREATION_FAILURE:', err.message || e);
      alert('PROTOCOL_SYNC_FAILED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300 font-mono">
       <div className="bg-[#1C2028] border border-[#2D3441] w-full max-w-xl rounded-[12px] overflow-hidden flex flex-col shadow-2xl">
          <div className="p-8 border-b border-[#2D3441] flex justify-between items-center bg-[#121417]/50">
             <div className="flex items-center gap-3">
                <Package size={20} className="text-[#60A5FA]" />
                <h2 className="text-xs font-black text-[#F1F5F9] uppercase tracking-widest">Job Assignment Protocol</h2>
             </div>
             <div className="flex gap-2">
                {[1, 2].map(n => <div key={n} className={cn("w-1.5 h-1.5 rounded-full", step === n ? "bg-[#60A5FA] w-4" : n < step ? "bg-[#34D399]" : "bg-[#2D3441]")} />)}
                <button onClick={onClose} className="ml-4 text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"><X size={18} /></button>
             </div>
          </div>

          <div className="p-10 space-y-10 flex-1 overflow-y-auto scrollbar-hide max-h-[500px]">
             {step === 1 && (
               <div className="space-y-8 animate-in slide-in-from-right-4">
                  <h3 className="text-lg font-black text-[#F1F5F9] uppercase tracking-tighter">Phase 01 // Configuration</h3>
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Article Reference</label>
                        <select 
                          value={formData.article_id}
                          onChange={e => setFormData({...formData, article_id: e.target.value})}
                          className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[10px] font-black text-[#F1F5F9] uppercase outline-none focus:border-[#60A5FA] rounded-[8px]"
                        >
                           <option value="">SELECT_ARTICLE</option>
                           {articles.map(a => <option key={a.id} value={a.id}>{a.code} • {a.name}</option>)}
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Production Specialist (Karigar)</label>
                        <select 
                          value={formData.karigar_id}
                          onChange={e => setFormData({...formData, karigar_id: e.target.value})}
                          className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[10px] font-black text-[#F1F5F9] uppercase outline-none focus:border-[#60A5FA] rounded-[8px]"
                        >
                           <option value="">SELECT_WORKER</option>
                           {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Target Suits</label>
                           <input 
                             type="number"
                             inputMode="numeric"
                             value={formData.target_suits}
                             onChange={e => setFormData({...formData, target_suits: Number(e.target.value)})}
                             className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[10px] font-black text-[#F1F5F9] uppercase outline-none focus:border-[#60A5FA] rounded-[8px]" 
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Due Date</label>
                           <input 
                             type="date" value={formData.due_date}
                             onChange={e => setFormData({...formData, due_date: e.target.value})}
                             className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[10px] font-black text-[#F1F5F9] uppercase outline-none focus:border-[#60A5FA] rounded-[8px]" 
                           />
                        </div>
                     </div>
                  </div>
               </div>
             )}

             {step === 2 && (
               <div className="space-y-8 animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black text-[#F1F5F9] uppercase tracking-tighter">Phase 02 // Yield Estimator</h3>
                    <div className="text-right">
                       <p className="text-[8px] text-[#94A3B8] uppercase font-black mb-1">Required_Gross</p>
                       <p className="text-lg font-black text-[#C5A059] leading-none">{calculateGross()} Gz</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                     <div className="space-y-4">
                        <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Average Consumption (Gaz/Suit)</label>
                        <div className="flex gap-4 items-center">
                           <input 
                              type="range" min={1.5} max={4} step={0.05}
                              value={formData.per_suit_gaz} 
                              onChange={e => setFormData({...formData, per_suit_gaz: Number(e.target.value)})}
                              className="flex-1 accent-[#60A5FA] bg-[#121417] h-1 rounded-full appearance-none" 
                           />
                           <span className="text-[#F1F5F9] font-black text-sm">{formData.per_suit_gaz}</span>
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[8px] font-black text-[#60A5FA] uppercase tracking-[0.2em] block">Actual Gaz Issued (Forensic Entry)</label>
                        <input 
                          type="number"
                          inputMode="numeric"
                          value={formData.gaz_issued}
                          onChange={e => setFormData({...formData, gaz_issued: Number(e.target.value)})}
                          className="w-full bg-[#121417] border border-[#60A5FA]/20 p-6 text-3xl font-black text-[#C5A059] focus:border-[#60A5FA] outline-none rounded-[8px]" 
                        />
                     </div>
                  </div>
               </div>
             )}
          </div>

          <div className="p-8 border-t border-[#2D3441] flex gap-4 bg-[#121417]">
             {step > 1 && (
               <button onClick={() => setStep(step - 1)} className="px-8 py-4 border border-[#2D3441] text-[9px] font-black uppercase text-[#94A3B8] hover:text-[#F1F5F9] transition-all rounded-[8px]">Back</button>
             )}
             <button 
               onClick={step === 2 ? handleSubmit : () => setStep(step + 1)}
               disabled={loading}
               className="flex-1 py-4 bg-[#60A5FA] text-[#121417] text-[10px] font-black uppercase hover:bg-[#3B82F6] transition-all flex items-center justify-center gap-3 rounded-[8px] shadow-lg shadow-[#60A5FA]/20"
             >
                {loading ? <Loader2 className="animate-spin" size={16} /> : (step === 2 ? <CheckCircle2 size={16} /> : <ChevronRight size={16} />)}
                {step === 2 ? 'AUTHORIZE_JOB_ORDER' : 'VALIDATE_PHASE'}
             </button>
          </div>
       </div>
    </div>
  );
}

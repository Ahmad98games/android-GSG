'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, PlusCircle, 
  X,
  TrendingUp,
  CheckCircle2,
  Package,
  Loader2,
  ChevronRight, Camera,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Decimal from 'decimal.js';
import Image from 'next/image';
import QRCode from 'qrcode';
import imageCompression from 'browser-image-compression';

/**
 * INDUSTRIAL ARTICLE MASTER (v8.6.1)
 * High-density management with integrated Pricing Sensitivity Engine and Automated Registry.
 */

interface Article {
  id: string;
  code: string;
  name: string;
  desi_color_name?: string;
  desi_color_hex?: string;
  price_per_set: number;
  cost_per_set: number;
  overhead_pct?: number;
  qr_code_url?: string;
  image_url?: string;
  stock?: number;
  size_protocol?: string;
  fabric_type?: string;
  created_at: string;
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [search, setSearch] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const initialized = useRef(false);

  const [tempCost, setTempCost] = useState(0);
  const [tempOverhead, setTempOverhead] = useState(0);

  const fetchArticles = useCallback(async (isInitial: boolean = false) => {
    if (!isInitial) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, code, name, price_per_set, cost_per_set, created_at, batches(suits_count)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const articlesWithStock = (data as (Article & { batches: { suits_count: number }[] })[] || []).map((item) => {
        return {
          ...item,
          stock: (item.batches || []).reduce((acc: number, b: { suits_count: number }) => acc + (b.suits_count || 0), 0)
        };
      });

      setArticles(articlesWithStock);
    } catch (e) {
      console.error('❌ ARTICLES_FETCH_FAILURE:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
        initialized.current = true;
        void fetchArticles(true);
    }
  }, [fetchArticles]);

  const filteredArticles = articles.filter(a => 
    a.code.toLowerCase().includes(search.toLowerCase()) || 
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const calculateMargin = (price: number, cost: number, overhead: number) => {
    try {
      const p = new Decimal(price);
      const c = new Decimal(cost);
      const o = new Decimal(1).plus(new Decimal(overhead).div(100));
      const totalCost = c.mul(o);
      if (p.isZero()) return '0.00';
      const margin = p.minus(totalCost).div(p).mul(100);
      return margin.toFixed(2);
    } catch { return '0.00'; }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#121417] font-mono selection:bg-[#60A5FA] selection:text-[#121417]">
      {/* Main Module Content */}
      <div className={cn("p-8 space-y-8 flex-1 overflow-y-auto transition-all bg-[#121417] scrollbar-hide", selectedArticle ? "mr-[480px]" : "")}>
        <div className="flex justify-between items-end border-b border-[#2D3441] pb-8 font-mono">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
               <span className="text-[#60A5FA]">Article</span> <span className="text-[#F1F5F9]">Master</span>
            </h1>
            <p className="text-[10px] text-[#94A3B8] tracking-[0.2em] mt-2 uppercase">Industrial_Registry // INDUSTRIAL_CORE_v8.6.1</p>
          </div>
          <div className="flex gap-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={14} />
                <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="SEARCH_PROTOCOL_ID" 
                  className="bg-[#1C2028] border border-[#2D3441] text-[10px] pl-10 pr-4 py-3 rounded-[8px] focus:outline-none focus:border-[#60A5FA] w-64 uppercase text-[#F1F5F9]"
                />
             </div>
             <button 
               onClick={() => setShowWizard(true)}
               className="bg-[#60A5FA] text-[#121417] px-6 py-3 rounded-[8px] text-[10px] font-black uppercase flex items-center gap-2 hover:bg-[#3B82F6] transition-all shadow-[0_0_20px_rgba(96,165,250,0.15)]"
             >
                <PlusCircle size={14} /> CREATE ARTICLE
             </button>
             <button onClick={() => void fetchArticles()} className="bg-[#1C2028] border border-[#2D3441] p-3 rounded-[8px] text-[#94A3B8] hover:text-[#F1F5F9] transition-all">
                <RotateCcw size={16} />
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? [...Array(8)].map((_, i) => (
            <div key={i} className="h-64 bg-[#1C2028] border border-[#2D3441] animate-pulse rounded-[12px]" />
          )) : filteredArticles.length === 0 ? (
            <div className="col-span-full py-32 text-center border border-dashed border-[#2D3441] text-[#94A3B8] uppercase italic rounded-[12px]">
               NO_REGISTRY_ENTRIES_DETECTED
            </div>
          ) : filteredArticles.map((art) => (
            <div 
              key={art.id} 
              onClick={() => {
                setSelectedArticle(art);
                setTempCost(art.cost_per_set);
                setTempOverhead(art.overhead_pct ?? 0);
              }}
              className={cn(
                "group bg-[#1C2028] border p-6 rounded-[12px] cursor-pointer transition-all hover:border-[#60A5FA]/30 relative overflow-hidden shadow-xl",
                selectedArticle?.id === art.id ? "border-[#60A5FA] ring-1 ring-[#C5A059]/20 bg-[#242933]" : "border-[#2D3441]"
              )}
            >
               <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                     <p className="text-[8px] text-[#60A5FA] font-black uppercase tracking-widest leading-none">PROTOCOL_NODE</p>
                     <p className="text-[14px] font-black text-[#F1F5F9] leading-none tracking-tight">#{art.code}</p>
                  </div>
                  <div className="p-2 bg-[#121417] rounded-[8px] group-hover:bg-[#60A5FA]/10 transition-colors">
                     <TrendingUp size={14} className="text-[#60A5FA]" />
                  </div>
               </div>

               <h3 className="text-sm font-black text-[#F1F5F9] uppercase tracking-tight mb-1 truncate">{art.name}</h3>
               <div className="flex items-center gap-2 mb-8">
                  <div className="w-2 h-2 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)]" style={{ backgroundColor: art.desi_color_hex || '#60A5FA' }} />
                  <p className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider">{art.desi_color_name || 'GENERAL_COLOR'}</p>
               </div>

               <div className="flex justify-between items-end font-mono">
                  <div>
                    <p className="text-[8px] text-[#94A3B8] font-black uppercase tracking-widest mb-1 leading-none">Price / Set</p>
                    <p className="text-md font-black text-[#C5A059] tracking-tighter">Rs. {art.price_per_set.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-[#94A3B8] font-black uppercase tracking-widest mb-1 leading-none">Stock</p>
                    <p className="text-[12px] font-black text-[#F1F5F9]">{art.stock || 0} SETS</p>
                  </div>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Sensitivity Sidebar */}
      <aside 
        className={cn(
          "fixed top-16 right-0 w-[480px] h-[calc(100vh-64px)] bg-[#1C2028] border-l border-[#2D3441] transition-transform duration-500 z-40 flex flex-col font-mono shadow-2xl",
          selectedArticle ? "translate-x-0" : "translate-x-full"
        )}
      >
         {selectedArticle && (
            <div className="h-full flex flex-col">
              <div className="p-8 border-b border-[#2D3441] flex justify-between items-center bg-[#1C2028]/50">
                 <div>
                    <h2 className="text-xl font-black text-[#F1F5F9] uppercase tracking-tighter">Article Analysis</h2>
                    <p className="text-[9px] text-[#60A5FA] uppercase font-black tracking-widest mt-1">Ref: {selectedArticle.code}</p>
                 </div>
                 <button onClick={() => setSelectedArticle(null)} className="p-2 hover:bg-[#121417] transition-colors group rounded-[8px]">
                    <X size={20} className="text-[#94A3B8] group-hover:text-[#F1F5F9]" />
                 </button>
              </div>

              <div className="p-8 flex-1 overflow-y-auto space-y-10 scrollbar-hide">
                 {/* Visual Identity */}
                 <div className="flex gap-6 items-start">
                    <div className="w-32 h-32 bg-[#121417] border border-[#2D3441] rounded-[12px] relative overflow-hidden flex items-center justify-center shadow-inner">
                       {selectedArticle.image_url ? (
                         <Image src={selectedArticle.image_url} alt="Article" fill className="object-cover" />
                       ) : (
                         <div className="w-full h-full" style={{ backgroundColor: selectedArticle.desi_color_hex }} />
                       )}
                    </div>
                    <div className="flex-1 space-y-4">
                       <div>
                          <p className="text-[8px] text-[#94A3B8] font-black uppercase mb-1">Identity_Tag</p>
                          <h4 className="text-md font-black text-[#F1F5F9] uppercase tracking-tight">{selectedArticle.name}</h4>
                       </div>
                       <div className="flex items-center gap-3">
                          <div className="h-4 w-4 rounded-full border border-[#2D3441] shadow-sm" style={{ backgroundColor: selectedArticle.desi_color_hex }} />
                          <span className="text-[10px] font-bold text-[#94A3B8] uppercase">{selectedArticle.desi_color_name}</span>
                       </div>
                    </div>
                 </div>

                 {/* Pricing Sensitivity Engine */}
                 <div className="space-y-6">
                    <div className="flex justify-between items-center">
                       <h4 className="text-[9px] font-black text-[#60A5FA] uppercase tracking-[0.2em]">Sensitivity Engine</h4>
                       <span className="text-[8px] text-[#94A3B8] font-black uppercase tracking-widest">SECURE_AUDIT_STABLE</span>
                    </div>

                    <div className="space-y-8 bg-[#121417]/40 border border-[#2D3441] p-6 rounded-[12px]">
                       <div className="space-y-4">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                             <span className="text-[#94A3B8]">Base Cost (PKR)</span>
                             <span className="text-[#F1F5F9]">Rs. {tempCost}</span>
                          </div>
                          <input 
                            type="range" min="100" max="5000" step="10"
                            value={tempCost}
                            onChange={(e) => setTempCost(parseInt(e.target.value))}
                            className="w-full h-1 bg-[#2D3441] rounded-full appearance-none accent-[#C5A059]"
                          />
                       </div>

                       <div className="space-y-4">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                             <span className="text-[#94A3B8]">Industrial Overhead</span>
                             <span className="text-[#F1F5F9]">{tempOverhead}%</span>
                          </div>
                          <input 
                            type="range" min="0" max="50" step="1"
                            value={tempOverhead}
                            onChange={(e) => setTempOverhead(parseInt(e.target.value))}
                            className="w-full h-1 bg-[#2D3441] rounded-full appearance-none accent-[#C5A059]"
                          />
                       </div>

                       <div className="pt-6 border-t border-[#2D3441] flex justify-between items-end">
                          <div>
                             <p className="text-[8px] text-[#94A3B8] font-black uppercase mb-1 leading-none">Projected Margin</p>
                             <p className={cn(
                               "text-3xl font-black tracking-tighter leading-none",
                               parseFloat(calculateMargin(selectedArticle.price_per_set, tempCost, tempOverhead)) > 20 ? "text-[#34D399]" : "text-[#F87171]"
                             )}>
                                {calculateMargin(selectedArticle.price_per_set, tempCost, tempOverhead)}%
                             </p>
                          </div>
                          <div className="text-right">
                             <p className="text-[8px] text-[#94A3B8] font-black uppercase mb-1 leading-none">Final Price</p>
                             <p className="text-md font-black text-[#C5A059] uppercase tracking-tighter leading-none">Rs. {selectedArticle.price_per_set}</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="flex justify-center border border-[#2D3441] p-6 bg-[#121417]/40 rounded-[12px]">
                    {selectedArticle.qr_code_url ? (
                       <Image src={selectedArticle.qr_code_url} alt="QR" width={120} height={120} className="invert opacity-20" />
                    ) : (
                       <div className="text-[8px] text-[#2D3441] uppercase font-black italic">QR_LINK_ORPHANED</div>
                    )}
                 </div>
              </div>
            </div>
         )}
      </aside>

      {/* ARTICLE CREATE WIZARD */}
      {showWizard && <ArticleWizard onClose={() => setShowWizard(false)} onComplete={() => { setShowWizard(false); void fetchArticles(); }} />}
    </div>
  );
}

/**
 * SUB-COMPONENT: ARTICLE WIZARD
 */
function ArticleWizard({ onClose, onComplete }: { onClose: () => void, onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    size_protocol: '42',
    fabric_type: '',
    cost_per_set: 0,
    overhead_pct: 15,
    price_per_set: 0,
    desi_color_name: '',
    desi_color_hex: '#60A5FA',
    image: null as File | null
  });

  const generateCode = async () => {
    const { data: maxArt } = await supabase.from('articles').select('code').order('code', { ascending: false }).limit(1);
    const lastCode = maxArt?.[0]?.code || 'GS-ART-0000';
    const num = parseInt(lastCode.split('-')[2]) + 1;
    return `GS-ART-${num.toString().padStart(4, '0')}`;
  };

  const handleUpload = async (file: File, bucket: string, path: string) => {
    const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1024, useWebWorker: true };
    const compressedFile = await imageCompression(file, options);
    const { data } = await supabase.storage.from(bucket).upload(path, compressedFile);
    if (!data) return '';
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  };

  const calculateLiveMargin = () => {
    if (!formData.price_per_set) return '0.00';
    const totalCost = new Decimal(formData.cost_per_set).mul(1 + (formData.overhead_pct/100));
    const margin = new Decimal(formData.price_per_set).minus(totalCost).div(formData.price_per_set).mul(100);
    return margin.toFixed(2);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price_per_set) return;
    setSubmitting(true);
    try {
      const code = await generateCode();
      let imageUrl = '';
      let qrUrl = '';

      if (formData.image) {
        imageUrl = await handleUpload(formData.image, 'article-images', `${code}_${Date.now()}.jpg`);
      }

      const qrBuffer = await QRCode.toDataURL(`https://sovereign.erp/item/${code}`, { margin: 1 });
      const qrBlob = await (await fetch(qrBuffer)).blob();
      const qrFile = new File([qrBlob], `${code}_qr.png`, { type: 'image/png' });
      qrUrl = await handleUpload(qrFile, 'qr-codes', `${code}_qr.png`);

      const { error } = await supabase.from('articles').insert([{
        code,
        name: formData.name,
        // size_protocol: formData.size_protocol,
        // fabric_type: formData.fabric_type,
        cost_per_set: formData.cost_per_set,
        // overhead_pct: formData.overhead_pct,
        price_per_set: formData.price_per_set,
        // desi_color_name: formData.desi_color_name, // Blocked by schema mismatch
        // desi_color_hex: formData.desi_color_hex,
        // image_url: imageUrl,
        // qr_code_url: qrUrl
      }]);

      if (error) throw error;
      onComplete();
    } catch (e) {
      console.error('❌ ARTICLE_WIZARD_FAILURE:', e);
      alert('REGISTRATION_FAILED_SYNC');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#121417]/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300 font-mono">
       <div className="bg-[#1C2028] border border-[#2D3441] w-full max-w-2xl rounded-[12px] overflow-hidden flex flex-col shadow-2xl">
          <div className="p-8 border-b border-[#2D3441] flex justify-between items-center bg-[#121417]/50">
             <div className="flex items-center gap-3">
                <Package size={20} className="text-[#60A5FA]" />
                <h2 className="text-xs font-black text-[#F1F5F9] uppercase tracking-widest">Article Registration Protocol</h2>
             </div>
             <div className="flex items-center gap-4">
                <div className="flex gap-2">
                   {[1, 2, 3].map(n => (
                     <div key={n} className={cn("w-1.5 h-1.5 rounded-full transition-all", step === n ? "bg-[#60A5FA] w-4" : n < step ? "bg-[#34D399]" : "bg-[#2D3441]")} />
                   ))}
                </div>
                <button onClick={onClose} className="ml-4 text-[#94A3B8] hover:text-[#F1F5F9] transition-colors group">
                   <X size={20} className="group-hover:rotate-90 transition-transform" />
                </button>
             </div>
          </div>

          <div className="p-12 space-y-10 flex-1 overflow-y-auto max-h-[600px] scrollbar-hide">
             {step === 1 && (
               <div className="space-y-8 animate-in slide-in-from-right-4">
                  <h3 className="text-lg font-black text-[#F1F5F9] uppercase tracking-tighter">Phase 01 // Identity</h3>
                  <div className="grid grid-cols-1 gap-6">
                     <div className="space-y-2">
                        <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Formal Name</label>
                        <input 
                          value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                          placeholder="E.G. PREMIUM LAWN"
                          className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[11px] font-black text-[#F1F5F9] uppercase focus:border-[#60A5FA] rounded-[8px]" 
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Size Protocol</label>
                           <select 
                             value={formData.size_protocol} onChange={e => setFormData({...formData, size_protocol: e.target.value})}
                             className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[11px] font-black text-[#F1F5F9] uppercase focus:border-[#60A5FA] rounded-[8px]"
                           >
                              {['24', '30', '36', '42', '48'].map(s => <option key={s} value={s}>{s}_STANDARD</option>)}
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Fabric Integrity</label>
                           <input 
                             value={formData.fabric_type} onChange={e => setFormData({...formData, fabric_type: e.target.value})}
                             placeholder="E.G. COTTON_MIX"
                             className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[11px] font-black text-[#F1F5F9] uppercase focus:border-[#60A5FA] rounded-[8px]" 
                           />
                        </div>
                     </div>
                  </div>
               </div>
             )}

             {step === 2 && (
               <div className="space-y-8 animate-in slide-in-from-right-4 text-[#F1F5F9]">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black uppercase tracking-tighter">Phase 02 // Pricing Sensitivity</h3>
                    <div className="text-right">
                       <p className="text-[8px] text-[#94A3B8] uppercase font-black mb-1 leading-none">Projected_Margin</p>
                       <p className={cn("text-lg font-black leading-none", parseFloat(calculateLiveMargin()) > 20 ? "text-[#34D399]" : "text-[#F87171]")}>{calculateLiveMargin()}%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Cost Per Set (PKR)</label>
                           <input 
                              type="number" 
                              inputMode="numeric"
                              value={formData.cost_per_set} onChange={e => setFormData({...formData, cost_per_set: Number(e.target.value)})}
                              className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[11px] font-black text-[#F1F5F9] rounded-[8px] focus:border-[#60A5FA] outline-none" 
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Institutional Overhead (%)</label>
                           <input 
                              type="number" 
                              inputMode="numeric"
                              value={formData.overhead_pct} onChange={e => setFormData({...formData, overhead_pct: Number(e.target.value)})}
                              className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[11px] font-black text-[#F1F5F9] rounded-[8px] focus:border-[#60A5FA] outline-none" 
                           />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[8px] font-black text-[#60A5FA] uppercase tracking-[0.2em] block">Target Retail / Set (PKR)</label>
                        <input 
                           type="number" 
                           inputMode="numeric"
                           value={formData.price_per_set} onChange={e => setFormData({...formData, price_per_set: Number(e.target.value)})}
                           className="w-full bg-[#60A5FA]/10 border border-[#60A5FA]/20 p-6 text-2xl font-black text-[#C5A059] focus:border-[#60A5FA] rounded-[8px] outline-none" 
                        />
                     </div>
                  </div>
               </div>
             )}

             {step === 3 && (
               <div className="space-y-8 animate-in slide-in-from-right-4 text-[#F1F5F9]">
                  <h3 className="text-lg font-black uppercase tracking-tighter">Phase 03 // Visuals & Color</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Desi Color ID</label>
                           <input 
                              placeholder="E.G. ZINC / FALSA"
                              value={formData.desi_color_name} onChange={e => setFormData({...formData, desi_color_name: e.target.value})}
                              className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[11px] font-black text-[#F1F5F9] uppercase rounded-[8px] focus:border-[#60A5FA] outline-none" 
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Color Mapping (Hex)</label>
                           <div className="flex gap-3 items-center">
                              <input 
                                type="color" value={formData.desi_color_hex} onChange={e => setFormData({...formData, desi_color_hex: e.target.value})}
                                className="w-12 h-12 bg-transparent border-0 p-0 cursor-pointer rounded-full overflow-hidden" 
                              />
                              <input 
                                value={formData.desi_color_hex} onChange={e => setFormData({...formData, desi_color_hex: e.target.value})}
                                className="flex-1 bg-[#121417] border border-[#2D3441] p-3 text-[10px] font-black text-[#94A3B8] uppercase rounded-[8px] focus:border-[#60A5FA] outline-none" 
                              />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Media Payload</label>
                        <label className="w-full aspect-square bg-[#121417] border border-dashed border-[#2D3441] rounded-[12px] flex flex-col items-center justify-center cursor-pointer hover:border-[#60A5FA]/30 transition-all relative overflow-hidden group">
                           <input 
                             type="file" accept="image/*" className="hidden"
                             onChange={e => setFormData({...formData, image: e.target.files?.[0] || null})}
                           />
                           {formData.image ? (
                             <Image src={URL.createObjectURL(formData.image)} alt="Preview" fill className="object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                           ) : (
                             <>
                               <Camera size={24} className="text-[#2D3441] mb-2 group-hover:text-[#60A5FA] transition-colors" />
                               <span className="text-[8px] font-black text-[#4B5563] uppercase tracking-widest group-hover:text-[#60A5FA] transition-colors">Load_Visual_Data</span>
                             </>
                           )}
                        </label>
                     </div>
                  </div>
               </div>
             )}
          </div>

          <div className="p-8 border-t border-[#2D3441] flex gap-4 bg-[#121417]">
             {step > 1 && (
               <button onClick={() => setStep(step - 1)} className="px-8 py-4 border border-[#2D3441] text-[9px] font-black uppercase text-[#94A3B8] hover:text-[#F1F5F9] transition-all rounded-[8px]">Previous</button>
             )}
             <button 
               onClick={step === 3 ? handleSubmit : () => setStep(step + 1)}
               disabled={submitting}
               className="flex-1 py-4 bg-[#60A5FA] text-[#121417] text-[10px] font-black uppercase hover:bg-[#3B82F6] transition-all flex items-center justify-center gap-3 disabled:opacity-50 rounded-[8px] shadow-lg shadow-[#60A5FA]/10"
             >
                {submitting ? (
                   <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                   step === 3 ? <CheckCircle2 size={16} /> : <ChevronRight size={16} />
                )}
                {step === 3 ? 'COMMIT_REGISTRATION' : 'NEXT_PROTOCOL'}
             </button>
          </div>
       </div>
    </div>
  );
}

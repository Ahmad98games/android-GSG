'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, Plus, 
  Phone, MapPin, 
  BookOpen, MoreVertical, X,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { DataTableSearch } from '@/components/ui/DataTableSearch';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/lib/hooks/useToast';

/**
 * INDUSTRIAL PARTIES REGISTRY (v8.6.1)
 * Unified identity management for Customers and Suppliers.
 */

interface Party {
  id: string;
  name: string;
  phone: string;
  address: string;
  type: 'CUSTOMER' | 'SUPPLIER';
  created_at: string;
  balance?: number;
}

export default function PartiesPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    type: 'CUSTOMER' as 'CUSTOMER' | 'SUPPLIER'
  });
  const [submitting, setSubmitting] = useState(false);
  const initialized = useRef(false);

  const fetchParties = useCallback(async (isInitial: boolean = false) => {
    if (!isInitial) setLoading(true);
    try {
      // 1. Fetch Basic Party Info
      const { data: partyData, error: partyError } = await supabase
        .from('parties')
        .select('*')
        .order('name');

      if (partyError) throw partyError;

      // 2. Fetch Khata Balances for all parties
      const { data: khataData, error: khataError } = await supabase
        .from('khata_entries')
        .select('party_id, entry_type, amount');

      if (khataError) throw khataError;

      // 3. Synthesize Balances
      const synthesizedParties = (partyData || []).map((p: Party) => {
        const pEntries = (khataData || []).filter(e => e.party_id === p.id);
        const balance = pEntries.reduce((acc, curr) => {
          return curr.entry_type === 'CREDIT' ? acc + Number(curr.amount) : acc - Number(curr.amount);
        }, 0);
        return { ...p, balance };
      });

      setParties(synthesizedParties);
    } catch (error: unknown) {
      const err = error as { message?: string };
      addToast({
        type: 'ERROR',
        title: 'Registry Sync Error',
        message: err.message || 'Unable to fetch the industrial parties registry from the core.'
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void fetchParties(true);
    }
  }, [fetchParties]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('parties')
        .insert([formData]);

      if (error) throw error;
      
      setShowModal(false);
      setFormData({ name: '', phone: '', address: '', type: 'CUSTOMER' });
      void fetchParties();
      addToast({
        type: 'SUCCESS',
        title: 'Party Registered',
        message: `${formData.name} has been added to the sovereign identity ledger.`
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      addToast({
        type: 'ERROR',
        title: 'Credentialing Failure',
        message: err.message || 'The system refused to commit the party registration.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredParties = parties.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.phone.includes(search)
  );

  return (
    <div className="p-8 space-y-8 bg-[#121417] min-h-screen text-[#F1F5F9] font-mono select-none selection:bg-[#60A5FA] selection:text-white">
      {/* Header Pipeline */}
      <div className="flex justify-between items-end border-b border-[#2D3441] pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">
             <span className="text-[#60A5FA]">Parties</span> <span className="text-[#60A5FA]">Registry</span>
          </h1>
          <p className="text-[10px] text-[#94A3B8] tracking-[0.2em] mt-2 uppercase">Identity_Control // INDUSTRIAL_CORE_v8.6.1</p>
        </div>
        <div className="flex items-center gap-4">
           <DataTableSearch 
             value={search}
             onChange={setSearch}
             placeholder="SEARCH_PARTIES..."
           />
           <button 
             onClick={() => setShowModal(true)}
             className="bg-[#60A5FA] text-[#121417] px-6 py-3 rounded-[8px] text-[10px] font-black uppercase flex items-center gap-2 hover:bg-[#3B82F6] transition-all shadow-[0_0_20px_rgba(96,165,250,0.15)]"
           >
              <Plus size={14} /> Create Party
           </button>
        </div>
      </div>

      {/* Parties Telemetry */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[...Array(6)].map((_, i) => (
             <CardSkeleton key={i} />
           ))}
        </div>
      ) : filteredParties.length === 0 ? (
        <div className="py-32 text-center border border-dashed border-[#2D3441] rounded-[12px]">
           <Users size={48} className="mx-auto mb-4 text-[#2D3441] opacity-20" />
           <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-black">No parties registered in the current sector</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredParties.map((party) => (
             <div 
               key={party.id} 
               className="group bg-[#1C2028] border border-[#2D3441] p-6 rounded-[12px] hover:border-[#60A5FA]/30 transition-all flex flex-col justify-between"
             >
                <div>
                   <div className="flex justify-between items-start mb-6">
                      <div className={cn(
                        "px-2 py-0.5 text-[7px] font-black rounded-[4px] border uppercase tracking-tighter",
                        party.type === 'CUSTOMER' ? "text-[#60A5FA] border-[#60A5FA]/20 bg-[#60A5FA]/5" : "text-[#F59E0B] border-[#F59E0B]/20 bg-[#F59E0B]/5"
                      )}>
                         {party.type}
                      </div>
                      <button className="text-[#2D3441] group-hover:text-[#94A3B8] transition-colors">
                         <MoreVertical size={14} />
                      </button>
                   </div>

                   <h3 className="text-sm font-black text-[#F1F5F9] uppercase tracking-tight mb-4 group-hover:text-[#60A5FA] transition-colors">{party.name}</h3>
                   
                   <div className="space-y-3">
                      <div className="flex items-center gap-3 text-[9px] text-[#94A3B8] font-bold uppercase">
                         <Phone size={12} className="text-[#2D3441]" /> {party.phone}
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-[#94A3B8] font-bold uppercase">
                         <MapPin size={12} className="text-[#2D3441]" /> {party.address || 'LOC_NOT_SPECIFIED'}
                      </div>
                   </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#2D3441] flex justify-between items-end">
                   <div>
                      <p className="text-[8px] text-[#2D3441] uppercase font-black mb-1">Khata Balance</p>
                      <p className={cn(
                        "text-xs font-black font-mono tracking-tight",
                        (party.balance || 0) >= 0 ? "text-[#34D399]" : "text-[#F87171]"
                      )}>
                         Rs. {Math.abs(party.balance || 0).toLocaleString()}.00
                         <span className="text-[8px] ml-1 opacity-50 uppercase">{(party.balance || 0) >= 0 ? 'CR' : 'DR'}</span>
                      </p>
                   </div>
                   <button 
                     onClick={() => router.push(`/dashboard/khata?party=${party.id}`)}
                     className="p-2 border border-[#2D3441] hover:border-[#60A5FA]/30 hover:bg-[#242933] transition-all text-[#94A3B8] hover:text-[#60A5FA] rounded-[8px]"
                   >
                      <BookOpen size={14} />
                   </button>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#1C2028] border border-[#2D3441] w-full max-w-md p-8 rounded-[12px] space-y-8 relative overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center">
                 <h2 className="text-sm font-black text-[#F1F5F9] uppercase tracking-[0.2em] flex items-center gap-2">
                    <Users size={16} className="text-[#60A5FA]" /> New Party Registration
                 </h2>
                 <button onClick={() => setShowModal(false)} className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors">
                    <X size={18} />
                 </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-6 text-[#F1F5F9]">
                 <div className="space-y-2">
                    <label className="text-[8px] font-black text-[#2D3441] uppercase tracking-widest block">Relationship Type</label>
                    <div className="grid grid-cols-2 gap-4">
                       {(['CUSTOMER', 'SUPPLIER'] as const).map((type) => (
                         <button 
                           key={type}
                           type="button"
                           onClick={() => setFormData(f => ({ ...f, type }))}
                           className={cn(
                             "py-4 border text-[9px] font-black uppercase tracking-widest transition-all rounded-[8px]",
                             formData.type === type ? "bg-[#60A5FA] text-[#121417] border-[#60A5FA]" : "bg-[#121417]/40 text-[#94A3B8] border-[#2D3441] hover:border-[#3D4757]"
                           )}
                         >
                            {type}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[8px] font-black text-[#2D3441] uppercase tracking-widest block">Formal Name / Entity</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-[#121417]/40 border border-[#2D3441] text-[10px] font-black text-[#F1F5F9] px-4 py-3 focus:outline-none focus:border-[#60A5FA]/40 uppercase rounded-[8px]" 
                      placeholder="ENTER_PARTY_NAME"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[8px] font-black text-[#2D3441] uppercase tracking-widest block">Communication Line (Phone)</label>
                    <input 
                      required
                      value={formData.phone}
                      onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                      className="w-full bg-[#121417]/40 border border-[#2D3441] text-[10px] font-black text-[#F1F5F9] px-4 py-3 focus:outline-none focus:border-[#60A5FA]/40 uppercase rounded-[8px]" 
                      placeholder="+92 XXX XXXXXXX"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[8px] font-black text-[#2D3441] uppercase tracking-widest block">Geographic HQ (Address)</label>
                    <textarea 
                      value={formData.address}
                      onChange={e => setFormData(f => ({ ...f, address: e.target.value }))}
                      className="w-full bg-[#121417]/40 border border-[#2D3441] text-[10px] font-black text-[#F1F5F9] px-4 py-3 h-20 focus:outline-none focus:border-[#60A5FA]/40 uppercase resize-none rounded-[8px]" 
                      placeholder="ENTER_PHYSICAL_LOCATION"
                    />
                 </div>

                 <button 
                   disabled={submitting}
                   className={cn(
                     "w-full py-4 bg-[#60A5FA] text-[#121417] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#3B82F6] transition-all flex items-center justify-center gap-3 rounded-[8px] shadow-lg",
                     submitting && "opacity-50 cursor-not-allowed"
                   )}
                 >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-[#121417]/20 border-t-[#121417] animate-spin rounded-full" />
                    ) : (
                      <CheckCircle size={14} />
                    )}
                    COMMIT_REGISTRATION
                 </button>
              </form>

              <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                 <Users size={160} />
              </div>
           </div>
        </div>
      )}
    </div>
  );
}


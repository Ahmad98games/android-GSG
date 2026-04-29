'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Truck, Search, Plus,
  MapPin, X, Loader2,
  CheckCircle2, ChevronRight,
  Package, Terminal, RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportToXLSX } from '@/lib/utils/xlsx-export';
import { useRouter } from 'next/navigation';

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  fabric_types: string[] | null;
  rating: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);

  const [form, setForm] = useState({
    name: '', phone: '', address: '', fabric_types: '' as string, rating: 3, notes: '', is_active: true
  });

  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async (isInitial: boolean = false) => {
    if (!isInitial) setLoading(true);
    setErrorStatus(null);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        if (error.message.includes('relation "public.suppliers" does not exist') || 
            error.message.includes('schema cache')) {
          setErrorStatus('SCHEMA_MISSING');
        }
        throw error;
      }
      setSuppliers(data || []);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error('❌ SUPPLIERS_FETCH:', err.message || e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void fetchSuppliers(true);
    }
  }, [fetchSuppliers]);

  const openEdit = (s: Supplier) => {
    setEditTarget(s);
    setForm({
      name: s.name, phone: s.phone || '', address: s.address || '',
      fabric_types: (s.fabric_types || []).join(', '), rating: s.rating,
      notes: s.notes || '', is_active: s.is_active
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditTarget(null);
    setForm({ name: '', phone: '', address: '', fabric_types: '', rating: 3, notes: '', is_active: true });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone || null,
        address: form.address || null,
        fabric_types: form.fabric_types ? form.fabric_types.split(',').map(s => s.trim()).filter(Boolean) : [],
        rating: form.rating,
        notes: form.notes || null,
        is_active: form.is_active
      };

      if (editTarget) {
        const { error } = await supabase.from('suppliers').update(payload).eq('id', editTarget.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('suppliers').insert(payload);
        if (error) throw error;
      }
      setShowForm(false);
      void fetchSuppliers();
    } catch (e) {
      console.error('❌ SUPPLIER_SAVE:', e);
      alert('Failed to save supplier.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  );

  return (
    <div className="p-8 space-y-8 bg-[#121417] min-h-screen text-[#F1F5F9] font-mono select-none">
      <div className="flex justify-between items-end border-b border-[#2D3441] pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">
             <span className="text-[#60A5FA]">Suppliers</span> <span className="text-[#60A5FA]">Ledger</span>
          </h1>
          <p className="text-[10px] text-[#94A3B8] tracking-[0.2em] mt-2 uppercase">Wholesale_Control_Sync // INDUSTRIAL_CORE_v8.6.1</p>
        </div>
      </div>

      {errorStatus === 'SCHEMA_MISSING' && (
        <div className="bg-[#60A5FA]/10 border border-[#60A5FA]/30 p-8 rounded-[8px] space-y-4">
          <div className="flex items-center gap-3 text-[#60A5FA]">
            <RotateCcw size={20} />
            <p className="text-sm font-black uppercase tracking-tighter">Emergency Schema Restoration Required</p>
          </div>
          <p className="text-xs text-[#94A3B8] font-mono leading-relaxed">
            The industrial procurement engine detected a missing <code className="text-white">public.suppliers</code> table. 
            Run the following SQL in your Supabase SQL Editor to restore functionality:
          </p>
          <pre className="bg-[#121417]/50 p-6 text-[10px] text-[#94A3B8] overflow-x-auto border border-[#2D3441] font-mono select-all rounded-[4px]">
{`CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);`}
          </pre>
          <button 
            onClick={() => void fetchSuppliers()}
            className="text-[10px] font-black text-[#60A5FA] uppercase hover:text-white transition-all underline underline-offset-4"
          >
            Retry Connection
          </button>
        </div>
      )}

      <div className="flex gap-4">
          <button
            onClick={() => exportToXLSX(suppliers, 'Sovereign_Suppliers', 'Suppliers')}
            className="px-6 py-3 bg-[#1C2028] border border-[#2D3441] text-[10px] font-black uppercase text-[#94A3B8] hover:text-[#F1F5F9] transition-all rounded-[8px]"
          >
            Export_XLSX
          </button>
          <button
            onClick={() => router.push('/dashboard/suppliers/po')}
            className="px-6 py-3 bg-[#1C2028] border border-[#2D3441] text-[10px] font-black uppercase text-[#94A3B8] hover:text-[#F1F5F9] transition-all flex items-center gap-2 rounded-[8px]"
          >
            <Package size={14} /> Purchase_Orders
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={14} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="SEARCH_SUPPLIER"
              className="bg-[#121417] border border-[#2D3441] text-[10px] pl-10 pr-4 py-3 rounded-[8px] focus:outline-none focus:border-[#60A5FA] w-64 uppercase text-[#F1F5F9]"
            />
          </div>
          <button onClick={openNew} className="bg-[#60A5FA] text-[#121417] px-6 py-3 rounded-[8px] text-[10px] font-black uppercase flex items-center gap-2 hover:bg-[#3B82F6] transition-all shadow-[0_0_20px_rgba(96,165,250,0.15)]">
            <Plus size={14} /> New_Supplier
          </button>
        </div>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? [...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-[#242933] border border-[#2D3441] animate-pulse rounded-[12px]" />
        )) : filtered.length === 0 ? (
          <div className="col-span-full py-32 text-center border border-dashed border-[#2D3441] rounded-[12px]">
            <Truck size={32} className="mx-auto text-[#2D3441] mb-4" />
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-black">No Suppliers Registered</p>
            <button onClick={openNew} className="mt-6 bg-[#60A5FA] text-[#121417] px-6 py-3 text-[10px] font-black uppercase rounded-[8px] hover:bg-[#3B82F6] transition-all">
              Register First Supplier
            </button>
          </div>
        ) : filtered.map(s => (
          <div
            key={s.id}
            onClick={() => openEdit(s)}
            className="bg-[#1C2028] border border-[#2D3441] p-6 rounded-[12px] cursor-pointer hover:border-[#60A5FA]/30 transition-all group shadow-xl"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-black text-[#F1F5F9] uppercase tracking-tighter group-hover:text-[#60A5FA] transition-colors">{s.name}</p>
                {s.phone && (
                  <p className="text-[10px] text-[#94A3B8] flex items-center gap-1 mt-1">
                      <Terminal size={10} /> SECURE_COMMS_STABLE
                  </p>
                )}
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} className={cn("w-1.5 h-1.5 rounded-full", n <= s.rating ? "bg-[#C5A059]" : "bg-[#121417]")} />
                ))}
              </div>
            </div>
            {s.address && (
              <p className="text-[9px] text-[#2D3441] flex items-center gap-1 mb-3">
                <MapPin size={10} /> {s.address}
              </p>
            )}
            {s.fabric_types && s.fabric_types.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {s.fabric_types.map((ft, i) => (
                  <span key={i} className="px-2 py-0.5 bg-[#121417] text-[8px] text-[#94A3B8] font-black uppercase rounded-[4px]">{ft}</span>
                ))}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-[#2D3441] flex justify-between items-center">
              <span className={cn("text-[9px] font-black uppercase", s.is_active ? "text-[#34D399]" : "text-[#2D3441]")}>
                {s.is_active ? 'ACTIVE' : 'INACTIVE'}
              </span>
              <ChevronRight size={12} className="text-[#2D3441] group-hover:text-[#60A5FA] transition-colors" />
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-[#121417]/95 backdrop-blur-md z-[100] flex items-center justify-center p-6 font-mono">
          <div className="bg-[#1C2028] border border-[#2D3441] w-full max-w-lg rounded-[12px] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-[#2D3441] flex justify-between items-center">
              <h2 className="text-xs font-black text-[#F1F5F9] uppercase tracking-widest">
                {editTarget ? 'Edit Supplier' : 'Register Supplier'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-[#94A3B8] hover:text-[#F1F5F9]"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[10px] font-black text-[#F1F5F9] uppercase outline-none focus:border-[#60A5FA] rounded-[8px]" />
              </div>
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Phone</label>
                  <input value={form.phone} 
                    type="tel"
                    inputMode="tel"
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[10px] font-black text-[#F1F5F9] outline-none focus:border-[#60A5FA] rounded-[8px]" />
                </div>
                 <div className="space-y-2">
                  <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Rating (1-5)</label>
                  <input type="number" 
                    inputMode="numeric"
                    min={1} max={5} value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })}
                    className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[10px] font-black text-[#F1F5F9] outline-none focus:border-[#60A5FA] rounded-[8px]" />
                </div>
              </div>
               <div className="space-y-2">
                <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Address</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[10px] font-black text-[#F1F5F9] outline-none focus:border-[#60A5FA] rounded-[8px]" />
              </div>
               <div className="space-y-2">
                <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Fabric Types (comma-separated)</label>
                <input value={form.fabric_types} onChange={e => setForm({ ...form, fabric_types: e.target.value })}
                  placeholder="Lawn, Cotton, Silk"
                  className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[10px] font-black text-[#F1F5F9] outline-none focus:border-[#60A5FA] rounded-[8px]" />
              </div>
               <div className="space-y-2">
                <label className="text-[8px] font-black text-[#94A3B8] uppercase tracking-widest block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                  className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[10px] font-black text-[#F1F5F9] outline-none focus:border-[#60A5FA] resize-none rounded-[8px]" />
              </div>
            </div>
             <div className="p-8 border-t border-[#2D3441] flex gap-4">
              <button onClick={() => setShowForm(false)} className="px-8 py-4 border border-[#2D3441] text-[9px] font-black uppercase text-[#94A3B8] hover:text-[#F1F5F9] transition-all rounded-[8px]">Cancel</button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 py-4 bg-[#60A5FA] text-[#121417] text-[10px] font-black uppercase hover:bg-[#3B82F6] transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(96,165,250,0.3)] rounded-[8px]">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                {editTarget ? 'Update_Supplier' : 'Register_Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


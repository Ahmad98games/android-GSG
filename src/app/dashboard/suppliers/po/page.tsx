'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus, X, Loader2,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Decimal from 'decimal.js';
import { useRouter } from 'next/navigation';

interface PO {
  id: string;
  code: string;
  supplier_id: string;
  status: string;
  fabric_type: string;
  quantity_gaz: number;
  unit_price_per_gaz: number;
  total_cost: number;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  notes: string | null;
  suppliers: { name: string } | null;
}

interface Supplier {
  id: string;
  name: string;
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [showGRN, setShowGRN] = useState<PO | null>(null);
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);

  const [form, setForm] = useState({
    supplier_id: '', fabric_type: '', quantity_gaz: '', unit_price_per_gaz: '',
    order_date: new Date().toISOString().split('T')[0], expected_date: '', notes: ''
  });

  const [grnForm, setGrnForm] = useState({ quantity_received: '', quality_grade: 'A', notes: '' });

  const fetchPOs = useCallback(async (isInitial: boolean = false) => {
    if (!isInitial) setLoading(true);
    try {
      const [{ data: pos }, { data: sups }] = await Promise.all([
        supabase.from('purchase_orders').select('*, suppliers(name)').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('id, name').eq('is_active', true)
      ]);
      setOrders((pos as unknown as PO[]) || []);
      setSuppliers(sups || []);
    } catch (e) {
      console.error('❌ PO_FETCH:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) { initialized.current = true; void fetchPOs(true); }
  }, [fetchPOs]);

  const liveTotal = () => {
    try {
      return new Decimal(form.quantity_gaz || 0).times(form.unit_price_per_gaz || 0).toFixed(2);
    } catch { return '0.00'; }
  };

  const handleCreatePO = async () => {
    if (!form.supplier_id || !form.fabric_type || !form.quantity_gaz) return;
    setSaving(true);
    try {
      // Generate PO code
      const year = new Date().getFullYear();
      const { count } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true });
      const code = `PO-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
      const total = new Decimal(form.quantity_gaz).times(form.unit_price_per_gaz).toFixed(2);

      const { error } = await supabase.from('purchase_orders').insert({
        code,
        supplier_id: form.supplier_id,
        fabric_type: form.fabric_type,
        quantity_gaz: parseFloat(form.quantity_gaz),
        unit_price_per_gaz: parseFloat(form.unit_price_per_gaz),
        total_cost: parseFloat(total),
        order_date: form.order_date,
        expected_date: form.expected_date || null,
        notes: form.notes || null,
        status: 'ORDERED'
      });
      if (error) throw error;
      setShowForm(false);
      setForm({ supplier_id: '', fabric_type: '', quantity_gaz: '', unit_price_per_gaz: '', order_date: new Date().toISOString().split('T')[0], expected_date: '', notes: '' });
      void fetchPOs();
    } catch (e) {
      console.error('❌ PO_CREATE:', e);
      alert('Failed to create PO.');
    } finally { setSaving(false); }
  };

  const handleGRN = async () => {
    if (!showGRN || !grnForm.quantity_received) return;
    setSaving(true);
    try {
      const { error: grnErr } = await supabase.from('goods_received').insert({
        po_id: showGRN.id,
        quantity_received: parseFloat(grnForm.quantity_received),
        quality_grade: grnForm.quality_grade,
        notes: grnForm.notes || null
      });
      if (grnErr) throw grnErr;

      // Check total received vs ordered
      const { data: allGRNs } = await supabase.from('goods_received').select('quantity_received').eq('po_id', showGRN.id);
      const totalReceived = (allGRNs || []).reduce((sum, g) => sum + Number(g.quantity_received), 0);
      const newStatus = totalReceived >= showGRN.quantity_gaz ? 'RECEIVED' : 'PARTIAL';

      await supabase.from('purchase_orders').update({
        status: newStatus,
        received_date: newStatus === 'RECEIVED' ? new Date().toISOString().split('T')[0] : null
      }).eq('id', showGRN.id);

      setShowGRN(null);
      setGrnForm({ quantity_received: '', quality_grade: 'A', notes: '' });
      void fetchPOs();
    } catch (e) {
      console.error('❌ GRN_SUBMIT:', e);
      alert('Failed to record receipt.');
    } finally { setSaving(false); }
  };

  const statusFilters = ['ALL', 'DRAFT', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED'];
  const filtered = orders.filter(o => filter === 'ALL' || o.status === filter);

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'ORDERED': return 'text-[#2E90FF] border-[#2E90FF]/20';
      case 'PARTIAL': return 'text-[#FBBF24] border-[#FBBF24]/20';
      case 'RECEIVED': return 'text-[#34D399] border-[#34D399]/20';
      case 'CANCELLED': return 'text-[#F87171] border-[#F87171]/20';
      default: return 'text-[#94A3B8] border-[#2D3441]';
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#121417] min-h-screen text-[#F1F5F9] font-mono select-none selection:bg-[#60A5FA] selection:text-white">
      <div className="flex justify-between items-end border-b border-[#2D3441] pb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/suppliers')} className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-[#F1F5F9] uppercase">Purchase Orders</h1>
            <p className="text-[10px] text-[#94A3B8] tracking-[0.2em] mt-2 uppercase">Procurement_Pipeline // INDUSTRIAL_CORE_v8.6.1</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-[#60A5FA] text-[#121417] px-6 py-3 rounded-[8px] text-[10px] font-black uppercase flex items-center gap-2 hover:bg-[#3B82F6] transition-all shadow-lg">
          <Plus size={14} /> Create_PO
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2">
        {statusFilters.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn("px-4 py-2 text-[9px] font-black uppercase border rounded-[8px] transition-all",
              filter === s ? "bg-[#60A5FA] text-[#121417] border-[#60A5FA]" : "bg-[#1C2028] text-[#94A3B8] border-[#2D3441] hover:bg-[#242933]"
            )}>
            {s} {s !== 'ALL' && `(${orders.filter(o => o.status === s).length})`}
          </button>
        ))}
      </div>

      {/* PO Table */}
      <div className="bg-[#1C2028] border border-[#2D3441] rounded-[12px] overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-[#121417]/40 text-[9px] text-[#94A3B8] uppercase tracking-[0.2em] border-b border-[#2D3441]">
            <tr>
              <th className="p-6 font-black">PO Code</th>
              <th className="p-6 font-black">Supplier</th>
              <th className="p-6 font-black">Fabric</th>
              <th className="p-6 font-black text-right">Quantity (Gaz)</th>
              <th className="p-6 font-black text-right">Total (Rs.)</th>
              <th className="p-6 font-black text-center">Status</th>
              <th className="p-6 font-black text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2D3441] text-[10px]">
            {loading ? <tr><td colSpan={7} className="p-16 text-center animate-pulse text-[#2D3441]">Loading...</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={7} className="p-16 text-center text-[#2D3441] uppercase italic">No purchase orders</td></tr>
            : filtered.map(po => (
              <tr key={po.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-6 font-black text-[#60A5FA]">{po.code}</td>
                <td className="p-6 font-black text-white uppercase">{po.suppliers?.name}</td>
                <td className="p-6 text-zinc-500 uppercase">{po.fabric_type}</td>
                <td className="p-6 text-right text-white font-black">{Number(po.quantity_gaz).toLocaleString()}</td>
                <td className="p-6 text-right text-white font-black">Rs. {Number(po.total_cost).toLocaleString()}</td>
                <td className="p-6 text-center">
                  <span className={cn("px-3 py-1 border rounded-full text-[9px] font-black uppercase", getStatusColor(po.status))}>{po.status}</span>
                </td>
                <td className="p-6 text-right">
                  {(po.status === 'ORDERED' || po.status === 'PARTIAL') && (
                    <button onClick={() => setShowGRN(po)}
                      className="px-4 py-2 bg-[#34D399]/10 border border-[#34D399]/20 text-[9px] font-black text-[#34D399] uppercase hover:bg-[#34D399]/20 transition-all rounded-[8px]">
                      Receive
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create PO Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-[#121417]/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 font-mono">
          <div className="bg-[#1C2028] border border-[#2D3441] w-full max-w-lg rounded-[12px] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-[#2D3441] flex justify-between items-center">
              <h2 className="text-xs font-black text-[#F1F5F9] uppercase tracking-widest">New Purchase Order</h2>
              <button onClick={() => setShowForm(false)} className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-zinc-700 uppercase tracking-widest block">Supplier *</label>
                <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                  className="w-full bg-black border border-white/5 p-4 text-[10px] font-black text-white uppercase outline-none focus:border-[#60A5FA]">
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-[#2D3441] uppercase tracking-widest block">Fabric Type *</label>
                <input value={form.fabric_type} onChange={e => setForm({ ...form, fabric_type: e.target.value })}
                  placeholder="e.g. Lawn, Cotton, Silk"
                  className="w-full bg-[#121417] border border-[#2D3441] p-4 text-[10px] font-black text-[#F1F5F9] outline-none focus:border-[#60A5FA]/50 rounded-[8px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-zinc-700 uppercase tracking-widest block">Quantity (Gaz) *</label>
                  <input type="number" inputMode="numeric" value={form.quantity_gaz} onChange={e => setForm({ ...form, quantity_gaz: e.target.value })}
                    className="w-full bg-black border border-white/5 p-4 text-[10px] font-black text-white outline-none focus:border-[#60A5FA]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-zinc-700 uppercase tracking-widest block">Price per Gaz (Rs.) *</label>
                  <input type="number" inputMode="numeric" value={form.unit_price_per_gaz} onChange={e => setForm({ ...form, unit_price_per_gaz: e.target.value })}
                    className="w-full bg-black border border-white/5 p-4 text-[10px] font-black text-white outline-none focus:border-[#60A5FA]" />
                </div>
              </div>
              <div className="p-4 bg-[#60A5FA]/5 border border-[#60A5FA]/20 flex justify-between items-center rounded-[8px]">
                <span className="text-[9px] font-black text-[#94A3B8] uppercase">Total Cost</span>
                <span className="text-lg font-black text-[#C5A059]">Rs. {Number(liveTotal()).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-zinc-700 uppercase tracking-widest block">Order Date</label>
                  <input type="date" value={form.order_date} onChange={e => setForm({ ...form, order_date: e.target.value })}
                    className="w-full bg-black border border-white/5 p-4 text-[10px] font-black text-white outline-none focus:border-[#60A5FA]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-zinc-700 uppercase tracking-widest block">Expected Date</label>
                  <input type="date" value={form.expected_date} onChange={e => setForm({ ...form, expected_date: e.target.value })}
                    className="w-full bg-black border border-white/5 p-4 text-[10px] font-black text-white outline-none focus:border-[#60A5FA]" />
                </div>
              </div>
            </div>
            <div className="p-8 border-t border-[#2D3441] flex gap-4">
              <button onClick={() => setShowForm(false)} className="px-8 py-4 border border-[#2D3441] text-[9px] font-black uppercase text-[#94A3B8] rounded-[8px] hover:bg-[#242933] transition-all">Cancel</button>
              <button onClick={handleCreatePO} disabled={saving}
                className="flex-1 py-4 bg-[#60A5FA] text-[#121417] text-[10px] font-black uppercase hover:bg-[#3B82F6] flex items-center justify-center gap-3 rounded-[8px] shadow-lg">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Create_Purchase_Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRN Modal */}
      {showGRN && (
        <div className="fixed inset-0 bg-[#121417]/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 font-mono">
          <div className="bg-[#1C2028] border border-[#2D3441] w-full max-md rounded-[12px] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-[#2D3441] flex justify-between items-center">
              <div>
                <h2 className="text-xs font-black text-[#F1F5F9] uppercase tracking-widest">Goods Received Note</h2>
                <p className="text-[9px] text-[#60A5FA] font-black mt-1">PO: {showGRN.code}</p>
              </div>
              <button onClick={() => setShowGRN(null)} className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-zinc-700 uppercase tracking-widest block">Quantity Received (Gaz)</label>
                <input type="number" inputMode="numeric" value={grnForm.quantity_received} onChange={e => setGrnForm({ ...grnForm, quantity_received: e.target.value })}
                  className="w-full bg-black border border-white/5 p-4 text-xl font-black text-white outline-none focus:border-[#60A5FA]" />
                <p className="text-[9px] text-zinc-700">Ordered: {showGRN.quantity_gaz} Gaz</p>
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-[#2D3441] uppercase tracking-widest block">Quality Grade</label>
                <div className="flex gap-3">
                  {['A', 'B', 'C'].map(g => (
                    <button key={g} onClick={() => setGrnForm({ ...grnForm, quality_grade: g })}
                      className={cn("flex-1 py-3 border text-[10px] font-black uppercase transition-all rounded-[8px]",
                        grnForm.quality_grade === g ? "bg-[#60A5FA] text-[#121417] border-[#60A5FA]" : "bg-[#121417] text-[#94A3B8] border-[#2D3441]"
                      )}>Grade {g}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-zinc-700 uppercase tracking-widest block">Notes</label>
                <textarea value={grnForm.notes} onChange={e => setGrnForm({ ...grnForm, notes: e.target.value })} rows={2}
                  className="w-full bg-black border border-white/5 p-4 text-[10px] font-black text-white outline-none focus:border-[#60A5FA] resize-none" />
              </div>
            </div>
            <div className="p-8 border-t border-[#2D3441]">
              <button onClick={handleGRN} disabled={saving}
                className="w-full py-4 bg-[#34D399] text-[#121417] text-[10px] font-black uppercase hover:bg-[#2EB886] flex items-center justify-center gap-3 rounded-[8px] shadow-lg">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Confirm_Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

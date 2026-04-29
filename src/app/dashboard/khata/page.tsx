'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BookOpen, Search, User, 
  ArrowUpRight, ArrowDownLeft, PlusCircle,
  FileText, Download,
  Calculator,
  CheckCircle2, X, Loader2,
  TrendingUp, TrendingDown,
  ShieldCheck,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/components/providers/CurrencyProvider';
import Decimal from 'decimal.js';
import * as XLSX from 'xlsx';
import { OfflineService } from '@/lib/offline-service';

/**
 * OMNORA NOXIS — Industrial Khata Hub (v9.0.0)
 * Deep Ledger Analysis & Decentralized Financial Intelligence
 */

interface Worker {
  name: string;
  balance: string;
  type: 'CREDIT' | 'DEBIT';
}

interface Entry {
  id: string;
  type: 'DEBIT' | 'CREDIT';
  amount: string;
  description: string;
  workerName: string;
  ts: string;
  snippetPath?: string;
}

interface Stats {
  totalCredit: string;
  totalDebit: string;
  netBalance: string;
  entryCount: number;
  position: 'CREDIT' | 'DEBIT';
}

export default function KhataPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const { currency, formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [entryData, setEntryData] = useState({
    amount: '',
    type: 'CREDIT' as 'DEBIT' | 'CREDIT',
    description: '',
    workerName: ''
  });

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/khata/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('STATS_SYNC_FAILURE:', e);
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await fetch('/api/khata/workers');
      const data = await res.json();
      setWorkers(data.workers || []);
    } catch (e) {
      console.error('WORKER_SYNC_FAILURE:', e);
    }
  };

  const fetchEntries = async (workerName?: string) => {
    try {
      const url = workerName ? `/api/khata?workerName=${encodeURIComponent(workerName)}` : '/api/khata';
      const res = await fetch(url);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (e) {
      console.error('LEDGER_FETCH_FAILURE:', e);
    }
  };

  const refreshData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchWorkers(), fetchEntries(selectedWorker || undefined)]);
    setLoading(false);
  }, [selectedWorker]);

  useEffect(() => {
    refreshData();
    // Background Sync on Mount
    OfflineService.sync().then(res => {
      if (res?.success) refreshData();
    });
  }, [refreshData]);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryData.amount || !entryData.workerName) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/khata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryData),
      });

      if (!res.ok) throw new Error('COMMIT_FAILED');
      
      setShowModal(false);
      setEntryData({ amount: '', type: 'CREDIT', description: '', workerName: '' });
      refreshData();
    } catch (e) {
      console.error('LEDGER_COMMIT_ERROR:', e);
      // OFFLINE FALLBACK
      await OfflineService.saveEntry(entryData);
      setShowModal(false);
      setEntryData({ amount: '', type: 'CREDIT', description: '', workerName: '' });
      alert('LEDGER_SAVED_LOCALLY: System will sync when factory Wi-Fi restores.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportXLSX = () => {
    if (entries.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(entries.map(e => ({
      Timestamp: new Date(e.ts).toLocaleString(),
      Worker: e.workerName,
      Type: e.type,
      Amount: e.amount,
      Description: e.description,
      TraceID: e.id.slice(0, 8).toUpperCase()
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Omnora_Ledger");
    XLSX.writeFile(workbook, `OMNORA_LEDGER_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const entriesWithBalance = React.useMemo(() => {
    let currentBal = new Decimal(0);
    
    if (selectedWorker) {
      const w = workers.find(x => x.name === selectedWorker);
      if (w) {
        currentBal = new Decimal(w.balance);
        if (w.type === 'DEBIT') {
          currentBal = currentBal.negated();
        }
      }
    } else if (stats) {
      currentBal = new Decimal(stats.netBalance);
      if (stats.position === 'DEBIT') {
        currentBal = currentBal.negated();
      }
    }

    return entries.map(entry => {
      const rowBal = currentBal.toNumber();
      // Reverse operation for the NEXT older entry down the list
      if (entry.type === 'CREDIT') {
        currentBal = currentBal.minus(entry.amount);
      } else {
        currentBal = currentBal.plus(entry.amount);
      }
      return { ...entry, runningBalance: rowBal };
    });
  }, [entries, selectedWorker, workers, stats]);

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-[#E2E8F0] font-mono selection:bg-[#FFD700] selection:text-black">
      {/* 1. Industrial Sidebar (Worker Registry) */}
      <aside className="w-[300px] bg-[#0F1115] border-r border-[#1F2937] flex flex-col p-6">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
            <h2 className="text-xs font-black tracking-[0.3em] uppercase text-[#FFD700]">Worker Registry</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" size={14} />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="FILTER_NODES" 
              className="w-full bg-[#050505] border border-[#1F2937] text-[10px] pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-[#FFD700] uppercase outline-none transition-all" 
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
          <button 
            onClick={() => setSelectedWorker(null)}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-xl transition-all border",
              selectedWorker === null ? "bg-[#FFD700]/5 border-[#FFD700]/30" : "hover:bg-[#1A1D23] border-transparent"
            )}
          >
            <div className="flex items-center gap-3">
              <History size={14} className={selectedWorker === null ? "text-[#FFD700]" : "text-[#4B5563]"} />
              <span className="text-[10px] font-black uppercase">Global Ledger</span>
            </div>
          </button>

          {workers.filter(w => w.name.toLowerCase().includes(search.toLowerCase())).map((w) => (
            <button 
              key={w.name}
              onClick={() => setSelectedWorker(w.name)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl transition-all border group",
                selectedWorker === w.name ? "bg-[#FFD700]/5 border-[#FFD700]/30" : "hover:bg-[#1A1D23] border-transparent"
              )}
            >
              <div className="flex flex-col items-start overflow-hidden">
                <span className={cn("text-[10px] font-black uppercase truncate", selectedWorker === w.name ? "text-white" : "text-[#94A3B8]")}>
                  {w.name}
                </span>
                <span className="text-[8px] text-[#4B5563] font-bold mt-1">
                  {formatCurrency(new Decimal(w.balance).abs().toNumber())}
                </span>
              </div>
              <div className={cn(
                "text-[8px] font-black px-2 py-1 rounded",
                w.type === 'CREDIT' ? "bg-[#34D399]/10 text-[#34D399]" : "bg-[#F87171]/10 text-[#F87171]"
              )}>
                {w.type === 'CREDIT' ? 'CR' : 'DR'}
              </div>
            </button>
          ))}
        </nav>

        <div className="mt-6 pt-6 border-t border-[#1F2937]">
          <button 
            onClick={() => setShowModal(true)}
            className="w-full bg-[#FFD700] text-black py-4 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-[#E6C200] transition-all"
          >
            <PlusCircle size={14} /> New Entry
          </button>
        </div>
      </aside>

      {/* 2. Intelligence Hub (Deep Analysis) */}
      <main className="flex-1 flex flex-col p-8 overflow-hidden">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase mb-4">
              {selectedWorker ? (
                <>
                  <span className="text-[#FFD700]">{selectedWorker}</span> <span className="text-white opacity-20">/ Ledger</span>
                </>
              ) : (
                <>
                  <span className="text-white">Central</span> <span className="text-[#FFD700]">Ledger</span>
                </>
              )}
            </h1>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-[#0F1115] px-4 py-2 border border-[#1F2937] rounded-full">
                <ShieldCheck size={14} className="text-[#FFD700]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Immutable Protocol Active</span>
              </div>
              <p className="text-[10px] text-[#4B5563] font-bold uppercase tracking-widest">
                Last Sync: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
           <div className="flex flex-col md:flex-row gap-4">
            <button 
              onClick={() => setShowModal(true)}
              className="bg-[#34D399]/10 border border-[#34D399]/30 text-[#34D399] px-6 py-5 md:py-4 rounded-xl text-[12px] font-black uppercase flex items-center justify-center gap-2 hover:bg-[#34D399]/20 transition-all shadow-[0_0_20px_rgba(52,211,153,0.1)] min-h-[44px]"
            >
              <PlusCircle size={18} /> New Transaction
            </button>
            <button 
              onClick={handleExportXLSX}
              className="bg-[#0F1115] border border-[#1F2937] p-5 md:p-4 rounded-xl text-[#94A3B8] hover:text-white transition-all hover:border-[#FFD700] flex items-center justify-center min-h-[44px]"
            >
              <Download size={20} />
            </button>
          </div>
        </div>

        {/* Financial Insights Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
          <div className="bg-[#0F1115] border border-[#1F2937] p-8 rounded-3xl relative overflow-hidden group hover:border-[#FFD700]/30 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp size={64} className="text-[#34D399]" />
            </div>
            <p className="text-[10px] font-black uppercase text-[#4B5563] mb-4 tracking-[0.2em]">Total Credit (In)</p>
            <p className="text-3xl font-black text-[#34D399]">{formatCurrency(new Decimal(stats?.totalCredit || 0).toNumber())}</p>
          </div>
          <div className="bg-[#0F1115] border border-[#1F2937] p-8 rounded-3xl relative overflow-hidden group hover:border-[#FFD700]/30 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingDown size={64} className="text-[#F87171]" />
            </div>
            <p className="text-[10px] font-black uppercase text-[#4B5563] mb-4 tracking-[0.2em]">Total Debit (Out)</p>
            <p className="text-3xl font-black text-[#F87171]">{formatCurrency(new Decimal(stats?.totalDebit || 0).toNumber())}</p>
          </div>
          <div className="bg-[#0F1115] border border-[#1F2937] p-8 rounded-3xl relative overflow-hidden group hover:border-[#FFD700]/30 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Calculator size={64} className="text-[#FFD700]" />
            </div>
            <p className="text-[10px] font-black uppercase text-[#4B5563] mb-4 tracking-[0.2em]">Net Position</p>
            <p className="text-3xl font-black text-white">{formatCurrency(new Decimal(stats?.netBalance || 0).abs().toNumber())}</p>
          </div>
          <div className="bg-[#0F1115] border border-[#1F2937] p-8 rounded-3xl relative overflow-hidden group hover:border-[#FFD700]/30 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <BookOpen size={64} className="text-[#8B5CF6]" />
            </div>
            <p className="text-[10px] font-black uppercase text-[#4B5563] mb-4 tracking-[0.2em]">Audit Entries</p>
            <p className="text-3xl font-black text-[#8B5CF6]">{stats?.entryCount || 0}</p>
          </div>
        </div>

        {/* Ledger Table Section */}
        <div className="flex-1 bg-[#0F1115] border border-[#1F2937] rounded-3xl overflow-hidden flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          <div className="p-6 border-b border-[#1F2937] flex justify-between items-center bg-[#14171C]">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[#E2E8F0] flex items-center gap-3">
              <BookOpen size={16} className="text-[#FFD700]" />
              Recent Transactions
            </h3>
            <div className="text-[8px] font-black uppercase px-3 py-1 bg-[#34D399]/10 rounded-full border border-[#34D399]/20 text-[#34D399]">
              Live Synced
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0F1115] text-[10px] text-[#94A3B8] uppercase font-black border-b border-[#1F2937] z-10 shadow-sm">
                <tr>
                  <th className="p-6 tracking-widest w-[15%]">Date</th>
                  <th className="p-6 tracking-widest w-[35%]">Transaction Detail</th>
                  <th className="p-6 tracking-widest text-right w-[15%]">Credit (Green)</th>
                  <th className="p-6 tracking-widest text-right w-[15%]">Debit (Red)</th>
                  <th className="p-6 tracking-widest text-right w-[20%]">Current Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center">
                      <Loader2 size={32} className="animate-spin text-[#FFD700] mx-auto" />
                    </td>
                  </tr>
                ) : entriesWithBalance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center opacity-20">
                      <FileText size={64} className="mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.5em]">No Entries Found</p>
                    </td>
                  </tr>
                ) : entriesWithBalance.map((e) => (
                  <tr key={e.id} className="group hover:bg-[#16181D] transition-colors">
                    <td className="p-6 text-[11px] font-mono text-[#94A3B8]">
                      {new Date(e.ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <div className="text-[9px] text-[#4B5563] mt-1">{new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="p-6">
                      <p className="text-[12px] font-bold text-[#E2E8F0] mb-1">{e.description}</p>
                      <p className="text-[9px] text-[#4B5563] font-black uppercase">{e.workerName}</p>
                    </td>
                    <td className="p-6 text-right">
                      {e.type === 'CREDIT' ? (
                        <span className="text-[12px] font-black text-[#34D399] bg-[#34D399]/5 px-3 py-1.5 rounded-lg border border-[#34D399]/10">
                          + {formatCurrency(new Decimal(e.amount).toNumber()).replace('Rs.', '').replace('$', '')}
                        </span>
                      ) : (
                        <span className="text-[#374151] font-mono">-</span>
                      )}
                    </td>
                    <td className="p-6 text-right">
                      {e.type === 'DEBIT' ? (
                        <span className="text-[12px] font-black text-[#F87171] bg-[#F87171]/5 px-3 py-1.5 rounded-lg border border-[#F87171]/10">
                          - {formatCurrency(new Decimal(e.amount).toNumber()).replace('Rs.', '').replace('$', '')}
                        </span>
                      ) : (
                        <span className="text-[#374151] font-mono">-</span>
                      )}
                    </td>
                    <td className="p-6 text-right">
                      <span className="text-[13px] font-black font-mono text-white">
                        {formatCurrency(new Decimal(e.runningBalance).abs().toNumber())}
                      </span>
                      <span className={cn(
                        "ml-2 text-[9px] font-black px-1.5 py-0.5 rounded",
                        e.runningBalance >= 0 ? "bg-[#34D399]/10 text-[#34D399]" : "bg-[#F87171]/10 text-[#F87171]"
                      )}>
                        {e.runningBalance >= 0 ? 'CR' : 'DR'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 3. Modal Layer (Industrial Entry) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 transition-all">
          <div className="bg-[#0F1115] border border-[#FFD700]/20 w-full max-w-lg p-10 rounded-[2.5rem] relative shadow-[0_0_50px_rgba(255,215,0,0.1)]">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 text-[#4B5563] hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
              <PlusCircle className="text-[#FFD700]" /> 
              <span>Manual Entry Override</span>
            </h2>

            <form onSubmit={handleAddEntry} className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button"
                  onClick={() => setEntryData(d => ({ ...d, type: 'CREDIT' }))}
                  className={cn(
                    "py-5 rounded-2xl border text-[10px] font-black uppercase transition-all",
                    entryData.type === 'CREDIT' ? "bg-[#34D399]/10 border-[#34D399] text-[#34D399]" : "border-[#1F2937] text-[#4B5563]"
                  )}
                >
                  Credit (Received)
                </button>
                <button 
                  type="button"
                  onClick={() => setEntryData(d => ({ ...d, type: 'DEBIT' }))}
                  className={cn(
                    "py-5 rounded-2xl border text-[10px] font-black uppercase transition-all",
                    entryData.type === 'DEBIT' ? "bg-[#F87171]/10 border-[#F87171] text-[#F87171]" : "border-[#1F2937] text-[#4B5563]"
                  )}
                >
                  Debit (Paid)
                </button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B5563]" size={16} />
                  <input 
                    required
                    list="workers-list"
                    value={entryData.workerName}
                    onChange={e => setEntryData(d => ({ ...d, workerName: e.target.value }))}
                    className="w-full bg-[#050505] border border-[#1F2937] text-[12px] pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-[#FFD700] uppercase font-black" 
                    placeholder="WORKER_IDENTIFIER"
                  />
                  <datalist id="workers-list">
                    {workers.map(w => <option key={w.name} value={w.name} />)}
                  </datalist>
                </div>

                <div className="relative">
                  <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B5563]" size={16} />
                   <input 
                    required type="number"
                    inputMode="numeric"
                    value={entryData.amount}
                    onChange={e => setEntryData(d => ({ ...d, amount: e.target.value }))}
                    className="w-full bg-[#050505] border border-[#1F2937] text-[16px] md:text-[12px] pl-12 pr-4 py-5 md:py-4 rounded-2xl focus:outline-none focus:border-[#FFD700] uppercase font-black" 
                    placeholder={`AMOUNT_${currency}`}
                  />
                </div>

                <textarea 
                  value={entryData.description}
                  onChange={e => setEntryData(d => ({ ...d, description: e.target.value }))}
                  className="w-full bg-[#050505] border border-[#1F2937] text-[12px] p-4 rounded-2xl h-32 focus:outline-none focus:border-[#FFD700] uppercase font-black resize-none" 
                  placeholder="ENTRY_REASONING_PROTOCOL"
                />
              </div>

              <button 
                disabled={submitting}
                className="w-full bg-[#FFD700] text-black py-6 rounded-2xl text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#E6C200] transition-all shadow-[0_20px_40px_rgba(255,215,0,0.2)]"
              >
                {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
                Authorize Ledger Commit
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Metadata } from 'next';

export const revalidate = 60; // ISR 60 seconds

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  await params;
  return {
    title: 'Gold She Industrial — Account Portal',
    description: 'View your orders and account balance',
    openGraph: {
      title: 'Gold She Industrial Account Portal',
      description: 'Track your orders and outstanding balance',
    }
  };
}

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // 1. Fetch token
  const { data: tokenData } = await supabase
    .from('party_portal_tokens')
    .select('party_id, expires_at')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!tokenData) {
    return (
      <div className="min-h-screen bg-[#121417] flex items-center justify-center p-8 font-sans">
        <div className="max-w-md w-full border border-[#2D3441] p-12 text-center space-y-6 bg-[#1C2028] rounded-[12px] shadow-2xl">
          <AlertCircle className="mx-auto text-[#60A5FA]" size={48} />
          <h1 className="text-xl font-bold uppercase tracking-tighter text-[#F1F5F9]">Link Expired</h1>
          <p className="text-sm text-[#94A3B8]">This tracking link is no longer valid or has expired. Please contact Gold She Industrial to request a new one.</p>
        </div>
      </div>
    );
  }

  // 2. Fetch Party & Data
  const partyId = tokenData.party_id;
  
  const [partyRes, ordersRes, khataRes] = await Promise.all([
    supabase.from('parties').select('name, phone').eq('id', partyId).single(),
    supabase.from('orders').select('*').eq('party_id', partyId).order('created_at', { ascending: false }).limit(20),
    supabase.from('khata_entries').select('*').eq('party_id', partyId).order('created_at', { ascending: false }).limit(20)
  ]);

  if (!partyRes.data) return notFound();

  const party = partyRes.data;
  const orders = ordersRes.data || [];
  const entries = khataRes.data || [];

  // Calculate Balance
  const { data: balanceData } = await supabase.rpc('calculate_party_balance', { p_id: partyId });
  const balance = balanceData || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'text-[#60A5FA] border-[#60A5FA]/20 bg-[#60A5FA]/5';
      case 'DISPATCHED': return 'text-blue-500 border-blue-500/50 bg-blue-500/10';
      case 'DELIVERED': return 'text-green-500 border-green-500/50 bg-green-500/10';
      default: return 'text-[#94A3B8] border-[#2D3441] bg-[#121417]/40';
    }
  };

  return (
    <div className="min-h-screen bg-[#121417] text-[#F1F5F9] font-sans selection:bg-[#60A5FA] selection:text-white pb-20">
      {/* Portal Header */}
      <header className="border-b border-[#2D3441] bg-[#1C2028] p-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-[#60A5FA] rounded-[4px] flex items-center justify-center font-black text-[#121417] text-xs">GS</div>
             <div>
                <h1 className="text-sm font-black uppercase tracking-tighter leading-none mb-1 font-mono">Gold She Industrial</h1>
                <p className="text-[8px] text-[#94A3B8] uppercase tracking-widest font-mono">Customer Portal // INDUSTRIAL_CORE_v8.6.1</p>
             </div>
          </div>
          <p className="text-[10px] font-bold uppercase text-[#94A3B8]">{party.name}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-10">
        {/* Balance Card */}
        <div className="bg-[#1C2028] border border-[#2D3441] p-8 rounded-[12px] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div>
            <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-2">Current Outstanding Balance</p>
            <h2 className={cn("text-4xl font-black tracking-tighter font-mono", balance > 0 ? "text-[#F87171]" : "text-[#34D399]")}>
              Rs. {Math.abs(balance).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="flex items-center gap-3 bg-[#121417]/40 p-4 border border-[#2D3441] rounded-[8px]">
             {balance > 0 ? (
               <TrendingUp className="text-[#F87171]" size={24} />
             ) : (
               <TrendingDown className="text-[#34D399]" size={24} />
             )}
             <p className="text-[10px] font-bold uppercase text-[#94A3B8] max-w-[120px]">
               {balance > 0 ? "Outstanding amount due to factory." : "Advance credit in your account."}
             </p>
          </div>
        </div>

        {/* Orders Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-l-2 border-[#60A5FA] pl-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#F1F5F9]">Recent Manufacturing Jobs</h3>
          </div>
          <div className="grid gap-4">
            {orders.map(order => (
              <div key={order.id} className="bg-[#111] border border-white/5 p-5 flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-white font-mono tracking-tighter uppercase">{order.code}</p>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-8">
                  <div className="hidden md:block text-right">
                    <p className="text-[9px] text-zinc-600 uppercase font-black mb-1">Order Value</p>
                    <p className="text-xs font-bold font-mono text-zinc-300">Rs. {parseFloat(order.total).toLocaleString('en-PK')}</p>
                  </div>
                  <span className={cn("px-3 py-1 rounded-full text-[8px] font-black border uppercase tracking-widest", getStatusColor(order.status))}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Ledger Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-l-2 border-[#2D3441] pl-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#F1F5F9]">Transaction History</h3>
          </div>
          <div className="bg-[#1C2028] border border-[#2D3441] overflow-hidden rounded-[12px] shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#121417]/50 border-b border-[#2D3441]">
                  <th className="p-4 text-[9px] font-black text-[#94A3B8] uppercase">Date</th>
                  <th className="p-4 text-[9px] font-black text-[#94A3B8] uppercase">Type</th>
                  <th className="p-4 text-[9px] font-black text-[#94A3B8] uppercase text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-[10px] font-medium text-zinc-400">{new Date(entry.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-[1px] uppercase tracking-tighter", 
                        entry.entry_type === 'CREDIT' ? "text-[#3D9970] bg-[#3D9970]/10" : "text-[#C44B4B] bg-[#C44B4B]/10"
                      )}>
                        {entry.entry_type}
                      </span>
                    </td>
                    <td className={cn("p-4 text-[11px] font-bold font-mono text-right", 
                      entry.entry_type === 'CREDIT' ? "text-[#3D9970]" : "text-[#C44B4B]"
                    )}>
                      Rs. {parseFloat(entry.amount).toLocaleString('en-PK')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="max-w-4xl mx-auto p-12 text-center border-t border-[#2D3441] opacity-50">
        <p className="text-[8px] font-black text-[#94A3B8] uppercase tracking-[0.4em]">INDUSTRIAL_CORE_v8.6.1 // GOLD SHE INDUSTRIAL</p>
      </footer>
    </div>
  );
}

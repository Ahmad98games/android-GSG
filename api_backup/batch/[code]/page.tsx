import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { headers } from 'next/headers';

export const revalidate = 30;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '60 s'),
});

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Batch: ${code} | Gold She Industrial`,
    description: `Industrial Batch Verification // Sovereign Inventory Control`,
  };
}

export default async function BatchScanPage({ params }: Props) {
  const { code } = await params;
  const headerList = await headers();
  const ip = headerList.get('x-forwarded-for') || '127.0.0.1';

  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return <div className="p-20 text-center font-mono text-[#F87171]">429: DATA_THROTTLED</div>;
  }

  const { data: batch, error } = await supabase
    .from('batches')
    .select('*, articles(*)')
    .eq('code', code)
    .single();

  if (!batch || error) notFound();

  // Log Scan
  try {
    supabase.from('scan_logs').insert({
      code,
      scan_type: 'BATCH',
      ip_address: ip,
      user_agent: headerList.get('user-agent')
    }).then();
  } catch {}

  return (
    <div className="min-h-screen bg-[#121417] text-[#F1F5F9] p-6 font-mono">
      <div className="max-w-md mx-auto mt-20 bg-[#1C2028] border border-[#2D3441] p-10 rounded-[2px]">
        <h1 className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-2">Internal Batch ID</h1>
        <h2 className="text-2xl font-black text-[#C5A059] mb-10">{batch.code}</h2>
        
        <div className="space-y-6">
           <div className="border-t border-[#2D3441] pt-6">
              <p className="text-[10px] text-[#94A3B8] uppercase mb-1">Linked Article</p>
              <p className="text-sm font-bold text-[#F1F5F9] mb-1">{batch.articles?.name}</p>
              <p className="text-[9px] text-[#C5A059]">{batch.articles?.code}</p>
           </div>
           
           <div className="grid grid-cols-2 gap-6 border-t border-[#2D3441] pt-6">
              <div>
                 <p className="text-[10px] text-[#94A3B8] uppercase mb-1">Batch Yield</p>
                 <p className="text-sm font-bold text-[#F1F5F9]">{batch.suits_count} Sets</p>
              </div>
              <div>
                 <p className="text-[10px] text-[#94A3B8] uppercase mb-1">Status</p>
                 <p className="text-[10px] font-bold text-[#34D399]">IN_VAULT</p>
              </div>
           </div>

           <div className="border-t border-[#2D3441] pt-6 text-center">
              <p className="text-[9px] text-[#94A3B8] uppercase">Verification Authentically Signed</p>
           </div>
        </div>
      </div>
    </div>
  );
}

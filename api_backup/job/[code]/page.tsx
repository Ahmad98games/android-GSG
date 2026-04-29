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
    title: `Job Order: ${code} | Gold She Industrial`,
    description: `Production Job Order Tracking // Sovereign Manufacturing Control`,
  };
}

export default async function JobScanPage({ params }: Props) {
  const { code } = await params;
  const headerList = await headers();
  const ip = headerList.get('x-forwarded-for') || '127.0.0.1';

  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return <div className="p-20 text-center font-mono text-[#C44B4B]">429: DATA_THROTTLED</div>;
  }

  const { data: job, error } = await supabase
    .from('job_orders')
    .select('*, articles(*), karigars(*), job_audit_results(*)')
    .eq('code', code)
    .single();

  if (!job || error) notFound();

  // Log Scan
  try {
    supabase.from('scan_logs').insert({
      code,
      scan_type: 'JOB',
      ip_address: ip,
      user_agent: headerList.get('user-agent')
    }).then();
  } catch {}

  const latestAudit = job.job_audit_results?.[0];

  return (
    <div className="min-h-screen bg-[#121417] text-[#F1F5F9] p-6 font-mono">
      <div className="max-w-md mx-auto mt-20 bg-[#1C2028] border border-[#2D3441] p-10 rounded-[2px]">
        <div className="flex justify-between items-center mb-10">
           <div>
              <h1 className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-2">Industrial Job Order</h1>
              <h2 className="text-2xl font-black text-[#C5A059] mb-1">{job.code}</h2>
           </div>
           <div className={cn(
             "px-3 py-1 text-[9px] font-bold border",
             job.status === 'AUDITED' ? "border-[#34D399] text-[#34D399]" : "border-[#FBBF24] text-[#FBBF24]"
           )}>
             {job.status}
           </div>
        </div>
        
        <div className="space-y-6">
           <div className="border-t border-[#2D3441] pt-6">
              <p className="text-[10px] text-[#94A3B8] uppercase mb-1">Production Asset</p>
              <p className="text-sm font-bold text-[#F1F5F9]">{job.articles?.name}</p>
           </div>
           
           <div className="border-t border-[#2D3441] pt-6">
              <p className="text-[10px] text-[#94A3B8] uppercase mb-1">Assigned Karigar</p>
              <p className="text-sm font-bold text-[#F1F5F9]">{job.karigars?.name}</p>
           </div>

           <div className="border-t border-[#2D3441] pt-6 grid grid-cols-2 gap-6">
              <div>
                 <p className="text-[10px] text-[#94A3B8] uppercase mb-1">Target</p>
                 <p className="text-sm font-bold text-[#F1F5F9] tracking-widest">{job.target_suits} Suits</p>
              </div>
              <div>
                 <p className="text-[10px] text-[#94A3B8] uppercase mb-1">Due Date</p>
                 <p className="text-sm font-bold text-[#F1F5F9]">{job.due_date}</p>
              </div>
           </div>

           {latestAudit && (
             <div className={cn(
                "border-t pt-6 mt-6",
                latestAudit.result === 'PASS' ? "border-[#34D399]/30" : "border-[#F87171]/30"
             )}>
                <div className="flex justify-between items-center">
                   <p className="text-[10px] uppercase font-bold text-[#94A3B8]">Audit Verification</p>
                   <p className={cn(
                      "text-[10px] font-black",
                      latestAudit.result === 'PASS' ? "text-[#34D399]" : "text-[#F87171]"
                   )}>{latestAudit.result}</p>
                </div>
                <p className="text-[9px] text-[#94A3B8] mt-2">Variance: {latestAudit.variance} gaz detected.</p>
             </div>
           )}

           <div className="border-t border-white/5 pt-10 text-center opacity-30">
              <p className="text-[9px] text-zinc-700 uppercase">Vault Integrity Standard v7.1</p>
           </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: (string | undefined | null | boolean | number)[]) {
  return inputs.filter(Boolean).join(' ');
}

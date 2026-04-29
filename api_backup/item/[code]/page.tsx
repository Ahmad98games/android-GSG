import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { headers } from 'next/headers';
import Image from 'next/image';

// 1. DATA CACHING & ISR
export const revalidate = 30; // Global 30s revalidation

// 2. RATE LIMITER CONFIG
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '60 s'),
});

interface Props {
  params: { code: string };
}

// 3. GENERATE METADATA (OG TAGS)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('code', code)
    .single();

  if (!article) return { title: 'Unknown Article | Gold She' };

  return {
    title: `${code} — ${article.name} | Gold She Industrial`,
    description: `${article.desi_color_name} · Rs. ${article.price_per_set} per set · Sovereign Analytics`,
    openGraph: {
      title: `${code} — ${article.name}`,
      description: `Industrial Article Registry: ${article.desi_color_name} // Gold She`,
      images: [article.image_url || ''],
    },
  };
}

// 4. MAIN PAGE
export default async function ItemScanPage({ params }: Props) {
  const { code } = await params;
  const headerList = await headers();
  const ip = headerList.get('x-forwarded-for') || '127.0.0.1';

  // Rate Limit Check
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121417] p-8">
        <div className="text-center">
          <h1 className="text-[#F87171] font-mono text-xl mb-4 uppercase">429: Rate Limit Exceeded</h1>
          <p className="text-[#94A3B8] text-xs font-mono">Excessive requests detected. Please retry in 60 seconds.</p>
        </div>
      </div>
    );
  }

  // Fetch Article
  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('code', code)
    .single();

  if (!article || error) notFound();

  // Log Scan (Fire & Forget)
  try {
    supabase.from('scan_logs').insert({
      code,
      scan_type: 'ARTICLE',
      ip_address: ip,
      user_agent: headerList.get('user-agent')
    }).then(); // Background
  } catch { /* ignore */ }

  return (
    <div className="min-h-screen bg-[#121417] text-[#F1F5F9] p-6 font-sans">
      <div className="max-w-md mx-auto mt-12 bg-[#1C2028] border border-[#2D3441] p-8 rounded-[2px]">
        {/* Header */}
        <div className="flex justify-between items-start mb-10 border-b border-[#2D3441] pb-6">
          <div>
            <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-widest">Article Scan</p>
            <h2 className="text-2xl font-black font-mono tracking-tighter text-[#C5A059] mt-1">{article.code}</h2>
          </div>
          <div className="w-10 h-10 border border-[#C5A059]/20 flex items-center justify-center">
            <span className="text-[#C5A059] font-mono text-xs">GS</span>
          </div>
        </div>

        {/* Hero Image */}
        {article.image_url && (
          <div className="relative aspect-square w-full mb-10 overflow-hidden grayscale hover:grayscale-0 transition-all duration-500">
            <Image 
              src={article.image_url} 
              alt={article.name} 
              fill 
              className="object-cover"
            />
          </div>
        )}

        {/* Data Grid */}
        <div className="space-y-8 font-mono">
           <div className="grid grid-cols-2 gap-8 border-b border-[#2D3441] pb-8">
              <div>
                 <p className="text-[10px] text-[#94A3B8] uppercase mb-1">Descriptor</p>
                 <p className="text-sm font-bold text-[#F1F5F9] uppercase">{article.name}</p>
              </div>
              <div>
                 <p className="text-[10px] text-[#94A3B8] uppercase mb-1">Desi Color</p>
                 <p className="text-sm font-bold text-[#C5A059]" style={{ color: article.desi_color_hex }}>{article.desi_color_name}</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-8 border-b border-[#2D3441] pb-8">
              <div>
                 <p className="text-[10px] text-[#94A3B8] uppercase mb-1">Pricing (PKR)</p>
                 <p className="text-sm font-black text-[#F1F5F9]">Rs. {article.price_per_set.toLocaleString()}</p>
                 <p className="text-[8px] text-[#94A3B8] mt-1 uppercase">Per Standard Set</p>
              </div>
              <div>
                 <p className="text-[10px] text-[#94A3B8] uppercase mb-1">Protocol</p>
                 <p className="text-sm font-bold text-[#F1F5F9] uppercase">{article.size_protocol || 'N/A'}</p>
              </div>
           </div>
           
           <div className="text-center pt-4">
              <p className="text-[9px] text-[#94A3B8] uppercase tracking-widest mb-4">Sovereign Ecosystem Verification</p>
              <div className="h-0.5 w-12 bg-[#C5A059] mx-auto opacity-30" />
           </div>
        </div>
      </div>
    </div>
  );
}

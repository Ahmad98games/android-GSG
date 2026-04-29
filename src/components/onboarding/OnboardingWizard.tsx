'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { 
  Factory, Store, BookOpen, Layers, Zap, Hexagon, CheckCircle2, Building2, 
  Upload, Monitor, Camera, ArrowRight, Wheat, Scissors, Package, HardHat, 
  Snowflake, Box, Waves, Hammer, Stethoscope, Truck, ShoppingBag, Car, 
  Gem, Warehouse, FlaskConical, Microscope, Leaf, Database, Cpu, Plane, 
  Dna, Briefcase, Search, Globe, MapPin, CircuitBoard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IndustryType } from '@/lib/constants/vocabulary';
import { useBranding } from '@/providers/BrandingProvider';

interface ThemeConfig {
  basePalette: string;
  accentColor: string;
  glassmorphism: string;
  fontPersonality: string;
  buttonStyle: string;
}

interface OnboardingWizardProps {
  onComplete: (industry: IndustryType) => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { businessName, businessLogo, updateBranding } = useBranding();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(businessName);
  const [logo, setLogo] = useState(businessLogo);
  const [industry, setIndustry] = useState<IndustryType | ''>('');
  const [theme, setTheme] = useState('');
  const [hubIp, setHubIp] = useState('127.0.0.1');
  const [isBooming, setIsBooming] = useState(false);
  
  const [marketType, setMarketType] = useState<'regional' | 'global'>('regional');
  const [searchQuery, setSearchQuery] = useState('');

  const industryMatrix = useMemo(() => ({
    regional: [
      { id: 'textile', name: 'Textile Looms', icon: Factory, value: 'Loom & Yarn tracking precision' },
      { id: 'rice-mill', name: 'Rice Mills', icon: Wheat, value: 'Batch & Weight management' },
      { id: 'tannery', name: 'Leather Tannery', icon: Scissors, value: 'Process flow automation' },
      { id: 'wholesale', name: 'Wholesale Dist.', icon: Package, value: 'Optimized for Credit-based Khata' },
      { id: 'construction', name: 'Construction', icon: HardHat, value: 'Labor & material tracking' },
      { id: 'cold-storage', name: 'Cold Storage', icon: Snowflake, value: 'Temperature & stock logs' },
      { id: 'plastic', name: 'Plastic Injection', icon: Box, value: 'Mold & machine uptime' },
      { id: 'flour-mill', name: 'Flour Mills', icon: Waves, value: 'Extraction & distribution audit' },
      { id: 'hardware', name: 'Hardware Store', icon: Hammer, value: 'Paint & tool inventory khata' },
      { id: 'pharmacy', name: 'Pharmacy Retail', icon: Stethoscope, value: 'Expiry & batch tracking' },
      { id: 'logistics', name: 'Transport/Logistics', icon: Truck, value: 'Fuel & cargo audit' },
      { id: 'retail', name: 'General Kiryana', icon: ShoppingBag, value: 'Fast-moving retail khata' },
      { id: 'poultry', name: 'Poultry Farm', icon: Factory, value: 'Feed & mortality audit' },
      { id: 'auto-parts', name: 'Auto Parts', icon: Car, value: 'SKU heavy inventory' },
      { id: 'jewelry', name: 'Gems & Jewelry', icon: Gem, value: 'Precision weight & purity' },
    ],
    global: [
      { id: 'warehousing', name: 'Smart Warehousing', icon: Warehouse, value: 'AI stock forecasting' },
      { id: 'pharma-mfg', name: 'Pharma Mfg', icon: FlaskConical, value: 'Strict compliance & FDA audit' },
      { id: 'tech-labs', name: 'Tech Research', icon: Microscope, value: 'Asset & patent tracking' },
      { id: 'green-energy', name: 'Green Energy', icon: Leaf, value: 'Grid & battery telemetry' },
      { id: 'data-center', name: 'Cloud Data Centers', icon: Database, value: 'Resource & cooling audit' },
      { id: 'machining', name: 'Precision Machining', icon: Cpu, value: 'CNC & high-tolerance tracking' },
      { id: 'electronics', name: 'Electronics Mfg', icon: CircuitBoard, value: 'SMT & component tracking' },
      { id: 'aviation', name: 'Aviation MRO', icon: Plane, value: 'Maintenance & safety logs' },
      { id: 'biotech', name: 'Biotech', icon: Dna, value: 'Sample & cold chain management' },
      { id: 'fintech', name: 'Fintech Ops', icon: Briefcase, value: 'Transaction & ledger audit' },
    ]
  }), []);

  const filteredIndustries = useMemo(() => {
    const list = marketType === 'regional' ? industryMatrix.regional : industryMatrix.global;
    if (!searchQuery) return list;
    return list.filter(i => 
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      i.value.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [marketType, searchQuery, industryMatrix]);

  const themes = [
    { 
      id: 'dark-horror', 
      name: 'Dark Horror', 
      desc: 'Charcoal & Blue Abyss',
      bgClass: 'bg-[#0f1115]',
      accentClass: 'bg-[#3b82f6]',
      borderClass: 'border-[#3b82f6]/30'
    },
    { 
      id: 'emerald-gold', 
      name: 'Emerald Gold', 
      desc: 'Dark Green & Pure Gold',
      bgClass: 'bg-[#062f20]',
      accentClass: 'bg-[#fbbf24]',
      borderClass: 'border-[#fbbf24]/30'
    },
    { 
      id: 'cyber-blue', 
      name: 'Cyber Blue', 
      desc: 'Deep Space & Neon Azure',
      bgClass: 'bg-[#0B1021]',
      accentClass: 'bg-[#06b6d4]',
      borderClass: 'border-[#06b6d4]/30'
    }
  ];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInitialize = async () => {
    setIsBooming(true);
    await updateBranding(name || 'Noxis Sentinel', logo);

    localStorage.setItem('INDUSTRY_TYPE', industry);
    localStorage.setItem('THEME_PRESET', theme);
    localStorage.setItem('HUB_IP', hubIp);
    localStorage.setItem('ONBOARDING_COMPLETE', 'true');

    if (window.noxis) {
      await window.noxis.store.set('activeIndustryProfile', industry);
      await window.noxis.store.set('themeConfig', {
        basePalette: 'Dark',
        accentColor: theme === 'emerald-gold' ? '#FBBF24' : theme === 'cyber-blue' ? '#06B6D4' : '#60A5FA',
        glassmorphism: 'Translucent',
        fontPersonality: 'Professional',
        buttonStyle: 'Neon Glow'
      } as ThemeConfig);
    }

    setTimeout(() => {
      onComplete(industry as IndustryType);
      window.location.href = '/dashboard';
    }, 2500);
  };

  if (isBooming) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#121417] flex items-center justify-center animate-in fade-in zoom-in duration-500">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-[#121417] to-[#121417] opacity-100 animate-pulse" />
         <div className="z-10 flex flex-col items-center gap-8">
            <div className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/10 overflow-hidden shadow-2xl relative">
              {logo ? <Image src={logo} alt="Logo" width={80} height={80} className="object-contain" unoptimized /> : <Monitor className="w-16 h-16 text-[#60A5FA]" />}
            </div>
            <div className="text-center">
              <h1 className="text-5xl font-black text-white tracking-[0.2em] uppercase mb-2">{name || 'Noxis Sentinel'}</h1>
              <p className="text-sm font-black text-[#60A5FA] uppercase tracking-[0.5em] animate-pulse">Initializing Mesh Core...</p>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0A0A0B] flex items-center justify-center overflow-hidden font-sans selection:bg-white selection:text-black">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[150px] animate-pulse [animation-delay:2s]" />
      </div>

      <div className="relative w-full max-w-6xl px-6 z-10">
        <div className="bg-[#121417]/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
             <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000" style={{ width: `${(step / 4) * 100}%` }} />
          </div>

          <div className="p-10 md:p-14">
            {step === 1 && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#60A5FA11] border border-[#60A5FA33] rounded-full text-[10px] font-black uppercase text-[#60A5FA] tracking-[0.3em]">
                    <Monitor size={14} /> White-Labeling Core
                  </div>
                  <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase">Brand Identity</h1>
                  <p className="text-[#94A3B8] font-medium tracking-wide text-sm">Personalize the entire industrial hub with your business identity.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-10 mt-12">
                  <div className="space-y-6">
                    <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#C5A059]"><Building2 className="w-3 h-3" /> Business Name</h2>
                    <input 
                      type="text" 
                      placeholder="e.g. Al-Falah Textiles"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#1E2126] border border-[#334155] rounded-3xl px-8 py-6 text-xl font-black focus:outline-none focus:border-[#60A5FA] transition-all"
                    />
                  </div>

                  <div className="space-y-6">
                    <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#C5A059]"><Camera className="w-3 h-3" /> System Logo</h2>
                    <label className="flex items-center justify-between w-full h-[84px] bg-[#1E2126] border border-[#334155] rounded-3xl px-8 cursor-pointer hover:border-[#60A5FA] transition-all">
                      <div className="flex items-center gap-4">
                        {logo ? <Image src={logo} alt="Logo" width={40} height={40} className="object-contain rounded-md" unoptimized /> : <Upload className="w-8 h-8 text-zinc-500" />}
                        <span className="text-sm font-bold text-zinc-400">{logo ? 'Logo Uploaded' : 'Upload PNG/SVG'}</span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      {logo && <CheckCircle2 className="w-6 h-6 text-[#22C55E]" />}
                    </label>
                  </div>
                </div>

                <div className="flex justify-center mt-12">
                   <button 
                     disabled={!name}
                     onClick={() => setStep(2)}
                     className="px-12 py-5 bg-[#60A5FA] text-[#121417] rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-20 flex items-center gap-3 shadow-[0_20px_40px_rgba(96,165,250,0.3)]"
                   >
                    Next: Industry Matrix <ArrowRight size={16} />
                   </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-12 duration-700">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="space-y-2 text-center md:text-left">
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase">Industry Matrix</h1>
                    <p className="text-[#94A3B8] font-medium tracking-wide text-xs">Deploying target-specific operational logic.</p>
                  </div>
                  
                  <div className="flex bg-[#1E2126] p-1.5 rounded-2xl border border-white/5 w-fit">
                    <button 
                      onClick={() => setMarketType('regional')}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        marketType === 'regional' ? "bg-white text-black shadow-xl" : "text-slate-500 hover:text-white"
                      )}
                    >
                      <MapPin size={14} /> Regional
                    </button>
                    <button 
                      onClick={() => setMarketType('global')}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        marketType === 'global' ? "bg-violet-600 text-white shadow-xl" : "text-slate-500 hover:text-white"
                      )}
                    >
                      <Globe size={14} /> Global
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="text"
                    placeholder="Search industries, logic types, or value propositions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1E2126] border border-white/5 rounded-3xl pl-16 pr-8 py-5 text-sm font-bold text-white focus:outline-none focus:border-violet-500 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="h-[400px] overflow-y-auto pr-2 custom-scrollbar grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredIndustries.map((ind) => (
                    <button
                      key={ind.id}
                      onClick={() => setIndustry(ind.id as IndustryType)}
                      className={cn(
                        "p-6 rounded-[2rem] border transition-all duration-300 text-left group bg-black/20 hover:bg-white/5",
                        industry === ind.id 
                          ? "border-white bg-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]" 
                          : "border-white/5"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-all",
                        industry === ind.id ? "bg-white text-black" : "bg-white/5 text-[#94A3B8] group-hover:bg-white/10 group-hover:text-white"
                      )}>
                        <ind.icon size={24} />
                      </div>
                      <h3 className="font-black text-white uppercase text-xs tracking-tight mb-2 leading-tight">{ind.name}</h3>
                      <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{ind.value}</p>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-white/5">
                  <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">← Back</button>
                  <button 
                    disabled={!industry}
                    onClick={() => setStep(3)}
                    className="px-10 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:scale-105 active:scale-95 transition-all disabled:opacity-20 flex items-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                  >
                    Confirm Selection <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-12 duration-700">
                <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase text-white tracking-[0.3em] backdrop-blur-md cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setStep(2)}>
                    ← Back to Industry Matrix
                  </div>
                  <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter">Local Link</h1>
                  <p className="text-[#94A3B8] font-medium tracking-wide text-sm">Enter the local IP address of your primary industrial server (Hub).</p>
                </div>

                <div className="max-w-md mx-auto space-y-8 bg-white/5 p-12 rounded-[2.5rem] border border-white/10 backdrop-blur-2xl shadow-2xl">
                   <div className="space-y-4 text-center">
                      <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 border border-white/10">
                         <Hexagon size={40} className="text-[#60A5FA]" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Hub IP Endpoint</p>
                      <input 
                        type="text"
                        value={hubIp}
                        onChange={e => setHubIp(e.target.value)}
                        placeholder="127.0.0.1"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-3xl font-black text-center text-white focus:border-[#60A5FA] outline-none transition-all tracking-[0.2em]"
                      />
                   </div>

                   <button 
                     onClick={() => setStep(4)}
                     className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                   >
                     Next: System Aesthetics
                   </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-12 animate-in fade-in slide-in-from-right-12 duration-1000">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase text-white tracking-[0.3em] backdrop-blur-md cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setStep(3)}>
                    ← Back to Local Link
                  </div>
                  <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 tracking-tighter">Core Aesthetics</h1>
                  <p className="text-[#94A3B8] font-medium tracking-wide text-sm">Define the emotional resonance of your workspace.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "relative p-8 rounded-[2rem] border transition-all duration-500 text-left group overflow-hidden backdrop-blur-xl",
                        t.bgClass,
                        theme === t.id 
                          ? `border-white shadow-[0_0_50px_rgba(255,255,255,0.1)] scale-105 z-10` 
                          : "border-white/5 hover:border-white/20 hover:scale-105 opacity-60 hover:opacity-100"
                      )}
                    >
                      <div className="relative z-10 space-y-6">
                        <div className={cn("w-full h-32 rounded-xl flex items-center justify-center shadow-inner", t.bgClass, t.borderClass, "border")}>
                           <div className={cn("w-16 h-16 rounded-full flex items-center justify-center shadow-2xl", t.accentClass)}>
                              {theme === t.id && <CheckCircle2 size={32} className="text-black" />}
                           </div>
                        </div>
                        <div>
                          <h3 className="font-black text-white uppercase text-xl tracking-tight mb-2 leading-tight">{t.name}</h3>
                          <p className="text-xs text-[#94A3B8] font-medium leading-relaxed">{t.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-center mt-12">
                   <button 
                     disabled={!theme}
                     onClick={handleInitialize}
                     className="px-12 py-6 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-[length:200%_auto] hover:bg-[position:right_center] text-white rounded-2xl font-black uppercase tracking-[0.3em] text-sm hover:scale-105 active:scale-95 transition-all duration-500 disabled:opacity-20 flex items-center gap-3 shadow-[0_0_50px_rgba(59,130,246,0.4)]"
                   >
                     <Zap size={20} className="animate-pulse" /> Initialize System
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

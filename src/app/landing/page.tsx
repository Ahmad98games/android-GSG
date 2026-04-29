'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle, 
  Globe, 
  ArrowRight, 
  Eye, 
  Network,
  Lock,
  Zap as FastZap,
  BarChart3,
  AlertTriangle,
  Settings
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useBranding } from '@/providers/BrandingProvider';
import { useCurrency } from '@/components/providers/CurrencyProvider';

/**
 * Global Industrial Landing Page — White-Labeled
 */

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [loadingText, setLoadingText] = useState('Searching for Local Mesh Nodes...');
  const [searchStatus, setSearchStatus] = useState<'searching' | 'timeout' | 'connected'>('searching');
  const [manualIp, setManualIp] = useState('');
  const [showManual, setShowManual] = useState(false);
  const { businessName, businessLogo } = useBranding();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { currency, setCurrency } = useCurrency();

  useEffect(() => {
    if (isInitializing && searchStatus === 'searching') {
      console.info('🛡️ FIREWALL_CHECK: Ensure Windows Firewall allows Noxis on Private Networks.');
      
      const timeout = setTimeout(() => {
        setSearchStatus('timeout');
        setLoadingText('Local Hub Active (Solo Mode)');
      }, 10000);

      const texts = [
        'Pinging Mesh Gateways...',
        'Scanning Local Subnet...',
        'Handshaking with Field Nodes...'
      ];
      let i = 0;
      const interval = setInterval(() => {
        i++;
        if (i < texts.length) setLoadingText(texts[i]);
      }, 2500);

      return () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };
    }
  }, [isInitializing, searchStatus]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const goToWizard = () => {
    window.location.href = '/onboarding';
  };

  const handleQuickDeploy = (tier: string) => {
    localStorage.setItem('NOXIS_TIER', tier);
    setIsInitializing(true);
    setSearchStatus('searching');
  };

  const proceedToDashboard = () => {
    if (manualIp) {
      localStorage.setItem('HUB_IP', manualIp);
    }
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-[#030303] text-slate-100 font-sans selection:bg-violet-500/30 overflow-x-hidden">
      {/* Cinematic Initialization Overlay */}
      {isInitializing && (
        <div className="fixed inset-0 z-[200] bg-[#030303] flex items-center justify-center animate-in fade-in duration-500 overflow-hidden">
          {/* Sonar Pulse Animation */}
          {searchStatus === 'searching' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-1 h-1 bg-violet-500/40 rounded-full animate-[ping_3s_linear_infinite]" />
              <div className="absolute w-[300px] h-[300px] border border-violet-500/10 rounded-full animate-[ping_4s_linear_infinite]" />
              <div className="absolute w-[600px] h-[600px] border border-violet-500/5 rounded-full animate-[ping_5s_linear_infinite]" />
            </div>
          )}

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-[#030303] to-[#030303]" />
          
          <div className="z-10 flex flex-col items-center gap-10 max-w-md w-full px-8 text-center">
            <div className="relative w-40 h-40 flex items-center justify-center">
               {/* Sonar Waves */}
               {searchStatus === 'searching' && (
                 <>
                   <div className="absolute inset-0 border border-violet-500/20 rounded-full animate-ping" />
                   <div className="absolute -inset-4 border border-violet-500/10 rounded-full animate-[ping_2s_linear_infinite]" />
                 </>
               )}
               
               <div className="relative w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl">
                 {businessLogo ? (
                   <Image src={businessLogo} alt="Logo" width={64} height={64} className="object-contain" unoptimized />
                 ) : (
                   <Network className={cn("w-12 h-12 text-violet-500", searchStatus === 'searching' && "animate-pulse")} />
                 )}
               </div>
            </div>

            <div className="space-y-4">
               <h2 className="text-3xl font-black text-white tracking-[0.2em] uppercase">{businessName}</h2>
               <div className="flex flex-col items-center gap-2">
                 <p className={cn(
                   "text-sm font-mono uppercase tracking-[0.3em]",
                   searchStatus === 'timeout' ? "text-[#C5A059]" : "text-[#FFD700] animate-pulse"
                 )}>
                   {loadingText}
                 </p>
                 {searchStatus === 'searching' && (
                   <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                     <Shield className="w-3 h-3" /> Encrypting Local Mesh
                   </span>
                 )}
               </div>
            </div>

            {/* Post-Discovery / Timeout UI */}
            <div className="w-full space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              {searchStatus === 'timeout' && !showManual && (
                <div className="flex flex-col gap-3">
                   <button 
                    onClick={proceedToDashboard}
                    className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] transition-all shadow-xl"
                  >
                    Enter Hub Anyway
                  </button>
                  <button 
                    onClick={() => setShowManual(true)}
                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings className="w-3 h-3" /> Connect Manually
                  </button>
                </div>
              )}

              {showManual && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <input 
                    type="text"
                    placeholder="ENTER HUB IP (e.g. 192.168.1.5)"
                    value={manualIp}
                    onChange={(e) => setManualIp(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-center font-black tracking-widest text-white focus:border-violet-500 outline-none transition-all"
                  />
                  <button 
                    onClick={proceedToDashboard}
                    disabled={!manualIp}
                    className="w-full py-4 bg-violet-600 text-white rounded-xl font-black uppercase tracking-widest text-xs disabled:opacity-30 transition-all"
                  >
                    Verify & Link
                  </button>
                </div>
              )}

              {/* Firewall Tip */}
              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 text-left">
                <AlertTriangle className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed tracking-tight">
                  <span className="text-white">PRO TIP:</span> Ensure Windows Firewall allows <span className="text-violet-400">{businessName}</span> on Private Networks for node discovery.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'py-4 bg-[#030303]/80 backdrop-blur-xl border-b border-white/5' : 'py-6 bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700] to-[#8A2BE2] rounded-xl blur-sm group-hover:blur-md transition-all opacity-80" />
              <div className="relative w-full h-full bg-[#030303] rounded-xl flex items-center justify-center border border-white/10 overflow-hidden">
                {businessLogo ? (
                  <Image src={businessLogo} alt="Logo" width={40} height={40} className="object-contain" unoptimized />
                ) : (
                  <Shield className="text-[#FFD700] w-5 h-5 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                )}
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black tracking-tighter text-white uppercase">{businessName}</span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#8A2BE2] uppercase mt-0.5">Industrial Intelligence</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-10 text-sm font-medium text-slate-400">
            <a href="#vision" onClick={(e) => handleNavClick(e, 'pillars')} className="hover:text-[#FFD700] transition-colors tracking-wide">Vision</a>
            <a href="#pillars" onClick={(e) => handleNavClick(e, 'pillars')} className="hover:text-[#FFD700] transition-colors tracking-wide">Tech Pillars</a>
            <a href="#dashboard" onClick={(e) => handleNavClick(e, 'dashboard')} className="hover:text-[#FFD700] transition-colors tracking-wide">Global Bridge</a>
            <a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')} className="hover:text-[#FFD700] transition-colors tracking-wide">Pricing</a>
            
            {/* Currency Toggle */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-1 ml-4">
              <button 
                onClick={() => setCurrency('USD')}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black transition-all",
                  currency === 'USD' ? "bg-[#FFD700] text-black shadow-lg" : "text-slate-400 hover:text-white"
                )}
              >
                USD
              </button>
              <button 
                onClick={() => setCurrency('PKR')}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black transition-all",
                  currency === 'PKR' ? "bg-[#FFD700] text-black shadow-lg" : "text-slate-400 hover:text-white"
                )}
              >
                PKR
              </button>
            </div>
          </div>

          <button onClick={goToWizard} className="relative group overflow-hidden px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] to-[#8A2BE2] group-hover:scale-105 transition-transform" />
            <span className="relative text-black">Enter Network</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6 overflow-hidden">
        {/* Background Visuals */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-violet-600/5 blur-[120px] rounded-full -z-10 animate-pulse" />
        <div className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] bg-yellow-500/5 blur-[100px] rounded-full -z-10" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-[#FFD700] animate-ping" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Version 9.0 Decentralized Mesh</span>
            </div>
            
            <h1 className="text-6xl lg:text-8xl font-black tracking-tight leading-[0.95] text-white">
              The Future of <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] via-[#FDB931] to-[#8A2BE2]">
                Industrial Intelligence.
              </span>
            </h1>
            
            <p className="text-2xl font-medium text-slate-400 leading-tight max-w-xl">
              Decoupled & Decentralized. Edge-Computing Mesh ERP with <span className="text-white">YOLOv8 Vision AI</span>. 0% Latency, 100% Privacy.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
              <button onClick={goToWizard} className="w-full sm:w-auto bg-white text-black px-10 py-5 rounded-2xl font-black text-lg hover:bg-[#FFD700] transition-all flex items-center justify-center gap-3 group shadow-[0_0_40px_rgba(255,215,0,0.3)]">
                Deploy Node <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={(e) => { e.preventDefault(); document.getElementById('pillars')?.scrollIntoView({ behavior: 'smooth' }); }} className="w-full sm:w-auto border border-white/10 bg-white/5 hover:bg-white/10 px-10 py-5 rounded-2xl font-bold text-lg transition-all backdrop-blur-md">
                View Architecture
              </button>
            </div>

            <div className="flex items-center gap-8 pt-10 border-t border-white/5">
              <div>
                <div className="text-3xl font-black text-white">0ms</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Local Latency</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <div className="text-3xl font-black text-white">100%</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data Privacy</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <div className="text-3xl font-black text-white">∞</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scalability</div>
              </div>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD700] to-[#8A2BE2] rounded-[40px] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative aspect-square rounded-[36px] overflow-hidden border border-white/10 bg-[#0A0A0A]">
              <Image 
                src="/landing/hero-mesh.png" 
                alt="Mesh Network Visual" 
                fill
                className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />
              
              {/* Overlay elements */}
              <div className="absolute bottom-8 left-8 right-8 p-6 rounded-3xl bg-black/60 backdrop-blur-md border border-white/10 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-300">Active Node: Karachi_01</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#FFD700]">SYNCED</span>
                </div>
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-gradient-to-r from-[#FFD700] to-[#8A2BE2]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Pillars */}
      <section id="pillars" className="py-32 px-6 bg-[#050505] relative">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-24">
            <h2 className="text-[#FFD700] font-black uppercase tracking-[0.3em] text-sm mb-4">The Foundation</h2>
            <h3 className="text-4xl lg:text-6xl font-black text-white leading-tight">Decentralized Power for the Industrial Spine.</h3>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            {/* Pillar 1 */}
            <div className="group relative p-10 rounded-[40px] bg-[#0A0A0A] border border-white/5 hover:border-[#FFD700]/30 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Network className="text-[#FFD700] w-8 h-8" />
              </div>
              <h4 className="text-2xl font-black text-white mb-4">Edge Mesh</h4>
              <p className="text-slate-400 leading-relaxed mb-8">
                No cloud dependency. Secure, fast, and local. Your factory runs even when the world goes offline. Truly resilient architecture.
              </p>
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> Air-Gapped</span>
                <span className="flex items-center gap-1.5"><FastZap className="w-3 h-3" /> Sub-ms Sync</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="group relative p-10 rounded-[40px] bg-[#0A0A0A] border border-white/5 hover:border-[#8A2BE2]/30 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-[#8A2BE2]/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Eye className="text-[#8A2BE2] w-8 h-8" />
              </div>
              <h4 className="text-2xl font-black text-white mb-4">AI Vision</h4>
              <p className="text-slate-400 leading-relaxed mb-8">
                Automated Quality Control & Worker Efficiency powered by YOLOv8. Detect defects and optimize floor movement in real-time.
              </p>
              <div className="relative w-full h-32 rounded-2xl overflow-hidden mt-4 bg-[#111]">
                <Image src="/landing/ai-heatmap.png" alt="AI Heatmap" fill className="object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
                <div className="absolute bottom-4 left-4 text-[10px] font-bold text-white uppercase tracking-widest bg-violet-600 px-2 py-1 rounded">Live Heatmap</div>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="group relative p-10 rounded-[40px] bg-[#0A0A0A] border border-white/5 hover:border-white/20 transition-all">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Globe className="text-white w-8 h-8" />
              </div>
              <h4 className="text-2xl font-black text-white mb-4">Global Bridge</h4>
              <p className="text-slate-400 leading-relaxed mb-8">
                Monitor multiple factory nodes from a single dashboard. Synchronize data globally while keeping processing local at each edge.
              </p>
              <div className="flex items-center gap-2 pt-4">
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-bold">LHR</div>
                <div className="w-2 h-px bg-white/20" />
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-bold">KHI</div>
                <div className="w-2 h-px bg-white/20" />
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-bold">FSD</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Visualization Section */}
      <section id="dashboard" className="py-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-24">
          <div className="flex-1 relative order-2 lg:order-1">
             <div className="absolute -inset-4 bg-gradient-to-r from-[#FFD700]/20 to-[#8A2BE2]/20 blur-2xl -z-10" />
             <div className="rounded-[40px] border border-white/10 bg-[#0A0A0A] p-4 shadow-2xl relative overflow-hidden group">
               <Image 
                  src="/landing/data-viz.png" 
                  alt="Global Dashboard" 
                  width={800} 
                  height={600} 
                  className="rounded-[32px] opacity-90 group-hover:scale-[1.02] transition-transform duration-700 bg-[#111]"
               />
               <div className="absolute top-8 right-8 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
                  <BarChart3 className="text-[#FFD700] w-4 h-4" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest">Real-time Telemetry</span>
               </div>
             </div>
          </div>

          <div className="flex-1 space-y-8 order-1 lg:order-2">
            <h2 className="text-5xl lg:text-7xl font-black text-white tracking-tighter">
              Total Visibility. <br />
              <span className="text-slate-600">No Blind Spots.</span>
            </h2>
            <p className="text-xl text-slate-400 leading-relaxed">
              Omnora Noxis Global provides a unified operating system for your entire manufacturing empire. From individual thread counts to global logistics, every byte of data is at your fingertips.
            </p>
            <ul className="space-y-6 pt-4">
              <li className="flex items-start gap-4">
                <div className="mt-1 w-5 h-5 rounded-full bg-[#FFD700] flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="text-black w-3 h-3" strokeWidth={3} />
                </div>
                <div>
                  <h5 className="text-lg font-bold text-white">Unified Node Management</h5>
                  <p className="text-slate-500 text-sm">Control 100+ edge nodes from one master bridge.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="mt-1 w-5 h-5 rounded-full bg-[#8A2BE2] flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="text-white w-3 h-3" strokeWidth={3} />
                </div>
                <div>
                  <h5 className="text-lg font-bold text-white">Predictive AI Analytics</h5>
                  <p className="text-slate-500 text-sm">Anticipate machine failures before they happen.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section id="pricing" className="py-32 px-6 bg-gradient-to-b from-transparent to-[#8A2BE2]/5">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div className="text-center mb-24">
            <h2 className="text-[#FFD700] font-black uppercase tracking-[0.3em] text-sm mb-4">Investment</h2>
            <h3 className="text-5xl lg:text-7xl font-black text-white tracking-tighter">Scale with Intelligence.</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8 w-full">
            {/* Tier 1 */}
            <div className="p-10 rounded-[40px] bg-[#0A0A0A] border border-white/5 hover:border-white/10 transition-all flex flex-col">
              <h4 className="text-xl font-bold text-slate-400 mb-2 uppercase tracking-widest">Startup</h4>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black text-white">
                  {currency === 'PKR' ? 'Rs. 3,500' : '$12'}
                </span>
                <span className="text-slate-500 font-bold">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1 text-sm text-slate-400">
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-slate-600" /> Up to 3 Edge Nodes</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-slate-600" /> Basic Inventory Mesh</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-slate-600" /> Standard ERP Module</li>
                <li className="flex items-center gap-3 opacity-30"><CheckCircle className="w-4 h-4" /> AI Vision Engine</li>
              </ul>
              <button onClick={() => handleQuickDeploy('pro')} className="w-full py-4 rounded-2xl border border-white/10 font-bold hover:bg-white hover:text-black transition-all">
                Get Started
              </button>
            </div>

            {/* Tier 2 - Popular */}
            <div className="p-10 rounded-[40px] bg-[#0A0A0A] border-2 border-[#FFD700] relative transform md:scale-105 shadow-2xl flex flex-col">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#FFD700] text-black px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Most Deployed</div>
              <h4 className="text-xl font-bold text-[#FFD700] mb-2 uppercase tracking-widest">Enterprise</h4>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-6xl font-black text-white">
                  {currency === 'PKR' ? 'Rs. 14,000' : '$49'}
                </span>
                <span className="text-slate-500 font-bold">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1 text-sm text-slate-300">
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-[#FFD700]" /> Unlimited Edge Nodes</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-[#FFD700]" /> Global Bridge Dashboard</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-[#FFD700]" /> Full AI Vision Integration</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-4 h-4 text-[#FFD700]" /> 24/7 Priority Support</li>
              </ul>
              <button onClick={() => handleQuickDeploy('elite')} className="w-full py-5 rounded-2xl bg-[#FFD700] text-black font-black text-lg hover:scale-[1.02] transition-all shadow-xl shadow-[#FFD700]/20">
                Deploy Now
              </button>
            </div>

            {/* Tier 3 */}
            <div className="p-10 rounded-[40px] bg-[#0A0A0A] border border-white/5 hover:border-white/10 transition-all flex flex-col">
              <h4 className="text-xl font-bold text-slate-400 mb-2 uppercase tracking-widest">Industrial</h4>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black text-white">Custom</span>
              </div>
              <p className="text-sm text-slate-500 mb-8 flex-1">
                For massive multi-national conglomerates requiring dedicated hardware and localized AI training.
              </p>
              <button onClick={() => goToWizard()} className="w-full py-4 rounded-2xl border border-white/10 font-bold hover:bg-white hover:text-black transition-all">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-24 px-6 border-t border-white/5 bg-[#030303] text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-12">
            <Shield className="text-[#FFD700] w-6 h-6" />
            <span className="text-2xl font-black tracking-tighter text-white">OMNORA <span className="text-[#FFD700]">NOXIS</span></span>
          </div>
          <h2 className="text-4xl font-black text-white mb-8">Ready to evolve?</h2>
          <div className="flex justify-center gap-6">
             <button onClick={goToWizard} className="px-10 py-5 bg-white text-black rounded-2xl font-black hover:bg-[#FFD700] transition-all">Start Free Trial</button>
             <button className="px-10 py-5 border border-white/10 rounded-2xl font-bold hover:bg-white/5 transition-all text-slate-400">Documentation</button>
          </div>
          <div className="mt-20 flex flex-col md:flex-row items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] gap-8">
            <p>© 2026 Omnora Noxis Global. All Rights Reserved.</p>
            <div className="flex gap-10">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  Palette, 
  Type, 
  Box, 
  Sparkles, 
  Layout,
  RefreshCw,
  Rocket
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ThemeConfig {
  basePalette: 'Dark' | 'Slate' | 'Navy';
  accentColor: string;
  glassmorphism: 'Solid' | 'Translucent' | 'Glass';
  fontPersonality: 'Professional' | 'Industrial' | 'Futuristic';
  buttonStyle: 'Neon Glow' | 'Minimalist Outline' | '3D Shadow';
}

const ACCENT_PRESETS = [
  '#60A5FA', '#22C55E', '#8B5CF6', '#EF4444', 
  '#F59E0B', '#06B6D4', '#F43F5E', '#6366F1', 
  '#14B8A6', '#F97316', '#EC4899', '#F8FAFC',
  '#10B981', '#3B82F6', '#6366F1', '#A855F7',
  '#D946EF', '#F43F5E', '#FB923C', '#FACC15'
];

const THEME_PRESETS = [
  { id: 'emerald', name: 'Emerald Forest', bg: 'Slate', accent: '#10B981', glass: 'Translucent' },
  { id: 'ruby', name: 'Ruby Volt', bg: 'Dark', accent: '#F43F5E', glass: 'Glass' },
  { id: 'violet', name: 'Electric Violet', bg: 'Navy', accent: '#8B5CF6', glass: 'Translucent' },
  { id: 'cyberpunk', name: 'Cyberpunk Gold', bg: 'Dark', accent: '#C5A059', glass: 'Glass' },
  { id: 'titanium', name: 'Titanium Slate', bg: 'Slate', accent: '#94A3B8', glass: 'Solid' },
  { id: 'neon', name: 'Neon Sky', bg: 'Navy', accent: '#06B6D4', glass: 'Glass' },
];

export default function ThemeWizardPage() {
  const [config, setConfig] = useState<ThemeConfig>({
    basePalette: 'Dark',
    accentColor: '#60A5FA',
    glassmorphism: 'Translucent',
    fontPersonality: 'Professional',
    buttonStyle: 'Neon Glow'
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setIsInitializing(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const getBaseColors = (palette: string) => {
    switch(palette) {
      case 'Slate': return { bg: '#0F1923', surface: '#172130' };
      case 'Navy': return { bg: '#0A0E1A', surface: '#111827' };
      default: return { bg: '#121417', surface: '#1E2126' };
    }
  };

  const getFont = (personality: string) => {
    switch(personality) {
      case 'Industrial': return 'var(--font-mono)';
      case 'Futuristic': return 'var(--font-geist)';
      default: return 'var(--font-inter)';
    }
  };

  const handleInitialize = async () => {
    if (typeof window !== 'undefined' && (window as any).noxis) {
      await (window as any).noxis.store.set('themeConfig', config);
      // In a real implementation, we'd also trigger the file write here via IPC
      router.push('/dashboard');
    }
  };

  const colors = getBaseColors(config.basePalette);

  return (
    <div className="min-h-screen bg-[#121417] text-[#F1F5F9] font-sans flex overflow-hidden">
      <AnimatePresence>
        {isInitializing && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#121417] flex flex-col items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 mb-8"
            >
              <Palette className="w-full h-full text-[#60A5FA]" />
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs font-black tracking-[0.5em] text-[#C5A059] uppercase"
            >
              Opening Design Lab...
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left: Controls */}
      <div className="w-[60%] h-screen overflow-y-auto bg-[#121417] border-r border-[#334155] p-12 custom-scrollbar">
        <header className="mb-12">
          <h1 className="text-3xl font-black tracking-widest text-[#60A5FA] uppercase mb-2">CUSTOMIZE YOUR INTERFACE</h1>
          <p className="text-[#94A3B8] text-sm">Configure the visual DNA of your industrial terminal</p>
        </header>

        {/* Section 0: Quick Presets */}
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#C5A059] mb-4">
            <Sparkles className="w-3 h-3" /> Quick Presets
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {THEME_PRESETS.map(p => (
              <button 
                key={p.id}
                onClick={() => setConfig({ 
                  ...config, 
                  basePalette: p.bg as any, 
                  accentColor: p.accent, 
                  glassmorphism: p.glass as any 
                })}
                className="p-4 rounded-2xl bg-[#1E2126] border border-[#334155] hover:border-[#60A5FA55] transition-all text-left flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg shrink-0 border border-white/5" style={{ backgroundColor: p.accent }} />
                <div>
                  <p className="text-[10px] font-black uppercase text-white leading-none mb-1">{p.name}</p>
                  <p className="text-[8px] font-bold text-[#475569] uppercase leading-none">{p.bg} / {p.glass}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Section 1: Base Palette */}
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#C5A059] mb-4">
            <Layout className="w-3 h-3" /> Base Palette
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {(['Dark', 'Slate', 'Navy'] as const).map(p => (
              <button 
                key={p}
                onClick={() => setConfig({ ...config, basePalette: p })}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  config.basePalette === p ? 'border-[#60A5FA] bg-[#60A5FA05]' : 'border-[#334155] hover:border-[#475569]'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 rounded-full border border-white/10" style={{ backgroundColor: getBaseColors(p).bg }} />
                  {config.basePalette === p && <Check className="w-4 h-4 text-[#60A5FA]" />}
                </div>
                <span className="text-sm font-black uppercase">{p}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Section 2: Accent Color */}
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#C5A059] mb-4">
            <Palette className="w-3 h-3" /> Accent Color
          </h2>
          <div className="grid grid-cols-6 gap-3 mb-4">
            {ACCENT_PRESETS.map(c => (
              <button 
                key={c}
                onClick={() => setConfig({ ...config, accentColor: c })}
                className="aspect-square rounded-xl border border-white/10 transition-all hover:scale-110 relative"
                style={{ 
                  backgroundColor: c,
                  boxShadow: config.accentColor === c ? `0 0 15px ${c}66` : 'none'
                }}
              >
                {config.accentColor === c && <Check className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 bg-[#1E2126] p-4 rounded-2xl border border-[#334155]">
            <input 
              type="color" 
              value={config.accentColor}
              onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
              className="w-10 h-10 rounded-lg bg-transparent cursor-pointer"
            />
            <input 
              type="text" 
              value={config.accentColor}
              onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
              className="bg-transparent border-none text-sm font-mono focus:outline-none flex-1 uppercase"
            />
          </div>
        </section>

        {/* Section 3: Glassmorphism */}
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#C5A059] mb-4">
            <Box className="w-3 h-3" /> Surface Style
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {(['Solid', 'Translucent', 'Glass'] as const).map(g => (
              <button 
                key={g}
                onClick={() => setConfig({ ...config, glassmorphism: g })}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  config.glassmorphism === g ? 'border-[#60A5FA] bg-[#60A5FA05]' : 'border-[#334155] hover:border-[#475569]'
                }`}
              >
                <div className="mb-4 h-8 flex items-center">
                  <div className={`w-full h-4 rounded ${
                    g === 'Solid' ? 'bg-[#334155]' : 
                    g === 'Translucent' ? 'bg-[#33415588] blur-[2px]' : 
                    'bg-[#33415544] blur-[4px]'
                  }`} />
                </div>
                <span className="text-sm font-black uppercase">{g}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Section 4: Typography */}
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#C5A059] mb-4">
            <Type className="w-3 h-3" /> Font Personality
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {(['Professional', 'Industrial', 'Futuristic'] as const).map(f => (
              <button 
                key={f}
                onClick={() => setConfig({ ...config, fontPersonality: f })}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  config.fontPersonality === f ? 'border-[#60A5FA] bg-[#60A5FA05]' : 'border-[#334155] hover:border-[#475569]'
                }`}
              >
                <p className="text-[10px] mb-4 h-8 overflow-hidden opacity-70">Noxis Industrial OS v9.0 — System Ready</p>
                <span className="text-sm font-black uppercase">{f}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Section 5: Buttons */}
        <section className="mb-12">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#C5A059] mb-4">
            <Sparkles className="w-3 h-3" /> Button Style
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {(['Neon Glow', 'Minimalist Outline', '3D Shadow'] as const).map(b => (
              <button 
                key={b}
                onClick={() => setConfig({ ...config, buttonStyle: b })}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center ${
                  config.buttonStyle === b ? 'border-[#60A5FA] bg-[#60A5FA05]' : 'border-[#334155] hover:border-[#475569]'
                }`}
              >
                <div 
                  className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase mb-4 ${
                    b === 'Neon Glow' ? 'bg-[#60A5FA] text-black shadow-[0_0_15px_#60A5FA]' :
                    b === 'Minimalist Outline' ? 'border border-[#60A5FA] text-[#60A5FA]' :
                    'bg-[#60A5FA] text-black shadow-[4px_4px_0_#1e293b]'
                  }`}
                  style={b !== 'Minimalist Outline' ? { backgroundColor: config.accentColor } : { borderColor: config.accentColor, color: config.accentColor }}
                >
                  PREVIEW
                </div>
                <span className="text-sm font-black uppercase">{b}</span>
              </button>
            ))}
          </div>
        </section>

        <button 
          onClick={handleInitialize}
          className="w-full bg-[#60A5FA] text-[#121417] py-6 rounded-3xl font-black text-lg tracking-widest flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(96,165,250,0.3)] mb-12"
          style={{ backgroundColor: config.accentColor }}
        >
          INITIALIZE SYSTEM <Rocket className="w-6 h-6" />
        </button>
      </div>

      {/* Right: Live Preview */}
      <div className="flex-1 h-screen bg-[#0F172A] p-12 flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-1/4 -right-20 w-80 h-80 bg-[#60A5FA22] rounded-full blur-[100px]" style={{ backgroundColor: `${config.accentColor}22` }} />
          <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-[#8B5CF611] rounded-full blur-[100px]" />
        </div>

        <div className="z-10 w-full max-w-md space-y-8">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10">
              <RefreshCw className="w-8 h-8 animate-spin-slow" style={{ color: config.accentColor }} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-widest">LIVE TERMINAL PREVIEW</h3>
            <p className="text-xs text-[#94A3B8] mt-2">Real-time simulation of industrial dashboard</p>
          </div>

          {/* Sample Card */}
          <div 
            className={`p-8 rounded-[2.5rem] border transition-all ${
              config.glassmorphism === 'Solid' ? 'bg-[#1E2126] border-[#334155]' :
              config.glassmorphism === 'Translucent' ? 'bg-[#1E212688] border-[#334155] backdrop-blur-md' :
              'bg-[#1E212644] border-white/10 backdrop-blur-xl'
            }`}
            style={{ 
              backgroundColor: config.glassmorphism === 'Solid' ? colors.surface : `${colors.surface}${config.glassmorphism === 'Translucent' ? '88' : '44'}`,
              fontFamily: getFont(config.fontPersonality)
            }}
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-1">Total Valuation</p>
                <p className="text-3xl font-black tracking-tighter" style={{ color: config.accentColor }}>Rs. 1,240,000</p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black text-[#22C55E] flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                STABLE
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Loom Active', value: '42/48' },
                { label: 'Energy Load', value: '78%' }
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-3 border-b border-white/5">
                  <span className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">{item.label}</span>
                  <span className="text-sm font-black">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <button 
                className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  config.buttonStyle === 'Neon Glow' ? 'shadow-lg' :
                  config.buttonStyle === 'Minimalist Outline' ? 'border' :
                  'shadow-[4px_4px_0_rgba(0,0,0,0.3)]'
                }`}
                style={{ 
                  backgroundColor: config.buttonStyle === 'Minimalist Outline' ? 'transparent' : config.accentColor,
                  color: config.buttonStyle === 'Minimalist Outline' ? config.accentColor : '#121417',
                  borderColor: config.accentColor,
                  boxShadow: config.buttonStyle === 'Neon Glow' ? `0 10px 25px ${config.accentColor}44` : 'none'
                }}
              >
                EXECUTE COMMAND
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}

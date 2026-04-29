'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Upload, 
  Check, 
  ArrowRight, 
  Globe,
  Monitor,
  Camera
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useBranding } from '@/providers/BrandingProvider';

export default function BrandingWizardPage() {
  const { businessName, businessLogo, updateBranding } = useBranding();
  const [name, setName] = useState(businessName);
  const [logo, setLogo] = useState(businessLogo);
  const [isInitializing, setIsInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setIsInitializing(false), 2000);
    return () => clearTimeout(timer);
  }, []);

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

  const handleConfirm = async () => {
    setSaving(true);
    await updateBranding(name || 'Noxis Sentinel', logo);
    router.push('/onboarding/industry');
  };

  return (
    <div className="min-h-screen bg-[#121417] text-[#F1F5F9] font-sans selection:bg-[#60A5FA33] overflow-hidden relative">
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
              <Monitor className="w-full h-full text-[#60A5FA]" />
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs font-black tracking-[0.5em] text-[#C5A059] uppercase"
            >
              Initializing Brand Core...
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-12 py-16 relative z-10 h-screen flex flex-col items-center justify-center">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#60A5FA11] border border-[#60A5FA33] mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#60A5FA] animate-pulse" />
            <span className="text-[8px] font-black tracking-[0.2em] text-[#60A5FA] uppercase">White-Labeling Ready</span>
          </div>
          <h1 className="text-4xl font-black tracking-[0.15em] text-white mb-2 uppercase">BRAND YOUR SYSTEM</h1>
          <p className="text-[#94A3B8] text-xs font-medium max-w-md mx-auto leading-relaxed">
            Enter your business details. This will replace all Noxis branding across your industrial hub and mobile nodes.
          </p>
        </header>

        <div className="w-full grid md:grid-cols-2 gap-12 mb-12">
          {/* Section 1: Business Name */}
          <div className="space-y-6">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#C5A059]">
              <Building2 className="w-3 h-3" /> Business Name
            </h2>
            <div className="relative group">
              <input 
                type="text" 
                placeholder="e.g. Al-Falah Textiles"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1E2126] border border-[#334155] rounded-3xl px-8 py-6 text-lg font-black focus:outline-none focus:border-[#60A5FA] transition-all group-hover:border-[#475569]"
              />
              {name.length > 2 && (
                <Check className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-[#22C55E]" />
              )}
            </div>
          </div>

          {/* Section 2: Logo Upload */}
          <div className="space-y-6">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#C5A059]">
              <Camera className="w-3 h-3" /> System Logo
            </h2>
            <div className="relative group h-[78px]">
              <label className="flex items-center justify-between w-full h-full bg-[#1E2126] border border-[#334155] rounded-3xl px-8 cursor-pointer hover:border-[#60A5FA] transition-all group-hover:bg-[#60A5FA05]">
                <div className="flex items-center gap-4">
                  {logo ? (
                    <img src={logo} alt="Business Logo" className="w-10 h-10 object-contain rounded-md" />
                  ) : (
                    <div className="w-10 h-10 bg-[#121417] rounded-lg flex items-center justify-center">
                      <Upload className="w-5 h-5 text-zinc-500" />
                    </div>
                  )}
                  <span className="text-sm font-bold text-zinc-400">
                    {logo ? 'Logo Uploaded' : 'Upload PNG/SVG'}
                  </span>
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                {logo && <Check className="w-6 h-6 text-[#22C55E]" />}
              </label>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="w-full max-w-md bg-[#1E212688] border border-[#334155] rounded-[2.5rem] p-10 backdrop-blur-md mb-12">
          <p className="text-[10px] font-black text-[#475569] uppercase tracking-widest mb-8 text-center">Live Branding Preview</p>
          <div className="flex items-center gap-4 justify-center">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden">
              {logo ? <img src={logo} alt="Logo" className="w-10 h-10 object-contain" /> : <Monitor className="w-8 h-8 text-[#60A5FA]" />}
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">{name || 'Noxis Sentinel'}</h3>
              <p className="text-[10px] font-bold text-[#60A5FA] uppercase tracking-widest mt-1">Industrial Intelligence</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleConfirm}
          disabled={!name || saving}
          className={`flex items-center gap-3 px-12 py-5 rounded-full font-black text-sm transition-all ${
            name 
              ? 'bg-[#60A5FA] text-[#121417] hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(96,165,250,0.3)]' 
              : 'bg-[#334155] text-[#64748B] cursor-not-allowed'
          }`}
        >
          {saving ? 'INITIALIZING...' : 'CONFIRM IDENTITY'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[10px] font-black text-[#475569] uppercase tracking-[0.3em] flex items-center gap-4">
        <Globe className="w-3 h-3" /> Global White-Labeling Engine Active
      </div>
    </div>
  );
}

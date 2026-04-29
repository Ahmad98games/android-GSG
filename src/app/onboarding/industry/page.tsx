'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Factory, 
  Trash2, 
  Box, 
  ShoppingCart, 
  Smartphone, 
  Settings, 
  Scissors, 
  FlaskConical, 
  Snowflake, 
  Waves, 
  Hammer, 
  Wheat, 
  Construction,
  Truck,
  Globe,
  Zap,
  Coffee,
  Stethoscope,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  Search
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface IndustryCard {
  id: string;
  name: string;
  category: string;
  icon: React.ElementType;
  features: string[];
}

const REGIONAL_INDUSTRIES: IndustryCard[] = [
  { id: 'textile', name: 'Textile — Loom & Dyeing', category: 'Manufacturing', icon: Factory, features: ['Karigar', 'Khata', 'Meter/Yard', 'PKR', 'CESS'] },
  { id: 'leather', name: 'Leather Tannery', category: 'Manufacturing', icon: Waves, features: ['Worker Wages', 'Hide Inventory', 'Export GST'] },
  { id: 'marble', name: 'Marble & Stone Factory', category: 'Manufacturing', icon: Construction, features: ['Slab Tracking', 'Labor Cost', 'Weight/Ton'] },
  { id: 'rice', name: 'Rice Mill', category: 'Processing', icon: Wheat, features: ['Paddy In/Out', 'Mandi Rate', 'Bag Count'] },
  { id: 'kiryana', name: 'Wholesale Kiryana', category: 'Wholesale', icon: ShoppingCart, features: ['Credit Khata', 'SKU Scan', 'Daily Cash'] },
  { id: 'mobile', name: 'Mobile Accessories Shop', category: 'Retail', icon: Smartphone, features: ['IMEI Tracking', 'Warranty', 'Walk-in POS'] },
  { id: 'auto-mfg', name: 'Auto Parts Manufacturing', category: 'Manufacturing', icon: Settings, features: ['OEM Codes', 'Batch Assembly', 'Dealer Ledger'] },
  { id: 'stitching', name: 'Garment Stitching Unit', category: 'Textiles', icon: Scissors, features: ['Piece Rate', 'Worker Efficiency', 'Order Tracking'] },
  { id: 'pharma-local', name: 'Pharma Distributor (Local)', category: 'Distribution', icon: FlaskConical, features: ['Batch/Expiry', 'Drug License', 'FIFO Dispatch'] },
  { id: 'cold-storage', name: 'Cold Storage', category: 'Logistics', icon: Snowflake, features: ['Temperature Log', 'Lot In/Out', 'Daily Rent'] },
  { id: 'plastic', name: 'Plastic Recycling', category: 'Processing', icon: Trash2, features: ['Weight In/Out', 'Scrap Rate', 'Shift Report'] },
  { id: 'furniture', name: 'Furniture Workshop', category: 'Manufacturing', icon: Hammer, features: ['Custom Orders', 'Material BOM', 'Carpenter Wages'] },
  { id: 'flour', name: 'Flour Mill', category: 'Processing', icon: Wheat, features: ['Wheat Intake', 'Flour Output', 'Bag Tracking'] },
  { id: 'construction', name: 'Construction Material', category: 'Wholesale', icon: Box, features: ['Cement/Steel', 'Contractor Ledger', 'Site Tracking'] },
  { id: 'poultry', name: 'Poultry Farm Management', category: 'Agriculture', icon: Wheat, features: ['Flock Life Cycle', 'Feed BOM', 'Mortality Log'] },
  { id: 'steel', name: 'Steel Re-rolling Mill', category: 'Manufacturing', icon: Construction, features: ['Billet Tracking', 'Power Load', 'Bundling'] },
  { id: 'chemicals', name: 'Chemicals & Pigments', category: 'Manufacturing', icon: FlaskConical, features: ['Formula Vault', 'Vat Batching', 'Safety SDS'] },
  { id: 'printing', name: 'Printing & Packaging', category: 'Industrial', icon: Box, features: ['Plate Inventory', 'Waste Sheet', 'Job Card'] },
];

const GLOBAL_INDUSTRIES: IndustryCard[] = [
  { id: 'smart-wh', name: 'Smart Warehousing', category: 'Logistics', icon: Box, features: ['IoT Sensors', 'Auto Replenishment', 'WMS'] },
  { id: 'ecommerce', name: 'E-commerce Logistics', category: 'Logistics', icon: Truck, features: ['Dropship', 'Multi-carrier', 'Returns Portal'] },
  { id: 'pharma-lab', name: 'Pharmaceutical Labs', category: 'Medical', icon: FlaskConical, features: ['FDA 21 CFR Part 11', 'eCTD', 'Cold Chain'] },
  { id: 'fashion-house', name: 'Boutique Fashion House', category: 'Fashion', icon: ShoppingBag, features: ['SKU Matrix', 'Lookbook', 'Wholesale Portal'] },
  { id: 'tech-asm', name: 'Tech Hardware Assembly', category: 'Electronics', icon: Zap, features: ['BOM Management', 'RMA Tracking', 'FCC/CE'] },
  { id: 'cloud-kitchen', name: 'Cloud Kitchen Chain', category: 'F&B', icon: Coffee, features: ['Recipe Costing', 'Multi-location', 'Delivery API'] },
  { id: '3pl', name: '3PL Logistics Provider', category: 'Logistics', icon: Truck, features: ['Client Billing', 'SLA Tracking', 'EDI'] },
  { id: 'med-device', name: 'Medical Device Distributor', category: 'Medical', icon: Stethoscope, features: ['UDI/GTIN', 'ISO 13485', 'Audit Trail'] },
  { id: 'auto-export', name: 'Auto Parts (Export)', category: 'Automotive', icon: Globe, features: ['HS Codes', 'LC/TT', 'Pre-shipment Inspection'] },
  { id: 'food-factory', name: 'Food & Beverage Factory', category: 'Manufacturing', icon: Factory, features: ['HACCP', 'Batch Recall', 'Shelf Life'] },
  { id: 'solar', name: 'Solar Installation Company', category: 'Energy', icon: Zap, features: ['Site Projects', 'Warranty Register', 'Inverter BOM'] },
  { id: 'retail-chain', name: 'Retail Chain Management', category: 'Retail', icon: ShoppingCart, features: ['Multi-store', 'Promotions Engine', 'EPOS'] },
  { id: 'denim', name: 'Denim Finishing Plant', category: 'Textiles', icon: Waves, features: ['Wash Recipes', 'Ozone Load', 'Eco Score'] },
  { id: 'jewelry', name: 'Luxury Jewelry Boutique', category: 'Retail', icon: ShoppingBag, features: ['Metal Weight', 'Gem Vault', 'Appraisal'] },
  { id: 'gaming-cafe', name: 'Gaming Cafe Chain', category: 'Entertainment', icon: Zap, features: ['Session Billing', 'Top-up Wallet', 'HW Inventory'] },
  { id: 'fleet', name: 'Fleet Management', category: 'Logistics', icon: Truck, features: ['Fuel Log', 'Driver Rating', 'Dispatch'] },
];

export default function IndustrySelectorPage() {
  const [region, setRegion] = useState<'regional' | 'global'>('regional');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setIsInitializing(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const industries = region === 'regional' ? REGIONAL_INDUSTRIES : GLOBAL_INDUSTRIES;
  const filtered = industries.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = async () => {
    if (!selected) return;
    const selectedIndustry = industries.find(i => i.id === selected);
    if (selectedIndustry && typeof window !== 'undefined' && (window as any).noxis) {
      await (window as any).noxis.store.set('activeIndustryProfile', selectedIndustry.id);
      router.push('/onboarding/theme');
    }
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
              <svg viewBox="0 0 100 100" className="w-full h-full text-[#60A5FA] fill-none stroke-current stroke-[4]">
                <motion.path 
                  d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              </svg>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs font-black tracking-[0.5em] text-[#C5A059] uppercase"
            >
              Initializing Industry Hub...
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#60A5FA 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />

      <div className="max-w-7xl mx-auto px-12 py-16 relative z-10 h-screen flex flex-col">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#60A5FA11] border border-[#60A5FA33] mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#60A5FA] animate-pulse" />
            <span className="text-[8px] font-black tracking-[0.2em] text-[#60A5FA] uppercase">Sovereign Bridge Active</span>
          </div>
          <h1 className="text-4xl font-black tracking-[0.15em] text-white mb-2 uppercase">SELECT SECTOR</h1>
          <p className="text-[#94A3B8] text-xs font-medium max-w-md mx-auto leading-relaxed">
            Noxis v9.0 will reconfigure its neural architecture to match your industrial DNA. Select your primary sector to begin.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
          <div className="flex items-center bg-[#1E2126] border border-[#334155] rounded-full p-1 w-full md:w-auto">
            <button 
              onClick={() => setRegion('regional')}
              className={`px-8 py-2.5 rounded-full text-xs font-black transition-all ${region === 'regional' ? 'bg-[#60A5FA] text-[#121417] shadow-[0_0_15px_rgba(96,165,250,0.4)]' : 'text-[#94A3B8] hover:text-white'}`}
            >
              REGIONAL / SOUTH ASIA
            </button>
            <button 
              onClick={() => setRegion('global')}
              className={`px-8 py-2.5 rounded-full text-xs font-black transition-all ${region === 'global' ? 'bg-[#60A5FA] text-[#121417] shadow-[0_0_15px_rgba(96,165,250,0.4)]' : 'text-[#94A3B8] hover:text-white'}`}
            >
              INTERNATIONAL / GLOBAL
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#475569] w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search industries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1E2126] border border-[#334155] rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[#60A5FA] transition-all"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-[#334155] scrollbar-track-transparent">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pb-8">
            <AnimatePresence mode="popLayout">
              {filtered.map((industry) => (
                <motion.div
                  key={industry.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -4 }}
                  onClick={() => setSelected(industry.id)}
                  className={`relative p-6 rounded-[2rem] border transition-all cursor-pointer group ${
                    selected === industry.id 
                      ? 'bg-[#60A5FA11] border-[#60A5FA] shadow-[0_0_30px_rgba(96,165,250,0.15)]' 
                      : 'bg-[#1E2126] border-[#334155] hover:border-[#60A5FA55]'
                  }`}
                >
                  <div className="mb-4">
                    <industry.icon className={`w-10 h-10 ${selected === industry.id ? 'text-[#60A5FA]' : 'text-[#C5A059]'} transition-colors`} />
                  </div>
                  <div className="mb-4">
                    <h3 className="text-sm font-black text-white leading-tight mb-1">{industry.name}</h3>
                    <p className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">{industry.category}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {industry.features.slice(0, 3).map(f => (
                      <span key={f} className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-[#121417] text-[#94A3B8] border border-[#334155]">
                        {f}
                      </span>
                    ))}
                  </div>
                  {selected === industry.id && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle2 className="w-5 h-5 text-[#60A5FA]" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-8 border-t border-[#334155] flex items-center justify-between">
          <div>
            <p className="text-xs text-[#475569] font-medium">
              {selected 
                ? `Selected: ${industries.find(i => i.id === selected)?.name}`
                : 'Please select an industry to continue'}
            </p>
            <p className="text-[10px] text-[#475569] mt-1 italic">You can change this later in Settings</p>
          </div>

          <button 
            disabled={!selected}
            onClick={handleConfirm}
            className={`flex items-center gap-2 px-10 py-4 rounded-full font-black text-sm transition-all ${
              selected 
                ? 'bg-[#60A5FA] text-[#121417] hover:scale-105 active:scale-95 shadow-[0_15px_30px_rgba(96,165,250,0.3)]' 
                : 'bg-[#334155] text-[#64748B] cursor-not-allowed'
            }`}
          >
            CONFIRM & CONTINUE <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

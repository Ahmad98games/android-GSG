'use client';
import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Video, 
  Users, 
  FileText, 
  Settings, 
  Activity,
  ShieldCheck,
  BookOpen,
  MessageSquare,
  Package,
  Layers,
  ShoppingCart,
  TrendingUp,
  Receipt,
  FileBarChart,
  Menu,
  X as CloseIcon,
  Home,
  Wallet
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/components/providers/CurrencyProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [industry, setIndustry] = useState('');
  const [themePreset, setThemePreset] = useState('');
  const [businessName, setBusinessName] = useState('NOXIS ENTERPRISE');
  const { currency, setCurrency } = useCurrency();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    setIndustry(localStorage.getItem('INDUSTRY_TYPE') || 'textile');
    setThemePreset(localStorage.getItem('THEME_PRESET') || 'cyber-blue');
    const bName = localStorage.getItem('gs_factory_name');
    if (bName) setBusinessName(bName);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getMenuItems = () => {
    if (industry === 'retail') {
      return [
        { name: 'POS Billing', icon: ShoppingCart, href: '/dashboard' },
        { name: 'Inventory', icon: Package, href: '/dashboard/production' },
        { name: 'Customers', icon: Users, href: '/dashboard/nodes' },
        { name: 'Sales Analytics', icon: TrendingUp, href: '/dashboard/audit' },
        { name: 'System Settings', icon: Settings, href: '/dashboard/settings' },
      ];
    } else if (industry === 'general') {
      return [
        { name: 'Daily Ledger', icon: BookOpen, href: '/dashboard/khata' },
        { name: 'Expenses', icon: Receipt, href: '/dashboard/audit' },
        { name: 'Reports', icon: FileBarChart, href: '/dashboard' },
        { name: 'System Settings', icon: Settings, href: '/dashboard/settings' },
      ];
    } else {
      // Default: Textile
      return [
        { name: 'Command Center', icon: LayoutDashboard, href: '/dashboard' },
        { name: 'Smart Khata', icon: BookOpen, href: '/dashboard/khata' },
        { name: 'Loom Tracker', icon: Layers, href: '/dashboard/messenger' },
        { name: 'Inventory', icon: Package, href: '/dashboard/production' },
        { name: 'Vision Sentinel', icon: Video, href: '/dashboard/vision' },
        { name: 'System Settings', icon: Settings, href: '/dashboard/settings' },
      ];
    }
  };

  const menuItems = getMenuItems();

  // Dynamic Theme Colors
  let accentHex = '#06b6d4'; // Cyber Blue default
  let bgClass = 'bg-[#0B1021]';
  let sidebarClass = 'bg-[#0F172A]';

  if (themePreset === 'emerald-gold') {
    accentHex = '#D4AF37';
    bgClass = 'bg-[#062f20]';
    sidebarClass = 'bg-[#042015]';
  } else if (themePreset === 'dark-horror') {
    accentHex = '#3b82f6';
    bgClass = 'bg-[#0f1115]';
    sidebarClass = 'bg-[#0a0a0a]';
  }

  const dateString = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className={cn("flex h-screen text-white overflow-hidden font-sans", bgClass)} style={{ '--theme-accent': accentHex } as React.CSSProperties}>
      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "border-r border-white/5 flex flex-col transition-all duration-500 z-50",
        sidebarClass,
        isMobile ? (isSidebarOpen ? "fixed inset-y-0 left-0 w-64 translate-x-0" : "fixed inset-y-0 left-0 w-64 -translate-x-full") : "w-64"
      )}>
        {/* Brand Section */}
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 overflow-hidden">
            <Image src="/noxis.png" alt="Noxis" width={32} height={32} className="object-contain" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-[0.2em] text-white">NOXIS</h1>
            <p className="text-[8px] font-mono font-bold transition-colors duration-500" style={{ color: accentHex }}>SENTINEL_HUB</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <Link 
              key={item.href + item.name} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                pathname === item.href 
                  ? "bg-white/10 border border-white/20" 
                  : "text-zinc-500 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon size={18} className={cn(
                "transition-colors duration-500",
                pathname === item.href ? "opacity-100" : "opacity-50 group-hover:opacity-100"
              )} style={pathname === item.href ? { color: accentHex } : {}} />
              <span className={cn("text-xs font-bold uppercase tracking-widest transition-colors", pathname === item.href ? "text-white" : "")}>{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* System Health Pulse */}
        <div className="p-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
            <ShieldCheck size={14} className="animate-pulse transition-colors duration-500" style={{ color: accentHex }} />
            <span className="text-[9px] font-black uppercase tracking-tighter transition-colors duration-500" style={{ color: accentHex }}>Guard Mode Active</span>
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent pointer-events-none" />
        
        {/* Top Header */}
        <header className={cn(
          "h-16 border-b border-white/5 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 transition-all",
          isMobile ? "bg-black/90" : "backdrop-blur-xl"
        )}>
          <div className="flex items-center gap-4">
             {isMobile && (
               <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-zinc-400 hover:text-white">
                 <Menu size={20} />
               </button>
             )}
             <div className="h-2 w-2 rounded-full bg-[#34D399] animate-pulse" />
             <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
               {businessName}
             </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <Activity size={14} style={{ color: accentHex }} className="transition-colors duration-500" />
               <span className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">Live Sync</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
               <span className="text-[10px] font-mono font-bold text-zinc-300">{dateString}</span>
            </div>

            {/* Currency Toggle */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-1">
              <button 
                onClick={() => setCurrency('USD')}
                className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-black transition-all",
                  currency === 'USD' ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-white"
                )}
              >
                USD
              </button>
              <button 
                onClick={() => setCurrency('PKR')}
                className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-black transition-all",
                  currency === 'PKR' ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-white"
                )}
              >
                PKR
              </button>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className={cn("p-4 md:p-8 relative z-10", isMobile ? "pb-24" : "")}>
          {children}
        </div>

        {/* Bottom Navigation (Mobile Only) */}
        {isMobile && (
          <nav className={cn(
            "fixed bottom-0 left-0 right-0 h-16 border-t border-white/5 flex items-center justify-around px-6 z-30",
            sidebarClass
          )}>
            <Link href="/dashboard" className={cn("flex flex-col items-center gap-1", pathname === '/dashboard' ? "text-white" : "text-zinc-500")}>
              <Home size={18} style={pathname === '/dashboard' ? { color: accentHex } : {}} />
              <span className="text-[8px] font-bold uppercase">Home</span>
            </Link>
            <Link href="/dashboard/khata" className={cn("flex flex-col items-center gap-1", pathname === '/dashboard/khata' ? "text-white" : "text-zinc-500")}>
              <Wallet size={18} style={pathname === '/dashboard/khata' ? { color: accentHex } : {}} />
              <span className="text-[8px] font-bold uppercase">Khata</span>
            </Link>
            <Link href="/dashboard/messenger" className={cn("flex flex-col items-center gap-1", pathname === '/dashboard/messenger' ? "text-white" : "text-zinc-500")}>
              <MessageSquare size={18} style={pathname === '/dashboard/messenger' ? { color: accentHex } : {}} />
              <span className="text-[8px] font-bold uppercase">Mesh</span>
            </Link>
            <Link href="/dashboard/settings" className={cn("flex flex-col items-center gap-1", pathname === '/dashboard/settings' ? "text-white" : "text-zinc-500")}>
              <Settings size={18} style={pathname === '/dashboard/settings' ? { color: accentHex } : {}} />
              <span className="text-[8px] font-bold uppercase">System</span>
            </Link>
          </nav>
        )}
      </main>
    </div>
  );
}

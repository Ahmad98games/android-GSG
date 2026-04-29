'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Search, 
  UserPlus, 
  Send, 
  CheckCircle2, 
  Smartphone,
  Info,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBranding } from '@/providers/BrandingProvider';
import { useCommStore } from '@/lib/stores/useCommStore';

interface Contact {
  id: string;
  name: string;
  phone: string;
  type: 'Customer' | 'Supplier';
}

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    amount?: string;
    balance?: string;
    customerName?: string;
    invoiceId?: string;
  };
}

/**
 * NOXIS v9.0 DYNAMIC WHATSAPP BRIDGE
 * Features: Multi-Routing, Live WYSIWYG Template Editor, Auto-Variables.
 */
export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose, initialData }) => {
  const { businessName } = useBranding();
  const { addLog } = useCommStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualNumber, setManualNumber] = useState('');
  const [customNote, setCustomNote] = useState('');
  
  // Simulated Contacts DB
  const contacts: Contact[] = useMemo(() => [
    { id: '1', name: 'Zahid Textiles', phone: '+923001234567', type: 'Customer' },
    { id: '2', name: 'Bilal Yarn Traders', phone: '+923219876543', type: 'Supplier' },
    { id: '3', name: 'Al-Fatah Mills', phone: '+923125556677', type: 'Customer' },
  ], []);

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  const toggleRecipient = (phone: string) => {
    setRecipients(prev => 
      prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
    );
  };

  const handleManualAdd = () => {
    let phone = manualNumber.trim();
    if (!phone) return;
    // Auto-detect +92 for Pakistan
    if (phone.startsWith('0')) phone = '+92' + phone.substring(1);
    else if (!phone.startsWith('+')) phone = '+' + phone;
    
    if (!recipients.includes(phone)) setRecipients([...recipients, phone]);
    setManualNumber('');
  };

  const today = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  
  const baseTemplate = `Salam, This is ${businessName}.
Invoice: ${initialData?.invoiceId || 'INV-9021'}
Amount: Rs. ${initialData?.amount || '0'}
Balance: Rs. ${initialData?.balance || '0'}
Date: ${today}`;

  const fullMessage = `${baseTemplate}
${customNote ? `\nNote: ${customNote}` : ''}

Regards, ${businessName} | Powered by Noxis v9.0`;

  const handleDispatch = () => {
    if (recipients.length === 0) return alert('Select at least one recipient');
    
    recipients.forEach(phone => {
      const encodedMsg = encodeURIComponent(fullMessage);
      const url = `https://wa.me/${phone.replace('+', '')}?text=${encodedMsg}`;
      window.open(url, '_blank');
      
      addLog({
        recipient: phone,
        message: fullMessage,
        status: 'sent',
        type: 'whatsapp'
      });
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#030303]/80 backdrop-blur-xl"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="relative w-full max-w-4xl bg-[#121417] border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-auto max-h-[800px]"
      >
        {/* Left: Routing & Contacts */}
        <div className="w-full md:w-[400px] border-r border-white/5 flex flex-col bg-[#16191E]">
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Intelligent Routing</h3>
               <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                 <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">WA_BRIDGE_v2</span>
               </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text"
                  placeholder="Search Supplier/Customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-xs font-bold text-white outline-none focus:border-violet-500 transition-all"
                />
              </div>

              <div className="flex gap-2">
                 <input 
                  type="text"
                  placeholder="Manual: 0300..."
                  value={manualNumber}
                  onChange={(e) => setManualNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
                  className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-4 py-3.5 text-xs font-bold text-white outline-none focus:border-violet-500 transition-all"
                />
                <button 
                  onClick={handleManualAdd}
                  className="p-3.5 bg-white/5 text-white rounded-2xl hover:bg-white/10 transition-all"
                >
                  <UserPlus size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2 custom-scrollbar">
            {filteredContacts.map(contact => (
              <button 
                key={contact.id}
                onClick={() => toggleRecipient(contact.phone)}
                className={cn(
                  "w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between group",
                  recipients.includes(contact.phone) 
                    ? "bg-violet-600/10 border-violet-500/30" 
                    : "bg-transparent border-white/5 hover:border-white/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs",
                    recipients.includes(contact.phone) ? "bg-violet-600 text-white" : "bg-white/5 text-slate-500 group-hover:text-white"
                  )}>
                    {contact.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white leading-none mb-1">{contact.name}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{contact.phone}</p>
                  </div>
                </div>
                {recipients.includes(contact.phone) && <CheckCircle2 size={16} className="text-violet-500" />}
              </button>
            ))}
          </div>

          <div className="p-6 bg-black/20 border-t border-white/5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Queued Recipients: {recipients.length}</p>
            <div className="flex flex-wrap gap-2">
              {recipients.map(r => (
                <div key={r} className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 flex items-center gap-2">
                  <span className="text-[9px] font-black text-white">{r}</span>
                  <X size={10} className="text-slate-500 cursor-pointer hover:text-red-400" onClick={() => toggleRecipient(r)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Template Editor & Preview */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
           <button 
            onClick={onClose}
            className="absolute top-8 right-8 p-2 text-slate-500 hover:text-white transition-all z-10"
           >
            <X size={24} />
           </button>

           <div className="p-12 space-y-10 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                 <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Template <span className="text-violet-500">Forge</span></h2>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em]">WYSIWYG Industrial Signaling</p>
              </div>

              <div className="grid gap-8">
                 {/* Live Preview Screen */}
                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                      <Smartphone size={12} /> Live Device Preview
                    </p>
                    <div className="bg-[#030303] rounded-[2rem] p-6 border border-white/10 shadow-2xl relative min-h-[200px]">
                       <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-1 bg-white/10 rounded-full" />
                       <div className="bg-[#25D366]/10 text-[#25D366] text-[10px] font-black uppercase px-4 py-2 rounded-xl mb-4 inline-block">WhatsApp Business Interface</div>
                       <pre className="text-sm font-medium text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                         {fullMessage}
                       </pre>
                    </div>
                 </div>

                 {/* Personal Note Editor */}
                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                      <Info size={12} /> Inject Personal Context
                    </p>
                    <textarea 
                      placeholder="Add a personal note (e.g. Please clear this by Friday)..."
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      className="w-full h-32 bg-white/5 border border-white/10 rounded-3xl p-6 text-sm font-medium text-white focus:border-violet-500 outline-none transition-all resize-none"
                    />
                 </div>
              </div>

              {/* Forensic Trust Protocol */}
              <div className="p-6 bg-violet-600/5 border border-violet-500/20 rounded-3xl flex gap-4 items-start">
                 <ShieldCheck className="text-violet-400 shrink-0 mt-1" size={20} />
                 <div className="space-y-1">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Noxis Trust Protocol</p>
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase">
                      All messages are timestamped and logged locally. URL encoding ensures UTF-8 compliance for international textile signaling.
                    </p>
                 </div>
              </div>
           </div>

           {/* Footer: Dispatch */}
           <div className="p-8 bg-black/40 border-t border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-4 text-slate-500">
                 <Clock size={16} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Ready for Deployment</span>
              </div>
              <button 
                onClick={handleDispatch}
                disabled={recipients.length === 0}
                className="px-10 py-5 bg-[#25D366] text-[#030303] rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-30 shadow-[0_0_40px_rgba(37,211,102,0.3)]"
              >
                <Send size={18} /> Dispatch via WhatsApp
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { MessageSquare, Check } from 'lucide-react';
import { waService } from '@/services/WhatsAppService';
import { cn } from '@/lib/utils';

interface WhatsAppButtonProps {
  phone: string;
  type: 'khata' | 'invoice' | 'alert' | 'custom';
  data: any;
  size?: 'sm' | 'md';
  className?: string;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({ 
  phone, 
  type, 
  data, 
  size = 'sm',
  className 
}) => {
  const [copied, setCopied] = useState(false);
  const isValid = !!waService.validatePhone(phone);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isValid) return;

    switch (type) {
      case 'khata':
        waService.sendKhataAlert(phone, data.amount, data.partyName, data.balance, data.direction);
        break;
      case 'invoice':
        waService.sendInvoiceShare(phone, data.invoiceNumber, data.total, data.itemCount, data.dueDate);
        break;
      case 'alert':
        waService.sendCriticalAlert(phone, data.alertType, data.details);
        break;
      case 'custom':
        waService.sendCustom(phone, data.message);
        break;
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (size === 'sm') {
    return (
      <button
        onClick={handleClick}
        disabled={!isValid}
        title={isValid ? 'Send via WhatsApp' : 'No valid number'}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
          isValid 
            ? "bg-[#25D36611] text-[#25D366] hover:bg-[#25D36622] border border-[#25D36633]" 
            : "bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50",
          className
        )}
      >
        {copied ? <Check className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={!isValid}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
        isValid
          ? "bg-[#25D366] text-white hover:scale-105 active:scale-95 shadow-lg shadow-[#25D36633]"
          : "bg-zinc-800 text-zinc-500 cursor-not-allowed",
        className
      )}
    >
      {copied ? <Check className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
      {copied ? 'OPENED' : 'WHATSAPP'}
    </button>
  );
};

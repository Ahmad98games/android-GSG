'use client';

class WhatsAppService {
  private static instance: WhatsAppService;

  private constructor() {}

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  /**
   * Strips non-numeric characters and ensures international format
   */
  public validatePhone(raw: string): string | null {
    const cleaned = raw.replace(/\D/g, '');
    if (cleaned.length < 10 || cleaned.length > 15) return null;
    return cleaned;
  }

  private openWhatsApp(phone: string, message: string) {
    const cleanedPhone = this.validatePhone(phone);
    if (!cleanedPhone) {
      console.error('INVALID_PHONE_FORMAT');
      return;
    }

    const url = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
    if (typeof window !== 'undefined' && (window as any).noxis) {
      (window as any).noxis.shell.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  }

  public async sendKhataAlert(
    phone: string, 
    amount: string, 
    partyName: string, 
    balance: string, 
    direction: 'credit' | 'debit'
  ) {
    let businessName = 'Noxis Sentinel';
    if (typeof window !== 'undefined' && window.noxis) {
      const savedName = await window.noxis.store.get('businessName') as string;
      if (savedName) businessName = savedName;
    }

    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const dirText = direction === 'credit' 
      ? `Rs. ${amount} credited to` 
      : `Rs. ${amount} debited from`;

    const template = `${businessName} Alert 🔔\n${dirText} your account.\nParty: ${partyName}\nCurrent Balance: Rs. ${balance}\nDate: ${date}\nSystem: Stable ✅`;
    
    this.openWhatsApp(phone, template);
  }

  public async sendInvoiceShare(
    phone: string, 
    invoiceNumber: string, 
    total: string, 
    itemCount: number, 
    dueDate: string
  ) {
    let businessName = 'Noxis Sentinel';
    if (typeof window !== 'undefined' && window.noxis) {
      const savedName = await window.noxis.store.get('businessName') as string;
      if (savedName) businessName = savedName;
    }

    const template = `📋 Invoice #${invoiceNumber}\nItems: ${itemCount}\nTotal: Rs. ${total}\nDue: ${dueDate}\nPowered by ${businessName} v9.0`;
    this.openWhatsApp(phone, template);
  }

  public async sendCriticalAlert(phone: string, alertType: string, details: string) {
    let businessName = 'NOXIS';
    if (typeof window !== 'undefined' && window.noxis) {
      const savedName = await window.noxis.store.get('businessName') as string;
      if (savedName) businessName = savedName.toUpperCase();
    }

    const timestamp = new Date().toLocaleTimeString();
    const template = `⚠️ ${businessName} ALERT [${alertType.toUpperCase()}]\n${details}\nTime: ${timestamp}\nAction Required — Check Dashboard`;
    this.openWhatsApp(phone, template);
  }

  public sendCustom(phone: string, message: string) {
    this.openWhatsApp(phone, message);
  }

  public async isLinked(): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).noxis) {
      const number = await (window as any).noxis.store.get('whatsappBusinessNumber');
      return !!number;
    }
    return false;
  }
}

export const waService = WhatsAppService.getInstance();

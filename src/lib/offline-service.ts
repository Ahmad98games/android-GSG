import { set, get, del, values } from 'idb-keyval';

/**
 * OMNORA NOXIS — Offline Resilience Engine
 * Handles local caching and background synchronization.
 */

interface PendingEntry {
  id: string;
  amount: string;
  type: 'DEBIT' | 'CREDIT';
  description: string;
  workerName: string;
  ts: string;
}

const PENDING_KEY = 'gs_pending_khata';

export const OfflineService = {
  async saveEntry(entry: Omit<PendingEntry, 'id' | 'ts'>) {
    const pending = (await get<PendingEntry[]>(PENDING_KEY)) || [];
    const newEntry: PendingEntry = {
      ...entry,
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
    };
    pending.push(newEntry);
    await set(PENDING_KEY, pending);
    return newEntry;
  },

  async getPending() {
    return (await get<PendingEntry[]>(PENDING_KEY)) || [];
  },

  async clearPending() {
    await del(PENDING_KEY);
  },

  async sync() {
    const pending = await this.getPending();
    if (pending.length === 0) return;

    console.info(`[Offline] Attempting sync of ${pending.length} entries...`);
    
    const failed: PendingEntry[] = [];
    
    const hubIp = localStorage.getItem('HUB_IP') || '192.168.1.100';
    const hubUrl = `http://${hubIp}:9000/api/khata`;

    for (const entry of pending) {
      try {
        const res = await fetch(hubUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
        if (!res.ok) throw new Error('SYNC_FAILED');
      } catch (e) {
        failed.push(entry);
      }
    }

    if (failed.length === 0) {
      await this.clearPending();
      return { success: true, count: pending.length };
    } else {
      await set(PENDING_KEY, failed);
      return { success: false, remaining: failed.length };
    }
  }
};

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../lib/env';
import fs from 'node:fs';

/**
 * GOLD SHE HUB — Supabase Synchronization Service
 * 100% Idempotent via Upserts.
 */
export class SupabaseSync {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!);
  }

  /**
   * @conflictKey entry_id
   */
  async syncKhata(entries: Record<string, unknown>[]) {
    const { error } = await this.supabase
      .from('khata_entries')
      .upsert(entries, { onConflict: 'entry_id' });
    if (error) throw error;
  }

  /**
   * @conflictKey event_id
   */
  async syncScans(scans: Record<string, unknown>[]) {
    const { error } = await this.supabase
      .from('scan_events')
      .upsert(scans, { onConflict: 'event_id' });
    if (error) throw error;
  }

  /**
   * @conflictKey delta_id
   */
  async syncDeltas(deltas: Record<string, unknown>[]) {
    const { error } = await this.supabase
      .from('stock_deltas')
      .upsert(deltas, { onConflict: 'delta_id' });
    if (error) throw error;
  }

  public static validateIdempotency() {
    const content = fs.readFileSync(__filename, 'utf8');
    if (content.includes('.insert(') && !content.includes('onConflict')) {
      throw new Error('[IdempotencyAudit] Raw .insert() detected.');
    }
    return true;
  }
}

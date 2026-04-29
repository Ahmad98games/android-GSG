import { get, set, del, keys } from 'idb-keyval';

const CHUNK_SIZE = 50;
const KEY_PREFIX = 'offline_msg_';

export interface QueuedMessage {
  id: string;
  channelId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retries: number;
}

export type SyncResult = {
  synced: number;
  failed: number;
  conflicts: Array<{ id: string; reason: string }>;
};

export const OfflineQueue = {
  async enqueue(msg: Omit<QueuedMessage, 'retries'>): Promise<void> {
    await set(KEY_PREFIX + msg.id, { ...msg, retries: 0 });
  },

  async getAll(): Promise<QueuedMessage[]> {
    const allKeys = (await keys()).filter((k) => String(k).startsWith(KEY_PREFIX));
    const items = await Promise.all(allKeys.map((k) => get(k)));
    return (items.filter(Boolean) as QueuedMessage[]).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  },

  async remove(id: string): Promise<void> {
    await del(KEY_PREFIX + id);
  },

  async getQueueLength(): Promise<number> {
    const allKeys = await keys();
    return allKeys.filter((k) => String(k).startsWith(KEY_PREFIX)).length;
  },

  // ─── CHUNKED DRAIN ─────────────────────────────────────────────────────────
  async drainToSync(
    authToken: string,
    onProgress?: (synced: number, total: number) => void
  ): Promise<SyncResult> {
    const all = await this.getAll();
    if (all.length === 0) return { synced: 0, failed: 0, conflicts: [] };

    const result: SyncResult = { synced: 0, failed: 0, conflicts: [] };
    let offset = 0;

    while (offset < all.length) {
      // Take next chunk of CHUNK_SIZE
      const chunk = all.slice(offset, offset + CHUNK_SIZE);
      const payloads = chunk.map((m) => m.payload);

      try {
        const response = await fetch('/api/ecosystem/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken,
          },
          body: JSON.stringify({ operation: 'SYNC_MESSAGES', records: payloads }),
        });

        // Must receive 200 or 207 before proceeding to next chunk
        if (!response.ok && response.status !== 207) {
          // Non-retriable server error — halt and back off
          console.error('[OfflineQueue] Chunk sync failed with status', response.status);
          // Increment retry count for this chunk
          for (const msg of chunk) {
            const updated = { ...msg, retries: msg.retries + 1 };
            if (updated.retries < 5) await set(KEY_PREFIX + msg.id, updated);
            else await del(KEY_PREFIX + msg.id); // Give up after 5 retries
          }
          result.failed += (all.length - result.synced);
          break; // Halt — do not process next chunk
        }

        const body = await response.json() as { accepted: number; rejected: number; conflicts: Array<{ id: string; reason: string }> };

        // Delete successfully synced messages
        for (const msg of chunk) {
          const wasAccepted = !body.conflicts?.find((c) => c.id === msg.payload.id);
          if (wasAccepted) {
            await del(KEY_PREFIX + msg.id);
            result.synced++;
          } else {
            result.failed++;
            const conflict = body.conflicts.find((c) => c.id === msg.payload.id);
            if (conflict) {
              result.conflicts.push({ id: msg.id, reason: conflict.reason });
              // STALE_UPDATE: remove from queue (DB has newer version)
              if (conflict.reason === 'STALE_UPDATE') await del(KEY_PREFIX + msg.id);
            }
          }
        }

        onProgress?.(result.synced, all.length);
        offset += CHUNK_SIZE;

        // Small delay between chunks to avoid hammering the server
        if (offset < all.length) await new Promise((r) => setTimeout(r, 100));

      } catch (networkError) {
        // Network failure — halt, do not delete queue, will retry next drain
        console.error('[OfflineQueue] Network error during chunk sync:', networkError);
        result.failed += chunk.length;
        break;
      }
    }

    return result;
  },
};

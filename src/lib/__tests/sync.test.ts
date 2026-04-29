import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OfflineQueue } from '../offline-queue';

// Mock idb-keyval
vi.mock('idb-keyval', () => {
  const store = new Map();
  return {
    get: vi.fn((key) => Promise.resolve(store.get(key))),
    set: vi.fn((key, val) => { store.set(key, val); return Promise.resolve(); }),
    del: vi.fn((key) => { store.delete(key); return Promise.resolve(); }),
    keys: vi.fn(() => Promise.resolve([...store.keys()])),
  };
});

describe('OfflineQueue — chunked sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('splits 100 messages into exactly two 50-record chunks', async () => {
    // Enqueue 100 messages
    for (let i = 0; i < 100; i++) {
      await OfflineQueue.enqueue({ 
        id: 'msg-' + i, 
        channelId: 'ch-1', 
        payload: { id: 'msg-' + i, updated_at: new Date().toISOString() }, 
        createdAt: new Date().toISOString() 
      });
    }

    let chunkCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body);
      chunkCount++;
      return { 
        ok: true, 
        status: 200, 
        json: async () => ({ accepted: body.records.length, rejected: 0, conflicts: [] }) 
      };
    });
    global.fetch = fetchMock;

    await OfflineQueue.drainToSync('mock-token');

    expect(chunkCount).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    
    const firstChunk = JSON.parse(fetchMock.mock.calls[0][1].body).records;
    expect(firstChunk.length).toBe(50);
    const secondChunk = JSON.parse(fetchMock.mock.calls[1][1].body).records;
    expect(secondChunk.length).toBe(50);
  });

  it('halts on server error and does not process next chunk', async () => {
    for (let i = 0; i < 60; i++) {
      await OfflineQueue.enqueue({ 
        id: 'msg-' + i, 
        channelId: 'ch-1', 
        payload: { id: 'msg-' + i, updated_at: new Date().toISOString() }, 
        createdAt: new Date().toISOString() 
      });
    }

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return { 
        ok: false, 
        status: 500, 
        json: async () => ({ error: 'SERVER_ERROR' }) 
      };
    });

    const result = await OfflineQueue.drainToSync('mock-token');
    expect(callCount).toBe(1); // Only first chunk attempted — halted on failure
    expect(result.failed).toBe(60); // Total 60 failed (50 in chunk + 10 remaining halted)
    expect(result.synced).toBe(0);
  });

  it('removes STALE_UPDATE conflicts from queue without retrying', async () => {
    await OfflineQueue.enqueue({ 
      id: 'stale-1', 
      channelId: 'ch-1', 
      payload: { id: 'stale-1', updated_at: '2024-01-01T00:00:00Z' }, 
      createdAt: new Date().toISOString() 
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true, 
      status: 207,
      json: async () => ({ 
        accepted: 0, 
        rejected: 1, 
        conflicts: [{ id: 'stale-1', reason: 'STALE_UPDATE' }] 
      }),
    });

    const result = await OfflineQueue.drainToSync('mock-token');
    expect(result.conflicts[0].reason).toBe('STALE_UPDATE');
    const remaining = await OfflineQueue.getQueueLength();
    expect(remaining).toBe(0); // Removed because DB has newer version
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { KhataEngine } from './KhataEngine';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../../db/schema';

describe('KhataEngine', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  let engine: KhataEngine;

  beforeEach(() => {
    const sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });
    sqlite.exec(`CREATE TABLE khata_entries (id TEXT PRIMARY KEY, debit_account TEXT, credit_account TEXT, amount TEXT, node_id TEXT, worker_id TEXT, timestamp INTEGER)`);
    engine = new KhataEngine(db);
  });

  it('should record entry and check balance', async () => {
    await engine.recordEntry({
      debitAccount: 'factory',
      creditAccount: 'worker:1',
      amount: '1000',
      description: 'Test entry',
      workerId: '1',
      nodeId: 'node'
    });

    const balance = await engine.getBalance('1');
    expect(balance.toString()).toBe('1000');
  });
});

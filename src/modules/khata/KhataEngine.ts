import { IndustrialMath } from '../../lib/IndustrialMath';
import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { khataEntries } from '../../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import Decimal from 'decimal.js';

export interface KhataTransaction {
  id?: string;
  debitAccount: string;
  creditAccount: string;
  amount: string | Decimal;
  description: string;
  nodeId: string;
  workerId: string;
}

export class KhataEngine {
  constructor(private db: BetterSQLite3Database<Record<string, unknown>>) {}

  async recordEntry(tx: KhataTransaction): Promise<string> {
    const id = tx.id || uuidv4();
    const amount = IndustrialMath.round(tx.amount).toString();
    const existing = await this.db.select().from(khataEntries).where(eq(khataEntries.id, id)).get();
    if (existing) return id;

    await this.db.insert(khataEntries).values({
      id,
      debitAccount: tx.debitAccount,
      creditAccount: tx.creditAccount,
      amount,
      description: tx.description,
      nodeId: tx.nodeId,
      workerId: tx.workerId,
      timestamp: Date.now(),
    });
    return id;
  }

  async getBalance(workerId: string): Promise<Decimal> {
    const entries = await this.db.select().from(khataEntries).where(eq(khataEntries.workerId, workerId)).all();
    let balance = new Decimal('0');
    for (const entry of entries) {
      if (entry.creditAccount === `worker:${workerId}`) {
        balance = IndustrialMath.add(balance, entry.amount);
      } else if (entry.debitAccount === `worker:${workerId}`) {
        balance = IndustrialMath.subtract(balance, entry.amount);
      }
    }
    return balance;
  }
}

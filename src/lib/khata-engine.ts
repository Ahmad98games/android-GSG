import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

/**
 * GOLD SHE MESH — Khata Engine (v1.0.0)
 * Pillar 5: Immutable Ledger & Double-Entry Logic
 * 
 * Rules:
 * 1. All financial arithmetic must use Decimal.js.
 * 2. Rows are append-only. No UPDATE on amount or type.
 * 3. Every entry generates a security Audit Log.
 */

export interface KhataRequest {
  type: 'CREDIT' | 'DEBIT';
  amount: string | number;
  description: string;
  workerName: string;
  workerId?: string;
  snippetPath?: string;
}

export class KhataEngine {
  /**
   * Records a new immutable entry in the ledger.
   */
  static async recordEntry(req: KhataRequest) {
    // 1. Validate using pure utility
    this.validateEntry({ entry_type: req.type, amount: req.amount });
    
    const amountStr = new Decimal(req.amount).toString();

    // 2. Atomic write to SQLite
    const entry = await (prisma as any).$transaction(async (tx: any) => {

      const newEntry = await tx.khataEntry.create({
        data: {
          type: req.type,
          amount: amountStr,
          description: req.description,
          workerName: req.workerName,
          workerId: req.workerId,
          snippetPath: req.snippetPath,
        },
      });

      // 3. Rule 4: Security Audit Log
      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entity: 'KHATA',
          entityId: newEntry.id,
          details: `${req.type} of ${amountStr} for ${req.workerName}`,
        },
      });

      return newEntry;
    });

    return entry;
  }

  /**
   * PURE UTILITY: Calculates current balance from a list of entries.
   */
  static calculateBalance(entries: { type?: string, entry_type?: string, amount: string | number }[]) {
    return entries.reduce((acc, entry) => {
      const amount = new Decimal(entry.amount);
      const type = entry.type || entry.entry_type;
      return type === 'CREDIT' ? acc.plus(amount) : acc.minus(amount);
    }, new Decimal(0));
  }

  /**
   * PURE UTILITY: Returns an array of entries with their running balance.
   */
  static runningBalance(entries: { type?: string, entry_type?: string, amount: string | number, ts?: any, created_at?: any }[]) {
    let balance = new Decimal(0);
    return entries.map(entry => {
      const amount = new Decimal(entry.amount);
      const type = entry.type || entry.entry_type;
      balance = type === 'CREDIT' ? balance.plus(amount) : balance.minus(amount);
      return { ...entry, balance };
    });
  }

  /**
   * PURE UTILITY: Validates entry constraints.
   */
  static validateEntry(entry: { entry_type: string, amount: string | number }) {
    const amount = new Decimal(entry.amount);
    if (amount.isNegative() || amount.isZero()) {
      throw new Error('Financial entry must be a positive non-zero value');
    }
    return true;
  }

  /**
   * Calculates current balance for a worker from the DB.
   */
  static async getWorkerBalance(workerName: string) {
    const entries = await prisma.khataEntry.findMany({
      where: { workerName },
    });

    return this.calculateBalance(entries).toString();
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';

/**
 * GOLD SHE MESH — Worker Ledger API (v1.0.0)
 * Pillar 5: Karigar-Specific Balances
 */

export async function GET() {
  try {
    const entries = await prisma.khataEntry.findMany({
      select: { workerName: true, type: true, amount: true }
    });

    const workerMap: Record<string, { balance: Decimal; lastActivity: string }> = {};

    entries.forEach(entry => {
      if (!workerMap[entry.workerName]) {
        workerMap[entry.workerName] = { balance: new Decimal(0), lastActivity: '' };
      }
      
      const amount = new Decimal(entry.amount);
      if (entry.type === 'CREDIT') {
        workerMap[entry.workerName].balance = workerMap[entry.workerName].balance.plus(amount);
      } else {
        workerMap[entry.workerName].balance = workerMap[entry.workerName].balance.minus(amount);
      }
    });

    const workers = Object.entries(workerMap).map(([name, data]) => ({
      name,
      balance: data.balance.toString(),
      type: data.balance.isNegative() ? 'DEBIT' : 'CREDIT'
    })).sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ workers });
  } catch (err) {
    console.error('[API:Khata:Workers] Error:', err);
    return NextResponse.json({ error: 'WORKER_FETCH_FAILED' }, { status: 500 });
  }
}

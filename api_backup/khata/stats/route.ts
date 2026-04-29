import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';

/**
 * GOLD SHE MESH — Khata Stats API (v1.0.0)
 * Pillar 5: Financial Insights
 */

export async function GET() {
  try {
    const entries = await prisma.khataEntry.findMany({
      select: { type: true, amount: true }
    });

    let totalCredit = new Decimal(0);
    let totalDebit = new Decimal(0);

    entries.forEach(entry => {
      const amount = new Decimal(entry.amount);
      if (entry.type === 'CREDIT') {
        totalCredit = totalCredit.plus(amount);
      } else {
        totalDebit = totalDebit.plus(amount);
      }
    });

    const netBalance = totalCredit.minus(totalDebit);

    return NextResponse.json({
      totalCredit: totalCredit.toString(),
      totalDebit: totalDebit.toString(),
      netBalance: netBalance.toString(),
      entryCount: entries.length,
      position: netBalance.isNegative() ? 'DEBIT' : 'CREDIT'
    });
  } catch (err) {
    console.error('[API:Khata:Stats] Error:', err);
    return NextResponse.json({ error: 'STATS_CALCULATION_FAILED' }, { status: 500 });
  }
}

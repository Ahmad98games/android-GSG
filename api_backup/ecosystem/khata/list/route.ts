/**
 * GET /api/ecosystem/khata/list
 * 
 * Pillar 5: Immutable Ledger View
 * Fetches entries from the local SQLite source of truth.
 */

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const entries = await prisma.khataEntry.findMany({
      orderBy: { ts: 'desc' },
      take: 100,
    });
    
    return NextResponse.json({ success: true, entries });
  } catch (err) {
    console.error('[KhataList] Error:', err);
    return NextResponse.json({ success: false, error: 'Database access failed' }, { status: 500 });
  }
}

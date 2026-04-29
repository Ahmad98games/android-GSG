import { NextRequest, NextResponse } from 'next/server';
import { KhataEngine } from '@/lib/khata-engine';
import { prisma } from '@/lib/prisma';

/**
 * GOLD SHE MESH — Khata Local API (v1.0.0)
 * Pillar 5: Direct Ledger Access
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workerName = searchParams.get('workerName');
    const limit = parseInt(searchParams.get('limit') || '50');

    const entries = await prisma.khataEntry.findMany({
      where: workerName ? { workerName } : {},
      orderBy: { ts: 'desc' },
      take: limit,
    });

    return NextResponse.json({ entries });
  } catch (err) {
    console.error('[API:Khata] Fetch Error:', err);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.workerName || !body.amount || !body.type) {
      return NextResponse.json({ error: 'MISSING_REQUIRED_FIELDS' }, { status: 400 });
    }

    const entry = await KhataEngine.recordEntry({
      type: body.type,
      amount: body.amount,
      description: body.description || 'Manual Ledger Entry',
      workerName: body.workerName,
      workerId: body.workerId,
    });

    return NextResponse.json({ success: true, entry });
  } catch (err) {
    console.error('[API:Khata] Create Error:', err);
    return NextResponse.json({ 
      error: 'LEDGER_COMMIT_FAILED', 
      message: err instanceof Error ? err.message : 'Unknown' 
    }, { status: 500 });
  }
}

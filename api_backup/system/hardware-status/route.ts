import { NextResponse } from 'next/server';
import { EnvironmentalAudit } from '@/lib/mesh/audit-logger';

/**
 * GOLD SHE MESH — Hardware Status API
 * GAP 5: Liability & Audit Logging
 * 
 * Returns the current hardware health report to the Settings UI.
 */

export async function GET() {
  try {
    const report = EnvironmentalAudit.getReport();
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: 'STATUS_FETCH_FAILED' }, { status: 500 });
  }
}

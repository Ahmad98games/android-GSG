import { NextResponse } from 'next/server';
import { resourceGuard } from '../../../server/ResourceGuard';

export async function GET() {
  return NextResponse.json({ status: 'ONLINE', metrics: resourceGuard.getSystemStatus() });
}

/**
 * POST /api/system/heartbeat
 * 
 * Sustainability Layer: Edge Node Heartbeat
 * Used by the Python Vision Engine to report vitality.
 */

import { NextRequest, NextResponse } from 'next/server';
import { healthRegistry } from '@/lib/mesh/sse-registry';

export async function POST() {
  try {
    // We update the health registry with a fresh timestamp
    healthRegistry.updateHeartbeat();

    return NextResponse.json({ 
      success: true, 
      timestamp: Date.now(),
      command: 'KEEP_ALIVE' 
    });
  } catch {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

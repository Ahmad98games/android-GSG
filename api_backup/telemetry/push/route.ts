/**
 * POST /api/telemetry/push
 * 
 * Pillar 3: AI Bridge Endpoint
 * Receives high-frequency telemetry from Python edge nodes and 
 * broadcasts it to the Vision UI via the SSE registry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { telemetryRegistry } from '@/lib/mesh/sse-registry';
import { AITelemetryPayload } from '@/lib/Shared/mesh-protocol';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json() as AITelemetryPayload;

    if (!payload.deviceId) {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
    }

    // Broadcast to all connected Hub UI instances
    telemetryRegistry.broadcast({
      event: 'ai-telemetry',
      data: payload
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[TelemetryPush] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

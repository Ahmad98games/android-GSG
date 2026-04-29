import { NextRequest, NextResponse } from 'next/server';
import { sseRegistry } from '@/lib/mesh/sse-registry';
import pino from 'pino';

const logger = pino({ level: 'info' });

/**
 * Handle incoming Vision Engine events and broadcast them via SSE.
 * Pillar 1: Zero-API Local AI Bridge.
 */
export async function POST(req: NextRequest) {
  try {
    const event = await req.json();

    // 1. Logic for CRITICAL_ALERT (latency < 200ms target)
    if (event.detections && event.detections.length > 0) {
      // In a real factory, we would check if detection is in a restricted zone.
      // For now, any person detection is a potential alert in industrial context.
      sseRegistry.broadcast({
        event: 'ai-detection',

        data: {
          type: 'PERSON_DETECTED',
          camera_id: event.camera_id,
          count: event.detections.length,
          timestamp: Date.now()
        }
      });
    }

    // 2. Health & Telemetry
    if (event.type === 'HEALTH_PULSE') {
      sseRegistry.broadcast({
        event: 'ai-telemetry',

        data: event
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ error: (err as Error).message }, '[VisionAPI] Failed to process AI event.');
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

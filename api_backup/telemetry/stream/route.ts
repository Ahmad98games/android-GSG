/**
 * GET /api/telemetry/stream
 * 
 * Pillar 3: Smart CCTV Telemetry Stream
 * Provides real-time AI inference data from edge nodes to the dashboard.
 */

import { telemetryRegistry } from '@/lib/mesh/sse-registry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      telemetryRegistry.register(controller);
      
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(
          `event: hub-status\ndata: ${JSON.stringify({
            status: 'telemetry_connected',
            ts: Date.now(),
          })}\n\n`
        )
      );
    },
    cancel(controller) {
      telemetryRegistry.unregister(controller);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

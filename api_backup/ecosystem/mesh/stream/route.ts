/**
 * GET /api/ecosystem/mesh/stream
 *
 * Server-Sent Events (SSE) endpoint for the PC Messenger UI.
 * The browser opens an EventSource to this URL and receives real-time events:
 *
 *   event: message         — incoming/outgoing text, photo, voice messages
 *   event: device-online   — a mobile device connected to the hub
 *   event: device-offline  — a mobile device disconnected
 *   event: hub-status      — periodic hub health updates
 *   event: pairing-complete — a new device completed pairing
 *
 * Usage in browser:
 *   const es = new EventSource('/api/ecosystem/mesh/stream');
 *   es.addEventListener('message', (e) => {
 *     const data = JSON.parse(e.data);
 *     // handle incoming message
 *   });
 */

import { sseRegistry } from '@/lib/mesh/sse-registry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Register this SSE client
      sseRegistry.register(controller);

      // Send initial connection confirmation
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(
          `event: hub-status\ndata: ${JSON.stringify({
            status: 'connected',
            ts: Date.now(),
          })}\n\n`
        )
      );
    },
    cancel(controller) {
      // Client disconnected (closed tab, navigated away)
      sseRegistry.unregister(controller);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
      'Access-Control-Allow-Origin': '*',
    },
  });
}

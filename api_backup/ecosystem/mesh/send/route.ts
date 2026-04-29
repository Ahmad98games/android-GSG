/**
 * POST /api/ecosystem/mesh/send
 *
 * Send a message from the PC Hub to a specific device or broadcast to all.
 *
 * Body:
 *   {
 *     to: string;         // deviceId or "broadcast"
 *     text: string;       // message content
 *     type?: string;      // "TEXT_MESSAGE" (default), "PHOTO_MESSAGE", "VOICE_NOTE"
 *     replyToMsgId?: string;
 *   }
 *
 * The hub encrypts the message with the target device's session key,
 * stores it in SQLite for offline sync, and forwards it via WebSocket.
 *
 * If the target is offline, the message is stored and will be synced
 * when the device reconnects (via SYNC_REQUEST → SYNC_BATCH).
 */

import { NextResponse } from 'next/server';
import { getHubServer } from '@/lib/mesh/node-server';
import { sseRegistry } from '@/lib/mesh/sse-registry';
import {
  buildPacket,
  generateUUID,
  dmConversationId,
  type MessageType,
  type TextMessagePayload,
} from '@/lib/Shared/mesh-protocol';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, text, type = 'TEXT_MESSAGE', replyToMsgId } = body as {
      to: string;
      text: string;
      type?: MessageType;
      replyToMsgId?: string;
    };

    if (!to || !text) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, text' },
        { status: 400 }
      );
    }

    const hub = getHubServer();
    const msgId = generateUUID();

    const payload: TextMessagePayload = {
      msgId,
      conversationId: to === 'broadcast' ? 'broadcast' : dmConversationId(hub.hubDeviceId, to),
      text,
      replyToMsgId,
    };

    // Build a packet for SQLite storage
    const packet = buildPacket(type, hub.hubDeviceId, to, 0, payload);

    // Store in hub's offline store (guarantees message persistence)
    hub.store.storeMessage(packet, payload.conversationId);

    if (to === 'broadcast') {
      // Send encrypted to all connected devices
      const connectedDevices = hub.getConnectedDevices();
      let sentCount = 0;
      for (const device of connectedDevices) {
        if (device.deviceId === hub.hubDeviceId) continue;
        try {
          await hub.sendEncrypted(device.deviceId, type, payload);
          sentCount++;
        } catch (err) {
          console.warn(`[MeshSend] Failed to send to ${device.deviceId}:`, err);
        }
      }
      // Broadcast via SSE to PC UI as well
      sseRegistry.broadcast({
        event: 'message',
        data: {
          packetId: packet.id,
          type,
          from: hub.hubDeviceId,
          to: 'broadcast',
          payload,
          ts: packet.ts,
          direction: 'outgoing',
        },
      });

      return NextResponse.json({
        success: true,
        packetId: packet.id,
        msgId,
        sentTo: sentCount,
        stored: true,
      });
    } else {
      // Direct message to specific device
      try {
        await hub.sendEncrypted(to, type, payload);
      } catch {
        // Device offline — message is already stored, will sync later
        console.info(`[MeshSend] Device ${to} offline — message queued for sync`);
      }

      // Push to SSE for PC UI
      sseRegistry.broadcast({
        event: 'message',
        data: {
          packetId: packet.id,
          type,
          from: hub.hubDeviceId,
          to,
          payload,
          ts: packet.ts,
          direction: 'outgoing',
        },
      });


      return NextResponse.json({
        success: true,
        packetId: packet.id,
        msgId,
        stored: true,
      });
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, error: err.message || 'Send failed' },
      { status: 500 }
    );
  }
}

// Enable CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

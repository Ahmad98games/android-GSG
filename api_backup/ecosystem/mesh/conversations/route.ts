/**
 * GET /api/ecosystem/mesh/conversations
 *
 * Returns the conversation list with last message preview and unread counts.
 * Used by the messenger sidebar to show all active conversations.
 *
 * Each conversation includes:
 *   - conversationId  (e.g. "deviceA:deviceB" for DMs, "broadcast")
 *   - peerDeviceId    (the other device in a DM)
 *   - lastMessageType (TEXT_MESSAGE, PHOTO_MESSAGE, etc.)
 *   - lastMessageTs   (timestamp of the most recent message)
 *   - unreadCount     (messages not yet marked read)
 *   - peer device info (name, type, online status)
 */

import { NextResponse } from 'next/server';
import { getHubServer } from '@/lib/mesh/node-server';
import { ConversationSummary } from '@/lib/mesh/offline-store';
import { DeviceIdentity } from '@/lib/Shared/mesh-protocol';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const hub = getHubServer();
    const raw = hub.store.getConversationList(hub.hubDeviceId);

    const allDevices = hub.store.getAllDevices();
    const connectedIds = new Set(hub.getConnectedDevices().map((d: DeviceIdentity) => d.deviceId));

    // Enrich with device info
    const conversations = raw.map((conv: ConversationSummary) => {
      const peer = allDevices.find((d: DeviceIdentity) => d.deviceId === conv.peerDeviceId);

      // Build preview text from payload type
      let preview = '';
      if (conv.lastMessageType === 'TEXT_MESSAGE') {
        try {
          const p = JSON.parse(conv.lastMessagePayload);
          preview = (p.text || '').slice(0, 80);
        } catch {
          preview = '[Message]';
        }
      } else if (conv.lastMessageType === 'PHOTO_MESSAGE') {
        preview = '📷 Photo';
      } else if (conv.lastMessageType === 'VOICE_NOTE') {
        preview = '🎤 Voice Note';
      } else {
        preview = `[${conv.lastMessageType}]`;
      }

      return {
        conversationId: conv.conversationId,
        peerDeviceId: conv.peerDeviceId,
        peerDeviceName: peer?.deviceName ?? conv.peerDeviceId,
        peerDeviceType: peer?.deviceType ?? 'node_mobile',
        isOnline: connectedIds.has(conv.peerDeviceId),
        lastMessagePreview: preview,
        lastMessageType: conv.lastMessageType,
        lastMessageTs: conv.lastMessageTs,
        unreadCount: conv.unreadCount,
      };
    });

    return NextResponse.json({
      conversations,
      count: conversations.length,
      hubDeviceId: hub.hubDeviceId,
    });


  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

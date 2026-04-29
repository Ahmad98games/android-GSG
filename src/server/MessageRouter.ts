import { db } from '../db/index';

import { hubMessages } from '../db/schema';

import { eq, and, gt, lt } from 'drizzle-orm';
import { z } from 'zod';
import pino from 'pino';

const logger = pino({ level: 'info' });

const MessageSchema = z.object({
  messageId: z.string(),
  toNodeId: z.string().optional(),
  encryptedPayload: z.custom<Buffer | Uint8Array>(),
  mediaType: z.string().default('text'),
  sentAt: z.number()
});


export class MessageRouter {
  constructor(private tcpServer: { isNodeOnline: (id: string) => Promise<boolean>; sendPacket: (id: string, packet: unknown) => void }) {}


  /**
   * Handle incoming tactical messages from nodes.
   */
  async onMessageReceived(fromNodeId: string, message: unknown) {

    try {
      const validated = MessageSchema.parse(message);
      const ttl = Date.now() + (72 * 60 * 60 * 1000); // 72 hours TTL

      // Store in Hub (never decrypts)
      await db.insert(hubMessages).values({
        messageId: validated.messageId,
        fromNodeId,
        toNodeId: validated.toNodeId || null,
        encryptedPayload: Buffer.from(validated.encryptedPayload).toString('base64'),
        mediaType: validated.mediaType,
        sentAt: validated.sentAt,
        deliveryStatus: 'pending',
        ttlExpiresAt: ttl
      });


      // If target node is connected, forward immediately
      if (validated.toNodeId) {
        const isOnline = await this.tcpServer.isNodeOnline(validated.toNodeId);
        if (isOnline) {
          await this.forwardMessage(validated.toNodeId, validated);
          await db.update(hubMessages)
            .set({ deliveryStatus: 'delivered', deliveredAt: Date.now() })
            .where(eq(hubMessages.messageId, validated.messageId));
        }
      } else {
        // Broadcast message (handle broadcast logic if needed)
      }
    } catch (err: unknown) {
      const error = err as Error;
      logger.error({ fromNodeId, error: error.message }, '[MessageRouter] Message validation failed.');
    }


  }

  /**
   * Handle node reconnection — deliver pending messages.
   */
  async onNodeReconnect(nodeId: string) {
    const pending = await db.select()
      .from(hubMessages)
      .where(and(
        eq(hubMessages.toNodeId, nodeId),
        eq(hubMessages.deliveryStatus, 'pending'),
        gt(hubMessages.ttlExpiresAt, Date.now())
      ))
      .orderBy(hubMessages.sentAt);

    for (const msg of pending) {
      const success = await this.forwardMessage(nodeId, msg);
      if (success) {
        await db.update(hubMessages)
          .set({ deliveryStatus: 'delivered', deliveredAt: Date.now() })
          .where(eq(hubMessages.messageId, msg.messageId));
      }
    }
  }

  /**
   * Handle FetchPendingMessagesRequest packet.
   */
  async onFetchPendingMessages(nodeId: string, lastReceivedAt: number) {
    return await db.select()
      .from(hubMessages)
      .where(and(
        eq(hubMessages.toNodeId, nodeId),
        gt(hubMessages.sentAt, lastReceivedAt)
      ))
      .orderBy(hubMessages.sentAt);
  }

  /**
   * Forward message to a connected node via TCP.
   */
  private async forwardMessage(nodeId: string, message: unknown): Promise<boolean> {

    try {
      this.tcpServer.sendPacket(nodeId, {
        type: 'MESSAGE',
        payload: message
      });
      return true;
    } catch {

      return false;
    }

  }

  /**
   * Prune expired messages (72h TTL).
   */
  async pruneExpiredMessages() {
    await db.delete(hubMessages).where(lt(hubMessages.ttlExpiresAt, Date.now()));
  }

  /**
   * Relay typing events without persistence.
   */
  async onTypingEvent(event: { fromNodeId: string; toNodeId: string; timestamp: number }) {
    const isOnline = await this.tcpServer.isNodeOnline(event.toNodeId);
    if (isOnline) {
      this.tcpServer.sendPacket(event.toNodeId, {
        type: 'TYPING',
        fromNodeId: event.fromNodeId,
        timestamp: event.timestamp
      });
    }
  }
}

import pino from 'pino';

const logger = pino({ level: 'info' });

export class RateLimiter {
  private packets = new Map<string, number[]>();
  private messages = new Map<string, number[]>();

  private readonly PACKET_WINDOW = 60000; // 1 minute
  private readonly PACKET_MAX = 200;

  private readonly MESSAGE_WINDOW = 3600000; // 1 hour
  private readonly MESSAGE_MAX = 100;

  /**
   * Check if a packet is within rate limits.
   */
  public checkPacketLimit(nodeId: string): boolean {
    const now = Date.now();
    let ts = this.packets.get(nodeId) || [];
    ts = ts.filter(t => now - t < this.PACKET_WINDOW);
    
    if (ts.length >= this.PACKET_MAX) {
      logger.warn({ nodeId, count: ts.length }, '[RateLimiter] Packet rate limit exceeded.');
      return false;
    }

    ts.push(now);
    this.packets.set(nodeId, ts);
    return true;
  }

  /**
   * Check if a message is within rate limits.
   */
  public checkMessageLimit(nodeId: string): boolean {
    const now = Date.now();
    let ts = this.messages.get(nodeId) || [];
    ts = ts.filter(t => now - t < this.MESSAGE_WINDOW);

    if (ts.length >= this.MESSAGE_MAX) {
      logger.warn({ nodeId, count: ts.length }, '[RateLimiter] Message rate limit exceeded.');
      return false;
    }

    ts.push(now);
    this.messages.set(nodeId, ts);
    return true;
  }

  /**
   * Returns current rate limit status for a node.
   */
  public getRateLimitStatus(nodeId: string) {
    const now = Date.now();
    const packets = (this.packets.get(nodeId) || []).filter(t => now - t < this.PACKET_WINDOW).length;
    const messages = (this.messages.get(nodeId) || []).filter(t => now - t < this.MESSAGE_WINDOW).length;
    
    return {
      packetsPerMin: packets,
      messagesPerHour: messages,
      packetRemaining: Math.max(0, this.PACKET_MAX - packets),
      messageRemaining: Math.max(0, this.MESSAGE_MAX - messages)
    };
  }
}

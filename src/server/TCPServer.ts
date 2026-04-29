import net from 'node:net';
import pino from 'pino';


import { binaryLogger } from './BinaryLogger';
import { WorkerPool } from './WorkerPool';
import { env } from '../lib/env';
import { IndustryProfileService } from '../services/IndustryProfileService';
import jwt from 'jsonwebtoken';
import { EventEmitter } from 'node:events';

const logger = pino({ level: env.LOG_LEVEL });

interface NodeProfile {
  id: string;
  type: 'hub_pc' | 'node_mobile';
}

interface NodeConnection {
  socket: net.Socket;
  syncOffset: number;
  sessionToken?: string;
  lastAckAt: number;
  rtt: number;
  profile?: NodeProfile;
  buffer: SlidingWindowBuffer;
}

class SlidingWindowBuffer extends EventEmitter {
  private data: Buffer = Buffer.alloc(0);
  constructor(private maxBytes: number = 65536) {
    super();
  }

  append(chunk: Buffer) {
    if (this.data.length + chunk.length > this.maxBytes) {
      this.emit('error', new Error('SlidingWindowBuffer overflow'));
      return;
    }
    this.data = Buffer.concat([this.data, chunk]);
    this.process();
  }

  private process() {
    while (this.data.length >= 4) {
      const length = this.data.readUInt32LE(0);
      if (this.data.length >= 4 + length) {
        const payload = this.data.subarray(4, 4 + length);
        this.emit('frame', payload);
        this.data = this.data.subarray(4 + length);
      } else {
        break;
      }
    }
  }
}

/**
 * GOLD SHE HUB — TCP Server v2.0 (Industrial Grade)
 */
export class TCPServer {
  private server: net.Server;
  private connections = new Map<string, NodeConnection>();
  private pool = new WorkerPool();
  private maxNodes = env.HUB_MAX_NODES;

  constructor() {
    this.server = net.createServer(s => this.handle(s));
    this.server.maxConnections = this.maxNodes;
  }

  private handle(socket: net.Socket) {
    if (this.connections.size >= this.maxNodes) {
      const capacityFull = Buffer.alloc(8);
      capacityFull.writeUInt32LE(4, 0);
      capacityFull.write('FULL', 4);
      socket.write(capacityFull);
      socket.end();
      return;
    }

    const nodeId = `node_${Math.random().toString(36).substr(2, 9)}`;
    const buffer = new SlidingWindowBuffer();
    const conn: NodeConnection = {
      socket,
      syncOffset: 0,
      lastAckAt: Date.now(),
      rtt: 0,
      buffer
    };

    this.connections.set(nodeId, conn);

    buffer.on('frame', (payload: Buffer) => {
      this.processFrame(nodeId, payload);
    });


    buffer.on('error', (err) => {
      logger.warn({ nodeId, error: err.message }, '[TCPServer] Buffer overflow or malformed frame.');
      this.closeConnection(nodeId);
    });

    socket.on('data', (chunk) => {
      buffer.append(chunk);
    });

    socket.on('error', (err) => {
      logger.error({ nodeId, error: err.message }, '[TCPServer] Socket error.');
      this.closeConnection(nodeId);
    });

    socket.on('close', () => {
      this.closeConnection(nodeId);
    });
  }

  private async processFrame(nodeId: string, payload: Buffer) {
    const conn = this.connections.get(nodeId);
    if (!conn) return;

    try {
      // Decode with protobuf via WorkerPool
      const decoded = (await this.pool.processPacket({ id: nodeId, payload })) as Record<string, unknown>;

      
      // Log to binary log with message ID correlation if available
      binaryLogger.log(payload, (decoded.messageId || decoded.id) as string | undefined);


      if (decoded.type === 'HANDSHAKE') {

        this.handleHandshake(nodeId, decoded);
      } else if (decoded.type === 'HEARTBEAT') {
        this.handleHeartbeat(nodeId, decoded);
      } else {
        // Forward to other handlers (Forensic, DB, etc)
        this.pool.processPacket({ type: 'DB_WRITE', data: decoded, nodeId });
      }
    } catch {
      logger.error({ nodeId }, '[TCPServer] Frame processing failed.');
    }

  }

  private handleHandshake(nodeId: string, packet: Record<string, unknown>) {
    const conn = this.connections.get(nodeId);
    if (!conn) return;

    const syncOffset = (this.connections.size % 50) * 20; // Jitter Manager logic

    
    if (packet.sessionToken) {
      try {
        jwt.verify(packet.sessionToken as string, env.HUB_JWT_SECRET);
        // Resumption success
        conn.sessionToken = packet.sessionToken as string;
        logger.info({ nodeId }, '[TCPServer] Session resumed.');
      } catch {
        // Require re-pairing (handled by client)
        logger.warn({ nodeId }, '[TCPServer] Session expired, re-pairing required.');
      }
    }


    conn.syncOffset = syncOffset;
    
    const hubAck = {
      type: 'HUB_ACK',
      syncOffsetMs: syncOffset,
      activeProfile: IndustryProfileService.getActiveProfile(),
      uiManifestUrl: '/api/config/ui-manifest',
      timestamp: Date.now()
    };

    this.sendPacket(nodeId, hubAck);
  }

  private handleHeartbeat(nodeId: string, packet: Record<string, unknown>) {

    const conn = this.connections.get(nodeId);
    if (!conn) return;

    const now = Date.now();
    conn.lastAckAt = now;
    if (packet.timestamp) {
      conn.rtt = now - (packet.timestamp as number);
    }


    const hubAck = {
      type: 'HUB_ACK',
      syncOffsetMs: conn.syncOffset,
      timestamp: now
    };

    this.sendPacket(nodeId, hubAck);
  }

  private sendPacket(nodeId: string, packet: Record<string, unknown>) {

    const conn = this.connections.get(nodeId);
    if (!conn) return;

    // In production, this would encode with Protobuf
    const payload = Buffer.from(JSON.stringify(packet)); 
    const header = Buffer.alloc(4);
    header.writeUInt32LE(payload.length, 0);
    
    conn.socket.write(Buffer.concat([header, payload]));
  }

  private closeConnection(nodeId: string) {
    const conn = this.connections.get(nodeId);
    if (conn) {
      conn.socket.destroy();
      this.connections.delete(nodeId);
      logger.info({ nodeId }, '[TCPServer] Connection closed.');
    }
  }

  public getStatusFeed() {
    return Array.from(this.connections.entries()).map(([id, conn]) => ({
      id,
      rtt: conn.rtt,
      lastSeen: conn.lastAckAt,
      status: (Date.now() - conn.lastAckAt > 45000) ? 'ghost' : 'online'
    }));
  }

  listen(port: number) { this.server.listen(port); }
}


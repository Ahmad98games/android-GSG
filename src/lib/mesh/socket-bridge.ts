import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'node:http';
import { JWTService, SecureCrypto } from './security-service';
import { getHubServer } from './node-server';
import { MeshPacket, generateUUID } from '../Shared/mesh-protocol';


import { hubWorkerPool } from './worker-pool';
import { hubBinaryLogger } from './binary-logger';

/**
 * GOLD SHE MESH — Secure WebSocket Bridge
 * GAP 1: Secure Bridge Authentication
 * 
 * Provides a Socket.io interface for Mobile Nodes with JWT auth 
 * and AES-256-GCM payload encryption.
 */

export class SocketBridge {
  private static instance: SocketBridge;
  private io: Server | null = null;
  private hub = getHubServer();
  
  // High-Capacity Throttling
  private packetCount = 0;
  private lastReset = Date.now();
  private readonly THROTTLE_THRESHOLD = 50; // 50 pkts/sec max before throttling

  private constructor() {}

  static getInstance(): SocketBridge {
    if (!SocketBridge.instance) {
      SocketBridge.instance = new SocketBridge();
    }
    return SocketBridge.instance;
  }

  /**
   * Initialize the Socket.io server and security middleware.
   */
  start(httpServer: HttpServer) {
    if (this.io) return;

    this.io = new Server(httpServer, {
      cors: { origin: '*' },
      transports: ['websocket'],
      maxHttpBufferSize: 1e8,
      pingTimeout: 60000,
    });

    // Multi-threaded worker pool is managed globally

    // PILLAR 1: JWT Security Middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers['x-auth-token'];
      
      if (!token) {
        console.warn(`[SocketBridge] Auth failed: No token provided from socket ${socket.id}`);
        return next(new Error('AUTHENTICATION_REQUIRED'));
      }

      const decoded = JWTService.validateToken(token as string);
      if (!decoded || typeof decoded === 'string') {
        console.warn(`[SocketBridge] Auth failed: Invalid/Expired token from ${socket.id}`);
        return next(new Error('INVALID_TOKEN'));
      }

      // Attach authenticated identity to socket
      socket.data.deviceId = decoded.sub as string;
      socket.data.deviceName = decoded.name as string;
      
      next();
    });

    // PILLAR 2: Secure Channel Management
    this.io.on('connection', (socket) => {
      const { deviceName, deviceId } = socket.data;
      console.info(`[SocketBridge] Secure link established: ${deviceName} [${deviceId}]`);

      // Handle incoming encrypted packets
      socket.on('packet', (encryptedData: string | Buffer) => {
        this.handleIncomingPacket(socket, encryptedData);
      });

      socket.on('disconnect', (reason) => {
        console.info(`[SocketBridge] Secure link severed: ${deviceId} (${reason})`);
      });
    });

    // PILLAR 3: Hub-to-Bridge event mapping
    this.hub.on('send-to-bridge', (deviceId: string, packet: MeshPacket) => {
      this.sendToNode(deviceId, packet);
    });

    this.hub.on('broadcast-to-bridge', (packet: MeshPacket) => {
      this.broadcast(packet);
    });

    console.info('[SocketBridge] Secure Bridge active on Pillar 1 standard.');
  }

  // Worker initialization removed in favor of global WorkerPool

  /**
   * Decrypts and processes incoming packets.
   */
  private handleIncomingPacket(socket: Socket, encrypted: string | Buffer) {
    // 1. RAW BINARY LOGGING
    hubBinaryLogger.log(Buffer.from(encrypted));

    // 2. HIGH-CAPACITY THROTTLER
    const now = Date.now();
    if (now - this.lastReset > 1000) {
      this.packetCount = 0;
      this.lastReset = now;
    }
    this.packetCount++;

    if (this.packetCount > this.THROTTLE_THRESHOLD) {
      console.warn(`[SocketBridge] HIGH LOAD: Throttling packets from ${socket.data.deviceId}`);
      if (this.packetCount > this.THROTTLE_THRESHOLD * 2) return; 
    }

    const secret = this.hub.store.getSystemSecret() || 'goldshe-mesh-default-secret-v1';
    
    // 3. Delegate to Global Worker Thread Pool
    hubWorkerPool.execute({
      id: generateUUID(),
      type: typeof encrypted === 'string' ? 'DECRYPT_JSON' : 'DECRYPT_PROTO',
      payload: encrypted,
      secret
    }).then(result => {
      if (result.success) {
        setImmediate(() => this.hub.emit('bridge-packet', result.data));
      } else {
        console.error(`[SocketBridge:Worker] Processing failed:`, result.error);
      }
    });
  }

  /**
   * Encrypts and sends a packet to a specific device.
   */
  sendToNode(deviceId: string, packet: MeshPacket) {
    if (!this.io) return;

    const secret = this.hub.store.getSystemSecret() || 'goldshe-mesh-default-secret-v1';
    
    try {
      const json = JSON.stringify(packet);
      const encrypted = SecureCrypto.encrypt(json, secret);
      
      this.io.to(deviceId).emit('packet', encrypted);
    } catch (err) {
      console.error(`[SocketBridge] Encryption failed for outgoing packet to ${deviceId}:`, err);
    }
  }

  /**
   * Broadcasts an encrypted packet to all connected nodes.
   */
  broadcast(packet: MeshPacket) {
    if (!this.io) return;

    const secret = this.hub.store.getSystemSecret() || 'goldshe-mesh-default-secret-v1';

    try {
      const json = JSON.stringify(packet);
      const encrypted = SecureCrypto.encrypt(json, secret);
      
      this.io.emit('packet', encrypted);
    } catch (err) {
      console.error(`[SocketBridge] Broadcast encryption failed:`, err);
    }
  }

  isReady(): boolean {
    return this.io !== null;
  }

  stop() {
    if (this.io) {
      console.info('[SocketBridge] Shutting down bridge...');
      this.io.close();
      this.io = null;
    }

  }
}

export const getSocketBridge = () => SocketBridge.getInstance();


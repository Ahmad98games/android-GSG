"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocketBridge = exports.SocketBridge = void 0;
const socket_io_1 = require("socket.io");
const security_service_1 = require("./security-service");
const node_server_1 = require("./node-server");
const mesh_protocol_1 = require("../Shared/mesh-protocol");
const worker_pool_1 = require("./worker-pool");
const binary_logger_1 = require("./binary-logger");
/**
 * GOLD SHE MESH — Secure WebSocket Bridge
 * GAP 1: Secure Bridge Authentication
 *
 * Provides a Socket.io interface for Mobile Nodes with JWT auth
 * and AES-256-GCM payload encryption.
 */
class SocketBridge {
    static instance;
    io = null;
    hub = (0, node_server_1.getHubServer)();
    // High-Capacity Throttling
    packetCount = 0;
    lastReset = Date.now();
    THROTTLE_THRESHOLD = 50; // 50 pkts/sec max before throttling
    constructor() { }
    static getInstance() {
        if (!SocketBridge.instance) {
            SocketBridge.instance = new SocketBridge();
        }
        return SocketBridge.instance;
    }
    /**
     * Initialize the Socket.io server and security middleware.
     */
    start(httpServer) {
        if (this.io)
            return;
        this.io = new socket_io_1.Server(httpServer, {
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
            const decoded = security_service_1.JWTService.validateToken(token);
            if (!decoded || typeof decoded === 'string') {
                console.warn(`[SocketBridge] Auth failed: Invalid/Expired token from ${socket.id}`);
                return next(new Error('INVALID_TOKEN'));
            }
            // Attach authenticated identity to socket
            socket.data.deviceId = decoded.sub;
            socket.data.deviceName = decoded.name;
            next();
        });
        // PILLAR 2: Secure Channel Management
        this.io.on('connection', (socket) => {
            const { deviceName, deviceId } = socket.data;
            console.info(`[SocketBridge] Secure link established: ${deviceName} [${deviceId}]`);
            // Handle incoming encrypted packets
            socket.on('packet', (encryptedData) => {
                this.handleIncomingPacket(socket, encryptedData);
            });
            socket.on('disconnect', (reason) => {
                console.info(`[SocketBridge] Secure link severed: ${deviceId} (${reason})`);
            });
        });
        // PILLAR 3: Hub-to-Bridge event mapping
        this.hub.on('send-to-bridge', (deviceId, packet) => {
            this.sendToNode(deviceId, packet);
        });
        this.hub.on('broadcast-to-bridge', (packet) => {
            this.broadcast(packet);
        });
        console.info('[SocketBridge] Secure Bridge active on Pillar 1 standard.');
    }
    // Worker initialization removed in favor of global WorkerPool
    /**
     * Decrypts and processes incoming packets.
     */
    handleIncomingPacket(socket, encrypted) {
        // 1. RAW BINARY LOGGING
        binary_logger_1.hubBinaryLogger.log(Buffer.from(encrypted));
        // 2. HIGH-CAPACITY THROTTLER
        const now = Date.now();
        if (now - this.lastReset > 1000) {
            this.packetCount = 0;
            this.lastReset = now;
        }
        this.packetCount++;
        if (this.packetCount > this.THROTTLE_THRESHOLD) {
            console.warn(`[SocketBridge] HIGH LOAD: Throttling packets from ${socket.data.deviceId}`);
            if (this.packetCount > this.THROTTLE_THRESHOLD * 2)
                return;
        }
        const secret = this.hub.store.getSystemSecret() || 'goldshe-mesh-default-secret-v1';
        // 3. Delegate to Global Worker Thread Pool
        worker_pool_1.hubWorkerPool.execute({
            id: (0, mesh_protocol_1.generateUUID)(),
            type: typeof encrypted === 'string' ? 'DECRYPT_JSON' : 'DECRYPT_PROTO',
            payload: encrypted,
            secret
        }).then(result => {
            if (result.success) {
                setImmediate(() => this.hub.emit('bridge-packet', result.data));
            }
            else {
                console.error(`[SocketBridge:Worker] Processing failed:`, result.error);
            }
        });
    }
    /**
     * Encrypts and sends a packet to a specific device.
     */
    sendToNode(deviceId, packet) {
        if (!this.io)
            return;
        const secret = this.hub.store.getSystemSecret() || 'goldshe-mesh-default-secret-v1';
        try {
            const json = JSON.stringify(packet);
            const encrypted = security_service_1.SecureCrypto.encrypt(json, secret);
            this.io.to(deviceId).emit('packet', encrypted);
        }
        catch (err) {
            console.error(`[SocketBridge] Encryption failed for outgoing packet to ${deviceId}:`, err);
        }
    }
    /**
     * Broadcasts an encrypted packet to all connected nodes.
     */
    broadcast(packet) {
        if (!this.io)
            return;
        const secret = this.hub.store.getSystemSecret() || 'goldshe-mesh-default-secret-v1';
        try {
            const json = JSON.stringify(packet);
            const encrypted = security_service_1.SecureCrypto.encrypt(json, secret);
            this.io.emit('packet', encrypted);
        }
        catch (err) {
            console.error(`[SocketBridge] Broadcast encryption failed:`, err);
        }
    }
    isReady() {
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
exports.SocketBridge = SocketBridge;
const getSocketBridge = () => SocketBridge.getInstance();
exports.getSocketBridge = getSocketBridge;

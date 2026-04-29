"use strict";
/**
 * Gold She Mesh — Hub Node Server (PC)
 *
 * V2.0: Raw TCP Refactor (Pillar 1)
 * Enforces industrial socket standards, JSON-newline protocol,
 * and Zombie Socket Annihilation.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHubServer = exports.HubNodeServer = void 0;
const node_net_1 = __importDefault(require("node:net"));
const node_events_1 = __importDefault(require("node:events"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const { subtle } = node_crypto_1.webcrypto;
const cryptoengine_1 = require("./cryptoengine");
const offline_store_1 = require("./offline-store");
const paring_manager_1 = require("./paring-manager");
const sse_registry_1 = require("./sse-registry");
const delta_processor_1 = require("./delta-processor");
const khata_engine_1 = require("../khata-engine");
const tcp_crypto_1 = require("./tcp-crypto");
const vocabulary_1 = require("../constants/vocabulary");
const worker_pool_1 = require("./worker-pool");
const binary_logger_1 = require("./binary-logger");
const config_manager_1 = require("./config-manager");
const mesh_protocol_1 = require("../Shared/mesh-protocol");
const forensic_monitor_1 = require("./forensic-monitor");
const security_service_1 = require("./security-service");
// ─────────────────────────────────────────────────────────────
class HubNodeServer extends node_events_1.default {
    server = null;
    nodes = new Map();
    /** Track all sockets for graceful annihilation */
    activeSockets = new Set();
    crypto = new cryptoengine_1.HubCryptoEngine();
    store;
    pairing;
    deltaProcessor;
    forensic;
    startTime = Date.now();
    hubDeviceId;
    hubIdentity;
    hubSeq = 0;
    heartbeatInterval = null;
    constructor(hubName = 'Gold She Hub PC') {
        super();
        this.store = new offline_store_1.HubOfflineStore();
        const savedId = this.store.getHubDeviceId();
        if (savedId) {
            this.hubDeviceId = savedId;
            console.info(`[HubServer] Restored identity: ${savedId}`);
        }
        else {
            this.hubDeviceId = (0, mesh_protocol_1.generateUUID)();
            this.store.saveHubDeviceId(this.hubDeviceId);
            console.info(`[HubServer] New identity: ${this.hubDeviceId}`);
        }
        this.hubIdentity = {
            deviceId: this.hubDeviceId,
            deviceName: hubName,
            deviceType: 'hub_pc',
            ecdhPublicKey: '',
            registeredAt: Date.now(),
            lastSeen: Date.now(),
            isOnline: true,
        };
        this.pairing = new paring_manager_1.PairingManager(this.store, this.hubDeviceId);
        this.deltaProcessor = new delta_processor_1.DeltaProcessor(this.store.getDb());
        this.forensic = forensic_monitor_1.ForensicMonitor.getInstance(this.store);
        /** GAP 1: Handle packets from Secure WebSocket Bridge */
        this.on('bridge-packet', (packet) => {
            this.handleBridgePacket(packet).catch(err => {
                console.error('[HubServer] Bridge packet processing error:', err);
            });
        });
    }
    // ─── Lifecycle ─────────────────────────────────────────────
    static instance = null;
    static getInstance() {
        if (!HubNodeServer.instance) {
            HubNodeServer.instance = new HubNodeServer();
        }
        return HubNodeServer.instance;
    }
    async start() {
        worker_pool_1.hubWorkerPool.start();
        this.server = node_net_1.default.createServer((socket) => this.onConnection(socket));
        this.server.on('error', (err) => {
            console.error('[HubServer] TCP Server Error:', err);
            this.emit('error', err);
        });
        this.server.listen(mesh_protocol_1.HUB_PORT, '0.0.0.0', () => {
            console.info(`[HubServer] Pillar 1 Raw TCP Mesh online at port ${mesh_protocol_1.HUB_PORT}`);
            this.emit('started');
        });
        this.store.upsertDevice(this.hubIdentity);
        this.heartbeatInterval = setInterval(() => {
            const deadline = Date.now() - mesh_protocol_1.HEARTBEAT_INTERVAL_MS * 2.5;
            for (const [deviceId, node] of this.nodes) {
                if (node.lastHeartbeat < deadline) {
                    console.warn(`[HubServer] Heartbeat timeout — dropping ${deviceId}`);
                    node.socket.destroy();
                    this.handleDisconnect(node);
                }
                else if (node.state === 'ESTABLISHED') {
                    // Send ping for RTT calculation
                    node.lastPingSentAt = Date.now();
                    this.sendToDevice(deviceId, (0, mesh_protocol_1.buildPacket)('HEARTBEAT', this.hubDeviceId, deviceId, this.nextSeq(), {}));
                }
            }
            this.store.expireOldPairingCodes();
        }, mesh_protocol_1.HEARTBEAT_INTERVAL_MS);
        // PILLAR 4: THE JANITOR (Storage Cleanup)
        // Runs every 24 hours to ensure SSD doesn't fill up with CCTV snippets.
        setInterval(() => this.runJanitor(), 24 * 60 * 60 * 1000);
        // Run once on boot
        this.runJanitor();
    }
    runJanitor() {
        const snippetsDir = node_path_1.default.join(process.cwd(), 'public', 'snippets');
        if (!node_fs_1.default.existsSync(snippetsDir))
            return;
        console.info('[HubServer] Janitor: Starting storage audit...');
        const now = Date.now();
        const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 Days
        node_fs_1.default.readdir(snippetsDir, (err, files) => {
            if (err)
                return;
            files.forEach((file) => {
                if (!file.endsWith('.mp4'))
                    return;
                const filePath = node_path_1.default.join(snippetsDir, file);
                node_fs_1.default.stat(filePath, (err, stats) => {
                    if (err)
                        return;
                    if (now - stats.mtimeMs > RETENTION_MS) {
                        console.info(`[HubServer] Janitor: Purging old snippet ${file}`);
                        node_fs_1.default.unlink(filePath, () => { });
                    }
                });
            });
        });
    }
    /** MODIFICATION 2: Graceful Shutdown (EADDRINUSE protection) */
    stop() {
        console.info('[HubServer] Initiating graceful shutdown...');
        if (this.heartbeatInterval)
            clearInterval(this.heartbeatInterval);
        // Annihilate all active sockets immediately
        for (const socket of this.activeSockets) {
            socket.destroy();
        }
        this.activeSockets.clear();
        if (this.server) {
            this.server.close();
            this.server = null;
        }
        this.store.close();
        this.emit('stopped');
        console.info('[HubServer] Shutdown complete.');
    }
    // ─── Connection Handling ────────────────────────────────────
    onConnection(socket) {
        const ip = socket.remoteAddress ?? 'unknown';
        this.activeSockets.add(socket);
        if (this.nodes.size >= mesh_protocol_1.MAX_DEVICES) {
            console.warn(`[HubServer] Capacity reached. Rejecting ${ip}`);
            this.sendRawSocket(socket, this.buildErrorPacket('MAX_DEVICES_REACHED', 'Hub at capacity', false));
            socket.destroy();
            return;
        }
        const abortController = new AbortController();
        const { signal } = abortController;
        const device = {
            socket,
            deviceId: '',
            identity: {},
            state: 'PENDING_PAIRING',
            buffer: '',
            seqCounter: 0,
            lastHeartbeat: Date.now(),
            syncOffset: 0,
            latencyMs: 0,
            lastPingSentAt: 0,
            abortController,
        };
        /** MODIFICATION 1: Zombie Socket Annihilation (3000ms) */
        device.handshakeTimer = setTimeout(() => {
            if (device.state !== 'ESTABLISHED') {
                console.warn(`[HubServer] Zombie detected (${ip}). Destroying socket.`);
                socket.destroy();
            }
        }, 3000);
        const onData = (chunk) => this.onSocketData(device, chunk);
        const onError = (err) => {
            console.error(`[HubServer] Socket error from ${ip}:`, err.message);
            socket.destroy();
        };
        socket.on('data', onData);
        socket.on('error', onError);
        signal.addEventListener('abort', () => {
            socket.off('data', onData);
            socket.off('error', onError);
        }, { once: true });
        socket.on('close', () => {
            this.activeSockets.delete(socket);
            if (device.handshakeTimer)
                clearTimeout(device.handshakeTimer);
            device.abortController.abort(); // Kill all associated listeners
            this.handleDisconnect(device);
        });
        console.info(`[HubServer] New raw connection from ${ip}`);
    }
    onSocketData(device, chunk) {
        // 1. RAW BINARY LOGGING
        binary_logger_1.hubBinaryLogger.log(chunk);
        device.buffer += chunk.toString('utf8');
        let boundaryIndex;
        while ((boundaryIndex = device.buffer.indexOf('\n')) !== -1) {
            const line = device.buffer.slice(0, boundaryIndex).trim();
            device.buffer = device.buffer.slice(boundaryIndex + 1);
            if (line) {
                // 2. OFF-LOAD TO WORKER POOL
                const secret = this.store.getSystemSecret() || 'goldshe-mesh-default-secret-v1';
                const taskId = (0, mesh_protocol_1.generateUUID)();
                worker_pool_1.hubWorkerPool.execute({
                    id: taskId,
                    type: 'DECRYPT_JSON', // Default for now, can detect binary/json later
                    payload: line,
                    secret
                }).then(result => {
                    if (result.success) {
                        this.handleProcessedPacket(device, result.data).catch(err => {
                            console.error('[HubServer] Packet handling error:', err);
                        });
                    }
                    else {
                        console.error(`[HubServer:Worker] Processing failed:`, result.error);
                    }
                });
            }
        }
    }
    /**
     * New handler for packets that have been decrypted and parsed by workers.
     */
    async handleProcessedPacket(device, packet) {
        // 1. HEARTBEAT LATENCY TRACKING
        if (packet.type === 'HEARTBEAT' || packet.type === 'HEARTBEAT_ACK') {
            device.lastHeartbeat = Date.now();
            if (packet.type === 'HEARTBEAT_ACK' && device.lastPingSentAt > 0) {
                device.latencyMs = Date.now() - device.lastPingSentAt;
                // Flag Weak Connection (> 500ms)
                const quality = device.latencyMs > 500 ? 'weak' : 'stable';
                if (quality === 'weak') {
                    console.warn(`[HubServer] WEAK CONNECTION detected for ${device.deviceId}: ${device.latencyMs}ms`);
                }
                // Update telemetry
                sse_registry_1.telemetryRegistry.broadcast({
                    event: 'telemetry',
                    data: {
                        deviceId: device.deviceId,
                        latencyMs: device.latencyMs,
                        connectionQuality: quality
                    }
                });
            }
            if (packet.type === 'HEARTBEAT') {
                this.sendRawSocket(device.socket, (0, mesh_protocol_1.buildPacket)('HEARTBEAT_ACK', this.hubDeviceId, packet.from, this.nextSeq(), {}));
            }
            return;
        }
        // 2. FORENSIC TRACKING (Scans)
        if (packet.type === 'KHATA_ENTRY' || packet.type === 'AI_TELEMETRY') {
            this.forensic.trackScan(device.deviceId, device.identity.deviceName || 'Unknown Node');
        }
        // Handshake Flow
        if (packet.type === 'PAIRING_VALIDATE') {
            await this.handlePairingValidate(device, packet);
            return;
        }
        if (packet.type === 'HANDSHAKE_INIT') {
            await this.handleHandshakeInit(device, packet);
            return;
        }
        if (packet.type === 'HANDSHAKE_COMPLETE') {
            await this.handleHandshakeComplete(device);
            return;
        }
        // Authenticated Routing
        if (device.state !== 'ESTABLISHED' || device.deviceId !== packet.from) {
            this.sendRawSocket(device.socket, this.buildErrorPacket('AUTH_REQUIRED', 'Establish session first', false));
            return;
        }
        device.lastHeartbeat = Date.now();
        // The packet payload is already decrypted if it was a specialized industrial event, 
        // or we might need to route it.
        // If the worker returned a full MeshPacket with decrypted data:
        await this.routeMessage(device, packet, packet.payload);
    }
    async processPacket(device, raw) {
        let packet;
        try {
            packet = JSON.parse(raw);
        }
        catch {
            console.error('[HubServer] Invalid JSON received. Dropping line.');
            return;
        }
        // Heartbeat (Cleartext)
        if (packet.type === 'HEARTBEAT') {
            device.lastHeartbeat = Date.now();
            this.sendRawSocket(device.socket, (0, mesh_protocol_1.buildPacket)('HEARTBEAT_ACK', this.hubDeviceId, packet.from, this.nextSeq(), {}));
            return;
        }
        // Handshake Flow
        if (packet.type === 'PAIRING_VALIDATE') {
            await this.handlePairingValidate(device, packet);
            return;
        }
        if (packet.type === 'HANDSHAKE_INIT') {
            await this.handleHandshakeInit(device, packet);
            return;
        }
        if (packet.type === 'HANDSHAKE_COMPLETE') {
            await this.handleHandshakeComplete(device);
            return;
        }
        // Authenticated Routing
        if (device.state !== 'ESTABLISHED' || device.deviceId !== packet.from) {
            this.sendRawSocket(device.socket, this.buildErrorPacket('AUTH_REQUIRED', 'Establish session first', false));
            return;
        }
        device.lastHeartbeat = Date.now();
        // Decrypt Envelope
        try {
            const envelope = JSON.parse(packet.payload);
            const innerPayload = await this.crypto.decrypt(envelope, packet.from);
            await this.routeMessage(device, packet, innerPayload);
        }
        catch (err) {
            console.error(`[HubServer] Decrypt failed from ${packet.from}:`, err);
            this.forensic.trackError(packet.from, 'Unknown Node', err.message);
            this.sendToDevice(packet.from, this.buildErrorPacket('DECRYPT_FAILED', 'Security violation', true));
        }
    }
    // ─── Message Routing & Handshake ─────────────────────────────
    async handlePairingValidate(device, packet) {
        const payload = JSON.parse(packet.payload);
        const result = this.pairing.validate(payload.pairingCode, payload.deviceIdentity.deviceId, this.nodes.size);
        if (!result.valid) {
            this.sendRawSocket(device.socket, this.buildErrorPacket('AUTH_FAILED', result.reason ?? 'Invalid code', false));
            device.socket.destroy();
            return;
        }
        const identity = { ...payload.deviceIdentity, isOnline: true, lastSeen: Date.now() };
        this.store.upsertDevice(identity);
        device.deviceId = identity.deviceId;
        device.identity = identity;
        device.state = 'PENDING_HANDSHAKE';
        // OMNORA SYNC WINDOW: Assign unique offset (250ms steps)
        device.syncOffset = (this.nodes.size * 250) % 5000;
        const accept = {
            assignedDeviceId: identity.deviceId,
            hubIdentity: this.hubIdentity,
            registeredDevices: this.store.getAllDevices(),
            bridgeToken: security_service_1.JWTService.issueToken(identity.deviceId, identity.deviceName),
            // @ts-expect-error - Adding dynamic property for the directive
            syncOffset: device.syncOffset,
        };
        this.sendRawSocket(device.socket, (0, mesh_protocol_1.buildPacket)('PAIRING_ACCEPT', this.hubDeviceId, identity.deviceId, this.nextSeq(), accept));
        console.info(`[HubServer] Device paired (Sync Offset: ${device.syncOffset}ms): ${identity.deviceName}`);
    }
    async handleHandshakeInit(device, packet) {
        if (device.state !== 'PENDING_HANDSHAKE')
            return;
        const init = JSON.parse(packet.payload);
        const peerKey = await this.crypto.importPeerPublicKey(init.ephemeralPublicKey);
        const bundle = await this.crypto.generateEphemeralBundle();
        device.ephemeralBundle = bundle;
        // Derive session key
        await this.crypto.deriveSessionKey(bundle.keyPair.privateKey, peerKey, packet.from);
        // Compute verify token using the same logic as the engine (needs raw bits)
        const rawBits = await subtle.deriveBits({ name: 'ECDH', public: peerKey }, bundle.keyPair.privateKey, 256);
        const verifyToken = cryptoengine_1.HubCryptoEngine.computeVerifyToken(rawBits, init.nonce);
        const ack = {
            identity: this.hubIdentity,
            ephemeralPublicKey: bundle.publicBase64,
            nonceEcho: init.nonce,
            verifyToken,
        };
        this.sendRawSocket(device.socket, (0, mesh_protocol_1.buildPacket)('HANDSHAKE_ACK', this.hubDeviceId, packet.from, this.nextSeq(), ack));
    }
    async handleHandshakeComplete(device) {
        if (device.state !== 'PENDING_HANDSHAKE')
            return;
        device.state = 'ESTABLISHED';
        if (device.handshakeTimer)
            clearTimeout(device.handshakeTimer);
        this.nodes.set(device.deviceId, device);
        console.info(`[HubServer] Session ESTABLISHED: ${device.deviceId}`);
        // Broadcast online status
        this.broadcastStatus(device.deviceId, true);
    }
    async routeMessage(_node, packet, inner) {
        // ── Pillar 3: AI Telemetry ──────────────────────────────
        if (packet.type === 'AI_TELEMETRY') {
            sse_registry_1.telemetryRegistry.broadcast({
                event: 'ai-telemetry',
                data: inner,
            });
            return;
        }
        if (packet.type === 'TELEMETRY_BEAT') {
            sse_registry_1.telemetryRegistry.broadcast({
                event: 'telemetry',
                data: inner,
            });
            return;
        }
        // ── Pillar 5: Khata Ledger ──────────────────────────────
        if (packet.type === 'KHATA_ENTRY') {
            try {
                const payload = inner;
                const entry = await khata_engine_1.KhataEngine.recordEntry({
                    type: payload.type,
                    amount: payload.amount,
                    description: payload.description,
                    workerName: payload.workerName,
                    workerId: payload.workerId,
                    snippetPath: `public/snippets/${payload.id}.mp4`
                });
                // PILLAR 4: Trigger AI Snippet Recording (Fire and Forget)
                // OMNORA V9.0: Tier Guard for Vision Trigger
                if (config_manager_1.configManager.isFeatureEnabled('visionEnabled')) {
                    fetch('http://localhost:5000/trigger-snippet', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            uuid: payload.id,
                            camera_id: payload.cameraId || 'DEFAULT'
                        })
                    }).catch(err => console.warn('[HubServer] Vision Trigger Warning:', err.message));
                }
                else {
                    console.debug('[HubServer] Vision Trigger skipped (Tier Restricted)');
                }
                sse_registry_1.sseRegistry.broadcast({
                    event: 'khata-entry',
                    data: entry,
                });
            }
            catch (err) {
                console.error('[HubServer] Khata Ledger Error:', err);
            }
            return;
        }
        // ── Messenger & Presence ───────────────────────────────
        if (packet.type === 'TEXT_MESSAGE' || packet.type === 'PHOTO_MESSAGE') {
            sse_registry_1.sseRegistry.broadcast({
                event: 'message',
                data: { packet, payload: inner },
            });
        }
        console.debug(`[HubServer] Routed ${packet.type} from ${packet.from}`);
    }
    // ─── Helpers ───────────────────────────────────────────────
    sendRawSocket(socket, packet) {
        if (!socket.writable)
            return;
        const raw = JSON.stringify(packet);
        const secret = this.store.getSystemSecret();
        if (secret) {
            try {
                const encrypted = tcp_crypto_1.TCPCrypto.encrypt(raw, secret);
                socket.write(encrypted + '\n');
                return;
            }
            catch (err) {
                console.error('[HubServer] Encryption failed:', err.message);
            }
        }
        socket.write(raw + '\n');
    }
    sendToDevice(deviceId, packet) {
        const node = this.nodes.get(deviceId);
        if (node) {
            this.sendRawSocket(node.socket, packet);
        }
        else {
            // Might be a bridge-connected node
            this.emit('send-to-bridge', deviceId, packet);
        }
    }
    /**
     * BROADCAST: Send a packet to all ESTABLISHED nodes.
     */
    broadcast(type, payload) {
        const packet = (0, mesh_protocol_1.buildPacket)(type, this.hubDeviceId, 'broadcast', this.nextSeq(), payload);
        for (const node of this.nodes.values()) {
            if (node.state === 'ESTABLISHED') {
                this.sendRawSocket(node.socket, packet);
            }
        }
        // Also broadcast to secure bridge nodes
        this.emit('broadcast-to-bridge', packet);
    }
    /**
     * BROADCAST VOCABULARY: Notifies all field nodes of terminology changes.
     */
    broadcastVocabulary(industry) {
        const vocab = vocabulary_1.VOCABULARIES[industry];
        if (!vocab)
            return;
        console.info(`[HubServer] Broadcasting Vocabulary: ${industry.toUpperCase()}`);
        this.broadcast('VOCABULARY_UPDATE', {
            industry,
            ...vocab
        });
    }
    nextSeq() {
        return ++this.hubSeq;
    }
    buildErrorPacket(code, msg, fatal) {
        return (0, mesh_protocol_1.buildPacket)('ERROR', this.hubDeviceId, 'all', 0, { code, message: msg, fatal });
    }
    handleDisconnect(device) {
        if (device.deviceId) {
            this.nodes.delete(device.deviceId);
            this.broadcastStatus(device.deviceId, false);
            this.store.setDeviceOnline(device.deviceId, false);
            console.info(`[HubServer] Device offline: ${device.deviceId}`);
        }
    }
    async handleBridgePacket(packet) {
        try {
            const envelope = JSON.parse(packet.payload);
            const innerPayload = await this.crypto.decrypt(envelope, packet.from);
            // Route using the same logic as TCP nodes
            // We pass a partial device object since routeMessage doesn't currently use the socket
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await this.routeMessage({ deviceId: packet.from }, packet, innerPayload);
        }
        catch (err) {
            console.error(`[HubServer] Bridge decryption failed from ${packet.from}:`, err);
        }
    }
    broadcastStatus(deviceId, online) {
        const event = online ? 'device-online' : 'device-offline';
        const data = online
            ? { device: this.nodes.get(deviceId)?.identity }
            : { deviceId, lastSeen: Date.now() };
        sse_registry_1.sseRegistry.broadcast({ event: event, data });
        sse_registry_1.telemetryRegistry.broadcast({ event: event, data });
    }
    /**
     * Returns a list of all currently connected node identities.
     */
    getConnectedDevices() {
        return Array.from(this.nodes.values()).map(n => n.identity);
    }
    get uptime() {
        return Date.now() - this.startTime;
    }
    get connectedDeviceCount() {
        return this.nodes.size;
    }
    /**
     * KICK: Terminate a node's connection and remove it from the registry.
     */
    kickDevice(deviceId) {
        const node = this.nodes.get(deviceId);
        if (node) {
            node.socket.destroy();
            this.nodes.delete(deviceId);
        }
        this.store.removeDevice(deviceId);
        this.broadcastStatus(deviceId, false);
        console.info(`[HubServer] Device kicked: ${deviceId}`);
    }
    /**
     * SEND ENCRYPTED: Sends a high-security encrypted payload to a specific node.
     */
    async sendEncrypted(deviceId, type, payload) {
        const node = this.nodes.get(deviceId);
        // 1. Build the base packet for storage/bridge
        const packet = (0, mesh_protocol_1.buildPacket)(type, this.hubDeviceId, deviceId, this.nextSeq(), payload);
        // 2. If node is connected via TCP, encrypt with session key and send
        if (node && node.state === 'ESTABLISHED') {
            try {
                const envelope = await this.crypto.encrypt(payload, deviceId);
                const encryptedPacket = (0, mesh_protocol_1.buildPacket)(type, this.hubDeviceId, deviceId, packet.seq, envelope);
                this.sendRawSocket(node.socket, encryptedPacket);
                return;
            }
            catch (err) {
                console.error(`[HubServer] Session encryption failed for ${deviceId}:`, err);
                throw err;
            }
        }
        // 3. If node is offline or on bridge, let the bridge handle encryption
        this.emit('send-to-bridge', deviceId, packet);
    }
}
exports.HubNodeServer = HubNodeServer;
const getHubServer = () => HubNodeServer.getInstance();
exports.getHubServer = getHubServer;

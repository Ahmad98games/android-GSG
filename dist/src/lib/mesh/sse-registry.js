"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRegistry = exports.telemetryRegistry = exports.sseRegistry = void 0;
/**
 * Gold She Mesh — SSE (Server-Sent Events) Registry
 *
 * Bridges the WebSocket Hub events to the PC browser UI.
 * The hub emits 'incoming-message' events via EventEmitter;
 * this registry pushes those events to all connected SSE clients
 * (i.e. the /messenger page in the browser).
 *
 * Flow:
 *   Mobile → WebSocket → Hub (node-server.ts)
 *     ↓ emit('incoming-message')
 *   SSE Registry → push to all ReadableStream controllers
 *     ↓
 *   Browser EventSource (/api/ecosystem/mesh/stream)
 */
const resource_guard_1 = require("./resource-guard");
// ─────────────────────────────────────────────────────────────
class SSERegistryImpl {
    controllers = new Set();
    encoder = new TextEncoder();
    name;
    constructor(name = 'Generic') {
        this.name = name;
    }
    /**
     * Register a new SSE client controller.
     */
    register(controller) {
        this.controllers.add(controller);
        console.info(`[SSE:${this.name}] Client connected — ${this.controllers.size} active`);
    }
    /**
     * Remove a disconnected SSE client controller.
     */
    unregister(controller) {
        this.controllers.delete(controller);
        console.info(`[SSE:${this.name}] Client disconnected — ${this.controllers.size} active`);
    }
    /**
     * Broadcast an SSE event to all connected browser clients.
     * HIGH-CAPACITY SCALING: If system is stressed (CPU > 90%), non-critical
     * "Live Logs" are dropped to prioritize data integrity and sync processing.
     */
    broadcast(event) {
        if (this.controllers.size === 0)
            return;
        // Resource Guardrail: Drop noisy telemetry if CPU is red-lining
        if (resource_guard_1.ResourceGuard.isStressed()) {
            const dropList = ['telemetry', 'ai-telemetry', 'ai-detection'];
            if (dropList.includes(event.event)) {
                return; // Drop packet to save hub cycles
            }
        }
        const payload = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
        const bytes = this.encoder.encode(payload);
        for (const controller of this.controllers) {
            try {
                controller.enqueue(bytes);
            }
            catch {
                this.controllers.delete(controller);
            }
        }
    }
    /** Send a heartbeat comment */
    heartbeat() {
        if (this.controllers.size === 0)
            return;
        const bytes = this.encoder.encode(': heartbeat\n\n');
        for (const controller of this.controllers) {
            try {
                controller.enqueue(bytes);
            }
            catch {
                this.controllers.delete(controller);
            }
        }
    }
    get clientCount() {
        return this.controllers.size;
    }
}
// ─────────────────────────────────────────────────────────────
class SystemHealthRegistry {
    lastPythonHeartbeat = 0;
    TIMEOUT_MS = 15_000;
    updateHeartbeat() {
        this.lastPythonHeartbeat = Date.now();
    }
    isSystemAlive() {
        return (Date.now() - this.lastPythonHeartbeat) < this.TIMEOUT_MS;
    }
    get healthStatus() {
        return {
            pythonEngine: this.isSystemAlive() ? 'ONLINE' : 'OFFLINE',
            lastSeen: this.lastPythonHeartbeat
        };
    }
}
// ─────────────────────────────────────────────────────────────
// Singletons
// ─────────────────────────────────────────────────────────────
/** Primary registry for Messenger / Presence */
exports.sseRegistry = new SSERegistryImpl('Messenger');
/** Dedicated high-frequency registry for AI Telemetry (Pillar 3) */
exports.telemetryRegistry = new SSERegistryImpl('Telemetry');
/** Health monitoring for edge nodes */
exports.healthRegistry = new SystemHealthRegistry();
// Heartbeats
setInterval(() => {
    exports.sseRegistry.heartbeat();
    exports.telemetryRegistry.heartbeat();
    // Broadcast health status to UI
    exports.sseRegistry.broadcast({
        event: 'hub-status',
        data: exports.healthRegistry.healthStatus
    });
}, 5_000); // 5s health broadcast

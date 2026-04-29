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
import { ResourceGuard } from './resource-guard';

// ─────────────────────────────────────────────────────────────

export interface SSEEvent {
  /** Event type — matches what the browser EventSource listens for */
  event: 
    | 'message' 
    | 'device-online' 
    | 'device-offline' 
    | 'hub-status' 
    | 'pairing-complete' 
    | 'stock-delta' 
    | 'khata-entry' 
    | 'telemetry' 
    | 'ai-telemetry'
    | 'ai-detection'
    | 'hardware-alert';
  /** JSON-serializable data payload */
  data: unknown;
}

// ─────────────────────────────────────────────────────────────

class SSERegistryImpl {
  private controllers = new Set<ReadableStreamDefaultController<Uint8Array>>();
  private encoder = new TextEncoder();
  private name: string;

  constructor(name = 'Generic') {
    this.name = name;
  }

  /**
   * Register a new SSE client controller.
   */
  register(controller: ReadableStreamDefaultController<Uint8Array>): void {
    this.controllers.add(controller);
    console.info(`[SSE:${this.name}] Client connected — ${this.controllers.size} active`);
  }

  /**
   * Remove a disconnected SSE client controller.
   */
  unregister(controller: ReadableStreamDefaultController<Uint8Array>): void {
    this.controllers.delete(controller);
    console.info(`[SSE:${this.name}] Client disconnected — ${this.controllers.size} active`);
  }

  /**
   * Broadcast an SSE event to all connected browser clients.
   * HIGH-CAPACITY SCALING: If system is stressed (CPU > 90%), non-critical 
   * "Live Logs" are dropped to prioritize data integrity and sync processing.
   */
  broadcast(event: SSEEvent): void {
    if (this.controllers.size === 0) return;

    // Resource Guardrail: Drop noisy telemetry if CPU is red-lining
    if (ResourceGuard.isStressed()) {
      const dropList: SSEEvent['event'][] = ['telemetry', 'ai-telemetry', 'ai-detection'];
      if (dropList.includes(event.event)) {
        return; // Drop packet to save hub cycles
      }
    }

    const payload = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
    const bytes = this.encoder.encode(payload);

    for (const controller of this.controllers) {
      try {
        controller.enqueue(bytes);
      } catch {
        this.controllers.delete(controller);
      }
    }
  }

  /** Send a heartbeat comment */
  heartbeat(): void {
    if (this.controllers.size === 0) return;
    const bytes = this.encoder.encode(': heartbeat\n\n');
    for (const controller of this.controllers) {
      try {
        controller.enqueue(bytes);
      } catch {
        this.controllers.delete(controller);
      }
    }
  }

  get clientCount(): number {
    return this.controllers.size;
  }
}

// ─────────────────────────────────────────────────────────────

class SystemHealthRegistry {
  private lastPythonHeartbeat = 0;
  private readonly TIMEOUT_MS = 15_000;

  updateHeartbeat(): void {
    this.lastPythonHeartbeat = Date.now();
  }

  isSystemAlive(): boolean {
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
export const sseRegistry = new SSERegistryImpl('Messenger');

/** Dedicated high-frequency registry for AI Telemetry (Pillar 3) */
export const telemetryRegistry = new SSERegistryImpl('Telemetry');

/** Health monitoring for edge nodes */
export const healthRegistry = new SystemHealthRegistry();

// Heartbeats
setInterval(() => {
  sseRegistry.heartbeat();
  telemetryRegistry.heartbeat();
  
  // Broadcast health status to UI
  sseRegistry.broadcast({
    event: 'hub-status',
    data: healthRegistry.healthStatus
  });
}, 5_000); // 5s health broadcast

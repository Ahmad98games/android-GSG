'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Gold She Mesh — SSE Stream Hook
 *
 * Connects to /api/ecosystem/mesh/stream using the native EventSource API.
 * Listens for device-online, device-offline, stock-delta, and message events.
 * Includes automatic reconnection with exponential backoff on stream drop.
 *
 * Usage:
 *   const { deviceStatuses, stockDeltas, isConnected } = useMeshStream();
 */

// ─── Types ────────────────────────────────────────────────────

export type DeviceStatus = 'online' | 'offline' | 'unknown';

export interface DeviceEvent {
  deviceId: string;
  deviceName: string;
  deviceType?: string;
  ts: number;
}

export interface StockDeltaEvent {
  id: string;
  status: 'APPLIED' | 'DUPLICATE' | 'REJECTED';
  deltaId?: string;
  action?: 'ADD' | 'SUBTRACT';
  amount?: number;
  previousValue?: number;
  newValue?: number;
  from: string;
  fromName: string;
  ts: number;
  batchId?: string;
}

export interface MeshStreamState {
  /** Map of deviceId → current status */
  deviceStatuses: Record<string, { status: DeviceStatus; name: string; lastSeen: number }>;
  /** Rolling list of recent stock delta events (newest first, max 20) */
  stockDeltas: StockDeltaEvent[];
  /** Whether the SSE connection is currently active */
  isConnected: boolean;
  /** Number of reconnect attempts since last successful connection */
  reconnectAttempts: number;
  /** AI Inference data */
  aiTelemetry: { deviceId: string; fps: number; ts: number }[];
  /** System vitals */
  systemTelemetry: { deviceId: string; battery: number; signal: number; ts: number }[];
  /** HIGH-CAPACITY SCALING: Stress state */
  isStressed: boolean;
  /** HIGH-CAPACITY SCALING: Last hardware alert */
  lastAlert: { type: string; message: string; ts: number } | null;
}

// ─── Constants ────────────────────────────────────────────────

const SSE_URL = '/api/ecosystem/mesh/stream';
const MAX_RECONNECT_DELAY_MS = 30_000;
const BACKOFF_BASE_MS = 1_000;
const MAX_STOCK_DELTAS = 20;

// ─── Hook ─────────────────────────────────────────────────────

export function useMeshStream(): MeshStreamState {
  const [deviceStatuses, setDeviceStatuses] = useState<
    Record<string, { status: DeviceStatus; name: string; lastSeen: number }>
  >({});
  const [stockDeltas, setStockDeltas] = useState<StockDeltaEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [aiTelemetry, setAiTelemetry] = useState<{ deviceId: string; fps: number; ts: number }[]>([]);
  const [systemTelemetry, setSystemTelemetry] = useState<{ deviceId: string; battery: number; signal: number; ts: number }[]>([]);
  const [isStressed, setIsStressed] = useState(false);
  const [lastAlert, setLastAlert] = useState<{ type: string; message: string; ts: number } | null>(null);

  // HIGH-CAPACITY SCALING: Internal buffers for UI throttling (500ms window)
  const buffers = useRef({
    deltas: [] as StockDeltaEvent[],
    ai: [] as { deviceId: string; fps: number; ts: number }[],
    system: [] as { deviceId: string; battery: number; signal: number; ts: number }[]
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // ── Reconnect with exponential backoff ──────────────────────
  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;

    setReconnectAttempts((prev) => {
      const attempt = prev + 1;
      const delay = Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt - 1), MAX_RECONNECT_DELAY_MS);
      console.info(`[useMeshStream] Reconnecting in ${delay}ms (attempt ${attempt})`);

      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);

      return attempt;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Connect to SSE stream ──────────────────────────────────
  const connect = useCallback(() => {
    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource(SSE_URL);
    eventSourceRef.current = es;

    // ─ Connection opened ─────────────────────────────────────
    es.onopen = () => {
      if (!mountedRef.current) return;
      console.info('[useMeshStream] ✓ SSE stream connected');
      setIsConnected(true);
      setReconnectAttempts(0);
    };

    // ─ Connection error — schedule reconnect ─────────────────
    es.onerror = () => {
      if (!mountedRef.current) return;
      console.warn('[useMeshStream] ✗ SSE stream error — scheduling reconnect');
      setIsConnected(false);
      es.close();
      eventSourceRef.current = null;
      scheduleReconnect();
    };

    // ─ Event: device-online ──────────────────────────────────
    es.addEventListener('device-online', (e) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(e.data) as DeviceEvent;
        setDeviceStatuses((prev) => ({
          ...prev,
          [data.deviceId]: {
            status: 'online',
            name: data.deviceName,
            lastSeen: data.ts,
          },
        }));
      } catch (err) {
        console.error('[useMeshStream] Failed to parse device-online:', err);
      }
    });

    // ─ Event: device-offline ─────────────────────────────────
    es.addEventListener('device-offline', (e) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(e.data) as DeviceEvent;
        setDeviceStatuses((prev) => ({
          ...prev,
          [data.deviceId]: {
            status: 'offline',
            name: data.deviceName || prev[data.deviceId]?.name || 'Unknown',
            lastSeen: data.ts,
          },
        }));
      } catch (err) {
        console.error('[useMeshStream] Failed to parse device-offline:', err);
      }
    });

    // ─ Event: stock-delta ────────────────────────────────────
    es.addEventListener('stock-delta', (e) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(e.data) as StockDeltaEvent;
        const event: StockDeltaEvent = {
          ...data,
          id: data.deltaId || `delta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        };
        // Buffer instead of immediate setState
        buffers.current.deltas.unshift(event);
      } catch {
        console.error('[useMeshStream] Failed to parse stock-delta');
      }
    });

    // ─ Event: hub-status (connection confirmation) ───────────
    es.addEventListener('hub-status', () => {
      if (!mountedRef.current) return;
      setIsConnected(true);
    });

    // ─ Event: ai-telemetry ───────────────────────────────────
    es.addEventListener('ai-telemetry', (e) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        buffers.current.ai.unshift({ deviceId: data.deviceId, fps: data.fps, ts: data.ts });
      } catch {
        console.error('[useMeshStream] Failed to parse ai-telemetry');
      }
    });

    // ─ Event: telemetry-beat ─────────────────────────────────
    es.addEventListener('telemetry-beat', (e) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        buffers.current.system.unshift({ deviceId: data.deviceId, battery: data.battery, signal: data.signalStrength, ts: data.ts });
      } catch {
        console.error('[useMeshStream] Failed to parse telemetry-beat');
      }
    });

    // ─ Event: hardware-alert ─────────────────────────────────
    es.addEventListener('hardware-alert', (e) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'SYSTEM_STRESS') setIsStressed(true);
        setLastAlert(data);
        // Alert recovery logic
        setTimeout(() => setIsStressed(false), 30000); // 30s timeout for stress warning
      } catch {
        console.error('[useMeshStream] Failed to parse hardware-alert');
      }
    });
  }, [scheduleReconnect]);

  // ── Lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    connect();

    // HIGH-CAPACITY SCALING: UI Throttle Flush (500ms)
    const flushInterval = setInterval(() => {
      if (!mountedRef.current) return;
      
      const { deltas, ai, system } = buffers.current;
      
      if (deltas.length > 0) {
        setStockDeltas(prev => [...deltas, ...prev].slice(0, MAX_STOCK_DELTAS));
        buffers.current.deltas = [];
      }
      
      if (ai.length > 0) {
        setAiTelemetry(prev => [...ai, ...prev].slice(0, 50));
        buffers.current.ai = [];
      }
      
      if (system.length > 0) {
        setSystemTelemetry(prev => [...system, ...prev].slice(0, 50));
        buffers.current.system = [];
      }
    }, 500);

    return () => {
      mountedRef.current = false;
      clearInterval(flushInterval);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return { 
    deviceStatuses, 
    stockDeltas, 
    isConnected, 
    reconnectAttempts, 
    aiTelemetry, 
    systemTelemetry,
    isStressed,
    lastAlert
  };
}

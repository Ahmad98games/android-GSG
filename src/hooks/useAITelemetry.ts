'use client';

/**
 * useAITelemetry — Pillar 3 Hook
 * 
 * High-performance hook for real-time AI telemetry streams.
 * Features:
 *  - EventSource lifecycle management
 *  - High-frequency event throttling (max 10fps state updates)
 *  - Device-indexed state mapping
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import type { AITelemetryPayload, TelemetryBeatPayload } from '@/lib/Shared/mesh-protocol';

export interface TelemetryState {
  ai: Record<string, AITelemetryPayload>;
  sensor: Record<string, TelemetryBeatPayload>;
  lastUpdate: number;
}

export function useAITelemetry() {
  const [data, setData] = useState<TelemetryState>({
    ai: {},
    sensor: {},
    lastUpdate: 0,
  });

  // Mutable refs for high-frequency updates
  const aiRef = useRef<Record<string, AITelemetryPayload>>({});
  const sensorRef = useRef<Record<string, TelemetryBeatPayload>>({});
  const throttleTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Syncs the mutable refs to React state.
   * Throttled to prevent dashboard "stutter" during high FPS AI streams.
   */
  const syncState = useCallback(() => {
    if (throttleTimer.current) return;

    throttleTimer.current = setTimeout(() => {
      setData({
        ai: { ...aiRef.current },
        sensor: { ...sensorRef.current },
        lastUpdate: Date.now(),
      });
      throttleTimer.current = null;
    }, 100); // 10 FPS cap for UI re-renders
  }, []);

  useEffect(() => {
    console.info('[TelemetryHook] Opening AI Stream...');
    const es = new EventSource('/api/telemetry/stream');

    es.addEventListener('ai-telemetry', (e) => {
      try {
        const payload = JSON.parse(e.data) as AITelemetryPayload;
        aiRef.current[payload.deviceId] = payload;
        syncState();
      } catch (err) {
        console.error('[TelemetryHook] AI Parse Error:', err);
      }
    });

    es.addEventListener('telemetry', (e) => {
      try {
        const payload = JSON.parse(e.data) as TelemetryBeatPayload;
        sensorRef.current[payload.deviceId] = payload;
        syncState();
      } catch (err) {
        console.error('[TelemetryHook] Sensor Parse Error:', err);
      }
    });

    es.onerror = (err) => {
      console.error('[TelemetryHook] SSE Error:', err);
      // EventSource automatically reconnects, but we log it
    };

    // PRUNING: Remove devices that haven't sent data in 10s to prevent memory leaks
    const pruneInterval = setInterval(() => {
      const now = Date.now();
      let changed = false;

      // Prune AI nodes
      for (const id in aiRef.current) {
        if (now - aiRef.current[id].ts > 10000) {
          delete aiRef.current[id];
          changed = true;
        }
      }

      // Prune Sensor nodes
      for (const id in sensorRef.current) {
        if (now - sensorRef.current[id].ts > 10000) {
          delete sensorRef.current[id];
          changed = true;
        }
      }

      if (changed) syncState();
    }, 5000);

    return () => {
      console.info('[TelemetryHook] Closing AI Stream & Cleaning Refs');
      es.close();
      clearInterval(pruneInterval);
      if (throttleTimer.current) clearTimeout(throttleTimer.current);
      
      // Zero-Leak: Explicitly clear large objects from memory
      aiRef.current = {};
      sensorRef.current = {};
    };
  }, [syncState]);

  return data;
}

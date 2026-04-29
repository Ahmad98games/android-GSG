'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * PRODUCTION-GRADE MESH ORCHESTRATOR
 * Main telemetry and event stream hook for the Industrial ERP Dashboard.
 */

export interface Telemetry {
  deviceId: string;
  battery: number;
  signal: number;
  status: 'online' | 'offline';
  ts: number;
}

export interface KhataEntry {
  id: string;
  workerName: string;
  amount: number;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  ts: number;
}

export interface LiveLog {
  id: string;
  type: 'STOCK_DELTA' | 'KHATA_PENDING' | 'SYSTEM';
  message: string;
  ts: number;
}

export function useMeshOrchestrator() {
  const [telemetry, setTelemetry] = useState<Record<string, Telemetry>>({});
  const [logs, setLogs] = useState<LiveLog[]>([]);
  const [approvals, setApprovals] = useState<KhataEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  const addLog = useCallback((type: LiveLog['type'], message: string) => {
    const newLog: LiveLog = {
      id: Math.random().toString(36).slice(2),
      type,
      message,
      ts: Date.now()
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  }, []);

  const connect = useCallback(() => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    
    const es = new EventSource('/api/ecosystem/mesh/stream');
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);
    es.onerror = () => {
      setIsConnected(false);
      setTimeout(connect, 5000);
    };

    es.addEventListener('telemetry', (e) => {
      const data = JSON.parse(e.data) as Telemetry;
      setTelemetry(prev => ({ ...prev, [data.deviceId]: data }));
    });

    es.addEventListener('khata-entry', (e) => {
      const data = JSON.parse(e.data) as KhataEntry;
      setApprovals(prev => [data, ...prev]);
      addLog('KHATA_PENDING', `New entry from ${data.workerName}: ${data.amount}`);
    });

    es.addEventListener('stock-delta', (e) => {
      const data = JSON.parse(e.data);
      addLog('STOCK_DELTA', `Stock updated by ${data.fromName}: ${data.action} ${data.amount}`);
    });

    return () => es.close();
  }, [addLog]);

  useEffect(() => {
    connect();
    return () => eventSourceRef.current?.close();
  }, [connect]);

  const approveKhata = (id: string) => {
    setApprovals(prev => prev.filter(a => a.id !== id));
    addLog('SYSTEM', `Khata ${id} approved manually.`);
  };

  const rejectKhata = (id: string) => {
    setApprovals(prev => prev.filter(a => a.id !== id));
    addLog('SYSTEM', `Khata ${id} rejected manually.`);
  };

  return { telemetry, logs, approvals, isConnected, approveKhata, rejectKhata };
}

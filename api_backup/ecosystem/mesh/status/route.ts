/**
 * GET /api/ecosystem/mesh/status
 *
 * Returns comprehensive hub metrics and health status:
 *   - Hub identity and uptime
 *   - Connected/registered device counts
 *   - Total messages and file transfers stored
 *   - SSE client count
 *   - Memory usage
 *   - Active pairing code status
 *
 * Used by the PC Messenger UI for the hub health dashboard.
 */

import { NextResponse } from 'next/server';
import { getHubServer } from '@/lib/mesh/node-server';
import { sseRegistry } from '@/lib/mesh/sse-registry';
import { DeviceIdentity } from '@/lib/Shared/mesh-protocol';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const hub = getHubServer();
    const devices = hub.getConnectedDevices();
    const allDevices = hub.store.getAllDevices();
    const mem = process.memoryUsage();

    return NextResponse.json({
      status: 'running',
      hubDeviceId: hub.hubDeviceId,
      uptime: hub.uptime,
      uptimeFormatted: formatUptime(hub.uptime),
      connectedCount: hub.connectedDeviceCount,
      registeredCount: allDevices.length,
      totalMessages: hub.store.getMessageCount(),
      totalFileTransfers: hub.store.getFileTransferCount(),
      sseClients: sseRegistry.clientCount,
      hasPairingCode: hub.pairing.hasActiveCode(),
      memoryUsageMB: Math.round(mem.heapUsed / 1024 / 1024),
      connectedDevices: devices.map((d: DeviceIdentity) => ({
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        deviceType: d.deviceType,
        lastSeen: d.lastSeen,
        isOnline: d.isOnline,
      })),
      allRegisteredDevices: allDevices.map((d: DeviceIdentity) => ({
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        deviceType: d.deviceType,
        registeredAt: d.registeredAt,
        lastSeen: d.lastSeen,
        isOnline: d.isOnline,
      })),
      ts: Date.now(),
    });

  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      {
        status: 'error',
        message: err.message || 'Hub not available',
        ts: Date.now(),
      },
      { status: 503 }
    );
  }
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// Enable CORS for potential mobile/admin panel requests
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

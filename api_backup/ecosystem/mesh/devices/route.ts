/**
 * /api/ecosystem/mesh/devices
 *
 * GET  — list all registered devices with online status
 * DELETE — kick and deregister a device
 *
 * Used by the messenger UI for the device panel and admin operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHubServer } from '@/lib/mesh/node-server';
import { DeviceIdentity } from '@/lib/Shared/mesh-protocol';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const hub = getHubServer();
    const allDevices = hub.store.getAllDevices();
    const connectedIds = new Set(hub.getConnectedDevices().map((d: DeviceIdentity) => d.deviceId));

    const devices = allDevices.map((d: DeviceIdentity) => ({
      ...d,
      isOnline: connectedIds.has(d.deviceId),
    }));

    return NextResponse.json({
      devices,
      count: devices.length,
      connectedCount: connectedIds.size,
      hubDeviceId: hub.hubDeviceId,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId query param required' },
        { status: 400 }
      );
    }

    const hub = getHubServer();

    if (deviceId === hub.hubDeviceId) {

      return NextResponse.json(
        { error: 'Cannot kick the hub itself' },
        { status: 403 }
      );
    }

    hub.kickDevice(deviceId);

    return NextResponse.json({
      success: true,
      message: `Device ${deviceId} kicked and deregistered`,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || 'Failed to kick device' },
      { status: 500 }
    );
  }
}

// Enable CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

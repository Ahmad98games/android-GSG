/**
 * POST /api/ecosystem/mesh/pairing/generate
 *
 * Generates a new single-use pairing code for a mobile device to join the mesh.
 * Returns:
 *   - 8-char alphanumeric code (e.g. "ABCD1234")
 *   - Human-readable display string (e.g. "GSG-ABCD-1234")
 *   - QR payload (base64-encoded JSON with hub IP, port, code)
 *   - Expiry timestamp (5 minutes from now)
 *   - Hub LAN IP (for manual entry on mobile)
 *
 * The mobile device either scans the QR or manually types the code,
 * then connects to ws://{hubIp}:{hubPort}/mesh and sends PAIRING_VALIDATE.
 */

import { NextResponse } from 'next/server';
import { getHubServer } from '@/lib/mesh/node-server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const hub = getHubServer();
    const result = hub.pairing.generateCode();

    return NextResponse.json({
      success: true,
      code: result.code,
      displayString: result.displayString,
      qrPayload: result.qrPayload,
      expiresAt: result.expiresAt,
      hubIp: result.hubIp,
      expiresInSeconds: Math.floor((result.expiresAt - Date.now()) / 1000),
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate pairing code' },
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * POST /api/ecosystem/mesh/config
 * 
 * Pillar 6: Mesh Configuration (Secured)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHubServer } from '@/lib/mesh/node-server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { systemSecret } = data;

    if (!systemSecret) {
      return NextResponse.json({ error: 'SECRET_REQUIRED' }, { status: 400 });
    }

    const hub = getHubServer();
    hub.store.saveSystemSecret(systemSecret);

    return NextResponse.json({ success: true, message: 'MESH_KEY_DEPLOYED' });
  } catch (err) {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

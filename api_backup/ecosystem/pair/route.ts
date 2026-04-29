import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getLocalIp } from '@/lib/network';

export async function POST(req: Request) {
  try {
    const { code, device_name, device_fingerprint, public_key_pem } = await req.json();

    if (!code || !device_name || !device_fingerprint || !public_key_pem) {
      return NextResponse.json({ error: 'MISSING_REQUIRED_FIELDS' }, { status: 400 });
    }

    // 1. Validate Code
    const { data: token, error: tokenErr } = await supabaseAdmin
      .from('node_pairing_tokens')
      .select('*')
      .eq('code', code)
      .eq('claimed', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenErr || !token) {
      return NextResponse.json({ error: 'INVALID_OR_EXPIRED_CODE' }, { status: 401 });
    }

    // 2. Enforce 10-node Limit
    const { count } = await supabaseAdmin
      .from('node_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (count !== null && count >= 10) {
      return NextResponse.json({ error: 'MAX_DEVICES_REACHED' }, { status: 403 });
    }

    // 3. Atomic Claim (Optimistic check via update filtering)
    const { data: updatedToken, error: claimErr } = await supabaseAdmin
      .from('node_pairing_tokens')
      .update({ claimed: true, device_fingerprint, claimed_at: new Date().toISOString() })
      .eq('code', code)
      .eq('claimed', false)
      .select()
      .single();

    if (claimErr || !updatedToken) {
      return NextResponse.json({ error: 'CODE_ALREADY_CLAIMED' }, { status: 409 });
    }

    // 4. Register Device
    const { data: node, error: nodeErr } = await supabaseAdmin
      .from('node_registrations')
      .upsert({
        node_slot: token.node_slot,
        device_name,
        device_fingerprint,
        role: token.role,
        public_key_pem,
        is_active: true,
        linked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'node_slot' })
      .select()
      .single();

    if (nodeErr) {
      return NextResponse.json({ error: 'REGISTRATION_FAILED', detail: nodeErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      node_id: node.id,
      node_slot: node.node_slot,
      role: node.role,
      local_pc_ip: getLocalIp()
    }, { status: 200 });

  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', detail: err.message || error }, { status: 500 });
  }
}

// Enable CORS for mobile app requests
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

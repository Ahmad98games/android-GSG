import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

// ─── CORS headers (allow same-origin + configured domains only) ───────────────
function getCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || '',
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);

  // Allow any origin that matches our configured app URL
  // Security is enforced by JWT validation below — not by origin restriction
  const isAllowed = allowedOrigins.includes(origin) || origin === '';

  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Node-ID, X-Device-Fingerprint',
    'Access-Control-Max-Age': '86400',
  };
}

// ─── JWT Authentication guard ─────────────────────────────────────────────────
async function validateRequest(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  // Check Authorization header (Bearer token from mobile nodes)
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) return { authenticated: true, user, supabase };
  }

  // Check session cookie (PC browser)
  const { data: { session }, error } = await supabase.auth.getSession();
  if (!error && session) return { authenticated: true, user: session.user, supabase };

  return { authenticated: false, user: null, supabase };
}

// ─── OPTIONS preflight ────────────────────────────────────────────────────────
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

// ─── POST /api/ecosystem/sync ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);

  // Security: validate JWT — no IP check needed, JWT is cryptographically secure
  const { authenticated, user, supabase } = await validateRequest(req);
  if (!authenticated || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Valid JWT required' }, { status: 401, headers: cors });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400, headers: cors }); }

  const { operation, records, node_id } = body as {
    operation: string;
    records: Array<{ id: string; updated_at: string; [key: string]: unknown }>;
    node_id?: string;
  };

  if (!operation || !Array.isArray(records)) {
    return NextResponse.json({ error: 'MISSING_FIELDS', message: 'operation and records[] required' }, { status: 400, headers: cors });
  }

  // ─── OPERATION: SYNC_MESSAGES ───────────────────────────────────────────────
  if (operation === 'SYNC_MESSAGES') {
    const results = { accepted: [] as string[], rejected: [] as { id: string; reason: string; current: unknown }[] };

    for (const incoming of records) {
      if (!incoming.id || !incoming.updated_at) {
        results.rejected.push({ id: incoming.id || 'unknown', reason: 'MISSING_ID_OR_TIMESTAMP', current: null });
        continue;
      }

      // LWW: fetch current record from DB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('messenger_messages')
        .select('id, updated_at, deleted_at')
        .eq('id', incoming.id)
        .maybeSingle();

      if (existing) {
        const dbTime = new Date(existing.updated_at || 0).getTime();
        const incomingTime = new Date(incoming.updated_at).getTime();

        // Reject if incoming is older than what is in DB (Last-Write-Wins)
        if (incomingTime < dbTime) {
          results.rejected.push({ id: incoming.id, reason: 'STALE_UPDATE', current: existing });
          continue;
        }
      }

      // Accept: upsert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('messenger_messages')
        .upsert(incoming, { onConflict: 'id' });

      if (error) {
        results.rejected.push({ id: incoming.id, reason: 'DB_ERROR', current: error.message });
      } else {
        results.accepted.push(incoming.id);
      }
    }

    const hasConflicts = results.rejected.length > 0;
    return NextResponse.json(
      { accepted: results.accepted.length, rejected: results.rejected.length, conflicts: results.rejected },
      { status: hasConflicts ? 207 : 200, headers: cors } // 207 Multi-Status when partial success
    );
  }

  // ─── OPERATION: HEARTBEAT ───────────────────────────────────────────────────
  if (operation === 'HEARTBEAT') {
    const record = records[0];
    if (!record || !node_id) {
      return NextResponse.json({ error: 'MISSING_NODE_ID' }, { status: 400, headers: cors });
    }

    // LWW on heartbeat: only update if incoming is newer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('node_registrations')
      .select('updated_at')
      .eq('id', node_id)
      .maybeSingle();

    if (existing) {
      const dbTime = new Date(existing.updated_at || 0).getTime();
      const incomingTime = new Date(record.updated_at).getTime();
      if (incomingTime < dbTime) {
        return NextResponse.json({ error: 'STALE_HEARTBEAT', message: 'DB has newer record' }, { status: 409, headers: cors });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('node_registrations')
      .update({
        current_screen: record.current_screen,
        updated_at: record.updated_at || new Date().toISOString(),
      })
      .eq('id', node_id);

    if (error) {
      return NextResponse.json({ error: 'HEARTBEAT_FAILED', detail: error.message }, { status: 500, headers: cors });
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: cors });
  }

  return NextResponse.json({ error: 'UNKNOWN_OPERATION', message: 'operation not recognised: ' + operation }, { status: 400, headers: cors });
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { KhataEngine } from '@/lib/khata-engine';
import type { Database } from '@/types/supabase';

function getCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowed = [
    process.env.NEXT_PUBLIC_APP_URL || '',
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);
  const ok = allowed.includes(origin) || origin === '';
  return {
    'Access-Control-Allow-Origin': ok ? (origin || '*') : 'null',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

async function validateRequest(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) return { authenticated: true, user, supabase };
  }
  const { data: { session }, error } = await supabase.auth.getSession();
  if (!error && session) return { authenticated: true, user: session.user, supabase };
  return { authenticated: false, user: null, supabase };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkManagerRole(supabase: any, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', userId).single();
  return profile && ['SUPER_ADMIN', 'MANAGER'].includes(profile.role);
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

// GET /api/ecosystem/khata — Fetch all PENDING khata entries
export async function GET(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const { authenticated, user, supabase } = await validateRequest(req);
  if (!authenticated || !user)
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers: cors });

  if (!(await checkManagerRole(supabase, user.id)))
    return NextResponse.json({ error: 'PERMISSION_DENIED' }, { status: 403, headers: cors });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entries, error } = await (supabase as any)
      .from('khata_entries')
      .select('*, parties(id, name)')
      .eq('approval_status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500, headers: cors });
    return NextResponse.json({ entries: entries ?? [], count: entries?.length ?? 0, fetchedAt: new Date().toISOString() }, { status: 200, headers: cors });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    return NextResponse.json({ error: 'INTERNAL', message: msg }, { status: 500, headers: cors });
  }
}

// PUT /api/ecosystem/khata — Approve or Reject a pending entry
// Body: { entryId: string, action: 'APPROVE' | 'REJECT', reason?: string }
export async function PUT(req: NextRequest) {
  const cors = getCorsHeaders(req);
  const { authenticated, user, supabase } = await validateRequest(req);
  if (!authenticated || !user)
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401, headers: cors });
  if (!(await checkManagerRole(supabase, user.id)))
    return NextResponse.json({ error: 'PERMISSION_DENIED' }, { status: 403, headers: cors });

  let body: { entryId: string; action: 'APPROVE' | 'REJECT'; reason?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400, headers: cors }); }

  const { entryId, action, reason } = body;
  if (!entryId || !['APPROVE', 'REJECT'].includes(action))
    return NextResponse.json({ error: 'INVALID_PARAMS', message: 'entryId and action required' }, { status: 400, headers: cors });

  try {
    // 1. Fetch entry to confirm PENDING
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entry, error: fetchErr } = await (supabase as any)
      .from('khata_entries').select('*').eq('id', entryId).single();

    if (fetchErr || !entry)
      return NextResponse.json({ error: 'ENTRY_NOT_FOUND' }, { status: 404, headers: cors });
    if (entry.approval_status !== 'PENDING')
      return NextResponse.json({ error: 'ALREADY_PROCESSED', message: `Already ${entry.approval_status}` }, { status: 409, headers: cors });

    // 2. Update status
    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (supabase as any)
      .from('khata_entries')
      .update({
        approval_status: newStatus,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: action === 'REJECT' ? (reason || null) : null,
      })
      .eq('id', entryId);

    if (updateErr)
      return NextResponse.json({ error: 'UPDATE_FAILED', message: updateErr.message }, { status: 500, headers: cors });

    // 3. If APPROVED → recalculate party balance via KhataEngine
    let updatedBalance: string | null = null;
    if (action === 'APPROVE' && entry.party_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allEntries } = await (supabase as any)
        .from('khata_entries')
        .select('entry_type, amount')
        .eq('party_id', entry.party_id)
        .eq('approval_status', 'APPROVED')
        .order('created_at', { ascending: true });

      if (allEntries) {
        const balance = KhataEngine.calculateBalance(allEntries);
        updatedBalance = balance.toString();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('parties')
          .update({ balance: updatedBalance, balance_updated_at: new Date().toISOString() })
          .eq('id', entry.party_id);
      }
    }

    // 4. Audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      action: `KHATA_${action}`,
      table_name: 'khata_entries',
      record_id: entryId,
      new_value: { approval_status: newStatus, balance: updatedBalance },
      old_value: { approval_status: 'PENDING' },
    });

    return NextResponse.json(
      { success: true, entryId, action: newStatus, updatedBalance, message: `Khata entry ${newStatus.toLowerCase()} successfully` },
      { status: 200, headers: cors }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    return NextResponse.json({ error: 'INTERNAL', message: msg }, { status: 500, headers: cors });
  }
}

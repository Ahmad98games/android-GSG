'use server';

import { supabase } from '@/lib/supabase';
import { KhataEngine } from '@/lib/khata-engine';
import { revalidatePath } from 'next/cache';

/**
 * KHATA APPROVAL WORKFLOW — Server Actions
 *
 * These actions wrap the Khata approval API for use in Server Components.
 * Role guard: only SUPER_ADMIN or MANAGER can approve/reject.
 */

// ─── Fetch all PENDING khata entries ─────────────────────────────────────────

export async function fetchPendingKhataEntries() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'UNAUTHORIZED', entries: [] };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['SUPER_ADMIN', 'MANAGER'].includes(profile.role)) {
      return { success: false, error: 'PERMISSION_DENIED', entries: [] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entries, error } = await (supabase as any)
      .from('khata_entries')
      .select('*, parties(id, name)')
      .eq('approval_status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message, entries: [] };
    return { success: true, entries: entries ?? [], count: entries?.length ?? 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error('❌ FETCH_PENDING_KHATA:', msg);
    return { success: false, error: msg, entries: [] };
  }
}

// ─── Approve a single khata entry ────────────────────────────────────────────

export async function approveKhataEntry(entryId: string, confirmText: string) {
  try {
    // Multi-factor confirmation
    if (confirmText !== 'CONFIRM') {
      return { success: false, error: 'Type CONFIRM to proceed' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'UNAUTHORIZED' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['SUPER_ADMIN', 'MANAGER'].includes(profile.role)) {
      return { success: false, error: 'PERMISSION_DENIED: Manager role required' };
    }

    // Fetch entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: entry, error: fetchErr } = await (supabase as any)
      .from('khata_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (fetchErr || !entry) return { success: false, error: 'ENTRY_NOT_FOUND' };
    if (entry.approval_status !== 'PENDING') {
      return { success: false, error: `Already ${entry.approval_status}` };
    }

    // Update status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (supabase as any)
      .from('khata_entries')
      .update({
        approval_status: 'APPROVED',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', entryId);

    if (updateErr) return { success: false, error: updateErr.message };

    // Recalculate party balance
    let updatedBalance: string | null = null;
    if (entry.party_id) {
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

    // Audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      action: 'KHATA_APPROVE',
      table_name: 'khata_entries',
      record_id: entryId,
      new_value: { approval_status: 'APPROVED', balance: updatedBalance },
      old_value: { approval_status: 'PENDING' },
    });

    revalidatePath('/dashboard/khata');
    revalidatePath('/dashboard');

    return { success: true, message: 'Khata entry approved', updatedBalance };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error('❌ KHATA_APPROVE_FAILURE:', msg);
    return { success: false, error: msg };
  }
}

// ─── Reject a single khata entry ─────────────────────────────────────────────

export async function rejectKhataEntry(entryId: string, reason: string) {
  try {
    if (!reason || reason.trim().length < 3) {
      return { success: false, error: 'A rejection reason is required (min 3 chars)' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'UNAUTHORIZED' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['SUPER_ADMIN', 'MANAGER'].includes(profile.role)) {
      return { success: false, error: 'PERMISSION_DENIED: Manager role required' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (supabase as any)
      .from('khata_entries')
      .update({
        approval_status: 'REJECTED',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', entryId)
      .eq('approval_status', 'PENDING'); // Optimistic concurrency guard

    if (updateErr) return { success: false, error: updateErr.message };

    // Audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      action: 'KHATA_REJECT',
      table_name: 'khata_entries',
      record_id: entryId,
      new_value: { approval_status: 'REJECTED', reason },
      old_value: { approval_status: 'PENDING' },
    });

    revalidatePath('/dashboard/khata');

    return { success: true, message: 'Khata entry rejected' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error('❌ KHATA_REJECT_FAILURE:', msg);
    return { success: false, error: msg };
  }
}

'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

/**
 * SOVEREIGN AUDIT RESTORE PROTOCOL (v8.1.1)
 * Surgical restoration of records from JSONB snapshots.
 */

const ALLOWED_RESTORE_TABLES = ['articles', 'batches', 'parties', 'orders', 'khata_entries', 'job_orders', 'karigars'];

export async function restoreFromAuditLog(auditId: string, confirmText: string) {
  try {
    // 1. Multi-factor Confirmation
    if (confirmText !== 'CONFIRM') throw new Error('Type CONFIRM to proceed');

    // 2. Fetch Audit Record
    const { data: audit, error: auditError } = await supabase
      .from('audit_log')
      .select('*')
      .eq('id', auditId)
      .single();

    if (auditError || !audit) throw new Error('AUDIT_NOT_FOUND');
    if (!audit.old_value) throw new Error('NO_RESTORE_DATA_AVAILABLE');
    if (!ALLOWED_RESTORE_TABLES.includes(audit.table_name)) {
        throw new Error(`RESTORE_NOT_ALLOWED: Table ${audit.table_name} is protected.`);
    }

    // 3. Validate Role (Server-Side)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('UNAUTHORIZED');

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['SUPER_ADMIN', 'MANAGER'].includes(profile.role)) {
      throw new Error('PERMISSION_DENIED: Manager role required for RESTORE.');
    }

    // 4. Build Dynamic Update & Execute
    const { error: restoreError } = await supabase
      .from(audit.table_name)
      .update(audit.old_value)
      .eq('id', audit.record_id);

    if (restoreError) throw restoreError;

    // 5. Log the Restoration Action
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: 'RESTORE',
      table_name: audit.table_name,
      record_id: audit.record_id,
      new_value: audit.old_value,
      old_value: null
    });

    // 6. Revalidate Cache
    revalidatePath(`/dashboard/${audit.table_name}`);
    revalidatePath('/dashboard/audit');
    
    return { 
      success: true, 
      message: `Record in ${audit.table_name} restored successfully.`
    };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_EXCEPTION';
    console.error('❌ AUDIT_RESTORE_FAILURE:', message);
    return { success: false, error: message };
  }
}

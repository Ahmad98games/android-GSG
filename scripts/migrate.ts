#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import Decimal from 'decimal.js';
import * as dotenv from 'dotenv';
import QRCode from 'qrcode';

dotenv.config();

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ROLLBACK = args.includes('--rollback');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ FATAL: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Helpers ────────────────────────────────────────────
function log(msg: string) { console.log(`  → ${msg}`); }
function heading(msg: string) { console.log(`\n━━━ ${msg} ━━━`); }

// ─── Main Migration ─────────────────────────────────────
async function migrate() {
  console.log(DRY_RUN ? '\n=== DRY RUN MODE ===' : '\n=== LIVE MIGRATION ===');
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Step 1: Snapshot current state
  heading('Step 1: Snapshot');
  const tables = ['articles', 'batches', 'parties', 'orders', 'order_items', 'khata_entries', 'job_orders', 'karigars'];
  if (!DRY_RUN) {
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        log(`⚠️  Could not snapshot '${table}': ${error.message}`);
        continue;
      }
      const { error: insertError } = await supabase.from('migration_snapshots').insert({
        table_name: table,
        snapshot_data: data,
        created_at: new Date().toISOString()
      });
      if (insertError) {
        log(`⚠️  Could not save snapshot for '${table}': ${insertError.message}`);
      } else {
        log(`✅ Snapshot saved: ${table} (${(data || []).length} rows)`);
      }
    }
  } else {
    log('Skipping snapshot in dry run mode.');
  }

  // Step 2: Validate schema — every required column exists
  heading('Step 2: Schema Validation');
  const requiredColumns: Record<string, string[]> = {
    articles: ['id', 'code', 'name', 'price_per_set', 'cost_per_set', 'overhead_pct', 'qr_code_url'],
    batches: ['id', 'code', 'article_id', 'suits_count', 'unit_cost', 'overhead_pct'],
    orders: ['id', 'code', 'party_id', 'status', 'total', 'amount_paid'],
    karigars: ['id', 'name', 'phone'],
    job_orders: ['id', 'code', 'article_id', 'karigar_id', 'gaz_issued', 'status'],
  };

  for (const [table, columns] of Object.entries(requiredColumns)) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      log(`❌ Table '${table}' does not exist or is inaccessible: ${error.message}`);
      continue;
    }
    if (data && data.length > 0) {
      const existingCols = Object.keys(data[0]);
      const missing = columns.filter(c => !existingCols.includes(c));
      if (missing.length > 0) {
        log(`⚠️  Table '${table}' missing columns: ${missing.join(', ')}`);
        if (DRY_RUN) {
          log(`   DRY RUN: Would add missing columns via ALTER TABLE`);
        }
      } else {
        log(`✅ Table '${table}': all ${columns.length} columns present`);
      }
    } else {
      log(`ℹ️  Table '${table}': empty — cannot validate columns from data, but table exists`);
    }
  }

  // Step 3: Backfill missing GS-ART codes
  heading('Step 3: Backfill Article Codes');
  const { data: articlesNeedingCodes } = await supabase
    .from('articles').select('id').is('code', null);
  const artCount = articlesNeedingCodes?.length || 0;
  log(`${artCount} articles need GS-ART codes.`);
  if (!DRY_RUN && articlesNeedingCodes) {
    // Get max existing code number
    const { data: existingArts } = await supabase.from('articles').select('code').not('code', 'is', null);
    let maxNum = 0;
    (existingArts || []).forEach(a => {
      const match = (a.code as string)?.match(/GS-ART-(\d+)/);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
    });
    for (let i = 0; i < articlesNeedingCodes.length; i++) {
      const code = 'GS-ART-' + String(maxNum + i + 1).padStart(4, '0');
      await supabase.from('articles').update({ code }).eq('id', articlesNeedingCodes[i].id);
      log(`  Assigned: ${code}`);
    }
  }

  // Step 4: Backfill missing GS-BCH codes
  heading('Step 4: Backfill Batch Codes');
  const { data: batchesNeedingCodes } = await supabase
    .from('batches').select('id').is('code', null);
  const bchCount = batchesNeedingCodes?.length || 0;
  log(`${bchCount} batches need GS-BCH codes.`);
  if (!DRY_RUN && batchesNeedingCodes) {
    const { data: existingBatches } = await supabase.from('batches').select('code').not('code', 'is', null);
    let maxNum = 0;
    (existingBatches || []).forEach(b => {
      const match = (b.code as string)?.match(/GS-BCH-(\d+)/);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
    });
    for (let i = 0; i < batchesNeedingCodes.length; i++) {
      const code = 'GS-BCH-' + String(maxNum + i + 1).padStart(4, '0');
      await supabase.from('batches').update({ code }).eq('id', batchesNeedingCodes[i].id);
      log(`  Assigned: ${code}`);
    }
  }

  // Step 5: Backfill missing JO codes
  heading('Step 5: Backfill Job Order Codes');
  const { data: jobsNeedingCodes } = await supabase
    .from('job_orders').select('id, created_at').is('code', null).order('created_at');
  const joCount = jobsNeedingCodes?.length || 0;
  log(`${joCount} job orders need JO codes.`);
  if (!DRY_RUN && jobsNeedingCodes) {
    const { data: existingJOs } = await supabase.from('job_orders').select('code').not('code', 'is', null);
    let maxNum = 0;
    (existingJOs || []).forEach(j => {
      const match = (j.code as string)?.match(/JO-(\d+)/);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
    });
    for (let i = 0; i < jobsNeedingCodes.length; i++) {
      const code = 'JO-' + String(maxNum + i + 1).padStart(5, '0');
      await supabase.from('job_orders').update({ code }).eq('id', jobsNeedingCodes[i].id);
      log(`  Assigned: ${code}`);
    }
  }

  // Step 6: Generate QR Codes
  heading('Step 6: QR Code Generation');
  const qrTables = [
    { table: 'articles', prefix: 'ART', bucket: 'industrial-assets' },
    { table: 'batches', prefix: 'BCH', bucket: 'industrial-assets' },
    { table: 'job_orders', prefix: 'JO', bucket: 'industrial-assets' }
  ];

  for (const { table, prefix, bucket } of qrTables) {
    const { data: items } = await supabase.from(table).select('id, code').is('qr_code_url', null).not('code', 'is', null);
    const count = items?.length || 0;
    log(`${count} ${table} need QR codes.`);
    
    if (!DRY_RUN && items) {
      for (const item of items) {
        try {
          const qrData = JSON.stringify({ type: prefix, id: item.id, code: item.code });
          const qrBuffer = await QRCode.toBuffer(qrData, { margin: 1, width: 400 });
          const fileName = `qr/${prefix}_${item.code}.png`;
          
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, qrBuffer, { contentType: 'image/png', upsert: true });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
          await supabase.from(table).update({ qr_code_url: publicUrl }).eq('id', item.id);
          log(`  Generated & Uploaded: ${item.code}`);
        } catch (err) {
          log(`  ❌ Failed QR for ${item.code}: ${(err as Error).message}`);
        }
      }
    }
  }

  // Step 7: Validate khata balance integrity
  heading('Step 7: Khata Balance Integrity');
  const { data: allParties } = await supabase.from('parties').select('id, name');
  let khataDiscrepancies = 0;
  for (const party of (allParties || [])) {
    const { data: entries } = await supabase
      .from('khata_entries')
      .select('amount, entry_type')
      .eq('party_id', party.id);

    if (!entries || entries.length === 0) continue;

    const balance = (entries).reduce((acc: Decimal, e: { amount: string; entry_type: string }) => {
      const amt = new Decimal(e.amount);
      return e.entry_type === 'CREDIT' ? acc.plus(amt) : acc.minus(amt);
    }, new Decimal(0));

    // Log any party with >= 10M balance as suspicious
    if (balance.abs().gte(10_000_000)) {
      log(`⚠️  ${party.name} (${party.id}): balance = ${balance.toFixed(2)} — unusually large`);
      khataDiscrepancies++;
    }
  }
  log(`Khata audit complete. ${khataDiscrepancies} suspicious balances flagged.`);

  // Step 8: Validate stock integrity
  heading('Step 8: Stock Integrity');
  const { data: allBatches } = await supabase
    .from('batches').select('id, code, suits_count');
  let stockMismatches = 0;
  for (const batch of (allBatches || [])) {
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('movement_type, quantity')
      .eq('batch_id', batch.id);

    if (!movements || movements.length === 0) continue;

    const netMovement = movements.reduce((acc: number, m: { movement_type: string; quantity: number }) => {
      return m.movement_type === 'IN' || m.movement_type === 'RETURN'
        ? acc + m.quantity
        : acc - m.quantity;
    }, 0);

    if (netMovement !== batch.suits_count) {
      log(`⚠️  Batch ${batch.code || batch.id}: recorded=${batch.suits_count}, calculated=${netMovement}`);
      stockMismatches++;
    }
  }
  log(`Stock audit complete. ${stockMismatches} mismatches found.`);

  // Step 9: Final count validation
  heading('Step 9: Record Counts');
  const countTables = ['articles', 'batches', 'parties', 'orders', 'karigars', 'job_orders', 'khata_entries'];
  for (const t of countTables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      log(`❌ ${t}: error — ${error.message}`);
    } else {
      log(`${t}: ${count ?? 0} records`);
    }
  }

  heading(DRY_RUN ? 'DRY RUN COMPLETE — no data was changed.' : 'MIGRATION COMPLETE.');
}

// ─── Rollback ───────────────────────────────────────────
async function rollback() {
  console.log('\n=== ROLLBACK MODE ===\n');

  const { data: snapshots, error } = await supabase
    .from('migration_snapshots')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !snapshots || snapshots.length === 0) {
    console.error('❌ No snapshots found. Cannot rollback.');
    process.exit(1);
  }

  // Group by table_name — latest snapshot per table
  const latestByTable = new Map<string, { table_name: string; snapshot_data: unknown[] }>();
  for (const snap of snapshots) {
    if (!latestByTable.has(snap.table_name)) {
      latestByTable.set(snap.table_name, snap);
    }
  }

  for (const [table, snap] of latestByTable) {
    const data = snap.snapshot_data as Record<string, unknown>[];
    log(`Restoring '${table}': ${data.length} rows from snapshot...`);

    // Delete current, reinsert snapshot
    const { error: delError } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delError) {
      log(`  ❌ Failed to clear '${table}': ${delError.message}`);
      continue;
    }

    if (data.length > 0) {
      // Insert in batches of 100
      for (let i = 0; i < data.length; i += 100) {
        const chunk = data.slice(i, i + 100);
        const { error: insError } = await supabase.from(table).insert(chunk);
        if (insError) {
          log(`  ❌ Failed to restore chunk in '${table}': ${insError.message}`);
        }
      }
    }
    log(`  ✅ Restored '${table}'`);
  }

  heading('ROLLBACK COMPLETE.');
}

// ─── Entry Point ────────────────────────────────────────
if (ROLLBACK) {
  void rollback();
} else {
  void migrate();
}

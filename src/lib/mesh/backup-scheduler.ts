/**
 * Gold She Mesh — SPOF Prevention: Automated SQLite Backup Scheduler
 *
 * Runs every 30 minutes via node-cron.
 * Uses better-sqlite3's native `.backup()` API which is WAL-safe —
 * it creates a consistent snapshot without interrupting live reads/writes.
 *
 * Retention policy: Keep the last 48 backups (= 24 hours of coverage).
 * Backups are stored in `.goldshemesh/backups/` as timestamped .db files.
 */

import cron from 'node-cron';
import path from 'node:path';
import fs from 'node:fs';
import type { Database as DatabaseType } from 'better-sqlite3';

// ─────────────────────────────────────────────────────────────

const BACKUP_DIR = path.join(process.cwd(), '.goldshemesh', 'backups');
const MAX_BACKUPS = 24; // 24 backups = 24 hours of coverage with 1h frequency
const CRON_EXPRESSION = '0 * * * *'; // every 1 hour (on the hour)

let cronTask: ReturnType<typeof cron.schedule> | null = null;

// ─────────────────────────────────────────────────────────────

/**
 * Format a Date into a safe filename timestamp: 2026-04-26T01-30-00
 */
function toFilenameTimestamp(date: Date): string {
  return date.toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, '');
}

/**
 * Execute a single backup cycle:
 *  1. Ensure the backup directory exists
 *  2. Copy the live DB using better-sqlite3's native backup
 *  3. Prune old backups beyond MAX_BACKUPS
 */
async function runBackup(db: DatabaseType): Promise<void> {
  const startMs = Date.now();
  const timestamp = toFilenameTimestamp(new Date());
  const backupFileName = `hub-store_${timestamp}.db`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);

  try {
    // Ensure backup directory exists
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    // better-sqlite3's .backup() returns a promise and is WAL-safe.
    // It performs an online backup without locking the source database.
    await db.backup(backupPath);

    const stats = fs.statSync(backupPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const durationMs = Date.now() - startMs;

    console.info(
      `[BackupScheduler] ✓ Backup complete: ${backupFileName} (${sizeMB} MB, ${durationMs}ms)`
    );

    // Prune old backups
    pruneOldBackups();
  } catch (err) {
    console.error('[BackupScheduler] ✗ Backup failed:', err);
  }
}

/**
 * Keep only the most recent MAX_BACKUPS files.
 * Sorts by filename (which contains a timestamp) descending,
 * then deletes everything beyond the retention limit.
 */
function pruneOldBackups(): void {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;

    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('hub-store_') && f.endsWith('.db'))
      .sort()
      .reverse(); // newest first (ISO timestamps sort lexicographically)

    if (files.length <= MAX_BACKUPS) return;

    const toDelete = files.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      const fullPath = path.join(BACKUP_DIR, file);
      fs.unlinkSync(fullPath);
      console.info(`[BackupScheduler] 🗑 Pruned old backup: ${file}`);
    }

    console.info(
      `[BackupScheduler] Pruned ${toDelete.length} old backup(s). ${MAX_BACKUPS} retained.`
    );
  } catch (err) {
    console.error('[BackupScheduler] Prune error:', err);
  }
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Start the automated backup scheduler.
 * Should be called once after the Hub boots and the DB is ready.
 *
 * @param db - The live better-sqlite3 Database instance from HubOfflineStore
 */
export function startBackupScheduler(db: DatabaseType): void {
  if (cronTask) {
    console.warn('[BackupScheduler] Already running — ignoring duplicate start()');
    return;
  }

  // Run an initial backup immediately on boot
  console.info('[BackupScheduler] Starting automated SQLite backup scheduler...');
  console.info(`[BackupScheduler] Schedule: every 1 hour | Retention: last ${MAX_BACKUPS} backups`);
  console.info(`[BackupScheduler] Backup directory: ${BACKUP_DIR}`);

  void runBackup(db);

  // Schedule recurring backups
  cronTask = cron.schedule(CRON_EXPRESSION, () => {
    void runBackup(db);
  });

  console.info('[BackupScheduler] ✓ Cron job registered');
}

/**
 * Stop the backup scheduler (graceful shutdown).
 */
export function stopBackupScheduler(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.info('[BackupScheduler] Stopped');
  }
}

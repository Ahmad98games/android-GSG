"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBackupScheduler = startBackupScheduler;
exports.stopBackupScheduler = stopBackupScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
// ─────────────────────────────────────────────────────────────
const BACKUP_DIR = node_path_1.default.join(process.cwd(), '.goldshemesh', 'backups');
const MAX_BACKUPS = 24; // 24 backups = 24 hours of coverage with 1h frequency
const CRON_EXPRESSION = '0 * * * *'; // every 1 hour (on the hour)
let cronTask = null;
// ─────────────────────────────────────────────────────────────
/**
 * Format a Date into a safe filename timestamp: 2026-04-26T01-30-00
 */
function toFilenameTimestamp(date) {
    return date.toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, '');
}
/**
 * Execute a single backup cycle:
 *  1. Ensure the backup directory exists
 *  2. Copy the live DB using better-sqlite3's native backup
 *  3. Prune old backups beyond MAX_BACKUPS
 */
async function runBackup(db) {
    const startMs = Date.now();
    const timestamp = toFilenameTimestamp(new Date());
    const backupFileName = `hub-store_${timestamp}.db`;
    const backupPath = node_path_1.default.join(BACKUP_DIR, backupFileName);
    try {
        // Ensure backup directory exists
        node_fs_1.default.mkdirSync(BACKUP_DIR, { recursive: true });
        // better-sqlite3's .backup() returns a promise and is WAL-safe.
        // It performs an online backup without locking the source database.
        await db.backup(backupPath);
        const stats = node_fs_1.default.statSync(backupPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        const durationMs = Date.now() - startMs;
        console.info(`[BackupScheduler] ✓ Backup complete: ${backupFileName} (${sizeMB} MB, ${durationMs}ms)`);
        // Prune old backups
        pruneOldBackups();
    }
    catch (err) {
        console.error('[BackupScheduler] ✗ Backup failed:', err);
    }
}
/**
 * Keep only the most recent MAX_BACKUPS files.
 * Sorts by filename (which contains a timestamp) descending,
 * then deletes everything beyond the retention limit.
 */
function pruneOldBackups() {
    try {
        if (!node_fs_1.default.existsSync(BACKUP_DIR))
            return;
        const files = node_fs_1.default
            .readdirSync(BACKUP_DIR)
            .filter((f) => f.startsWith('hub-store_') && f.endsWith('.db'))
            .sort()
            .reverse(); // newest first (ISO timestamps sort lexicographically)
        if (files.length <= MAX_BACKUPS)
            return;
        const toDelete = files.slice(MAX_BACKUPS);
        for (const file of toDelete) {
            const fullPath = node_path_1.default.join(BACKUP_DIR, file);
            node_fs_1.default.unlinkSync(fullPath);
            console.info(`[BackupScheduler] 🗑 Pruned old backup: ${file}`);
        }
        console.info(`[BackupScheduler] Pruned ${toDelete.length} old backup(s). ${MAX_BACKUPS} retained.`);
    }
    catch (err) {
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
function startBackupScheduler(db) {
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
    cronTask = node_cron_1.default.schedule(CRON_EXPRESSION, () => {
        void runBackup(db);
    });
    console.info('[BackupScheduler] ✓ Cron job registered');
}
/**
 * Stop the backup scheduler (graceful shutdown).
 */
function stopBackupScheduler() {
    if (cronTask) {
        cronTask.stop();
        cronTask = null;
        console.info('[BackupScheduler] Stopped');
    }
}

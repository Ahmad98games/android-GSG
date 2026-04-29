/**
 * Gold She Mesh — Idempotent Delta Processor
 *
 * Processes incoming stock deltas from mobile nodes with full safety guarantees:
 *   1. UUID-based idempotency — duplicate deltas are silently rejected
 *   2. Mathematical delta application — ADD/SUBTRACT to current value, never overwrite
 *   3. Atomic transactions — delta_log insert + stock_ledger update in one SQLite transaction
 *   4. Floor-zero guard — stock can never go negative
 *
 * This processor operates on the Hub's local SQLite database (same DB as HubOfflineStore).
 * It is the server-side counterpart to the mobile SyncEngine's STOCK_IN / STOCK_OUT operations.
 */

import type { Database as DatabaseType } from 'better-sqlite3';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type DeltaAction = 'ADD' | 'SUBTRACT';

export interface StockDelta {
  /** UUID v4 — idempotency key, must be unique per operation */
  uuid: string;
  /** The mathematical operation to perform */
  action: DeltaAction;
  /** Positive number — the quantity to add or subtract */
  amount: number;
  /** The batch/article/SKU identifier this delta applies to */
  batchId: string;
  /** Unix ms timestamp from the source device */
  timestamp: number;
  /** Device ID that originated this delta */
  sourceDeviceId: string;
}

export type DeltaResult =
  | {
      status: 'APPLIED';
      deltaId: string;
      previousValue: number;
      newValue: number;
      action: DeltaAction;
      amount: number;
    }
  | {
      status: 'DUPLICATE';
      deltaId: string;
      message: string;
      originalTimestamp: number;
    }
  | {
      status: 'REJECTED';
      deltaId: string;
      reason: string;
    };

// ─────────────────────────────────────────────────────────────
// Schema Migration (called from HubOfflineStore.migrate())
// ─────────────────────────────────────────────────────────────

/**
 * Create the delta_log and stock_ledger tables.
 * Safe to call multiple times (IF NOT EXISTS).
 */
export function migrateDeltaTables(db: DatabaseType): void {
  db.exec(`
    -- Idempotency log: every processed delta UUID is recorded here
    CREATE TABLE IF NOT EXISTS delta_log (
      uuid              TEXT PRIMARY KEY,
      batch_id          TEXT NOT NULL,
      action            TEXT NOT NULL CHECK(action IN ('ADD', 'SUBTRACT')),
      amount            REAL NOT NULL CHECK(amount > 0),
      previous_value    REAL NOT NULL,
      new_value         REAL NOT NULL,
      source_device_id  TEXT NOT NULL,
      source_ts         INTEGER NOT NULL,
      processed_at      INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_delta_log_batch
      ON delta_log(batch_id, processed_at);

    -- Current stock values per batch/SKU
    CREATE TABLE IF NOT EXISTS stock_ledger (
      batch_id          TEXT PRIMARY KEY,
      current_qty       REAL NOT NULL DEFAULT 0,
      last_updated_at   INTEGER NOT NULL,
      last_delta_uuid   TEXT
    );
  `);
}

// ─────────────────────────────────────────────────────────────
// Delta Processor
// ─────────────────────────────────────────────────────────────

export class DeltaProcessor {
  private db: DatabaseType;

  // Pre-compiled statements for performance
  private stmtCheckDuplicate;
  private stmtGetStock;
  private stmtUpsertStock;
  private stmtInsertDeltaLog;

  constructor(db: DatabaseType) {
    this.db = db;

    this.stmtCheckDuplicate = db.prepare(
      `SELECT uuid, source_ts FROM delta_log WHERE uuid = ?`
    );

    this.stmtGetStock = db.prepare(
      `SELECT current_qty FROM stock_ledger WHERE batch_id = ?`
    );

    this.stmtUpsertStock = db.prepare(`
      INSERT INTO stock_ledger (batch_id, current_qty, last_updated_at, last_delta_uuid)
      VALUES (@batchId, @qty, @now, @uuid)
      ON CONFLICT(batch_id) DO UPDATE SET
        current_qty     = @qty,
        last_updated_at = @now,
        last_delta_uuid = @uuid
    `);

    this.stmtInsertDeltaLog = db.prepare(`
      INSERT INTO delta_log (uuid, batch_id, action, amount, previous_value, new_value,
                             source_device_id, source_ts, processed_at)
      VALUES (@uuid, @batchId, @action, @amount, @previousValue, @newValue,
              @sourceDeviceId, @sourceTs, @processedAt)
    `);
  }

  /**
   * Process a single stock delta with full idempotency and atomicity.
   *
   * The entire read-check-write cycle runs inside a SQLite transaction,
   * ensuring no race condition between concurrent delta processing.
   */
  processDelta(delta: StockDelta): DeltaResult {
    // ── Input validation ──────────────────────────────────────
    if (!delta.uuid || typeof delta.uuid !== 'string') {
      return { status: 'REJECTED', deltaId: delta.uuid ?? 'unknown', reason: 'Missing or invalid UUID' };
    }
    if (!delta.batchId || typeof delta.batchId !== 'string') {
      return { status: 'REJECTED', deltaId: delta.uuid, reason: 'Missing or invalid batchId' };
    }
    if (typeof delta.amount !== 'number' || delta.amount <= 0 || !isFinite(delta.amount)) {
      return { status: 'REJECTED', deltaId: delta.uuid, reason: `Invalid amount: ${delta.amount}. Must be a positive finite number.` };
    }
    if (delta.action !== 'ADD' && delta.action !== 'SUBTRACT') {
      return { status: 'REJECTED', deltaId: delta.uuid, reason: `Invalid action: ${delta.action}. Must be ADD or SUBTRACT.` };
    }

    // ── Atomic transaction ────────────────────────────────────
    const txn = this.db.transaction((): DeltaResult => {
      // Step 1: Idempotency check — has this UUID been processed before?
      const existing = this.stmtCheckDuplicate.get(delta.uuid) as
        | { uuid: string; source_ts: number }
        | undefined;

      if (existing) {
        return {
          status: 'DUPLICATE',
          deltaId: delta.uuid,
          message: `Delta ${delta.uuid} was already processed`,
          originalTimestamp: existing.source_ts,
        };
      }

      // Step 2: Read current stock value (defaults to 0 for new batches)
      const stockRow = this.stmtGetStock.get(delta.batchId) as
        | { current_qty: number }
        | undefined;
      const previousValue = stockRow?.current_qty ?? 0;

      // Step 3: Apply mathematical delta
      let newValue: number;
      if (delta.action === 'ADD') {
        newValue = previousValue + delta.amount;
      } else {
        // Floor-zero guard: stock can never go negative
        newValue = Math.max(0, previousValue - delta.amount);
      }

      // Round to 4 decimal places to avoid floating-point drift
      newValue = Math.round(newValue * 10000) / 10000;

      const now = Date.now();

      // Step 4: Write — both operations in the same transaction
      this.stmtUpsertStock.run({
        batchId: delta.batchId,
        qty: newValue,
        now,
        uuid: delta.uuid,
      });

      this.stmtInsertDeltaLog.run({
        uuid: delta.uuid,
        batchId: delta.batchId,
        action: delta.action,
        amount: delta.amount,
        previousValue,
        newValue,
        sourceDeviceId: delta.sourceDeviceId,
        sourceTs: delta.timestamp,
        processedAt: now,
      });

      return {
        status: 'APPLIED',
        deltaId: delta.uuid,
        previousValue,
        newValue,
        action: delta.action,
        amount: delta.amount,
      };
    });

    // Execute the transaction
    const result = txn();

    if (result.status === 'APPLIED') {
      console.info(
        `[DeltaProcessor] ✓ ${result.action} ${result.amount} on batch ${delta.batchId}: ${result.previousValue} → ${result.newValue}`
      );
    } else if (result.status === 'DUPLICATE') {
      console.info(`[DeltaProcessor] ↩ Duplicate delta ignored: ${delta.uuid}`);
    }

    return result;
  }

  /**
   * Get the current stock value for a batch.
   * Returns 0 if the batch has never been seen.
   */
  getStockLevel(batchId: string): number {
    const row = this.stmtGetStock.get(batchId) as
      | { current_qty: number }
      | undefined;
    return row?.current_qty ?? 0;
  }

  /**
   * Get the full delta history for a batch (newest first).
   */
  getDeltaHistory(batchId: string, limit = 50): Array<{
    uuid: string;
    action: DeltaAction;
    amount: number;
    previousValue: number;
    newValue: number;
    sourceDeviceId: string;
    sourceTs: number;
    processedAt: number;
  }> {
    return this.db
      .prepare(
        `SELECT * FROM delta_log WHERE batch_id = ? ORDER BY processed_at DESC LIMIT ?`
      )
      .all(batchId, limit) as Array<{
      uuid: string;
      action: DeltaAction;
      amount: number;
      previousValue: number;
      newValue: number;
      sourceDeviceId: string;
      sourceTs: number;
      processedAt: number;
    }>;
  }
}

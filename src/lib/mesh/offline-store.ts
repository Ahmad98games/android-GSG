/**
 * Gold She Mesh — Hub Offline Store (better-sqlite3)
 *
 * The PC Hub is the persistent store for the entire mesh.
 * Every message, file manifest, receipt, and device record is written here.
 * When a mobile device reconnects after being offline, it syncs from this store.
 *
 * SQLite is used synchronously (better-sqlite3) for simplicity and reliability.
 * No ORM — raw parameterized SQL for predictable performance at our scale (≤10 devices).
 */

import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import type {
  MeshPacket,
  DeviceIdentity,
  FileManifestPayload,
} from '../Shared/mesh-protocol';
import { migrateDeltaTables } from './delta-processor';
import { env } from '../env';



// ─────────────────────────────────────────────────────────────

const DB_DIR = path.join(process.cwd(), '.goldshemesh');
const DB_PATH = path.join(DB_DIR, 'hub-store.db');

// ─────────────────────────────────────────────────────────────

export interface StoredMessage {
  packetId: string;
  type: string;
  fromDeviceId: string;
  toDeviceId: string;
  conversationId: string;
  payload: string;          // raw JSON string (EncryptedEnvelope)
  seq: number;
  senderTs: number;
  hubStoredAt: number;
  deliveredAt: number | null;
  readAt: number | null;
}

export interface PairingCode {
  code: string;
  createdAt: number;
  expiresAt: number;
  usedAt: number | null;
  usedByDeviceId: string | null;
}

export interface FileTransferRecord {
  fileId: string;
  fromDeviceId: string;
  toDeviceId: string;
  fileName: string;
  mimeType: string;
  totalBytes: number;
  totalChunks: number;
  receivedChunks: number;
  sha256: string;
  parentMsgId: string;
  conversationId: string;
  status: 'pending' | 'in_progress' | 'complete' | 'aborted';
  startedAt: number;
  completedAt: number | null;
}

export interface Incident {
  id: string;
  deviceId: string;
  deviceName: string;
  type: string;
  severity: string;
  description: string;
  ts: number;
}


// ─────────────────────────────────────────────────────────────

export interface ConversationSummary {
  conversationId: string;
  peerDeviceId: string;
  lastMessageType: string;
  lastMessagePayload: string;
  lastMessageTs: number;
  unreadCount: number;
}

// ─────────────────────────────────────────────────────────────

export class HubOfflineStore {

  private db: DatabaseType;
  private messageQueue: { packet: MeshPacket; conversationId: string }[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 20;
  private readonly FLUSH_INTERVAL_MS = 500;

  constructor() {
    fs.mkdirSync(DB_DIR, { recursive: true });
    
    // STARTUP RECOVERY LOGIC
    if (!this.performIntegrityCheck()) {
      this.attemptAutoRecovery();
    }

    this.db = new Database(DB_PATH);
    this.configure();
    this.migrate();
  }

  /**
   * Performs a silent integrity check on the SQLite file.
   * If the DB is corrupted, SQLite might fail to open or throw on PRAGMA integrity_check.
   */
  private performIntegrityCheck(): boolean {
    if (!fs.existsSync(DB_PATH)) return true; // New system, no integrity to check

    try {
      const checkDb = new Database(DB_PATH, { timeout: 2000 });
      const result = checkDb.pragma('integrity_check');
      checkDb.close();
      
      const rows = result as Array<{ integrity_check: string }>;
      if (rows[0] && rows[0].integrity_check === 'ok') {
        return true;
      }

      return false;
    } catch (err) {
      console.error('[HubOfflineStore] ⚠️ Integrity check failed or DB is locked:', err);
      return false;
    }
  }

  /**
   * Restores the database from the latest healthy backup in .goldshemesh/backups/
   */
  private attemptAutoRecovery(): void {
    console.error('[HubOfflineStore] 🚨 CRITICAL: Database corruption detected. Initiating Auto-Recovery...');
    
    try {
      if (!fs.existsSync(env.BACKUP_DIR)) {
        console.error('[HubOfflineStore] ❌ Recovery failed: No backup directory found.');
        return;
      }

      const backups = fs.readdirSync(env.BACKUP_DIR)
        .filter(f => f.startsWith('hub-store_') && f.endsWith('.db'))
        .sort()
        .reverse(); // Latest first

      if (backups.length === 0) {
        console.error('[HubOfflineStore] ❌ Recovery failed: No backup files available.');
        return;
      }

      const latestBackup = path.join(env.BACKUP_DIR, backups[0]);

      console.info(`[HubOfflineStore] 🛠 Restoring from latest backup: ${backups[0]}`);
      
      // Move corrupted DB to a quarantine file for forensic analysis
      const quarantinePath = `${DB_PATH}.corrupted.${Date.now()}`;
      fs.renameSync(DB_PATH, quarantinePath);
      
      // Copy backup to live DB path
      fs.copyFileSync(latestBackup, DB_PATH);
      
      console.info('[HubOfflineStore] ✅ CRITICAL RECOVERY EVENT COMPLETE. System restored.');
    } catch (err) {
      console.error('[HubOfflineStore] ❌ Recovery process failed:', err);
    }
  }

  /** SQLite3 performance tuning — safe for our local-only use case */
  private configure(): void {
    this.db.pragma('journal_mode = WAL');      // WAL for concurrent reads during writes
    this.db.pragma('synchronous = NORMAL');    // Safe + fast (no fdatasync on every write)
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('cache_size = -8000');      // 8 MB page cache
    this.db.pragma('temp_store = MEMORY');
  }

  private migrate(): void {
    this.db.exec(`
      -- Device registry
      CREATE TABLE IF NOT EXISTS devices (
        device_id       TEXT PRIMARY KEY,
        device_name     TEXT NOT NULL,
        device_type     TEXT NOT NULL CHECK(device_type IN ('hub_pc','node_mobile')),
        ecdh_public_key TEXT NOT NULL,
        registered_at   INTEGER NOT NULL,
        last_seen       INTEGER NOT NULL,
        is_online       INTEGER NOT NULL DEFAULT 0
      );

      -- All messages passing through the hub (stored encrypted)
      CREATE TABLE IF NOT EXISTS messages (
        packet_id       TEXT PRIMARY KEY,
        type            TEXT NOT NULL,
        from_device_id  TEXT NOT NULL REFERENCES devices(device_id),
        to_device_id    TEXT NOT NULL,   -- may be 'broadcast'
        conversation_id TEXT NOT NULL,
        payload         TEXT NOT NULL,   -- EncryptedEnvelope JSON
        seq             INTEGER NOT NULL,
        sender_ts       INTEGER NOT NULL,
        hub_stored_at   INTEGER NOT NULL,
        delivered_at    INTEGER,
        read_at         INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_messages_conversation
        ON messages(conversation_id, hub_stored_at);
      CREATE INDEX IF NOT EXISTS idx_messages_to_device
        ON messages(to_device_id, hub_stored_at);
      CREATE INDEX IF NOT EXISTS idx_messages_from_seq
        ON messages(from_device_id, seq);

      -- Pairing codes (one-time use, 5-minute expiry)
      CREATE TABLE IF NOT EXISTS pairing_codes (
        code              TEXT PRIMARY KEY,
        created_at        INTEGER NOT NULL,
        expires_at        INTEGER NOT NULL,
        used_at           INTEGER,
        used_by_device_id TEXT
      );

      -- File transfer tracking
      CREATE TABLE IF NOT EXISTS file_transfers (
        file_id         TEXT PRIMARY KEY,
        from_device_id  TEXT NOT NULL,
        to_device_id    TEXT NOT NULL,
        file_name       TEXT NOT NULL,
        mime_type       TEXT NOT NULL,
        total_bytes     INTEGER NOT NULL,
        total_chunks    INTEGER NOT NULL,
        received_chunks INTEGER NOT NULL DEFAULT 0,
        sha256          TEXT NOT NULL,
        parent_msg_id   TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'pending'
                          CHECK(status IN ('pending','in_progress','complete','aborted')),
        started_at      INTEGER NOT NULL,
        completed_at    INTEGER
      );

      -- Per-device sequence high-water marks for sync gap detection
      CREATE TABLE IF NOT EXISTS sync_state (
        observer_device_id TEXT NOT NULL,
        source_device_id   TEXT NOT NULL,
        last_seq           INTEGER NOT NULL DEFAULT 0,
        updated_at         INTEGER NOT NULL,
        PRIMARY KEY(observer_device_id, source_device_id)
      );

      -- Forensic Incidents
      CREATE TABLE IF NOT EXISTS incidents (
        id              TEXT PRIMARY KEY,
        device_id       TEXT NOT NULL,
        device_name     TEXT NOT NULL,
        type            TEXT NOT NULL,
        severity        TEXT NOT NULL,
        description     TEXT NOT NULL,
        ts              INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_incidents_ts ON incidents(ts);
    `);

    // Delta processor tables (stock_ledger + delta_log)
    migrateDeltaTables(this.db);
  }

  // ─── Devices ───────────────────────────────────────────────

  upsertDevice(device: DeviceIdentity): void {
    this.db
      .prepare(`
        INSERT INTO devices (device_id, device_name, device_type, ecdh_public_key,
                             registered_at, last_seen, is_online)
        VALUES (@deviceId, @deviceName, @deviceType, @ecdhPublicKey,
                @registeredAt, @lastSeen, @isOnline)
        ON CONFLICT(device_id) DO UPDATE SET
          device_name     = excluded.device_name,
          last_seen       = excluded.last_seen,
          is_online       = excluded.is_online
      `)
      .run({
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        ecdhPublicKey: device.ecdhPublicKey,
        registeredAt: device.registeredAt,
        lastSeen: device.lastSeen,
        isOnline: device.isOnline ? 1 : 0,
      });
  }

  setDeviceOnline(deviceId: string, online: boolean): void {
    this.db
      .prepare(
        `UPDATE devices SET is_online = ?, last_seen = ? WHERE device_id = ?`
      )
      .run(online ? 1 : 0, Date.now(), deviceId);
  }

  getDevice(deviceId: string): DeviceIdentity | undefined {
    const row = this.db
      .prepare(`SELECT * FROM devices WHERE device_id = ?`)
      .get(deviceId) as Record<string, unknown> | undefined;
    return row ? this.rowToDevice(row) : undefined;
  }

  getAllDevices(): DeviceIdentity[] {
    return (this.db.prepare(`SELECT * FROM devices`).all() as Record<string, unknown>[]).map(
      this.rowToDevice
    );
  }

  private rowToDevice(row: Record<string, unknown>): DeviceIdentity {
    return {
      deviceId: row.device_id as string,
      deviceName: row.device_name as string,
      deviceType: row.device_type as DeviceIdentity['deviceType'],
      ecdhPublicKey: row.ecdh_public_key as string,
      registeredAt: row.registered_at as number,
      lastSeen: row.last_seen as number,
      isOnline: (row.is_online as number) === 1,
    };
  }

  // ─── Messages ──────────────────────────────────────────────

  /**
   * HIGH-CAPACITY SCALING: Store message via in-memory buffer.
   * Prevents "Database Locked" errors by batching writes into a single transaction.
   */
  storeMessage(packet: MeshPacket, conversationId: string): void {
    this.messageQueue.push({ packet, conversationId });

    if (this.messageQueue.length >= this.BATCH_SIZE) {
      this.flushQueue();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flushQueue(), this.FLUSH_INTERVAL_MS);
    }
  }

  private flushQueue(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.messageQueue.length === 0) return;

    const batch = [...this.messageQueue];
    this.messageQueue = [];

    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO messages
        (packet_id, type, from_device_id, to_device_id, conversation_id,
         payload, seq, sender_ts, hub_stored_at)
      VALUES
        (@packetId, @type, @from, @to, @convId, @payload, @seq, @ts, @now)
    `);

    const now = Date.now();
    
    // Industrial Batch Transaction
    const transaction = this.db.transaction((items) => {
      for (const item of items) {
        insert.run({
          packetId: item.packet.id,
          type: item.packet.type,
          from: item.packet.from,
          to: item.packet.to,
          convId: item.conversationId,
          payload: item.packet.payload,
          seq: item.packet.seq,
          ts: item.packet.ts,
          now: now,
        });
      }
    });

    try {
      transaction(batch);
      console.debug(`[OfflineStore] Flushed batch of ${batch.length} messages.`);
    } catch (err) {
      console.error('[OfflineStore] Batch flush failed:', err);
      // Re-queue on failure? For now, we log it.
    }
  }

  markDelivered(packetId: string): void {
    this.db
      .prepare(`UPDATE messages SET delivered_at = ? WHERE packet_id = ?`)
      .run(Date.now(), packetId);
  }

  markRead(packetId: string): void {
    this.db
      .prepare(`UPDATE messages SET read_at = ? WHERE packet_id = ?`)
      .run(Date.now(), packetId);
  }

  /**
   * Get all messages for a device that were stored after seq `afterSeq` for
   * each source device, used for offline sync.
   */
  getMessagesForSync(
    targetDeviceId: string,
    highWaterMarks: Record<string, number>
  ): MeshPacket[] {
    // Build a UNION of queries for each source device
    // For sources not in highWaterMarks we want everything (seq > 0)
    const rows = this.db
      .prepare(`
        SELECT * FROM messages
        WHERE (to_device_id = ? OR to_device_id = 'broadcast')
          AND from_device_id != ?
        ORDER BY hub_stored_at ASC
        LIMIT 500
      `)
      .all(targetDeviceId, targetDeviceId) as Record<string, unknown>[];

    return rows
      .filter((row) => {
        const fromId = row.from_device_id as string;
        const seq = row.seq as number;
        const hwm = highWaterMarks[fromId] ?? 0;
        return seq > hwm;
      })
      .map(this.rowToPacket);
  }

  private rowToPacket(row: Record<string, unknown>): MeshPacket {
    return {
      v: '1.0.0',
      id: row.packet_id as string,
      type: row.type as MeshPacket['type'],
      from: row.from_device_id as string,
      to: row.to_device_id as string,
      ts: row.sender_ts as number,
      seq: row.seq as number,
      payload: row.payload as string,
    };
  }

  // ─── Pairing Codes ─────────────────────────────────────────

  storePairingCode(code: string, ttlMs = 5 * 60 * 1000): void {
    const now = Date.now();
    this.db
      .prepare(`
        INSERT INTO pairing_codes (code, created_at, expires_at)
        VALUES (?, ?, ?)
      `)
      .run(code, now, now + ttlMs);
  }

  validateAndConsumePairingCode(code: string, usedByDeviceId: string): boolean {
    const now = Date.now();
    const row = this.db
      .prepare(`
        SELECT * FROM pairing_codes
        WHERE code = ? AND used_at IS NULL AND expires_at > ?
      `)
      .get(code, now);
    if (!row) return false;

    this.db
      .prepare(
        `UPDATE pairing_codes SET used_at = ?, used_by_device_id = ? WHERE code = ?`
      )
      .run(now, usedByDeviceId, code);
    return true;
  }

  expireOldPairingCodes(): void {
    this.db
      .prepare(`DELETE FROM pairing_codes WHERE expires_at < ?`)
      .run(Date.now() - 60_000);
  }

  // ─── File Transfers ────────────────────────────────────────

  initFileTransfer(manifest: FileManifestPayload, fromId: string, toId: string): void {
    this.db
      .prepare(`
        INSERT OR IGNORE INTO file_transfers
          (file_id, from_device_id, to_device_id, file_name, mime_type,
           total_bytes, total_chunks, sha256, parent_msg_id, conversation_id,
           status, started_at)
        VALUES
          (@fileId, @from, @to, @fileName, @mimeType,
           @totalBytes, @totalChunks, @sha256, @parentMsgId, @convId,
           'in_progress', @now)
      `)
      .run({
        fileId: manifest.fileId,
        from: fromId,
        to: toId,
        fileName: manifest.fileName,
        mimeType: manifest.mimeType,
        totalBytes: manifest.totalBytes,
        totalChunks: manifest.totalChunks,
        sha256: manifest.sha256,
        parentMsgId: manifest.parentMsgId,
        convId: manifest.conversationId,
        now: Date.now(),
      });
  }

  incrementReceivedChunks(fileId: string): void {
    this.db
      .prepare(`UPDATE file_transfers SET received_chunks = received_chunks + 1 WHERE file_id = ?`)
      .run(fileId);
  }

  completeFileTransfer(fileId: string): void {
    this.db
      .prepare(`UPDATE file_transfers SET status = 'complete', completed_at = ? WHERE file_id = ?`)
      .run(Date.now(), fileId);
  }

  abortFileTransfer(fileId: string): void {
    this.db
      .prepare(`UPDATE file_transfers SET status = 'aborted' WHERE file_id = ?`)
      .run(fileId);
  }

  getFileTransfer(fileId: string): FileTransferRecord | undefined {
    return this.db
      .prepare(`SELECT * FROM file_transfers WHERE file_id = ?`)
      .get(fileId) as FileTransferRecord | undefined;
  }

  // ─── Sync state ────────────────────────────────────────────

  updateSyncState(
    observerDeviceId: string,
    sourceDeviceId: string,
    seq: number
  ): void {
    this.db
      .prepare(`
        INSERT INTO sync_state (observer_device_id, source_device_id, last_seq, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(observer_device_id, source_device_id) DO UPDATE SET
          last_seq   = MAX(last_seq, excluded.last_seq),
          updated_at = excluded.updated_at
      `)
      .run(observerDeviceId, sourceDeviceId, seq, Date.now());
  }

  // ─── Hub Identity Persistence ──────────────────────────────

  /**
   * Persist the hub device ID so it survives process restarts.
   * Without this, every restart generates a new UUID and mobile
   * devices with cached hub IDs will fail to reconnect.
   */
  saveHubDeviceId(hubId: string): void {
    this.db
      .prepare(`
        INSERT INTO sync_state (observer_device_id, source_device_id, last_seq, updated_at)
        VALUES ('__hub__', '__identity__', 0, ?)
        ON CONFLICT(observer_device_id, source_device_id) DO UPDATE SET
          updated_at = excluded.updated_at
      `)
      .run(Date.now());

    // Use a simple KV approach — repurpose sync_state with a sentinel key
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hub_config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    this.db
      .prepare(`INSERT INTO hub_config (key, value) VALUES ('hub_device_id', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
      .run(hubId);
  }

  getHubDeviceId(): string | null {
    // Ensure the table exists (first boot scenario)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hub_config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    const row = this.db
      .prepare(`SELECT value FROM hub_config WHERE key = 'hub_device_id'`)
      .get() as { value: string } | undefined;
    return row?.value ?? null;
  }

  saveSystemSecret(secret: string): void {
    this.db
      .prepare(`INSERT INTO hub_config (key, value) VALUES ('system_secret', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
      .run(secret);
  }

  getSystemSecret(): string | null {
    const row = this.db
      .prepare(`SELECT value FROM hub_config WHERE key = 'system_secret'`)
      .get() as { value: string } | undefined;
    return row?.value ?? null;
  }

  // ─── Conversation List ─────────────────────────────────────

  /**
   * Get a list of conversations with the last message preview
   * and unread count. Used by the messenger sidebar.
   */
  getConversationList(hubDeviceId: string): ConversationSummary[] {

    const rows = this.db
      .prepare(`
        SELECT
          m.conversation_id,
          m.type AS last_type,
          m.payload AS last_payload,
          m.sender_ts AS last_ts,
          CASE
            WHEN m.from_device_id = ? THEN m.to_device_id
            ELSE m.from_device_id
          END AS peer_device_id,
          (SELECT COUNT(*) FROM messages m2
           WHERE m2.conversation_id = m.conversation_id
             AND m2.read_at IS NULL
             AND m2.from_device_id != ?) AS unread_count
        FROM messages m
        INNER JOIN (
          SELECT conversation_id, MAX(hub_stored_at) AS max_stored
          FROM messages
          WHERE conversation_id != ''
          GROUP BY conversation_id
        ) latest ON m.conversation_id = latest.conversation_id
                 AND m.hub_stored_at = latest.max_stored
        ORDER BY m.sender_ts DESC
      `)
      .all(hubDeviceId, hubDeviceId) as Array<Record<string, unknown>>;

    return rows.map((r) => ({
      conversationId: r.conversation_id as string,
      peerDeviceId: r.peer_device_id as string,
      lastMessageType: r.last_type as string,
      lastMessagePayload: r.last_payload as string,
      lastMessageTs: r.last_ts as number,
      unreadCount: r.unread_count as number,
    }));
  }

  // ─── Message History (paginated) ───────────────────────────

  /**
   * Fetch messages for a conversation with cursor-based pagination.
   * Returns newest-first up to `limit`, optionally before a timestamp.
   */
  getMessageHistory(
    conversationId: string,
    limit = 50,
    beforeTs?: number
  ): StoredMessage[] {
    const query = beforeTs
      ? `SELECT * FROM messages
         WHERE conversation_id = ? AND sender_ts < ?
         ORDER BY sender_ts DESC
         LIMIT ?`
      : `SELECT * FROM messages
         WHERE conversation_id = ?
         ORDER BY sender_ts DESC
         LIMIT ?`;

    const args = beforeTs
      ? [conversationId, beforeTs, limit]
      : [conversationId, limit];

    const rows = this.db.prepare(query).all(...args) as Record<string, unknown>[];

    return rows
      .map((r) => ({
        packetId: r.packet_id as string,
        type: r.type as string,
        fromDeviceId: r.from_device_id as string,
        toDeviceId: r.to_device_id as string,
        conversationId: r.conversation_id as string,
        payload: r.payload as string,
        seq: r.seq as number,
        senderTs: r.sender_ts as number,
        hubStoredAt: r.hub_stored_at as number,
        deliveredAt: r.delivered_at as number | null,
        readAt: r.read_at as number | null,
      }))
      .reverse(); // Return oldest-first for UI rendering
  }

  // ─── Bulk Mark Read ────────────────────────────────────────

  /** Mark all messages in a conversation as read */
  bulkMarkRead(conversationId: string, selfDeviceId: string): number {
    const result = this.db
      .prepare(`
        UPDATE messages SET read_at = ?
        WHERE conversation_id = ?
          AND read_at IS NULL
          AND from_device_id != ?
      `)
      .run(Date.now(), conversationId, selfDeviceId);
    return result.changes;
  }

  // ─── Search ────────────────────────────────────────────────

  /** Search messages by text content (searches the raw payload JSON) */
  searchMessages(
    query: string,
    conversationId?: string,
    limit = 30
  ): StoredMessage[] {
    const searchPattern = `%${query}%`;
    const sql = conversationId
      ? `SELECT * FROM messages
         WHERE conversation_id = ? AND payload LIKE ?
         ORDER BY sender_ts DESC LIMIT ?`
      : `SELECT * FROM messages
         WHERE payload LIKE ?
         ORDER BY sender_ts DESC LIMIT ?`;

    const args = conversationId
      ? [conversationId, searchPattern, limit]
      : [searchPattern, limit];

    const rows = this.db.prepare(sql).all(...args) as Record<string, unknown>[];

    return rows.map((r) => ({
      packetId: r.packet_id as string,
      type: r.type as string,
      fromDeviceId: r.from_device_id as string,
      toDeviceId: r.to_device_id as string,
      conversationId: r.conversation_id as string,
      payload: r.payload as string,
      seq: r.seq as number,
      senderTs: r.sender_ts as number,
      hubStoredAt: r.hub_stored_at as number,
      deliveredAt: r.delivered_at as number | null,
      readAt: r.read_at as number | null,
    }));
  }

  // ─── Stats / Metrics ──────────────────────────────────────

  getMessageCount(): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) as cnt FROM messages`)
      .get() as { cnt: number };
    return row.cnt;
  }

  getFileTransferCount(): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) as cnt FROM file_transfers`)
      .get() as { cnt: number };
    return row.cnt;
  }

  /** Remove a device from the registry (kick) */
  removeDevice(deviceId: string): void {
    this.db.prepare(`DELETE FROM devices WHERE device_id = ?`).run(deviceId);
  }

  // ─── Incidents ─────────────────────────────────────────────

  storeIncident(incident: Incident): void {
    this.db
      .prepare(`
        INSERT INTO incidents (id, device_id, device_name, type, severity, description, ts)
        VALUES (@id, @deviceId, @deviceName, @type, @severity, @description, @ts)
      `)
      .run(incident);
  }

  getRecentIncidents(limit = 100): Incident[] {
    return this.db
      .prepare(`SELECT * FROM incidents ORDER BY ts DESC LIMIT ?`)
      .all(limit) as Incident[];
  }


  // ─── Database Accessor ─────────────────────────────────────

  /** Expose the raw better-sqlite3 Database handle for DeltaProcessor and BackupScheduler */
  getDb(): DatabaseType {
    return this.db;
  }

  // ─── Lifecycle ─────────────────────────────────────────────

  close(): void {
    this.flushQueue(); // Final flush before shutdown
    this.db.close();
  }
}
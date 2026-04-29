"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HubOfflineStore = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const delta_processor_1 = require("./delta-processor");
const env_1 = require("../env");
// ─────────────────────────────────────────────────────────────
const DB_DIR = node_path_1.default.join(process.cwd(), '.goldshemesh');
const DB_PATH = node_path_1.default.join(DB_DIR, 'hub-store.db');
// ─────────────────────────────────────────────────────────────
class HubOfflineStore {
    db;
    messageQueue = [];
    flushTimer = null;
    BATCH_SIZE = 20;
    FLUSH_INTERVAL_MS = 500;
    constructor() {
        node_fs_1.default.mkdirSync(DB_DIR, { recursive: true });
        // STARTUP RECOVERY LOGIC
        if (!this.performIntegrityCheck()) {
            this.attemptAutoRecovery();
        }
        this.db = new better_sqlite3_1.default(DB_PATH);
        this.configure();
        this.migrate();
    }
    /**
     * Performs a silent integrity check on the SQLite file.
     * If the DB is corrupted, SQLite might fail to open or throw on PRAGMA integrity_check.
     */
    performIntegrityCheck() {
        if (!node_fs_1.default.existsSync(DB_PATH))
            return true; // New system, no integrity to check
        try {
            const checkDb = new better_sqlite3_1.default(DB_PATH, { timeout: 2000 });
            const result = checkDb.pragma('integrity_check');
            checkDb.close();
            const rows = result;
            if (rows[0] && rows[0].integrity_check === 'ok') {
                return true;
            }
            return false;
        }
        catch (err) {
            console.error('[HubOfflineStore] ⚠️ Integrity check failed or DB is locked:', err);
            return false;
        }
    }
    /**
     * Restores the database from the latest healthy backup in .goldshemesh/backups/
     */
    attemptAutoRecovery() {
        console.error('[HubOfflineStore] 🚨 CRITICAL: Database corruption detected. Initiating Auto-Recovery...');
        try {
            if (!node_fs_1.default.existsSync(env_1.env.BACKUP_DIR)) {
                console.error('[HubOfflineStore] ❌ Recovery failed: No backup directory found.');
                return;
            }
            const backups = node_fs_1.default.readdirSync(env_1.env.BACKUP_DIR)
                .filter(f => f.startsWith('hub-store_') && f.endsWith('.db'))
                .sort()
                .reverse(); // Latest first
            if (backups.length === 0) {
                console.error('[HubOfflineStore] ❌ Recovery failed: No backup files available.');
                return;
            }
            const latestBackup = node_path_1.default.join(env_1.env.BACKUP_DIR, backups[0]);
            console.info(`[HubOfflineStore] 🛠 Restoring from latest backup: ${backups[0]}`);
            // Move corrupted DB to a quarantine file for forensic analysis
            const quarantinePath = `${DB_PATH}.corrupted.${Date.now()}`;
            node_fs_1.default.renameSync(DB_PATH, quarantinePath);
            // Copy backup to live DB path
            node_fs_1.default.copyFileSync(latestBackup, DB_PATH);
            console.info('[HubOfflineStore] ✅ CRITICAL RECOVERY EVENT COMPLETE. System restored.');
        }
        catch (err) {
            console.error('[HubOfflineStore] ❌ Recovery process failed:', err);
        }
    }
    /** SQLite3 performance tuning — safe for our local-only use case */
    configure() {
        this.db.pragma('journal_mode = WAL'); // WAL for concurrent reads during writes
        this.db.pragma('synchronous = NORMAL'); // Safe + fast (no fdatasync on every write)
        this.db.pragma('foreign_keys = ON');
        this.db.pragma('cache_size = -8000'); // 8 MB page cache
        this.db.pragma('temp_store = MEMORY');
    }
    migrate() {
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
        (0, delta_processor_1.migrateDeltaTables)(this.db);
    }
    // ─── Devices ───────────────────────────────────────────────
    upsertDevice(device) {
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
    setDeviceOnline(deviceId, online) {
        this.db
            .prepare(`UPDATE devices SET is_online = ?, last_seen = ? WHERE device_id = ?`)
            .run(online ? 1 : 0, Date.now(), deviceId);
    }
    getDevice(deviceId) {
        const row = this.db
            .prepare(`SELECT * FROM devices WHERE device_id = ?`)
            .get(deviceId);
        return row ? this.rowToDevice(row) : undefined;
    }
    getAllDevices() {
        return this.db.prepare(`SELECT * FROM devices`).all().map(this.rowToDevice);
    }
    rowToDevice(row) {
        return {
            deviceId: row.device_id,
            deviceName: row.device_name,
            deviceType: row.device_type,
            ecdhPublicKey: row.ecdh_public_key,
            registeredAt: row.registered_at,
            lastSeen: row.last_seen,
            isOnline: row.is_online === 1,
        };
    }
    // ─── Messages ──────────────────────────────────────────────
    /**
     * HIGH-CAPACITY SCALING: Store message via in-memory buffer.
     * Prevents "Database Locked" errors by batching writes into a single transaction.
     */
    storeMessage(packet, conversationId) {
        this.messageQueue.push({ packet, conversationId });
        if (this.messageQueue.length >= this.BATCH_SIZE) {
            this.flushQueue();
        }
        else if (!this.flushTimer) {
            this.flushTimer = setTimeout(() => this.flushQueue(), this.FLUSH_INTERVAL_MS);
        }
    }
    flushQueue() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        if (this.messageQueue.length === 0)
            return;
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
        }
        catch (err) {
            console.error('[OfflineStore] Batch flush failed:', err);
            // Re-queue on failure? For now, we log it.
        }
    }
    markDelivered(packetId) {
        this.db
            .prepare(`UPDATE messages SET delivered_at = ? WHERE packet_id = ?`)
            .run(Date.now(), packetId);
    }
    markRead(packetId) {
        this.db
            .prepare(`UPDATE messages SET read_at = ? WHERE packet_id = ?`)
            .run(Date.now(), packetId);
    }
    /**
     * Get all messages for a device that were stored after seq `afterSeq` for
     * each source device, used for offline sync.
     */
    getMessagesForSync(targetDeviceId, highWaterMarks) {
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
            .all(targetDeviceId, targetDeviceId);
        return rows
            .filter((row) => {
            const fromId = row.from_device_id;
            const seq = row.seq;
            const hwm = highWaterMarks[fromId] ?? 0;
            return seq > hwm;
        })
            .map(this.rowToPacket);
    }
    rowToPacket(row) {
        return {
            v: '1.0.0',
            id: row.packet_id,
            type: row.type,
            from: row.from_device_id,
            to: row.to_device_id,
            ts: row.sender_ts,
            seq: row.seq,
            payload: row.payload,
        };
    }
    // ─── Pairing Codes ─────────────────────────────────────────
    storePairingCode(code, ttlMs = 5 * 60 * 1000) {
        const now = Date.now();
        this.db
            .prepare(`
        INSERT INTO pairing_codes (code, created_at, expires_at)
        VALUES (?, ?, ?)
      `)
            .run(code, now, now + ttlMs);
    }
    validateAndConsumePairingCode(code, usedByDeviceId) {
        const now = Date.now();
        const row = this.db
            .prepare(`
        SELECT * FROM pairing_codes
        WHERE code = ? AND used_at IS NULL AND expires_at > ?
      `)
            .get(code, now);
        if (!row)
            return false;
        this.db
            .prepare(`UPDATE pairing_codes SET used_at = ?, used_by_device_id = ? WHERE code = ?`)
            .run(now, usedByDeviceId, code);
        return true;
    }
    expireOldPairingCodes() {
        this.db
            .prepare(`DELETE FROM pairing_codes WHERE expires_at < ?`)
            .run(Date.now() - 60_000);
    }
    // ─── File Transfers ────────────────────────────────────────
    initFileTransfer(manifest, fromId, toId) {
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
    incrementReceivedChunks(fileId) {
        this.db
            .prepare(`UPDATE file_transfers SET received_chunks = received_chunks + 1 WHERE file_id = ?`)
            .run(fileId);
    }
    completeFileTransfer(fileId) {
        this.db
            .prepare(`UPDATE file_transfers SET status = 'complete', completed_at = ? WHERE file_id = ?`)
            .run(Date.now(), fileId);
    }
    abortFileTransfer(fileId) {
        this.db
            .prepare(`UPDATE file_transfers SET status = 'aborted' WHERE file_id = ?`)
            .run(fileId);
    }
    getFileTransfer(fileId) {
        return this.db
            .prepare(`SELECT * FROM file_transfers WHERE file_id = ?`)
            .get(fileId);
    }
    // ─── Sync state ────────────────────────────────────────────
    updateSyncState(observerDeviceId, sourceDeviceId, seq) {
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
    saveHubDeviceId(hubId) {
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
    getHubDeviceId() {
        // Ensure the table exists (first boot scenario)
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS hub_config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
        const row = this.db
            .prepare(`SELECT value FROM hub_config WHERE key = 'hub_device_id'`)
            .get();
        return row?.value ?? null;
    }
    saveSystemSecret(secret) {
        this.db
            .prepare(`INSERT INTO hub_config (key, value) VALUES ('system_secret', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
            .run(secret);
    }
    getSystemSecret() {
        const row = this.db
            .prepare(`SELECT value FROM hub_config WHERE key = 'system_secret'`)
            .get();
        return row?.value ?? null;
    }
    // ─── Conversation List ─────────────────────────────────────
    /**
     * Get a list of conversations with the last message preview
     * and unread count. Used by the messenger sidebar.
     */
    getConversationList(hubDeviceId) {
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
            .all(hubDeviceId, hubDeviceId);
        return rows.map((r) => ({
            conversationId: r.conversation_id,
            peerDeviceId: r.peer_device_id,
            lastMessageType: r.last_type,
            lastMessagePayload: r.last_payload,
            lastMessageTs: r.last_ts,
            unreadCount: r.unread_count,
        }));
    }
    // ─── Message History (paginated) ───────────────────────────
    /**
     * Fetch messages for a conversation with cursor-based pagination.
     * Returns newest-first up to `limit`, optionally before a timestamp.
     */
    getMessageHistory(conversationId, limit = 50, beforeTs) {
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
        const rows = this.db.prepare(query).all(...args);
        return rows
            .map((r) => ({
            packetId: r.packet_id,
            type: r.type,
            fromDeviceId: r.from_device_id,
            toDeviceId: r.to_device_id,
            conversationId: r.conversation_id,
            payload: r.payload,
            seq: r.seq,
            senderTs: r.sender_ts,
            hubStoredAt: r.hub_stored_at,
            deliveredAt: r.delivered_at,
            readAt: r.read_at,
        }))
            .reverse(); // Return oldest-first for UI rendering
    }
    // ─── Bulk Mark Read ────────────────────────────────────────
    /** Mark all messages in a conversation as read */
    bulkMarkRead(conversationId, selfDeviceId) {
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
    searchMessages(query, conversationId, limit = 30) {
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
        const rows = this.db.prepare(sql).all(...args);
        return rows.map((r) => ({
            packetId: r.packet_id,
            type: r.type,
            fromDeviceId: r.from_device_id,
            toDeviceId: r.to_device_id,
            conversationId: r.conversation_id,
            payload: r.payload,
            seq: r.seq,
            senderTs: r.sender_ts,
            hubStoredAt: r.hub_stored_at,
            deliveredAt: r.delivered_at,
            readAt: r.read_at,
        }));
    }
    // ─── Stats / Metrics ──────────────────────────────────────
    getMessageCount() {
        const row = this.db
            .prepare(`SELECT COUNT(*) as cnt FROM messages`)
            .get();
        return row.cnt;
    }
    getFileTransferCount() {
        const row = this.db
            .prepare(`SELECT COUNT(*) as cnt FROM file_transfers`)
            .get();
        return row.cnt;
    }
    /** Remove a device from the registry (kick) */
    removeDevice(deviceId) {
        this.db.prepare(`DELETE FROM devices WHERE device_id = ?`).run(deviceId);
    }
    // ─── Incidents ─────────────────────────────────────────────
    storeIncident(incident) {
        this.db
            .prepare(`
        INSERT INTO incidents (id, device_id, device_name, type, severity, description, ts)
        VALUES (@id, @deviceId, @deviceName, @type, @severity, @description, @ts)
      `)
            .run(incident);
    }
    getRecentIncidents(limit = 100) {
        return this.db
            .prepare(`SELECT * FROM incidents ORDER BY ts DESC LIMIT ?`)
            .all(limit);
    }
    // ─── Database Accessor ─────────────────────────────────────
    /** Expose the raw better-sqlite3 Database handle for DeltaProcessor and BackupScheduler */
    getDb() {
        return this.db;
    }
    // ─── Lifecycle ─────────────────────────────────────────────
    close() {
        this.flushQueue(); // Final flush before shutdown
        this.db.close();
    }
}
exports.HubOfflineStore = HubOfflineStore;

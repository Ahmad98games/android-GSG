-- GOLD SHE HUB — Initial Infrastructure Migration v9.0
-- Pillar 6: Production-Grade Forensic Persistence

PRAGMA foreign_keys = ON;

-- 1. Nodes & Handshake
CREATE TABLE IF NOT EXISTS nodes (
    node_id TEXT PRIMARY KEY,
    device_name TEXT,
    paired_at INTEGER,
    last_seen INTEGER,
    sync_offset_ms INTEGER,
    status TEXT DEFAULT 'active'
);

-- 2. Sessions
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    jwt_token TEXT,
    ecdh_public_key TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (node_id) REFERENCES nodes(node_id)
);

-- 3. Stock Batches
CREATE TABLE IF NOT EXISTS stock_batches (
    batch_id TEXT PRIMARY KEY,
    batch_code TEXT UNIQUE NOT NULL,
    description TEXT,
    current_qty TEXT NOT NULL,
    unit TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 4. Scan Events
CREATE TABLE IF NOT EXISTS scan_events (
    event_id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    worker_id TEXT,
    barcode TEXT NOT NULL,
    batch_id TEXT,
    scanned_at INTEGER NOT NULL,
    received_at INTEGER NOT NULL,
    sync_status TEXT DEFAULT 'pending',
    FOREIGN KEY (node_id) REFERENCES nodes(node_id),
    FOREIGN KEY (batch_id) REFERENCES stock_batches(batch_id)
);

-- 5. Khata (Financial Ledger)
CREATE TABLE IF NOT EXISTS khata_entries (
    entry_id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    debit_account TEXT NOT NULL,
    credit_account TEXT NOT NULL,
    amount_pkr TEXT NOT NULL,
    reversal_of TEXT,
    created_at INTEGER NOT NULL,
    sync_status TEXT DEFAULT 'pending',
    FOREIGN KEY (node_id) REFERENCES nodes(node_id),
    FOREIGN KEY (reversal_of) REFERENCES khata_entries(entry_id)
);

-- 6. Stock Deltas
CREATE TABLE IF NOT EXISTS stock_deltas (
    delta_id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    qty TEXT NOT NULL,
    vector_clock TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    sync_status TEXT DEFAULT 'pending',
    FOREIGN KEY (node_id) REFERENCES nodes(node_id),
    FOREIGN KEY (batch_id) REFERENCES stock_batches(batch_id)
);

-- 7. Forensic Events
CREATE TABLE IF NOT EXISTS forensic_events (
    event_id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    payload TEXT,
    binary_log_offset INTEGER,
    binary_log_file TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (node_id) REFERENCES nodes(node_id)
);

-- 8. Forensic Conflicts
CREATE TABLE IF NOT EXISTS forensic_conflicts (
    conflict_id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    local_value TEXT,
    remote_value TEXT,
    resolution TEXT DEFAULT 'local_wins',
    created_at INTEGER NOT NULL
);

-- 9. Tactical Messenger
CREATE TABLE IF NOT EXISTS messages (
    message_id TEXT PRIMARY KEY,
    from_node_id TEXT NOT NULL,
    to_node_id TEXT,
    content TEXT,
    media_type TEXT DEFAULT 'text',
    is_encrypted INTEGER DEFAULT 1,
    sent_at INTEGER NOT NULL,
    delivered_at INTEGER,
    FOREIGN KEY (from_node_id) REFERENCES nodes(node_id)
);

-- 10. Sync State
CREATE TABLE IF NOT EXISTS sync_state (
    table_name TEXT PRIMARY KEY,
    last_synced_at INTEGER,
    last_sync_cursor TEXT,
    pending_count INTEGER DEFAULT 0
);

-- 11. Binary Log Index
CREATE TABLE IF NOT EXISTS binary_log_index (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id TEXT NOT NULL,
    log_file TEXT NOT NULL,
    byte_offset INTEGER NOT NULL,
    packet_length INTEGER NOT NULL,
    received_at INTEGER NOT NULL,
    FOREIGN KEY (node_id) REFERENCES nodes(node_id)
);

-- 12. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    payload TEXT,
    ip_address TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scans_node ON scan_events(node_id);
CREATE INDEX IF NOT EXISTS idx_scans_sync ON scan_events(sync_status);
CREATE INDEX IF NOT EXISTS idx_scans_ts ON scan_events(scanned_at);
CREATE INDEX IF NOT EXISTS idx_khata_worker ON khata_entries(worker_id);
CREATE INDEX IF NOT EXISTS idx_khata_sync ON khata_entries(sync_status);
CREATE INDEX IF NOT EXISTS idx_khata_ts ON khata_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_deltas_batch ON stock_deltas(batch_id);
CREATE INDEX IF NOT EXISTS idx_deltas_sync ON stock_deltas(sync_status);
CREATE INDEX IF NOT EXISTS idx_forensic_node ON forensic_events(node_id);
CREATE INDEX IF NOT EXISTS idx_forensic_type ON forensic_events(event_type);
CREATE INDEX IF NOT EXISTS idx_forensic_ts ON forensic_events(created_at);
CREATE INDEX IF NOT EXISTS idx_binary_node ON binary_log_index(node_id);
CREATE INDEX IF NOT EXISTS idx_binary_lookup ON binary_log_index(log_file, byte_offset);

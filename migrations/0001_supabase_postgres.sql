-- GOLD SHE HUB — Cloud (Supabase/PostgreSQL) Migration v9.0
-- Pillar 6: Cloud-First Idempotency

-- 1. Nodes & Handshake
CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ,
    is_online BOOLEAN DEFAULT FALSE,
    sync_offset INTEGER NOT NULL
);

-- 2. Khata (Financial Ledger)
CREATE TABLE IF NOT EXISTS khata_entries (
    id UUID PRIMARY KEY,
    debit_account TEXT NOT NULL,
    credit_account TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    currency TEXT DEFAULT 'PKR',
    description TEXT,
    node_id TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    sync_status TEXT DEFAULT 'synced',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_khata_worker ON khata_entries(worker_id);
CREATE INDEX IF NOT EXISTS idx_khata_ts ON khata_entries(timestamp);

-- 3. Inventory
CREATE TABLE IF NOT EXISTS stock_batches (
    id TEXT PRIMARY KEY,
    article_code TEXT NOT NULL,
    total_quantity NUMERIC(20, 8) NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_deltas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id TEXT NOT NULL REFERENCES stock_batches(id),
    node_id TEXT NOT NULL,
    quantity_delta NUMERIC(20, 8) NOT NULL,
    operation TEXT NOT NULL,
    vector_clock JSONB NOT NULL,
    timestamp BIGINT NOT NULL
);

-- 4. Forensics
CREATE TABLE IF NOT EXISTS forensic_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT,
    raw_packet_ref BIGINT,
    timestamp BIGINT NOT NULL
);

-- 5. Audit
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    ip TEXT,
    timestamp BIGINT NOT NULL
);

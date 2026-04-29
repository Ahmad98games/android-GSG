-- LAYER 3: INDUSTRY PROFILE SYSTEM — METADATA TABLE

CREATE TABLE IF NOT EXISTS entity_metadata (
    metadata_id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('scan', 'khata', 'stock', 'node')),
    entity_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    value_type TEXT NOT NULL CHECK(value_type IN ('string', 'number', 'boolean', 'decimal', 'date')),
    created_at INTEGER NOT NULL,
    UNIQUE (entity_type, entity_id, key)
);

CREATE INDEX IF NOT EXISTS idx_entity_metadata_lookup ON entity_metadata(entity_type, entity_id);

-- Rollback logic
-- DROP TABLE entity_metadata;

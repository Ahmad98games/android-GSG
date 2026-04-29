-- LAYER 2: HUB-SIDE OFFLINE MESSAGING

CREATE TABLE IF NOT EXISTS hub_messages (
    message_id TEXT PRIMARY KEY,
    from_node_id TEXT NOT NULL REFERENCES nodes(id),
    to_node_id TEXT REFERENCES nodes(id), -- NULL = broadcast to all
    encrypted_payload BLOB NOT NULL,
    media_type TEXT DEFAULT 'text',
    sent_at INTEGER NOT NULL,
    delivered_at INTEGER,
    delivery_status TEXT DEFAULT 'pending' CHECK(delivery_status IN ('pending', 'delivered', 'failed')),
    ttl_expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS typing_events (
    from_node_id TEXT NOT NULL,
    to_node_id TEXT NOT NULL,
    last_typing_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hub_messages_to_delivery ON hub_messages(to_node_id, delivery_status);
CREATE INDEX IF NOT EXISTS idx_hub_messages_ttl ON hub_messages(ttl_expires_at);
CREATE INDEX IF NOT EXISTS idx_hub_messages_from ON hub_messages(from_node_id);

-- Rollback logic
-- DROP TABLE typing_events;
-- DROP TABLE hub_messages;

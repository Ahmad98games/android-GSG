import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const nodes = sqliteTable('nodes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['hub_pc', 'node_mobile'] }).notNull(),
  registeredAt: integer('registered_at').default(sql`CURRENT_TIMESTAMP`),
  lastSeen: integer('last_seen'),
  isOnline: integer('is_online', { mode: 'boolean' }).default(false),
  syncOffset: integer('sync_offset').notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  nodeId: text('node_id').notNull().references(() => nodes.id),
  sessionKey: text('session_key').notNull(),
  jwtToken: text('jwt_token').notNull(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
});

export const scanEvents = sqliteTable('scan_events', {
  id: text('id').primaryKey(),
  nodeId: text('node_id').notNull().references(() => nodes.id),
  workerId: text('worker_id'),
  barcode: text('barcode').notNull(),
  locationId: text('location_id'),
  timestamp: integer('timestamp').notNull(),
  rawLogOffset: integer('raw_log_offset'),
}, (table) => ({

  nodeIdx: index('idx_scan_node').on(table.nodeId),
  tsIdx: index('idx_scan_ts').on(table.timestamp),
}));

export const khataEntries = sqliteTable('khata_entries', {
  id: text('id').primaryKey(),
  debitAccount: text('debit_account').notNull(),
  creditAccount: text('credit_account').notNull(),
  amount: text('amount').notNull(),
  currency: text('currency').default('PKR'),
  description: text('description'),
  nodeId: text('node_id').notNull(),
  workerId: text('worker_id').notNull(),
  timestamp: integer('timestamp').notNull(),
  syncStatus: text('sync_status', { enum: ['pending', 'synced', 'conflict'] }).default('pending'),
}, (table) => ({

  workerIdx: index('idx_khata_worker').on(table.workerId),
  syncIdx: index('idx_khata_sync').on(table.syncStatus),
  tsIdx: index('idx_khata_ts').on(table.timestamp),
}));

export const stockBatches = sqliteTable('stock_batches', {
  id: text('id').primaryKey(),
  articleCode: text('article_code').notNull(),
  totalQuantity: text('total_quantity').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const stockDeltas = sqliteTable('stock_deltas', {
  id: text('id').primaryKey(),
  batchId: text('batch_id').notNull().references(() => stockBatches.id),
  nodeId: text('node_id').notNull(),
  quantityDelta: text('quantity_delta').notNull(),
  operation: text('operation', { enum: ['inward', 'outward', 'transfer'] }).notNull(),
  vectorClock: text('vector_clock').notNull(),
  timestamp: integer('timestamp').notNull(),
});

export const forensicEvents = sqliteTable('forensic_events', {
  id: text('id').primaryKey(),
  nodeId: text('node_id').notNull(),
  type: text('type').notNull(),
  severity: text('severity', { enum: ['low', 'warn', 'critical'] }).notNull(),
  description: text('description'),
  rawPacketRef: integer('raw_packet_ref'),
  timestamp: integer('timestamp').notNull(),
});

export const forensicConflicts = sqliteTable('forensic_conflicts', {
  id: text('id').primaryKey(),
  table: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  localState: text('local_state'),
  remoteState: text('remote_state'),
  resolvedAt: integer('resolved_at').notNull(),
});

export const adminAuditLog = sqliteTable('admin_audit_log', {
  id: text('id').primaryKey(),
  adminUser: text('admin_user').notNull(),
  action: text('action').notNull(),
  targetId: text('target_id'),
  ip: text('ip'),
  timestamp: integer('timestamp').notNull(),
});

export const syncState = sqliteTable('sync_state', {
  tableName: text('table_name').primaryKey(),
  lastSyncedAt: integer('last_synced_at').notNull(),
});

export const binaryLogIndex = sqliteTable('binary_log_index', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fileName: text('file_name').notNull(),
  date: text('date').notNull(),
  startOffset: integer('start_offset').notNull(),
  endOffset: integer('end_offset'),
});

export const hubMessages = sqliteTable('hub_messages', {
  messageId: text('message_id').primaryKey(),
  fromNodeId: text('from_node_id').notNull().references(() => nodes.id),
  toNodeId: text('to_node_id').references(() => nodes.id),
  encryptedPayload: text('encrypted_payload').notNull(), // SQLite BLOB is handled as Buffer/Uint8Array in Drizzle, but I'll use text for now if it's base64 or just use blob if I can. Drizzle sqlite-core has blob.
  mediaType: text('media_type').default('text'),
  sentAt: integer('sent_at').notNull(),
  deliveredAt: integer('delivered_at'),
  deliveryStatus: text('delivery_status').default('pending'),
  ttlExpiresAt: integer('ttl_expires_at').notNull(),
}, (table) => ({
  toDeliveryIdx: index('idx_msg_to_delivery').on(table.toNodeId, table.deliveryStatus),
  ttlIdx: index('idx_msg_ttl').on(table.ttlExpiresAt),
}));


export const typingEvents = sqliteTable('typing_events', {
  fromNodeId: text('from_node_id').notNull(),
  toNodeId: text('to_node_id').notNull(),
  lastTypingAt: integer('last_typing_at').notNull(),
});


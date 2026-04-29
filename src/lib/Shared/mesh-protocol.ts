/**
 * Gold She Mesh — Tactical Communication Protocol v1.0
 * Shared between textile-admin (PC Hub) and textile-mobile (Node Devices)
 *
 * Transport:   WebSocket over LAN (no internet required)
 * Encryption:  ECDH P-256 key exchange → HKDF → AES-256-GCM
 * Topology:    Star — PC is Hub, mobiles are Nodes (Hub relays all traffic)
 * Offline:     Messages queued in SQLite, synced on reconnect via vector clocks
 * Max Devices: 10 nodes + 1 hub = 11 total
 */

export const MESH_VERSION = '1.0.0';

/** WebSocket port the Hub listens on — must be open on LAN */
export const HUB_PORT = 7447;

/** File transfer chunk size — 64 KB balances throughput vs. memory */
export const CHUNK_SIZE_BYTES = 65_536;

/** Heartbeat keeps connection alive through NAT/switches */
export const HEARTBEAT_INTERVAL_MS = 20_000;

/** Exponential backoff delays (ms) for reconnect attempts */
export const RECONNECT_BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];

export const MAX_DEVICES = 70;

// ─────────────────────────────────────────────────────────────
// PACKET TYPES
// ─────────────────────────────────────────────────────────────

export type MessageType =
  // ── Handshake ──────────────────────────────────────────────
  | 'HANDSHAKE_INIT'         // Node → Hub: introduce + send ephemeral ECDH pub key
  | 'HANDSHAKE_ACK'          // Hub → Node: send own ephemeral key + encrypted verify
  | 'HANDSHAKE_COMPLETE'     // Node → Hub: confirm session key derived
  // ── Pairing ────────────────────────────────────────────────
  | 'PAIRING_VALIDATE'       // Node → Hub: present pairing code to claim device slot
  | 'PAIRING_ACCEPT'         // Hub → Node: slot granted, here is your identity
  | 'PAIRING_REJECT'         // Hub → Node: code invalid / max devices reached
  // ── Messaging ──────────────────────────────────────────────
  | 'TEXT_MESSAGE'
  | 'PHOTO_MESSAGE'
  | 'VOICE_NOTE'
  // ── File Transfer ──────────────────────────────────────────
  | 'FILE_MANIFEST'          // sender → hub → receiver: announce incoming file
  | 'FILE_MANIFEST_ACK'      // receiver → hub → sender: ready to receive
  | 'FILE_CHUNK'             // sender → hub → receiver: one 64KB chunk
  | 'FILE_CHUNK_ACK'         // receiver → hub → sender: chunk confirmed
  | 'FILE_COMPLETE'          // receiver → hub → sender: all chunks received + verified
  | 'FILE_ABORT'             // either side: cancel transfer
  // ── Receipts ───────────────────────────────────────────────
  | 'DELIVERY_RECEIPT'       // hub → sender: message reached hub store
  | 'READ_RECEIPT'           // recipient → hub → sender: message opened
  // ── Device State ───────────────────────────────────────────
  | 'DEVICE_REGISTRY'        // Hub → Node (on connect): full list of known devices
  | 'DEVICE_ONLINE'          // Hub → broadcast: a device came online
  | 'DEVICE_OFFLINE'         // Hub → broadcast: a device went offline
  | 'HEARTBEAT'
  | 'HEARTBEAT_ACK'
  // ── Sync ───────────────────────────────────────────────────
  | 'SYNC_REQUEST'           // Node → Hub: give me missed messages since seq X
  | 'SYNC_BATCH'             // Hub → Node: here are your missed packets
  // ── Presence ─────────────────────────────────────────────
  | 'TYPING_INDICATOR'       // Any → Hub → others: user is typing
  | 'PRESENCE_UPDATE'        // Hub → broadcast: device presence change
  // ── Telemetry & Industrial ─────────────────────────────────
  | 'TELEMETRY_BEAT'         // Node → Hub: battery, signal, sensors
  | 'AI_TELEMETRY'           // Node → Hub: live CCTV inference / object detection
  | 'KHATA_ENTRY'            // Node → Hub: ledger entry (pending state)
  | 'VOCABULARY_UPDATE'      // Hub → broadcast: update industrial terminology
  // ── Control ────────────────────────────────────────────────
  | 'SYSTEM_COMMAND'         // Hub → Node: trigger hardware (vibrate, flash, etc)
  | 'SYSTEM_STRESS'          // Hub → UI: performance throttle warning
  | 'FORENSIC_INCIDENT'      // Hub → broadcast: anomalous behavior detected
  | 'ERROR';

// ─────────────────────────────────────────────────────────────
// CORE PACKET ENVELOPE
// ─────────────────────────────────────────────────────────────

/**
 * Every byte on the wire is a JSON-serialized MeshPacket.
 * The `payload` field is either:
 *   - An EncryptedEnvelope (for all user data after handshake)
 *   - A PlainHandshakePayload (only during key exchange — no session key yet)
 */
export interface MeshPacket {
  /** Protocol version — rejects incompatible clients */
  v: string;
  /** UUID v4 — used for deduplication and ACK correlation */
  id: string;
  type: MessageType;
  /** Sender device ID */
  from: string;
  /** Recipient device ID or 'broadcast' */
  to: string;
  /** Unix timestamp ms — sender clock */
  ts: number;
  /**
   * Monotonically increasing per-device sequence number.
   * Used for gap detection and offline sync.
   */
  seq: number;
  /**
   * JSON string of the actual payload.
   * Post-handshake: always EncryptedEnvelope.
   * During handshake: plain HandshakePayload types.
   */
  payload: string;
}

// ─────────────────────────────────────────────────────────────
// ENCRYPTION ENVELOPE
// ─────────────────────────────────────────────────────────────

/** Wraps all post-handshake payloads */
export interface EncryptedEnvelope {
  /** base64 AES-256-GCM ciphertext (payload bytes, tag excluded) */
  ct: string;
  /** base64 12-byte random IV / nonce */
  iv: string;
  /** base64 16-byte GCM authentication tag */
  tag: string;
  /** First 8 hex bytes of SHA-256(sharedSecret) — key rotation check */
  kid: string;
}

// ─────────────────────────────────────────────────────────────
// DEVICE IDENTITY
// ─────────────────────────────────────────────────────────────

export type DeviceType = 'hub_pc' | 'node_mobile';

export interface DeviceIdentity {
  deviceId: string;          // UUID v4
  deviceName: string;        // "Gold She Hub" / "Floor-01"
  deviceType: DeviceType;
  /** base64 raw ECDH P-256 public key — used for long-term key derivation */
  ecdhPublicKey: string;
  registeredAt: number;      // unix ms
  lastSeen: number;          // unix ms
  isOnline: boolean;
}

// ─────────────────────────────────────────────────────────────
// TELEMETRY & INDUSTRIAL
// ─────────────────────────────────────────────────────────────

export interface TelemetryBeatPayload {
  deviceId: string;
  ts: number;               // unix ms
  battery: number;           // 0..100
  signalStrength: number;    // -dBm
  uptime: number;            // node uptime in seconds
  tempCelsius?: number;
  latencyMs?: number;        // RTT in milliseconds
  connectionQuality?: 'stable' | 'weak';
}

export interface AIDetection {
  label: string;
  confidence: number;
  /** Relative percentages 0..1 */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AITelemetryPayload {
  deviceId: string;
  ts: number;
  fps: number;
  detections: AIDetection[];
  /** Optional reference to a frame if Hub should pull it */
  frameId?: string;
  /** Status of the AI engine (running, idle, error, reconnecting) */
  engineStatus: 'running' | 'idle' | 'error' | 'reconnecting';
}

export interface KhataEntryPayload {
  id: string;                // UUID
  workerId: string;
  workerName: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  ts: number;
}

export interface SystemCommandPayload {
  command: 'VIBRATE' | 'FLASHLIGHT_ON' | 'FLASHLIGHT_OFF' | 'REBOOT_APP' | 'FORCE_SYNC';
  durationMs?: number;       // for vibrate
  ts: number;
}

// ─────────────────────────────────────────────────────────────
// HANDSHAKE PAYLOADS  (plain — before session key exists)
// ─────────────────────────────────────────────────────────────

export interface HandshakeInitPayload {
  identity: DeviceIdentity;
  /** base64 ephemeral ECDH P-256 public key — single session use */
  ephemeralPublicKey: string;
  /** base64 32 random bytes — anti-replay nonce */
  nonce: string;
}

export interface HandshakeAckPayload {
  identity: DeviceIdentity;
  ephemeralPublicKey: string;
  /** Echo initiator nonce concatenated with responder nonce */
  nonceEcho: string;
  /**
   * HMAC-SHA256(sharedSecret, "MESH_VERIFY_" + initiatorNonce)
   * Proves responder derived the same secret — prevents MITM
   */
  verifyToken: string;
}

export interface HandshakeCompletePayload {
  /** SHA-256(sharedSecret)[0:8] hex — mutual confirmation */
  keyFingerprint: string;
  verifyToken: string;
}

// ─────────────────────────────────────────────────────────────
// PAIRING
// ─────────────────────────────────────────────────────────────

export interface PairingCodePayload {
  /** The 8-char alphanumeric pairing code (also encoded in QR) */
  code: string;
  /** Hub LAN IP — embedded so mobile can find hub without manual entry */
  hubIp: string;
  hubPort: number;
  /** Hub device ID */
  hubDeviceId: string;
  /** Code expiry unix ms (codes expire after 5 minutes) */
  expiresAt: number;
}

export interface PairingValidatePayload {
  pairingCode: string;
  deviceIdentity: DeviceIdentity;
  ecdhPublicKey: string;
}

export interface PairingAcceptPayload {
  assignedDeviceId: string;
  hubIdentity: DeviceIdentity;
  registeredDevices: DeviceIdentity[];
  /** Secure Bridge JWT issued upon successful pairing */
  bridgeToken?: string;
}

// ─────────────────────────────────────────────────────────────
// MESSAGE PAYLOADS  (encrypted inside EncryptedEnvelope)
// ─────────────────────────────────────────────────────────────

export interface TextMessagePayload {
  msgId: string;
  conversationId: string;
  text: string;
  replyToMsgId?: string;
  mentions?: string[];       // deviceIds
}

export interface PhotoMessagePayload {
  msgId: string;
  conversationId: string;
  caption?: string;
  fileId: string;
  /** base64 JPEG thumbnail ≤ 8 KB — displayed immediately before full download */
  thumbnailBase64: string;
  widthPx: number;
  heightPx: number;
  fileSizeBytes: number;
}

export interface VoiceNotePayload {
  msgId: string;
  conversationId: string;
  fileId: string;
  durationMs: number;
  /** 40-point amplitude envelope 0..1 for waveform visualizer */
  waveform: number[];
}

// ─────────────────────────────────────────────────────────────
// FILE TRANSFER
// ─────────────────────────────────────────────────────────────

export interface FileManifestPayload {
  fileId: string;            // UUID v4
  fileName: string;
  mimeType: string;
  totalBytes: number;
  totalChunks: number;
  /** SHA-256 hex of entire file — final integrity check */
  sha256: string;
  conversationId: string;
  /** msgId this file belongs to (photo/voice/attachment) */
  parentMsgId: string;
}

export interface FileChunkPayload {
  fileId: string;
  chunkIndex: number;        // 0-based
  totalChunks: number;
  /** base64 raw chunk bytes */
  data: string;
  /** SHA-256 hex of this chunk — per-chunk integrity */
  chunkSha256: string;
}

export interface FileChunkAckPayload {
  fileId: string;
  chunkIndex: number;
}

export interface FileAbortPayload {
  fileId: string;
  reason: string;
}

// ─────────────────────────────────────────────────────────────
// SYNC
// ─────────────────────────────────────────────────────────────

/** Node tells Hub: "I have messages up to seq X per device — send me the rest" */
export interface SyncRequestPayload {
  /** Map of deviceId → highest seq number this node has received from that device */
  highWaterMarks: Record<string, number>;
}

export interface SyncBatchPayload {
  packets: MeshPacket[];
  hasMore: boolean;
}

// ─────────────────────────────────────────────────────────────
// DEVICE STATE
// ─────────────────────────────────────────────────────────────

export interface DeviceRegistryPayload {
  devices: DeviceIdentity[];
  hubDeviceId: string;
}

export interface DeviceOnlinePayload {
  device: DeviceIdentity;
}

export interface DeviceOfflinePayload {
  deviceId: string;
  lastSeen: number;
}

// ─────────────────────────────────────────────────────────────
// ERROR
// ─────────────────────────────────────────────────────────────

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
  retriable: boolean;
  correlationId?: string;    // packetId that caused this error
}

export type ErrorCode =
  | 'AUTH_FAILED'
  | 'PAIRING_CODE_INVALID'
  | 'PAIRING_CODE_EXPIRED'
  | 'MAX_DEVICES_REACHED'
  | 'DEVICE_NOT_REGISTERED'
  | 'DECRYPT_FAILED'
  | 'UNKNOWN_PACKET_TYPE'
  | 'RATE_LIMITED'
  | 'FILE_CHECKSUM_MISMATCH'
  | 'INTERNAL';

// ─────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────────────────

/** Construct a MeshPacket with auto-populated v, id, ts */
export function buildPacket(
  type: MessageType,
  from: string,
  to: string,
  seq: number,
  payload: object
): MeshPacket {
  return {
    v: MESH_VERSION,
    id: generateUUID(),
    type,
    from,
    to,
    ts: Date.now(),
    seq,
    payload: JSON.stringify(payload),
  };
}

/** RFC 4122 UUID v4 — works in Node.js and React Native (Hermes) */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older envs
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Build a conversation ID for a direct message pair (order-independent) */
export function dmConversationId(deviceA: string, deviceB: string): string {
  return [deviceA, deviceB].sort().join(':');
}

/** Parse a pairing QR payload string back into PairingCodePayload */
export function decodePairingQR(qrString: string): PairingCodePayload {
  const decoded = atob(qrString);
  return JSON.parse(decoded) as PairingCodePayload;
}

/** Encode a PairingCodePayload for QR display */
export function encodePairingQR(payload: PairingCodePayload): string {
  return btoa(JSON.stringify(payload));
}

// ─────────────────────────────────────────────────────────────
// PRESENCE / TYPING
// ─────────────────────────────────────────────────────────────

export interface TypingIndicatorPayload {
  conversationId: string;
  deviceId: string;
  deviceName: string;
  isTyping: boolean;
}

export interface PresencePayload {
  deviceId: string;
  status: 'online' | 'offline' | 'idle';
  lastSeen: number;
  currentScreen?: string;
}

// ─────────────────────────────────────────────────────────────
// HUB METRICS (for status API + UI dashboard)
// ─────────────────────────────────────────────────────────────

export interface HubMetrics {
  hubDeviceId: string;
  uptime: number;              // ms since hub started
  connectedDevices: number;
  registeredDevices: number;
  totalMessages: number;
  totalFileTransfers: number;
  sseClients: number;
  memoryUsageMB: number;
}

// ─────────────────────────────────────────────────────────────
// CONVERSATION PREVIEW (for sidebar listing)
// ─────────────────────────────────────────────────────────────

export interface ConversationPreview {
  conversationId: string;
  peerDeviceId: string;
  peerDeviceName: string;
  peerDeviceType: DeviceType;
  lastMessageType: string;
  lastMessagePreview: string;   // truncated plain text or '[Photo]' / '[Voice Note]'
  lastMessageTs: number;
  unreadCount: number;
  isOnline: boolean;
}

// ─────────────────────────────────────────────────────────────
// FORENSIC MONITORING
// ─────────────────────────────────────────────────────────────

export interface ForensicIncident {
  id: string;
  deviceId: string;
  deviceName: string;
  type: 'RAPID_SCAN' | 'REPEATED_ERRORS' | 'MIDNIGHT_ACTIVITY' | 'UNAUTHORIZED_ACCESS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  ts: number;
}
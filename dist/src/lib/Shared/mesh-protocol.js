"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_DEVICES = exports.RECONNECT_BACKOFF_MS = exports.HEARTBEAT_INTERVAL_MS = exports.CHUNK_SIZE_BYTES = exports.HUB_PORT = exports.MESH_VERSION = void 0;
exports.buildPacket = buildPacket;
exports.generateUUID = generateUUID;
exports.dmConversationId = dmConversationId;
exports.decodePairingQR = decodePairingQR;
exports.encodePairingQR = encodePairingQR;
exports.MESH_VERSION = '1.0.0';
/** WebSocket port the Hub listens on — must be open on LAN */
exports.HUB_PORT = 7447;
/** File transfer chunk size — 64 KB balances throughput vs. memory */
exports.CHUNK_SIZE_BYTES = 65_536;
/** Heartbeat keeps connection alive through NAT/switches */
exports.HEARTBEAT_INTERVAL_MS = 20_000;
/** Exponential backoff delays (ms) for reconnect attempts */
exports.RECONNECT_BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];
exports.MAX_DEVICES = 70;
// ─────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────────────────
/** Construct a MeshPacket with auto-populated v, id, ts */
function buildPacket(type, from, to, seq, payload) {
    return {
        v: exports.MESH_VERSION,
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
function generateUUID() {
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
function dmConversationId(deviceA, deviceB) {
    return [deviceA, deviceB].sort().join(':');
}
/** Parse a pairing QR payload string back into PairingCodePayload */
function decodePairingQR(qrString) {
    const decoded = atob(qrString);
    return JSON.parse(decoded);
}
/** Encode a PairingCodePayload for QR display */
function encodePairingQR(payload) {
    return btoa(JSON.stringify(payload));
}

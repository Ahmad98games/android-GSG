"use strict";
/**
 * Gold She Mesh — Pairing Manager (PC Hub)
 *
 * Responsible for:
 *   1. Generating single-use 8-char pairing codes (TTL: 5 min)
 *   2. Encoding the QR payload that encodes hub IP + port + code
 *   3. Validating codes presented by connecting mobile nodes
 *   4. Enforcing max device limit
 *
 * Pairing flow:
 *   PC: generateCode() → display code + QR
 *   Mobile: user scans QR or types code → WebSocket connect to hub IP:PORT
 *   Mobile: sends PAIRING_VALIDATE packet
 *   Hub: validates code → stores device → sends PAIRING_ACCEPT
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PairingManager = void 0;
const node_os_1 = __importDefault(require("node:os"));
const cryptoengine_1 = require("./cryptoengine");
const mesh_protocol_1 = require("../Shared/mesh-protocol");
// ─────────────────────────────────────────────────────────────
class PairingManager {
    store;
    hubDeviceId;
    activeCodes = new Map();
    constructor(store, hubDeviceId) {
        this.store = store;
        this.hubDeviceId = hubDeviceId;
    }
    /**
     * Generate a new pairing code.
     * Encodes hub's LAN IP into the payload so mobile can auto-connect.
     * Returns everything needed to display to the user (code string + QR data).
     */
    generateCode() {
        const hubIp = this.getLanIp();
        const rawCode = cryptoengine_1.HubCryptoEngine.generatePairingCode(); // 8 uppercase alphanumeric chars
        const displayString = `GSG-${rawCode.slice(0, 4)}-${rawCode.slice(4)}`;
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        const payload = {
            code: rawCode,
            hubIp,
            hubPort: mesh_protocol_1.HUB_PORT,
            hubDeviceId: this.hubDeviceId,
            expiresAt,
        };
        const qrPayload = (0, mesh_protocol_1.encodePairingQR)(payload);
        const active = {
            code: rawCode,
            qrPayload,
            displayString,
            expiresAt,
            hubIp,
        };
        // Store in both memory (for fast validation) and DB (persistent)
        this.activeCodes.set(rawCode, active);
        this.store.storePairingCode(rawCode);
        // Auto-cleanup from memory after expiry + 30s grace
        setTimeout(() => this.activeCodes.delete(rawCode), 5 * 60 * 1000 + 30_000);
        return active;
    }
    /**
     * Validate a code presented by a connecting device.
     * Returns whether validation succeeded. Consumes the code if valid.
     */
    validate(code, presentingDeviceId, currentDeviceCount) {
        const normalizedCode = code.trim().toUpperCase().replace(/-/g, '');
        if (currentDeviceCount >= mesh_protocol_1.MAX_DEVICES) {
            return { valid: false, reason: `MAX_DEVICES_REACHED: limit is ${mesh_protocol_1.MAX_DEVICES}` };
        }
        const inMemory = this.activeCodes.get(normalizedCode);
        if (!inMemory) {
            return { valid: false, reason: 'PAIRING_CODE_INVALID' };
        }
        if (Date.now() > inMemory.expiresAt) {
            this.activeCodes.delete(normalizedCode);
            return { valid: false, reason: 'PAIRING_CODE_EXPIRED' };
        }
        // Mark as consumed in DB
        const dbValid = this.store.validateAndConsumePairingCode(normalizedCode, presentingDeviceId);
        if (!dbValid) {
            return { valid: false, reason: 'PAIRING_CODE_INVALID' };
        }
        this.activeCodes.delete(normalizedCode);
        return { valid: true };
    }
    /** Get the primary LAN IPv4 address of this machine */
    getLanIp() {
        const interfaces = node_os_1.default.networkInterfaces();
        for (const iface of Object.values(interfaces)) {
            if (!iface)
                continue;
            for (const entry of iface) {
                if (entry.family === 'IPv4' && !entry.internal) {
                    return entry.address;
                }
            }
        }
        return '127.0.0.1'; // fallback — shouldn't happen on a networked machine
    }
    /** Check if any active un-expired codes exist (for UI status display) */
    hasActiveCode() {
        const now = Date.now();
        for (const [, code] of this.activeCodes) {
            if (now < code.expiresAt)
                return true;
        }
        return false;
    }
}
exports.PairingManager = PairingManager;

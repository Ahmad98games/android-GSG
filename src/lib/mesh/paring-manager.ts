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

import os from 'node:os';
import type { HubOfflineStore } from './offline-store';
import { HubCryptoEngine } from './cryptoengine';
import type { PairingCodePayload } from '../Shared/mesh-protocol';
import { HUB_PORT, MAX_DEVICES, encodePairingQR } from '../Shared/mesh-protocol';

// ─────────────────────────────────────────────────────────────

export interface ActivePairingCode {
  code: string;
  qrPayload: string;    // base64 for QR display
  displayString: string; // "GSG-ABCD-1234" human-readable
  expiresAt: number;
  hubIp: string;
}

// ─────────────────────────────────────────────────────────────

export class PairingManager {
  private activeCodes = new Map<string, ActivePairingCode>();

  constructor(
    private readonly store: HubOfflineStore,
    private readonly hubDeviceId: string
  ) {}

  /**
   * Generate a new pairing code.
   * Encodes hub's LAN IP into the payload so mobile can auto-connect.
   * Returns everything needed to display to the user (code string + QR data).
   */
  generateCode(): ActivePairingCode {
    const hubIp = this.getLanIp();
    const rawCode = HubCryptoEngine.generatePairingCode(); // 8 uppercase alphanumeric chars
    const displayString = `GSG-${rawCode.slice(0, 4)}-${rawCode.slice(4)}`;
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    const payload: PairingCodePayload = {
      code: rawCode,
      hubIp,
      hubPort: HUB_PORT,
      hubDeviceId: this.hubDeviceId,
      expiresAt,
    };

    const qrPayload = encodePairingQR(payload);

    const active: ActivePairingCode = {
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
  validate(
    code: string,
    presentingDeviceId: string,
    currentDeviceCount: number
  ): { valid: boolean; reason?: string } {
    const normalizedCode = code.trim().toUpperCase().replace(/-/g, '');

    if (currentDeviceCount >= MAX_DEVICES) {
      return { valid: false, reason: `MAX_DEVICES_REACHED: limit is ${MAX_DEVICES}` };
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
    const dbValid = this.store.validateAndConsumePairingCode(
      normalizedCode,
      presentingDeviceId
    );
    if (!dbValid) {
      return { valid: false, reason: 'PAIRING_CODE_INVALID' };
    }

    this.activeCodes.delete(normalizedCode);
    return { valid: true };
  }

  /** Get the primary LAN IPv4 address of this machine */
  private getLanIp(): string {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
      if (!iface) continue;
      for (const entry of iface) {
        if (entry.family === 'IPv4' && !entry.internal) {
          return entry.address;
        }
      }
    }
    return '127.0.0.1'; // fallback — shouldn't happen on a networked machine
  }

  /** Check if any active un-expired codes exist (for UI status display) */
  hasActiveCode(): boolean {
    const now = Date.now();
    for (const [, code] of this.activeCodes) {
      if (now < code.expiresAt) return true;
    }
    return false;
  }
}
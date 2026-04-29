/**
 * Gold She Mesh — Hub Crypto Engine (Node.js)
 *
 * Algorithm chain:
 *   1. ECDH P-256 (ephemeral per-session) → shared raw bits
 *   2. HKDF-SHA256 → AES-256-GCM session key
 *   3. AES-256-GCM (random 96-bit IV per message) → ciphertext + auth tag
 *
 * Every session uses a FRESH ephemeral key pair.
 * Long-lived identity keys are stored in the DB and used only for device registry.
 */

import { webcrypto } from 'node:crypto';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { EncryptedEnvelope } from '../Shared/mesh-protocol.ts';

const { subtle } = webcrypto;

const ECDH_PARAMS: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' };
const AES_ALGO = 'AES-GCM' as const;
const AES_KEY_LEN = 256;
const HKDF_HASH = 'SHA-256';
const HKDF_SALT = Buffer.from('GoldSheMesh-HKDF-Salt-v1', 'utf8');
const HKDF_INFO = Buffer.from('GoldSheMesh/SessionKey/v1', 'utf8');

// ─────────────────────────────────────────────────────────────

export interface EphemeralKeyBundle {
  keyPair: CryptoKeyPair;
  publicBase64: string;
}

export interface SessionContext {
  peerId: string;
  sessionKey: CryptoKey;
  keyFingerprint: string;   // hex SHA-256(rawSharedSecret)[0..7]
  establishedAt: number;
}

// ─────────────────────────────────────────────────────────────

export class HubCryptoEngine {
  /** Active E2EE sessions indexed by remote deviceId */
  private readonly sessions = new Map<string, SessionContext>();

  /** Generate an ephemeral ECDH P-256 key pair for one handshake */
  async generateEphemeralBundle(): Promise<EphemeralKeyBundle> {
    const keyPair = await subtle.generateKey(ECDH_PARAMS, true, [
      'deriveKey',
      'deriveBits',
    ]);
    const rawPub = await subtle.exportKey('raw', keyPair.publicKey);
    return {
      keyPair,
      publicBase64: Buffer.from(rawPub).toString('base64'),
    };
  }

  /** Import a peer's raw ECDH public key from base64 */
  async importPeerPublicKey(base64: string): Promise<CryptoKey> {
    const raw = Buffer.from(base64, 'base64');
    return subtle.importKey(
      'raw',
      raw,
      ECDH_PARAMS,
      false,  // non-extractable is fine — we only need to derive
      []      // no key ops on a raw peer key
    );
  }

  /**
   * Derive a shared AES-256-GCM session key from our ephemeral private key
   * and the peer's ephemeral public key. Both sides call this — they get
   * the same key without ever transmitting it.
   */
  async deriveSessionKey(
    myEphemeralPrivateKey: CryptoKey,
    peerEphemeralPublicKey: CryptoKey,
    peerId: string
  ): Promise<SessionContext> {
    // Step 1 — ECDH: raw shared secret (32 bytes for P-256)
    const rawShared = await subtle.deriveBits(
      { name: 'ECDH', public: peerEphemeralPublicKey },
      myEphemeralPrivateKey,
      256
    );
    const rawSharedBuf = Buffer.from(rawShared);

    // Step 2 — HKDF: stretch into a proper AES key
    const hkdfMaterial = await subtle.importKey(
      'raw',
      rawSharedBuf,
      'HKDF',
      false,
      ['deriveKey']
    );

    const sessionKey = await subtle.deriveKey(
      {
        name: 'HKDF',
        hash: HKDF_HASH,
        salt: HKDF_SALT,
        info: HKDF_INFO,
      },
      hkdfMaterial,
      { name: AES_ALGO, length: AES_KEY_LEN },
      false,   // AES session key must not be extractable
      ['encrypt', 'decrypt']
    );

    // Step 3 — Key fingerprint: SHA-256(rawShared)[0..7] as hex
    const fpBytes = createHash('sha256').update(rawSharedBuf).digest();
    const keyFingerprint = fpBytes.subarray(0, 8).toString('hex');

    const ctx: SessionContext = {
      peerId,
      sessionKey,
      keyFingerprint,
      establishedAt: Date.now(),
    };
    this.sessions.set(peerId, ctx);
    return ctx;
  }

  /**
   * Encrypt a JSON-serializable payload for a specific peer.
   * Returns an EncryptedEnvelope — the only thing that travels on the wire.
   */
  async encrypt(plainPayload: object, peerId: string): Promise<EncryptedEnvelope> {
    const ctx = this.requireSession(peerId);
    const iv = webcrypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce
    const plainBytes = new TextEncoder().encode(JSON.stringify(plainPayload));

    const encrypted = await subtle.encrypt(
      { name: AES_ALGO, iv, tagLength: 128 },
      ctx.sessionKey,
      plainBytes
    );

    // WebCrypto AES-GCM returns ciphertext || authTag (tag appended)
    const encBuf = new Uint8Array(encrypted);
    const ct = encBuf.subarray(0, encBuf.length - 16);
    const tag = encBuf.subarray(encBuf.length - 16);

    return {
      ct: Buffer.from(ct).toString('base64'),
      iv: Buffer.from(iv).toString('base64'),
      tag: Buffer.from(tag).toString('base64'),
      kid: ctx.keyFingerprint,
    };
  }

  /**
   * Decrypt an EncryptedEnvelope received from a peer.
   * Throws AuthenticationError if the GCM tag doesn't verify.
   */
  async decrypt<T = unknown>(envelope: EncryptedEnvelope, peerId: string): Promise<T> {
    const ctx = this.requireSession(peerId);

    if (ctx.keyFingerprint !== envelope.kid) {
      throw new Error(
        `Key fingerprint mismatch for peer ${peerId}: ` +
        `expected ${ctx.keyFingerprint}, got ${envelope.kid}`
      );
    }

    const ctBuf = Buffer.from(envelope.ct, 'base64');
    const tagBuf = Buffer.from(envelope.tag, 'base64');
    const ivBuf = Buffer.from(envelope.iv, 'base64');

    // Reconstruct the concatenated buffer WebCrypto expects
    const combined = new Uint8Array(ctBuf.length + tagBuf.length);
    combined.set(ctBuf, 0);
    combined.set(tagBuf, ctBuf.length);

    let decrypted: ArrayBuffer;
    try {
      decrypted = await subtle.decrypt(
        { name: AES_ALGO, iv: ivBuf, tagLength: 128 },
        ctx.sessionKey,
        combined
      );
    } catch {
      throw new Error(`AES-GCM authentication failed for peer ${peerId} — possible tampering`);
    }

    return JSON.parse(new TextDecoder().decode(decrypted)) as T;
  }

  // ── Pairing code generation ───────────────────────────────

  /**
   * Generate a cryptographically random 8-character alphanumeric pairing code.
   * Uses only uppercase letters + digits for unambiguous manual entry.
   * Codes are single-use and expire after 5 minutes.
   */
  static generatePairingCode(): string {
    const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 confusion
    const bytes = randomBytes(8);
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += CHARSET[bytes[i] % CHARSET.length];
    }
    return code;
  }

  // ── HMAC verify token (for handshake confirmation) ────────

  /**
   * Compute HMAC-SHA256(rawSharedBits, "GOLDSHEMESH_VERIFY:" + nonce)
   * Both sides can verify the other derived the same shared secret.
   */
  static computeVerifyToken(rawSharedBits: ArrayBuffer, nonce: string): string {
    const key = Buffer.from(rawSharedBits);
    const msg = `GOLDSHEMESH_VERIFY:${nonce}`;
    return createHmac('sha256', key).update(msg).digest('base64');
  }

  // ── File integrity ────────────────────────────────────────

  static sha256Hex(data: Buffer | Uint8Array | string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  // ── Session management ────────────────────────────────────

  hasSession(peerId: string): boolean {
    return this.sessions.has(peerId);
  }

  dropSession(peerId: string): void {
    this.sessions.delete(peerId);
  }

  getKeyFingerprint(peerId: string): string | undefined {
    return this.sessions.get(peerId)?.keyFingerprint;
  }

  private requireSession(peerId: string): SessionContext {
    const ctx = this.sessions.get(peerId);
    if (!ctx) {
      throw new Error(`No E2EE session for peer ${peerId} — handshake not completed`);
    }
    return ctx;
  }
}
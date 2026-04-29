"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TCPCrypto = void 0;
const node_crypto_1 = require("node:crypto");
/**
 * GOLD SHE MESH — TCP Encryption Utility
 * Pillar 6: Production Hardening
 *
 * Implements a lightweight AES-256-GCM layer for raw TCP traffic.
 * This ensures that even if local network sniffing occurs,
 * the industrial JSON packets remain unreadable without the System Secret.
 */
class TCPCrypto {
    static ALGORITHM = 'aes-256-gcm';
    static IV_LENGTH = 12; // 96-bit for GCM
    static AUTH_TAG_LENGTH = 16;
    /**
     * Encrypts a plain string using the provided system secret.
     * Format: IV (12b) + Ciphertext + AuthTag (16b) -> Base64
     */
    static encrypt(plainText, secret) {
        const key = this.deriveKey(secret);
        const iv = (0, node_crypto_1.randomBytes)(this.IV_LENGTH);
        const cipher = (0, node_crypto_1.createCipheriv)(this.ALGORITHM, key, iv);
        const encrypted = Buffer.concat([
            cipher.update(plainText, 'utf8'),
            cipher.final()
        ]);
        const authTag = cipher.getAuthTag();
        // Concatenate [IV][Encrypted][AuthTag]
        return Buffer.concat([iv, encrypted, authTag]).toString('base64');
    }
    /**
     * Decrypts a base64 encoded encrypted string.
     */
    static decrypt(base64, secret) {
        const key = this.deriveKey(secret);
        const data = Buffer.from(base64, 'base64');
        // Extract parts
        const iv = data.subarray(0, this.IV_LENGTH);
        const authTag = data.subarray(data.length - this.AUTH_TAG_LENGTH);
        const ciphertext = data.subarray(this.IV_LENGTH, data.length - this.AUTH_TAG_LENGTH);
        const decipher = (0, node_crypto_1.createDecipheriv)(this.ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([
            decipher.update(ciphertext),
            decipher.final()
        ]);
        return decrypted.toString('utf8');
    }
    /**
     * Derives a 32-byte key from the variable-length secret using SHA-256.
     */
    static deriveKey(secret) {
        return (0, node_crypto_1.createHash)('sha256').update(secret).digest();
    }
}
exports.TCPCrypto = TCPCrypto;

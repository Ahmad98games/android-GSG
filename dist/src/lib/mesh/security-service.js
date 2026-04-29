"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTService = exports.SecureCrypto = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * GOLD SHE MESH — Security Service
 * GAP 1: Secure Bridge Authentication
 */
class SecureCrypto {
    static ALGORITHM = 'aes-256-gcm';
    static IV_LENGTH = 12;
    static AUTH_TAG_LENGTH = 16;
    /**
     * Encrypts a string payload using AES-256-GCM.
     * Returns Base64 string.
     */
    static encrypt(payload, secret) {
        const encrypted = this.encryptBinary(Buffer.from(payload, 'utf8'), secret);
        return encrypted.toString('base64');
    }
    /**
     * Decrypts an AES-256-GCM encrypted base64 string.
     */
    static decrypt(base64, secret) {
        const data = Buffer.from(base64, 'base64');
        const decrypted = this.decryptBinary(data, secret);
        return decrypted.toString('utf8');
    }
    /**
     * High-Performance Binary Encryption
     * Format: IV(12b) + Ciphertext + AuthTag(16b)
     */
    static encryptBinary(payload, secret) {
        const key = this.deriveKey(secret);
        const iv = node_crypto_1.default.randomBytes(this.IV_LENGTH);
        const cipher = node_crypto_1.default.createCipheriv(this.ALGORITHM, key, iv);
        const encrypted = Buffer.concat([
            cipher.update(payload),
            cipher.final()
        ]);
        const authTag = cipher.getAuthTag();
        return Buffer.concat([iv, encrypted, authTag]);
    }
    /**
     * High-Performance Binary Decryption
     */
    static decryptBinary(data, secret) {
        const key = this.deriveKey(secret);
        const buffer = Buffer.from(data);
        if (buffer.length < this.IV_LENGTH + this.AUTH_TAG_LENGTH) {
            throw new Error('Invalid encrypted data length');
        }
        const iv = buffer.subarray(0, this.IV_LENGTH);
        const authTag = buffer.subarray(buffer.length - this.AUTH_TAG_LENGTH);
        const ciphertext = buffer.subarray(this.IV_LENGTH, buffer.length - this.AUTH_TAG_LENGTH);
        const decipher = node_crypto_1.default.createDecipheriv(this.ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        return Buffer.concat([
            decipher.update(ciphertext),
            decipher.final()
        ]);
    }
    static deriveKey(secret) {
        return node_crypto_1.default.createHash('sha256').update(secret).digest();
    }
}
exports.SecureCrypto = SecureCrypto;
class JWTService {
    static secret = process.env.JWT_SECRET || 'goldshe-mesh-default-secret-v1';
    static setSecret(secret) {
        this.secret = secret;
    }
    /**
     * Generates a long-lived JWT for a paired mobile node.
     */
    static issueToken(deviceId, deviceName) {
        return jsonwebtoken_1.default.sign({
            sub: deviceId,
            name: deviceName,
            iat: Math.floor(Date.now() / 1000)
        }, this.secret, { expiresIn: '90d' } // Typical industrial device session
        );
    }
    /**
     * Validates the JWT and returns the decoded payload.
     */
    static validateToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.secret);
        }
        catch (err) {
            console.warn('[JWTService] Token validation failed:', err.message);
            return null;
        }
    }
}
exports.JWTService = JWTService;

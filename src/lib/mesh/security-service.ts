import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

/**
 * GOLD SHE MESH — Security Service
 * GAP 1: Secure Bridge Authentication
 */

export class SecureCrypto {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12;
  private static readonly AUTH_TAG_LENGTH = 16;

  /**
   * Encrypts a string payload using AES-256-GCM.
   * Returns Base64 string.
   */
  static encrypt(payload: string, secret: string): string {
    const encrypted = this.encryptBinary(Buffer.from(payload, 'utf8'), secret);
    return encrypted.toString('base64');
  }

  /**
   * Decrypts an AES-256-GCM encrypted base64 string.
   */
  static decrypt(base64: string, secret: string): string {
    const data = Buffer.from(base64, 'base64');
    const decrypted = this.decryptBinary(data, secret);
    return decrypted.toString('utf8');
  }

  /**
   * High-Performance Binary Encryption
   * Format: IV(12b) + Ciphertext + AuthTag(16b)
   */
  static encryptBinary(payload: Buffer | Uint8Array, secret: string): Buffer {
    const key = this.deriveKey(secret);
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

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
  static decryptBinary(data: Buffer | Uint8Array, secret: string): Buffer {
    const key = this.deriveKey(secret);
    const buffer = Buffer.from(data);

    if (buffer.length < this.IV_LENGTH + this.AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted data length');
    }

    const iv = buffer.subarray(0, this.IV_LENGTH);
    const authTag = buffer.subarray(buffer.length - this.AUTH_TAG_LENGTH);
    const ciphertext = buffer.subarray(this.IV_LENGTH, buffer.length - this.AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
  }

  private static deriveKey(secret: string): Buffer {
    return crypto.createHash('sha256').update(secret).digest();
  }
}

export class JWTService {
  private static secret: string = process.env.JWT_SECRET || 'goldshe-mesh-default-secret-v1';

  static setSecret(secret: string) {
    this.secret = secret;
  }

  /**
   * Generates a long-lived JWT for a paired mobile node.
   */
  static issueToken(deviceId: string, deviceName: string): string {
    return jwt.sign(
      { 
        sub: deviceId,
        name: deviceName,
        iat: Math.floor(Date.now() / 1000)
      },
      this.secret,
      { expiresIn: '90d' } // Typical industrial device session
    );
  }

  /**
   * Validates the JWT and returns the decoded payload.
   */
  static validateToken(token: string): jwt.JwtPayload | string | null {
    try {
      return jwt.verify(token, this.secret);
    } catch (err) {
      console.warn('[JWTService] Token validation failed:', (err as Error).message);
      return null;
    }
  }
}

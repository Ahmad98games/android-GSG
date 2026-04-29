import { createCipheriv, createDecipheriv, randomBytes, createHash, generateKeyPairSync } from 'node:crypto';

export class SecureCrypto {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12;
  private static readonly AUTH_TAG_LENGTH = 16;

  static deriveSessionKey(sharedSecret: Buffer): Buffer {
    return createHash('sha256').update(sharedSecret).digest();
  }

  static encrypt(data: Buffer | Uint8Array, key: Buffer): Buffer {
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, encrypted, tag]);
  }

  static decrypt(packet: Buffer | Uint8Array, key: Buffer): Buffer {
    const data = Buffer.from(packet);
    const iv = data.subarray(0, this.IV_LENGTH);
    const tag = data.subarray(data.length - this.AUTH_TAG_LENGTH);
    const ciphertext = data.subarray(this.IV_LENGTH, data.length - this.AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  static generateEphemeralKeyPair() {
    return generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });
  }
}

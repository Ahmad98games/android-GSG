import fs from 'node:fs';
import path from 'node:path';

import crypto from 'node:crypto';



export class BinaryLogger {

  private stream: fs.WriteStream | null = null;
  private readonly logDir = path.join(process.cwd(), 'logs');
  private currentFileName = '';

  constructor() {
    if (!fs.existsSync(this.logDir)) fs.mkdirSync(this.logDir, { recursive: true });
    this.rotate();
  }

  private rotate() {
    const date = new Date().toISOString().split('T')[0];
    const fileName = `hub-raw-${date}.bin`;
    if (this.currentFileName !== fileName) {
      if (this.stream) this.stream.end();
      this.currentFileName = fileName;
      this.stream = fs.createWriteStream(path.join(this.logDir, fileName), { flags: 'a' });
    }
  }

  log(data: Buffer | Uint8Array, messageId?: string) {
    this.rotate();
    if (!this.stream) return;
    
    const ts = BigInt(Date.now());
    const header = Buffer.alloc(16);
    
    // Timestamp (6 bytes)
    header.writeUIntBE(Number(ts & BigInt('0xffffffffffff')), 0, 6);
    
    // Length (2 bytes)
    header.writeUInt16BE(data.length, 6);
    
    // Message ID Hash (8 bytes)
    if (messageId) {
      const hash = crypto.createHash('shake256', { outputLength: 8 }).update(messageId).digest();
      hash.copy(header, 8);
    } else {
      header.fill(0, 8, 16);
    }
    
    this.stream.write(header);
    this.stream.write(data);
  }
}


export const binaryLogger = new BinaryLogger();

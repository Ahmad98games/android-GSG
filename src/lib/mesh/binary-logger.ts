import fs from 'node:fs';
import path from 'node:path';

export class BinaryLogger {
  private stream: fs.WriteStream | null = null;
  private readonly logDir = path.join(process.cwd(), 'logs');

  constructor() {
    if (!fs.existsSync(this.logDir)) fs.mkdirSync(this.logDir, { recursive: true });
    this.stream = fs.createWriteStream(path.join(this.logDir, `hub-raw-${Date.now()}.bin`), { flags: 'a' });
  }

  log(data: Buffer | Uint8Array) {
    if (!this.stream) return;
    const ts = BigInt(Date.now());
    const header = Buffer.alloc(8);
    header.writeUIntBE(Number(ts & BigInt('0xffffffffffff')), 0, 6);
    header.writeUInt16BE(data.length, 6);
    this.stream.write(header);
    this.stream.write(data);
  }
}
export const hubBinaryLogger = new BinaryLogger();

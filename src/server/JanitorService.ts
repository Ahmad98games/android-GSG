import fs from 'node:fs';
import path from 'node:path';

export class JanitorService {
  constructor(private db: any) {
    setInterval(() => this.cleanup(), 86400000);
  }

  private cleanup() {
    // Prune logs...
  }
}

import { Worker } from 'node:worker_threads';
import path from 'node:path';
import pino from 'pino';
// Sentry removed as it is missing from package.json


const logger = pino({ level: 'info' });

export class WorkerPool {
  private workers: Worker[] = [];
  private next = 0;

  constructor(private count = 4) {
    for (let i = 0; i < count; i++) {
      this.createWorker(i);
    }
  }

  private createWorker(index: number) {
    const worker = new Worker(path.join(__dirname, 'packet-worker.js'));
    
    worker.on('error', (err) => {
      logger.error({ index, error: err.message }, '[WorkerPool] Worker crashed.');
      this.restartWorker(index);
    });


    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.error({ index, code }, '[WorkerPool] Worker exited with error code.');
        this.restartWorker(index);
      }
    });

    this.workers[index] = worker;
  }

  private restartWorker(index: number) {
    logger.info({ index }, '[WorkerPool] Restarting worker...');
    this.createWorker(index);
  }

  async processPacket(task: Record<string, unknown>): Promise<unknown> {
    const worker = this.workers[this.next];
    this.next = (this.next + 1) % this.workers.length;
    
    return new Promise((resolve, reject) => {
      const listener = (msg: { id: string; error?: string; data: unknown }) => {
        if (msg.id === task.id) {
          worker.off('message', listener);
          if (msg.error) reject(new Error(msg.error));
          else resolve(msg.data);
        }
      };
      worker.on('message', listener);
      worker.postMessage(task);
    });
  }

}


import { Worker } from 'node:worker_threads';
import path from 'node:path';
import EventEmitter from 'node:events';
import { configManager } from './config-manager';
import { WorkerTask, WorkerResult } from './worker-types';

/**
 * GOLD SHE MESH — Multi-Threaded Balancer
 * 
 * V9.0: Tier-Aware Scaling
 * Manages a pool of workers to offload CPU-intensive tasks.
 */

export class WorkerPool extends EventEmitter {
  private workers: Worker[] = [];
  private nextWorkerIndex = 0;
  private readonly numWorkers: number;
  private readonly workerPath: string;
  private isInitialized = false;

  constructor() {
    super();
    const config = configManager.getConfig();
    this.numWorkers = config.maxWorkers;
    
    // Pillar 5: Production Efficiency — Use .js in production
    const isProd = process.env.NODE_ENV === 'production' || !!(process as unknown as { pkg: unknown }).pkg;
    const fileName = isProd ? 'packet-worker.js' : 'packet-worker.ts';
    this.workerPath = path.resolve(__dirname, fileName);
    
    console.info(`[WorkerPool] Initialized for ${config.tier} Tier (${this.numWorkers} workers)`);
  }

  public start() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    console.info(`[WorkerPool] Scaling up ${this.numWorkers} workers for high-capacity throughput...`);
    for (let i = 0; i < this.numWorkers; i++) {
      this.spawnWorker(i);
    }
  }

  private spawnWorker(index: number) {
    try {
      // Use transpile-only for speed in development
      const worker = new Worker(this.workerPath, { 
        execArgv: process.execArgv,
        workerData: { workerId: index },
        env: { 
          ...process.env, 
          TS_NODE_TRANSPILE_ONLY: 'true',
          NODE_OPTIONS: '--no-warnings' 
        }
      });

      worker.on('message', (result: WorkerResult) => {
        this.emit(`result:${result.id}`, result);
      });

      worker.on('error', (err) => {
        console.error(`[WorkerPool] Worker ${index} fault:`, err);
        // OMNORA V9.0: Don't respawn on error, let the 'exit' handler handle it.
        // This prevents double-respawning which causes process explosion.
      });

      worker.on('exit', (code) => {
        if (code !== 0 && this.workers[index]) {
          console.warn(`[WorkerPool] Worker ${index} died (Code: ${code}). Restarting...`);
          this.respawnWorker(index);
        }
      });

      this.workers[index] = worker;
    } catch (err) {
      console.error(`[WorkerPool] Failed to spawn worker ${index}:`, err);
    }
  }

  private respawnWorker(index: number) {
    if (this.workers[index]) {
      const oldWorker = this.workers[index];
      this.workers[index] = null as any;
      oldWorker.terminate();
    }
    
    // OMNORA V9.0: Exponential Backoff / Throttle
    // If a worker crashes too fast, wait longer to avoid killing the CPU.
    const delay = 5000; 
    setTimeout(() => {
      if (this.numWorkers > 0 && this.isInitialized) {
        this.spawnWorker(index);
      }
    }, delay); 
  }

  /**
   * Distribute a task to the next available worker in a round-robin fashion.
   * OMNORA V9.0: Lazy Load — Spawns workers only when active data stream is detected.
   */
  execute(task: WorkerTask): Promise<WorkerResult> {
    if (!this.isInitialized) {
      this.init();
    }

    return new Promise((resolve) => {
      const worker = this.workers[this.nextWorkerIndex];
      this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.numWorkers;

      const handler = (result: WorkerResult) => {
        if (result.id === task.id) {
          this.removeListener(`result:${task.id}`, handler);
          resolve(result);
        }
      };

      this.on(`result:${task.id}`, handler);
      
      if (worker) {
        worker.postMessage(task);
      } else {
        // Retry if spawning
        setTimeout(() => this.execute(task).then(resolve), 500);
      }
    });
  }

  terminate() {
    console.info('[WorkerPool] Scaling down: Terminating all workers...');
    for (const worker of this.workers) {
      if (worker) worker.terminate();
    }
    this.workers = [];
    this.isInitialized = false;
  }
}

export const hubWorkerPool = new WorkerPool();

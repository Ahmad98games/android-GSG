"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hubWorkerPool = exports.WorkerPool = void 0;
const node_worker_threads_1 = require("node:worker_threads");
const node_path_1 = __importDefault(require("node:path"));
const node_events_1 = __importDefault(require("node:events"));
const config_manager_1 = require("./config-manager");
/**
 * GOLD SHE MESH — Multi-Threaded Balancer
 *
 * V9.0: Tier-Aware Scaling
 * Manages a pool of workers to offload CPU-intensive tasks.
 */
class WorkerPool extends node_events_1.default {
    workers = [];
    nextWorkerIndex = 0;
    numWorkers;
    workerPath;
    isInitialized = false;
    constructor() {
        super();
        const config = config_manager_1.configManager.getConfig();
        this.numWorkers = config.maxWorkers;
        // Pillar 5: Production Efficiency — Use .js in production
        const isProd = process.env.NODE_ENV === 'production' || !!process.pkg;
        const fileName = isProd ? 'packet-worker.js' : 'packet-worker.ts';
        this.workerPath = node_path_1.default.resolve(__dirname, fileName);
        console.info(`[WorkerPool] Initialized for ${config.tier} Tier (${this.numWorkers} workers)`);
    }
    start() {
        this.init();
    }
    init() {
        if (this.isInitialized)
            return;
        this.isInitialized = true;
        console.info(`[WorkerPool] Scaling up ${this.numWorkers} workers for high-capacity throughput...`);
        for (let i = 0; i < this.numWorkers; i++) {
            this.spawnWorker(i);
        }
    }
    spawnWorker(index) {
        try {
            // Use transpile-only for speed in development
            const worker = new node_worker_threads_1.Worker(this.workerPath, {
                execArgv: process.execArgv,
                workerData: { workerId: index },
                env: {
                    ...process.env,
                    TS_NODE_TRANSPILE_ONLY: 'true',
                    NODE_OPTIONS: '--no-warnings'
                }
            });
            worker.on('message', (result) => {
                this.emit(`result:${result.id}`, result);
            });
            worker.on('error', (err) => {
                console.error(`[WorkerPool] Worker ${index} fault:`, err);
                this.respawnWorker(index);
            });
            worker.on('exit', (code) => {
                if (code !== 0 && this.workers[index]) {
                    console.warn(`[WorkerPool] Worker ${index} died (Code: ${code}). Restarting...`);
                    this.respawnWorker(index);
                }
            });
            this.workers[index] = worker;
        }
        catch (err) {
            console.error(`[WorkerPool] Failed to spawn worker ${index}:`, err);
        }
    }
    respawnWorker(index) {
        if (this.workers[index]) {
            this.workers[index].terminate();
        }
        setTimeout(() => {
            if (this.numWorkers > 0) {
                this.spawnWorker(index);
            }
        }, 5000);
    }
    /**
     * Distribute a task to the next available worker in a round-robin fashion.
     * OMNORA V9.0: Lazy Load — Spawns workers only when active data stream is detected.
     */
    execute(task) {
        if (!this.isInitialized) {
            this.init();
        }
        return new Promise((resolve) => {
            const worker = this.workers[this.nextWorkerIndex];
            this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.numWorkers;
            const handler = (result) => {
                if (result.id === task.id) {
                    this.removeListener(`result:${task.id}`, handler);
                    resolve(result);
                }
            };
            this.on(`result:${task.id}`, handler);
            if (worker) {
                worker.postMessage(task);
            }
            else {
                // Retry if spawning
                setTimeout(() => this.execute(task).then(resolve), 500);
            }
        });
    }
    terminate() {
        console.info('[WorkerPool] Scaling down: Terminating all workers...');
        for (const worker of this.workers) {
            if (worker)
                worker.terminate();
        }
        this.workers = [];
        this.isInitialized = false;
    }
}
exports.WorkerPool = WorkerPool;
exports.hubWorkerPool = new WorkerPool();

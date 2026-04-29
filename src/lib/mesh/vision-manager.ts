import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import { checkHardwareSpecs } from './hardware-check';
import { sseRegistry } from './sse-registry';
import { configManager } from './config-manager';

/**
 * GOLD SHE MESH — Vision Engine Manager
 * GAP 2: Multiprocessing Architecture
 * 
 * OMNORA V9.0: Tier-Aware Vision Lifecycle
 */

export class VisionManager {
  private static instance: VisionManager;
  private childProcess: ChildProcess | null = null;
  private isShuttingDown = false;

  private constructor() {}

  static getInstance(): VisionManager {
    if (!VisionManager.instance) {
      VisionManager.instance = new VisionManager();
    }
    return VisionManager.instance;
  }

  /**
   * Start the Vision Engine as a dedicated child process.
   */
  async start() {
    if (this.childProcess) return;

    // OMNORA V9.0: Tier-Aware Gating
    const config = configManager.getConfig();
    if (!config.visionEnabled || process.env.DISABLE_VISION === 'true') {
      console.warn(`[VisionManager] AI Subsystem DISABLED (Tier: ${config.tier}).`);
      return;
    }

    // 1. Hardware Pre-flight Audit
    const specs = checkHardwareSpecs();
    
    // 2. If hardware is weak, notify the Dashboard UI
    if (specs.isThrottled) {
      setTimeout(() => {
        sseRegistry.broadcast({
          event: 'hardware-alert',
          data: {
            type: 'PERFORMANCE_THROTTLE',
            message: `Hub running on sub-optimal hardware (${specs.cores} Cores, ${specs.totalMemoryGB}GB RAM). AI latency may occur.`,
            specs
          }
        });
      }, 5000); // Delay to ensure SSE clients are connected
    }

    if (process.env.DISABLE_VISION === 'true') {
      console.info(`[VisionManager] AI Subsystem DISABLED via environment flag.`);
      return;
    }

    const pythonPath = process.env.PYTHON_PATH || 'python';
    const scriptPath = path.join(process.cwd(), 'vision_engine.py');

    console.info(`[VisionManager] Initializing Industrial AI Subsystem...`);

    // Launch Python process in a separate memory space
    this.childProcess = spawn(pythonPath, [scriptPath], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        PYTHONUNBUFFERED: '1',
        // Ensure child doesn't inherit unnecessary handles
      }
    });

    this.childProcess.stdout?.on('data', (data) => {
      const line = data.toString().trim();
      if (line) console.info(`[VisionEngine] ${line}`);
    });

    this.childProcess.stderr?.on('data', (data) => {
      const error = data.toString().trim();
      if (error) console.error(`[VisionEngine:FAULT] ${error}`);
    });

    this.childProcess.on('exit', (code) => {
      this.childProcess = null;
      if (!this.isShuttingDown) {
        console.warn(`[VisionManager] AI Subsystem terminated (Code: ${code}). Re-spawning in 10s...`);
        setTimeout(() => this.start(), 10000);
      }
    });
  }

  /**
   * Graceful termination of the AI subsystem.
   */
  stop() {
    this.isShuttingDown = true;
    if (this.childProcess) {
      console.info('[VisionManager] Signalling AI Subsystem shutdown...');
      this.childProcess.kill('SIGINT');
      this.childProcess = null;
    }
  }
}

export const getVisionManager = () => VisionManager.getInstance();

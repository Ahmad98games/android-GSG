"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVisionManager = exports.VisionManager = void 0;
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
const hardware_check_1 = require("./hardware-check");
const sse_registry_1 = require("./sse-registry");
const config_manager_1 = require("./config-manager");
/**
 * GOLD SHE MESH — Vision Engine Manager
 * GAP 2: Multiprocessing Architecture
 *
 * OMNORA V9.0: Tier-Aware Vision Lifecycle
 */
class VisionManager {
    static instance;
    childProcess = null;
    isShuttingDown = false;
    constructor() { }
    static getInstance() {
        if (!VisionManager.instance) {
            VisionManager.instance = new VisionManager();
        }
        return VisionManager.instance;
    }
    /**
     * Start the Vision Engine as a dedicated child process.
     */
    async start() {
        if (this.childProcess)
            return;
        // OMNORA V9.0: Tier-Aware Gating
        const config = config_manager_1.configManager.getConfig();
        if (!config.visionEnabled || process.env.DISABLE_VISION === 'true') {
            console.warn(`[VisionManager] AI Subsystem DISABLED (Tier: ${config.tier}).`);
            return;
        }
        // 1. Hardware Pre-flight Audit
        const specs = (0, hardware_check_1.checkHardwareSpecs)();
        // 2. If hardware is weak, notify the Dashboard UI
        if (specs.isThrottled) {
            setTimeout(() => {
                sse_registry_1.sseRegistry.broadcast({
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
        const scriptPath = node_path_1.default.join(process.cwd(), 'vision_engine.py');
        console.info(`[VisionManager] Initializing Industrial AI Subsystem...`);
        // Launch Python process in a separate memory space
        this.childProcess = (0, node_child_process_1.spawn)(pythonPath, [scriptPath], {
            stdio: ['inherit', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1',
                // Ensure child doesn't inherit unnecessary handles
            }
        });
        this.childProcess.stdout?.on('data', (data) => {
            const line = data.toString().trim();
            if (line)
                console.info(`[VisionEngine] ${line}`);
        });
        this.childProcess.stderr?.on('data', (data) => {
            const error = data.toString().trim();
            if (error)
                console.error(`[VisionEngine:FAULT] ${error}`);
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
exports.VisionManager = VisionManager;
const getVisionManager = () => VisionManager.getInstance();
exports.getVisionManager = getVisionManager;

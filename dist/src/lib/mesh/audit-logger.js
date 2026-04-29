"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentalAudit = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const sse_registry_1 = require("./sse-registry");
const resource_guard_1 = require("./resource-guard");
/**
 * GOLD SHE MESH — Liability & Audit Logging
 * GAP 5: Environmental Monitoring & Liability Protection
 *
 * Periodically records system vitals to a hidden audit log.
 * Provides evidence of host-side hardware failures to protect brand reputation.
 */
const AUDIT_LOG_DIR = node_path_1.default.join(process.cwd(), '.goldshemesh');
const AUDIT_LOG_PATH = node_path_1.default.join(AUDIT_LOG_DIR, 'env-audit.log');
class EnvironmentalAudit {
    static interval = null;
    static stressInterval = null;
    /**
     * Start the periodic monitoring and logging.
     */
    static start() {
        if (this.interval)
            return;
        if (!node_fs_1.default.existsSync(AUDIT_LOG_DIR)) {
            node_fs_1.default.mkdirSync(AUDIT_LOG_DIR, { recursive: true });
        }
        console.info(`[AuditLogger] liability protection active. Logging to: .goldshemesh/env-audit.log`);
        // Record system vitals every 5 minutes for long-term audit
        this.interval = setInterval(() => this.recordMetrics(), 5 * 60 * 1000);
        // HIGH-CAPACITY SCALING: Check stress every 10s to trigger guardrails
        this.stressInterval = setInterval(() => this.checkSystemStress(), 10 * 1000);
        // Immediate first record
        this.recordMetrics();
        this.checkSystemStress();
    }
    static checkSystemStress() {
        try {
            const cpus = node_os_1.default.cpus();
            const load = node_os_1.default.loadavg();
            // Load avg > 90% of cores
            const cpuUsage = (load[0] / cpus.length) * 100;
            const isStressed = cpuUsage > 90;
            resource_guard_1.ResourceGuard.setStress(isStressed, cpuUsage);
            if (isStressed) {
                // Signal UI to show "Auto-Scale" warning
                sse_registry_1.telemetryRegistry.broadcast({
                    event: 'hardware-alert',
                    data: {
                        type: 'SYSTEM_STRESS',
                        message: 'AUTO-SCALE WARNING: CPU Usage Critical. Prioritizing Sync Data over Live Logs.',
                        cpu: cpuUsage.toFixed(1),
                        ts: Date.now()
                    }
                });
            }
        }
        catch (err) {
            console.error('[AuditLogger] Stress check failed:', err);
        }
    }
    static recordMetrics() {
        try {
            const cpus = node_os_1.default.cpus();
            const load = node_os_1.default.loadavg();
            const freeMem = node_os_1.default.freemem() / (1024 * 1024 * 1024);
            const totalMem = node_os_1.default.totalmem() / (1024 * 1024 * 1024);
            const memUsagePct = ((totalMem - freeMem) / totalMem) * 100;
            // Detect "CPU Spike" (Load Avg > 80% of cores)
            const cpuSpike = load[0] > cpus.length * 0.8;
            const ramPressure = memUsagePct > 90;
            const entry = {
                timestamp: new Date().toISOString(),
                vitals: {
                    cpu_load_1m: load[0].toFixed(2),
                    cpu_spike_detected: cpuSpike,
                    mem_usage_pct: memUsagePct.toFixed(1),
                    ram_pressure_detected: ramPressure,
                    system_stressed: resource_guard_1.ResourceGuard.isStressed(),
                    uptime_seconds: Math.floor(node_os_1.default.uptime())
                }
            };
            // Append to hidden log
            node_fs_1.default.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(entry) + '\n');
            // MANDATORY TOAST: If hardware lag is detected, notify UI immediately
            if (cpuSpike || ramPressure) {
                this.emitLiabilityAlert(cpuSpike ? 'CPU_SPIKE' : 'RAM_FULL');
            }
        }
        catch (err) {
            console.error('[AuditLogger] Metrics capture failed:', err);
        }
    }
    /**
     * Pushes a mandatory liability toast to the UI.
     */
    static emitLiabilityAlert(reason) {
        sse_registry_1.sseRegistry.broadcast({
            event: 'hardware-alert',
            data: {
                type: 'HARDWARE_LATENCY',
                message: 'Hardware Latency Detected: System Performance Throttled by Host Infrastructure.',
                reason: reason,
                ts: Date.now()
            }
        });
    }
    /**
     * Generates a status report for the Settings UI.
     */
    static getReport() {
        const load = node_os_1.default.loadavg();
        const freeMem = node_os_1.default.freemem() / (1024 * 1024 * 1024);
        const totalMem = node_os_1.default.totalmem() / (1024 * 1024 * 1024);
        const cpus = node_os_1.default.cpus();
        return {
            cpu: load[0] > cpus.length * 0.7 ? 'Bottlenecked' : 'Healthy',
            ram: (freeMem / totalMem) < 0.1 ? 'Full' : 'Healthy',
            disk: 'Healthy', // Placeholder for advanced disk IO check
            latency: 'Low (Local Mesh)',
            lastAudit: new Date().toLocaleTimeString()
        };
    }
    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        if (this.stressInterval) {
            clearInterval(this.stressInterval);
            this.stressInterval = null;
        }
    }
}
exports.EnvironmentalAudit = EnvironmentalAudit;

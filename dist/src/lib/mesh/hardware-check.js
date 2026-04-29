"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkHardwareSpecs = checkHardwareSpecs;
const node_os_1 = __importDefault(require("node:os"));
function checkHardwareSpecs() {
    const cores = node_os_1.default.cpus().length;
    const totalMemoryGB = Math.round(node_os_1.default.totalmem() / (1024 * 1024 * 1024));
    const cpuModel = node_os_1.default.cpus()[0].model;
    // Requirement: at least i5 (roughly 4+ cores) and 8GB RAM
    const isThrottled = cores < 4 || totalMemoryGB < 8;
    console.info(`\n[HardwareCheck] Starting Pre-flight Audit...`);
    console.info(`[HardwareCheck] CPU: ${cpuModel} (${cores} cores)`);
    console.info(`[HardwareCheck] RAM: ${totalMemoryGB}GB`);
    if (isThrottled) {
        console.warn(`\n  ╔══════════════════════════════════════════════════════════════╗`);
        console.warn(`  ║   ⚠️ PERFORMANCE THROTTLE WARNING                             ║`);
        console.warn(`  ║   Detected specs are below industrial baseline (i5/8GB).      ║`);
        console.warn(`  ║   AI Inference latency may increase.                          ║`);
        console.warn(`  ╚══════════════════════════════════════════════════════════════╝\n`);
    }
    else {
        console.info(`[HardwareCheck] Pre-flight Success: System meets AI requirements.\n`);
    }
    return { cores, totalMemoryGB, isThrottled, cpuModel };
}

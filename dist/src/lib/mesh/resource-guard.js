"use strict";
/**
 * GOLD SHE MESH — Resource Guardrails
 *
 * Centralized state for system stress monitoring.
 * Used to prioritize "Sync Data" over "Live Logs" when CPU > 90%.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceGuard = void 0;
class ResourceGuard {
    static stressed = false;
    static cpuUsage = 0;
    static setStress(isStressed, cpuUsage) {
        if (this.stressed !== isStressed) {
            console.warn(`[ResourceGuard] System Stress State Changed: ${isStressed} (CPU: ${cpuUsage.toFixed(1)}%)`);
        }
        this.stressed = isStressed;
        this.cpuUsage = cpuUsage;
    }
    static isStressed() {
        return this.stressed;
    }
    static getCpuUsage() {
        return this.cpuUsage;
    }
}
exports.ResourceGuard = ResourceGuard;

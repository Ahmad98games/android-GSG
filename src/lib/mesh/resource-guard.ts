/**
 * GOLD SHE MESH — Resource Guardrails
 * 
 * Centralized state for system stress monitoring.
 * Used to prioritize "Sync Data" over "Live Logs" when CPU > 90%.
 */

export class ResourceGuard {
  private static stressed = false;
  private static cpuUsage = 0;

  static setStress(isStressed: boolean, cpuUsage: number) {
    if (this.stressed !== isStressed) {
      console.warn(`[ResourceGuard] System Stress State Changed: ${isStressed} (CPU: ${cpuUsage.toFixed(1)}%)`);
    }
    this.stressed = isStressed;
    this.cpuUsage = cpuUsage;
  }

  static isStressed(): boolean {
    return this.stressed;
  }

  static getCpuUsage(): number {
    return this.cpuUsage;
  }
}

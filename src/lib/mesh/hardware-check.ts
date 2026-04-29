import os from 'node:os';

/**
 * GOLD SHE MESH — Hardware Pre-flight Check
 * GAP 2: Multiprocessing Architecture
 * 
 * Scans CPU cores and available RAM on startup.
 * Enforces industrial performance standards for AI inference.
 */

export interface HardwareSpecs {
  cores: number;
  totalMemoryGB: number;
  isThrottled: boolean;
  cpuModel: string;
}

export function checkHardwareSpecs(): HardwareSpecs {
  const cores = os.cpus().length;
  const totalMemoryGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  const cpuModel = os.cpus()[0].model;

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
  } else {
    console.info(`[HardwareCheck] Pre-flight Success: System meets AI requirements.\n`);
  }

  return { cores, totalMemoryGB, isThrottled, cpuModel };
}

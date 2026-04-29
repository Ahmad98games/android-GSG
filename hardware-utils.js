const os = require('node:os');

/**
 * Shared Hardware Detection Logic for OMNORA V9.0
 */
function getHardwareTier() {
  const cpus = os.cpus();
  const cores = cpus.length;
  const totalMemoryGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  const cpuModel = cpus[0]?.model.toUpperCase() || 'UNKNOWN';

  // ELITE: i7/i9 or High Core Count + 16GB+ RAM
  if ((cores >= 8 || cpuModel.includes('I7') || cpuModel.includes('I9')) && totalMemoryGB >= 16) {
    return 'ELITE';
  }

  // PRO: Mid-range
  if (cores >= 4 && totalMemoryGB >= 8) {
    return 'PRO';
  }

  // LITE: i5 4th Gen / Legacy / Low RAM
  return 'LITE';
}

module.exports = { getHardwareTier };

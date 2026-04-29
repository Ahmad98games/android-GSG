import os from 'node:os';
import path from 'node:path';

/**
 * OMNORA NOXIS v9.0 — Modular Configuration Manager
 * Tier-Based Architecture for Scaling from i5 4th Gen to i7 RTX Rigs.
 */

export type LicenseTier = 'LITE' | 'PRO' | 'ELITE';

export interface TierConfig {
  tier: LicenseTier;
  maxWorkers: number;
  visionEnabled: boolean;
  hardwareAcceleration: boolean;
  uiEffects: 'minimal' | 'standard' | 'high-fidelity';
  sqliteOptimized: boolean;
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: TierConfig;

  private constructor() {
    this.config = this.detectTier();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private detectTier(): TierConfig {
    const cores = os.cpus().length;
    const totalMemoryGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
    const cpuModel = os.cpus()[0].model.toUpperCase();

    // ELITE: i7/i9 or High Core Count + 16GB+ RAM
    if ((cores >= 8 || cpuModel.includes('I7') || cpuModel.includes('I9')) && totalMemoryGB >= 16) {
      return {
        tier: 'ELITE',
        maxWorkers: cores >= 8 ? 8 : 4,
        visionEnabled: true,
        hardwareAcceleration: true,
        uiEffects: 'high-fidelity',
        sqliteOptimized: true,
      };
    }

    // PRO: Mid-range
    if (cores >= 4 && totalMemoryGB >= 8) {
      return {
        tier: 'PRO',
        maxWorkers: 2,
        visionEnabled: true,
        hardwareAcceleration: true,
        uiEffects: 'standard',
        sqliteOptimized: true,
      };
    }

    // LITE: i5 4th Gen / Legacy / Low RAM
    return {
      tier: 'LITE',
      maxWorkers: 1,
      visionEnabled: false,
      hardwareAcceleration: false,
      uiEffects: 'minimal',
      sqliteOptimized: true,
    };
  }

  public getConfig(): TierConfig {
    return this.config;
  }

  /**
   * Helper to resolve paths reliably across Windows/OneDrive
   */
  public resolvePath(...segments: string[]): string {
    return path.join(process.cwd(), ...segments);
  }

  /**
   * Feature Guard: Returns true if the feature is allowed for the current tier
   */
  public isFeatureEnabled(feature: keyof TierConfig): boolean {
    const val = this.config[feature];
    return typeof val === 'boolean' ? val : !!val;
  }
}

/**
 * Standard error for locked features
 */
export class FeatureLockedError extends Error {
  constructor(feature: string, requiredTier: LicenseTier) {
    super(`[FeatureLocked] ${feature} is not available in the current tier. Required: ${requiredTier}`);
    this.name = 'FeatureLockedError';
  }
}

export const configManager = ConfigManager.getInstance();

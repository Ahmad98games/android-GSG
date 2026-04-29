"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configManager = exports.FeatureLockedError = void 0;
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
class ConfigManager {
    static instance;
    config;
    constructor() {
        this.config = this.detectTier();
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    detectTier() {
        const cores = node_os_1.default.cpus().length;
        const totalMemoryGB = Math.round(node_os_1.default.totalmem() / (1024 * 1024 * 1024));
        const cpuModel = node_os_1.default.cpus()[0].model.toUpperCase();
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
    getConfig() {
        return this.config;
    }
    /**
     * Helper to resolve paths reliably across Windows/OneDrive
     */
    resolvePath(...segments) {
        return node_path_1.default.join(process.cwd(), ...segments);
    }
    /**
     * Feature Guard: Returns true if the feature is allowed for the current tier
     */
    isFeatureEnabled(feature) {
        const val = this.config[feature];
        return typeof val === 'boolean' ? val : !!val;
    }
}
/**
 * Standard error for locked features
 */
class FeatureLockedError extends Error {
    constructor(feature, requiredTier) {
        super(`[FeatureLocked] ${feature} is not available in the current tier. Required: ${requiredTier}`);
        this.name = 'FeatureLockedError';
    }
}
exports.FeatureLockedError = FeatureLockedError;
exports.configManager = ConfigManager.getInstance();

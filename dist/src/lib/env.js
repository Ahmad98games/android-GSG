"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    HUB_TCP_PORT: zod_1.z.coerce.number().int().min(1024).max(65535).default(9000),
    HUB_JWT_SECRET: zod_1.z.string().min(32, "JWT secret must be at least 32 chars"),
    HUB_MAX_NODES: zod_1.z.coerce.number().int().min(1).max(500).default(100),
    HUB_SYNC_OFFSET_WINDOW_MS: zod_1.z.coerce.number().int().default(1000),
    INDUSTRY_PROFILE: zod_1.z.enum(['TEXTILE', 'PHARMA', 'LOGISTICS', 'GENERAL']).default('GENERAL'),
    SUPABASE_URL: zod_1.z.string().url().optional(),
    SUPABASE_ANON_KEY: zod_1.z.string().optional(),
    LOG_LEVEL: zod_1.z.enum(["fatal", "error", "warn", "info", "debug"]).default("info"),
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
    BINARY_LOG_DIR: zod_1.z.string().default("./logs"),
    BACKUP_DIR: zod_1.z.string().default("./backups"),
});
const validateEnv = () => {
    try {
        return envSchema.parse(process.env);
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            console.error('\n❌ CRITICAL CONFIGURATION ERROR');
            console.table(err.issues.map(e => ({ var: e.path.join('.'), msg: e.message })));
            process.exit(1);
        }
        throw err;
    }
};
exports.env = validateEnv();

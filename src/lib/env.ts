import { z } from 'zod';

const envSchema = z.object({
  HUB_TCP_PORT: z.coerce.number().int().min(1024).max(65535).default(9000),
  HUB_JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 chars"),
  HUB_MAX_NODES: z.coerce.number().int().min(1).max(500).default(100),
  HUB_SYNC_OFFSET_WINDOW_MS: z.coerce.number().int().default(1000),
  INDUSTRY_PROFILE: z.enum(['TEXTILE', 'PHARMA', 'LOGISTICS', 'GENERAL']).default('GENERAL'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug"]).default("info"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  BINARY_LOG_DIR: z.string().default("./logs"),
  BACKUP_DIR: z.string().default("./backups"),
});

const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error('\n❌ CRITICAL CONFIGURATION ERROR');
      console.table(err.issues.map(e => ({ var: e.path.join('.'), msg: e.message })));
      process.exit(1);
    }
    throw err;
  }
};

export const env = validateEnv();

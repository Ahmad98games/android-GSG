import { supabase } from '@/lib/supabase';

/**
 * SOVEREIGN SENTINEL (v8.3)
 * Lightweight observability — logs errors to system_logs table.
 * Never crashes the app. Fails silently with console fallback.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export async function sovereignLog(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('system_logs').insert({
      level,
      message,
      context: context ?? null,
      url: typeof window !== 'undefined' ? window.location.pathname : 'server',
      created_at: new Date().toISOString()
    });
  } catch {
    // Never let logging crash the app
    console.error(`[Sentinel/${level}] ${message}`, context);
  }
}

/**
 * Wraps a Supabase mutation and logs failures automatically.
 */
export async function guardedMutation<T>(
  label: string,
  fn: () => Promise<{ data: T | null; error: { message: string } | null }>
): Promise<T | null> {
  const { data, error } = await fn();
  if (error) {
    await sovereignLog('ERROR', `Mutation failed: ${label}`, { error: error.message });
    throw new Error(error.message);
  }
  return data;
}

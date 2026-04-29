/**
 * Wraps any promise with a hard timeout.
 * If the promise doesn't resolve/reject within `ms` milliseconds,
 * the returned promise rejects with a CONNECTION_TIMEOUT error.
 *
 * This is necessary because Supabase's `.abortSignal()` doesn't reliably
 * interrupt DNS-level failures (ENOTFOUND) in all environments.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('CONNECTION_TIMEOUT'));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

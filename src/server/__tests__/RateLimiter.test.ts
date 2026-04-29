import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '../RateLimiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
    vi.useFakeTimers();
  });

  it('should allow packets within limit', () => {
    for (let i = 0; i < 200; i++) {
      expect(limiter.checkPacketLimit('node1')).toBe(true);
    }
    expect(limiter.checkPacketLimit('node1')).toBe(false);
  });

  it('should allow messages within limit', () => {
    for (let i = 0; i < 100; i++) {
      expect(limiter.checkMessageLimit('node1')).toBe(true);
    }
    expect(limiter.checkMessageLimit('node1')).toBe(false);
  });

  it('should reset limits after window expires', () => {
    for (let i = 0; i < 200; i++) limiter.checkPacketLimit('node1');
    expect(limiter.checkPacketLimit('node1')).toBe(false);

    vi.advanceTimersByTime(60001);
    expect(limiter.checkPacketLimit('node1')).toBe(true);
  });

  it('should track different nodes separately', () => {
    for (let i = 0; i < 200; i++) limiter.checkPacketLimit('node1');
    expect(limiter.checkPacketLimit('node1')).toBe(false);
    expect(limiter.checkPacketLimit('node2')).toBe(true);
  });
});
